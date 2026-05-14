import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as OrmRepository } from 'typeorm';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { Installation } from './installation.entity';
import { Repository as RepoEntity } from './repository.entity';
import { AppConfigService } from './app-config.service';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly appConfig: AppConfigService,
    @InjectRepository(Installation)
    private readonly installations: OrmRepository<Installation>,
    @InjectRepository(RepoEntity)
    private readonly repositories: OrmRepository<RepoEntity>,
  ) {}

  async installUrl(state: string): Promise<string> {
    const cfg = await this.appConfig.resolved();
    if (!cfg?.slug) {
      throw new BadRequestException(
        'GitHub App is not configured yet. Run the manifest setup first.',
      );
    }
    return `https://github.com/apps/${cfg.slug}/installations/new?state=${encodeURIComponent(state)}`;
  }

  async getAppOctokit(): Promise<Octokit> {
    const cfg = await this.appConfig.resolved();
    if (!cfg) {
      throw new BadRequestException('GitHub App is not configured');
    }
    return new Octokit({
      authStrategy: createAppAuth,
      auth: { appId: cfg.appId, privateKey: cfg.privateKey },
    });
  }

  /**
   * Lists all installations of our GitHub App on github.com that are not yet
   * linked to any CollabHub user. Lets a user "claim" an installation they
   * created on github.com without a setup_url redirect.
   */
  async listDiscoverableInstallations(): Promise<
    Array<{
      githubInstallationId: string;
      accountLogin: string;
      accountType: string;
      accountAvatarUrl: string | null;
      createdAt: string;
    }>
  > {
    const app = await this.getAppOctokit();
    const installs = await app.paginate(app.apps.listInstallations, {
      per_page: 100,
    });
    const linkedIds = new Set(
      (await this.installations.find()).map((i) => i.githubInstallationId),
    );
    return (installs as any[])
      .filter((i) => !linkedIds.has(String(i.id)))
      .map((i) => ({
        githubInstallationId: String(i.id),
        accountLogin: i.account?.login ?? i.account?.slug ?? 'unknown',
        accountType: i.account?.type ?? 'Organization',
        accountAvatarUrl: i.account?.avatar_url ?? null,
        createdAt: i.created_at,
      }));
  }

  async installationOctokit(installationId: string | number): Promise<Octokit> {
    const cfg = await this.appConfig.resolved();
    if (!cfg) {
      throw new BadRequestException('GitHub App is not configured');
    }
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: cfg.appId,
        privateKey: cfg.privateKey,
        installationId: Number(installationId),
      },
    });
  }

  /** Called from the frontend after the user finishes the install on github.com. */
  async linkInstallation(
    userId: string,
    githubInstallationId: string,
  ): Promise<Installation> {
    const app = await this.getAppOctokit();
    const { data } = await app.request('GET /app/installations/{installation_id}', {
      installation_id: Number(githubInstallationId),
    });

    // Shared-instance mode: any authenticated user can claim/re-link any
    // installation. userId on the row is kept only as a "linked by" audit field.
    const existing = await this.installations.findOne({
      where: { githubInstallationId: String(data.id) },
    });

    const account = data.account as any;
    const accountLogin = account?.login ?? account?.slug ?? 'unknown';
    const accountType = account?.type ?? 'Organization';
    const avatar = account?.avatar_url ?? null;

    const record =
      existing ??
      this.installations.create({
        githubInstallationId: String(data.id),
        userId,
      });
    record.accountLogin = accountLogin;
    record.accountType = accountType;
    record.accountAvatarUrl = avatar;
    record.userId = userId;
    const saved = await this.installations.save(record);

    await this.syncRepositories(saved);
    return saved;
  }

  // Shared-instance mode: every authenticated user sees every installation
  // and every repo. The `userId` param is preserved on the signatures for
  // when we re-introduce per-team scoping, but is intentionally ignored here.
  async listUserInstallations(_userId: string): Promise<Installation[]> {
    return this.installations.find({ order: { createdAt: 'ASC' } });
  }

  async listUserRepositories(_userId: string): Promise<RepoEntity[]> {
    return this.repositories.find({
      relations: ['installation'],
      order: { fullName: 'ASC' },
    });
  }

  async getRepositoryForUser(
    _userId: string,
    repoId: string,
  ): Promise<RepoEntity> {
    const repo = await this.repositories.findOne({
      where: { id: repoId },
      relations: ['installation'],
    });
    if (!repo) {
      throw new NotFoundException('Repository not found');
    }
    return repo;
  }

  async setRepositoryEnabled(
    userId: string,
    repoId: string,
    enabled: boolean,
  ): Promise<RepoEntity> {
    const repo = await this.getRepositoryForUser(userId, repoId);
    repo.enabled = enabled;
    return this.repositories.save(repo);
  }

  async syncRepositories(installation: Installation): Promise<RepoEntity[]> {
    const octokit = await this.installationOctokit(installation.githubInstallationId);
    const repos = await octokit.paginate(
      octokit.apps.listReposAccessibleToInstallation,
      { per_page: 100 },
    );
    const saved: RepoEntity[] = [];
    for (const r of repos as any[]) {
      let row = await this.repositories.findOne({
        where: { githubRepoId: String(r.id) },
      });
      if (!row) {
        row = this.repositories.create({
          githubRepoId: String(r.id),
          owner: r.owner.login,
          name: r.name,
          fullName: r.full_name,
          private: r.private,
          enabled: true,
          installationId: installation.id,
        });
      } else {
        row.owner = r.owner.login;
        row.name = r.name;
        row.fullName = r.full_name;
        row.private = r.private;
        row.installationId = installation.id;
      }
      saved.push(await this.repositories.save(row));
    }
    this.logger.log(
      `Synced ${saved.length} repositories for installation ${installation.githubInstallationId}`,
    );
    return saved;
  }

  async findRepoByGithubId(githubRepoId: number | string): Promise<RepoEntity | null> {
    return this.repositories.findOne({
      where: { githubRepoId: String(githubRepoId) },
      relations: ['installation'],
    });
  }

  async findInstallationByGithubId(
    githubInstallationId: number | string,
  ): Promise<Installation | null> {
    return this.installations.findOne({
      where: { githubInstallationId: String(githubInstallationId) },
    });
  }

  async fetchPullRequestDetails(
    installationId: string,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<{ pr: any; diff: string }> {
    const octokit = await this.installationOctokit(installationId);
    const [pr, diffResp] = await Promise.all([
      octokit.pulls.get({ owner, repo, pull_number: prNumber }),
      octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
        mediaType: { format: 'diff' },
      }) as unknown as Promise<{ data: string }>,
    ]);
    return { pr: pr.data, diff: typeof diffResp.data === 'string' ? diffResp.data : '' };
  }

  async fetchPullRequestMeta(
    installationId: string,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<any> {
    const octokit = await this.installationOctokit(installationId);
    const { data } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });
    return data;
  }
}
