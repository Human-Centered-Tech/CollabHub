import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PullRequest } from './pull-request.entity';
import { Summary } from './summary.entity';
import { GithubService } from '../github/github.service';
import { LlmService } from '../llm/llm.service';
import { Repository as RepoEntity } from '../github/repository.entity';

@Injectable()
export class SummariesService {
  private readonly logger = new Logger(SummariesService.name);

  constructor(
    @InjectRepository(PullRequest)
    private readonly prs: Repository<PullRequest>,
    @InjectRepository(Summary)
    private readonly summaries: Repository<Summary>,
    private readonly github: GithubService,
    private readonly llm: LlmService,
  ) {}

  async upsertPullRequestFromWebhook(
    repo: RepoEntity,
    pr: any,
  ): Promise<PullRequest> {
    let row = await this.prs.findOne({
      where: { repositoryId: repo.id, number: pr.number },
    });
    if (!row) {
      row = this.prs.create({
        repositoryId: repo.id,
        number: pr.number,
      });
    }
    row.title = pr.title ?? '';
    row.authorLogin = pr.user?.login ?? 'unknown';
    row.authorAvatarUrl = pr.user?.avatar_url ?? null;
    row.headSha = pr.head?.sha ?? '';
    row.state = pr.state ?? 'open';
    row.htmlUrl = pr.html_url ?? '';
    row.body = pr.body ?? '';
    row.merged = Boolean(pr.merged);
    row.mergedAt = pr.merged_at ? new Date(pr.merged_at) : null;
    return this.prs.save(row);
  }

  /**
   * Creates (or returns) a pending Summary row for the PR's current head sha.
   * The actual LLM call should be made by the caller via `generateWithInstallation`.
   */
  async createPendingSummary(prRow: PullRequest): Promise<Summary> {
    const existing = await this.summaries.findOne({
      where: { pullRequestId: prRow.id, headSha: prRow.headSha, status: 'ready' },
    });
    if (existing) return existing;

    const pending = this.summaries.create({
      pullRequestId: prRow.id,
      headSha: prRow.headSha,
      status: 'pending',
    });
    return this.summaries.save(pending);
  }

  async generateWithInstallation(
    installationGithubId: string,
    repo: RepoEntity,
    prRow: PullRequest,
    summary: Summary,
  ): Promise<Summary> {
    try {
      const { pr, diff } = await this.github.fetchPullRequestDetails(
        installationGithubId,
        repo.owner,
        repo.name,
        prRow.number,
      );

      const payload = await this.llm.summarize({
        repoFullName: repo.fullName,
        prNumber: prRow.number,
        prTitle: pr.title,
        prBody: pr.body ?? '',
        author: pr.user?.login ?? prRow.authorLogin,
        diff,
      });

      summary.overview = payload.overview;
      summary.authorNote = payload.authorNote;
      summary.pros = payload.pros;
      summary.cons = payload.cons;
      summary.watchOuts = payload.watchOuts;
      summary.model = this.llm.modelName();
      summary.status = 'ready';
      summary.errorMessage = null as any;
    } catch (err: any) {
      this.logger.error(
        `Summary failed for ${repo.fullName}#${prRow.number}: ${err.message}`,
      );
      summary.status = 'failed';
      summary.errorMessage = err.message?.slice(0, 1000) ?? 'unknown error';
    }
    return this.summaries.save(summary);
  }

  async listForUserRepo(
    userId: string,
    repoId: string,
  ): Promise<{ pullRequest: PullRequest; summary: Summary | null }[]> {
    const repo = await this.github.getRepositoryForUser(userId, repoId);
    const prs = await this.prs.find({
      where: { repositoryId: repo.id },
      order: { updatedAt: 'DESC' },
      take: 50,
    });
    const rows: { pullRequest: PullRequest; summary: Summary | null }[] = [];
    for (const pr of prs) {
      const summary = await this.summaries.findOne({
        where: { pullRequestId: pr.id },
        order: { createdAt: 'DESC' },
      });
      rows.push({ pullRequest: pr, summary });
    }
    return rows;
  }

  // Shared-instance mode: list across all repos, no per-user filter.
  async listRecentForUser(_userId: string, limit = 20) {
    const prs = await this.prs.find({
      order: { updatedAt: 'DESC' },
      take: limit,
      relations: ['repository'],
    });
    const out: { pullRequest: PullRequest; summary: Summary | null }[] = [];
    for (const pr of prs) {
      const summary = await this.summaries.findOne({
        where: { pullRequestId: pr.id },
        order: { createdAt: 'DESC' },
      });
      out.push({ pullRequest: pr, summary });
    }
    return out;
  }

  async findById(_userId: string, summaryId: string): Promise<Summary> {
    const summary = await this.summaries.findOne({
      where: { id: summaryId },
      relations: ['pullRequest', 'pullRequest.repository', 'pullRequest.repository.installation'],
    });
    if (!summary) throw new NotFoundException('Summary not found');
    return summary;
  }
}
