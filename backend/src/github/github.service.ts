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

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly appId: string;
  private readonly privateKey: string;
  private readonly slug: string;
  private appOctokit: Octokit | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Installation)
    private readonly installations: OrmRepository<Installation>,
    @InjectRepository(RepoEntity)
    private readonly repositories: OrmRepository<RepoEntity>,
  ) {
    this.appId = config.get<string>('GITHUB_APP_ID') ?? '';
    this.slug = config.get<string>('GITHUB_APP_SLUG') ?? '';
    // Allow `\n` literal in env values (Railway multi-line is fine, but support both).
    const raw = config.get<string>('GITHUB_APP_PRIVATE_KEY') ?? '';
    this.privateKey = raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
  }

  installUrl(state: string): string {
    if (!this.slug) {
      throw new BadRequestException(
        'GITHUB_APP_SLUG is not configured on the server',
      );
    }
    return `https://github.com/apps/${this.slug}/installations/new?state=${encodeURIComponent(state)}`;
  }

  private getAppOctokit(): Octokit {
    if (!this.appId || !this.privateKey) {
      throw new BadRequestException('GitHub App is not configured');
    }
    if (!this.appOctokit) {
      this.appOctokit = new Octokit({
        authStrategy: createAppAuth,
        auth: { appId: this.appId, privateKey: this.privateKey },
      });
    }
    return this.appOctokit;
  }

  installationOctokit(installationId: string | number): Octokit {
    if (!this.appId || !this.privateKey) {
      throw new BadRequestException('GitHub App is not configured');
    }
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: this.appId,
        privateKey: this.privateKey,
        installationId: Number(installationId),
      },
    });
  }

  /** Called from the frontend after the user finishes the install on github.com. */
  async linkInstallation(
    userId: string,
    githubInstallationId: string,
  ): Promise<Installation> {
    const app = this.getAppOctokit();
    const { data } = await app.request('GET /app/installations/{installation_id}', {
      installation_id: Number(githubInstallationId),
    });

    // If another user already linked this installation, reject.
    const existing = await this.installations.findOne({
      where: { githubInstallationId: String(data.id) },
    });
    if (existing && existing.userId !== userId) {
      throw new BadRequestException(
        'This GitHub installation is already linked to another CollabHub account',
      );
    }

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

    // Eagerly sync the repos accessible to this installation.
    await this.syncRepositories(saved);
    return saved;
  }

  async listUserInstallations(userId: string): Promise<Installation[]> {
    return this.installations.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  async listUserRepositories(userId: string): Promise<RepoEntity[]> {
    const installs = await this.installations.find({ where: { userId } });
    if (installs.length === 0) return [];
    return this.repositories.find({
      where: installs.map((i) => ({ installationId: i.id })),
      relations: ['installation'],
      order: { fullName: 'ASC' },
    });
  }

  async getRepositoryForUser(
    userId: string,
    repoId: string,
  ): Promise<RepoEntity> {
    const repo = await this.repositories.findOne({
      where: { id: repoId },
      relations: ['installation'],
    });
    if (!repo || repo.installation.userId !== userId) {
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
    const octokit = this.installationOctokit(installation.githubInstallationId);
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

  /** Fetch a PR with its diff. Diff is plain text and may be large. */
  async fetchPullRequestDetails(
    installationId: string,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<{ pr: any; diff: string }> {
    const octokit = this.installationOctokit(installationId);
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
}
