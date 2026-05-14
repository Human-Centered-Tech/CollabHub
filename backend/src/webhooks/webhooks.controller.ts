import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import type { Request } from 'express';
import { GithubService } from '../github/github.service';
import { AppConfigService } from '../github/app-config.service';
import { SummariesService } from '../summaries/summaries.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly github: GithubService,
    private readonly appConfig: AppConfigService,
    private readonly summaries: SummariesService,
  ) {}

  @Post('github')
  @HttpCode(200)
  async github_webhook(
    @Req() req: Request,
    @Headers('x-github-event') event: string,
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-delivery') delivery: string,
  ) {
    const raw: Buffer = (req as any).body;
    if (!Buffer.isBuffer(raw)) {
      throw new BadRequestException('Expected raw body buffer');
    }

    const cfg = await this.appConfig.resolved();
    if (!cfg?.webhookSecret) {
      this.logger.error('GitHub App webhook secret is not configured');
      throw new UnauthorizedException('Webhooks not configured');
    }
    if (!this.verifySignature(raw, signature, cfg.webhookSecret)) {
      throw new UnauthorizedException('Invalid signature');
    }

    let payload: any;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid JSON payload');
    }

    this.logger.log(`GitHub event ${event} (${delivery})`);

    if (event === 'ping') {
      return { ok: true, pong: true };
    }

    if (event === 'installation' || event === 'installation_repositories') {
      // Best-effort: refresh repo list. If we don't know the installation yet, ignore.
      const installationId = payload?.installation?.id;
      if (installationId) {
        const install = await this.github.findInstallationByGithubId(installationId);
        if (install) {
          await this.github.syncRepositories(install);
        }
      }
      return { ok: true };
    }

    if (event === 'pull_request') {
      const action = payload.action;
      if (!['opened', 'synchronize', 'reopened', 'ready_for_review'].includes(action)) {
        return { ok: true, skipped: action };
      }
      const repoId = payload.repository?.id;
      const installationId = payload.installation?.id;
      const pr = payload.pull_request;
      if (!repoId || !installationId || !pr) {
        return { ok: false, error: 'missing-fields' };
      }
      if (pr.draft && action === 'opened') {
        return { ok: true, skipped: 'draft' };
      }
      const repo = await this.github.findRepoByGithubId(repoId);
      if (!repo) {
        this.logger.warn(`Webhook for unknown repo ${repoId}; ignoring`);
        return { ok: true, skipped: 'unknown-repo' };
      }
      if (!repo.enabled) {
        return { ok: true, skipped: 'disabled' };
      }

      const prRow = await this.summaries.upsertPullRequestFromWebhook(repo, pr);
      const summary = await this.summaries.createPendingSummary(prRow);

      // Fire-and-forget: webhooks must return within ~10s, so do LLM work async.
      if (summary.status === 'pending') {
        this.summaries
          .generateWithInstallation(String(installationId), repo, prRow, summary)
          .catch((err) =>
            this.logger.error(`Background summary failed: ${err.message}`),
          );
      }

      return { ok: true, queued: true, summaryId: summary.id };
    }

    return { ok: true, ignored: event };
  }

  private verifySignature(raw: Buffer, signature: string | undefined, secret: string): boolean {
    if (!signature) return false;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(raw);
    const expected = `sha256=${hmac.digest('hex')}`;
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected),
      );
    } catch {
      return false;
    }
  }
}
