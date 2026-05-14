import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { IsBoolean, IsString } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthService } from '../auth/auth.service';
import { GithubService } from './github.service';
import { AppConfigService } from './app-config.service';
import { User } from '../users/user.entity';

class LinkInstallationDto {
  @IsString()
  installationId: string;

  @IsString()
  state: string;
}

class SetEnabledDto {
  @IsBoolean()
  enabled: boolean;
}

@Controller('github')
export class GithubController {
  constructor(
    private readonly github: GithubService,
    private readonly auth: AuthService,
    private readonly appConfig: AppConfigService,
    private readonly config: ConfigService,
  ) {}

  // --- App config / manifest setup (no auth on callback; state-protected) ---

  @UseGuards(JwtAuthGuard)
  @Get('app-status')
  async appStatus() {
    const cfg = await this.appConfig.resolved();
    if (!cfg) {
      return { configured: false };
    }
    return {
      configured: true,
      slug: cfg.slug,
      appId: cfg.appId,
      source: cfg.source,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('manifest')
  manifest(@CurrentUser() user: User) {
    const state = this.auth.signGithubState(user.id);
    const backendUrl = this.requireUrl('BACKEND_URL');
    const frontendUrl = this.requireUrl('FRONTEND_URL');
    const orgSlug = this.config.get<string>('GITHUB_APP_OWNER') ?? '';

    const manifest = {
      name: 'CollabHub',
      url: frontendUrl,
      hook_attributes: {
        url: `${backendUrl}/api/webhooks/github`,
        active: true,
      },
      redirect_url: `${backendUrl}/api/github/manifest-callback`,
      callback_urls: [`${frontendUrl}/github/callback`],
      public: false,
      default_permissions: {
        pull_requests: 'write',
        contents: 'read',
        metadata: 'read',
      },
      default_events: ['pull_request'],
    };

    const postUrl = orgSlug
      ? `https://github.com/organizations/${orgSlug}/settings/apps/new`
      : `https://github.com/settings/apps/new`;

    return {
      postUrl,
      state,
      manifest,
    };
  }

  @Get('manifest-callback')
  async manifestCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontend = this.requireUrl('FRONTEND_URL');
    if (!code || !state) {
      return res.redirect(`${frontend}/connect?setup=error&reason=missing-params`);
    }

    try {
      this.auth.verifyGithubState(state);
    } catch {
      return res.redirect(`${frontend}/connect?setup=error&reason=bad-state`);
    }

    try {
      const oct = new Octokit();
      const resp = await oct.request('POST /app-manifests/{code}/conversions', {
        code,
      });
      const data = resp.data as any;
      await this.appConfig.save({
        appId: data.id,
        slug: data.slug,
        clientId: data.client_id,
        clientSecret: data.client_secret,
        webhookSecret: data.webhook_secret,
        privateKey: data.pem,
        htmlUrl: data.html_url,
      });
      return res.redirect(`${frontend}/connect?setup=success&slug=${encodeURIComponent(data.slug)}`);
    } catch (err: any) {
      return res.redirect(
        `${frontend}/connect?setup=error&reason=${encodeURIComponent(err.message ?? 'exchange-failed')}`,
      );
    }
  }

  // --- Standard install + repo management ---

  @UseGuards(JwtAuthGuard)
  @Get('install-url')
  async installUrl(@CurrentUser() user: User) {
    const state = this.auth.signGithubState(user.id);
    const url = await this.github.installUrl(state);
    return { url, state };
  }

  @UseGuards(JwtAuthGuard)
  @Post('installations/link')
  async link(@CurrentUser() user: User, @Body() dto: LinkInstallationDto) {
    const userIdFromState = this.auth.verifyGithubState(dto.state);
    if (userIdFromState !== user.id) {
      return { ok: false, error: 'state-user-mismatch' };
    }
    const installation = await this.github.linkInstallation(
      user.id,
      dto.installationId,
    );
    return { ok: true, installation };
  }

  @UseGuards(JwtAuthGuard)
  @Get('installations')
  installations(@CurrentUser() user: User) {
    return this.github.listUserInstallations(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('repositories')
  repositories(@CurrentUser() user: User) {
    return this.github.listUserRepositories(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('repositories/:id')
  setEnabled(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: SetEnabledDto,
  ) {
    return this.github.setRepositoryEnabled(user.id, id, dto.enabled);
  }

  private requireUrl(key: string): string {
    const v = this.config.get<string>(key);
    if (!v) {
      throw new Error(`${key} env var must be set`);
    }
    return v.replace(/\/$/, '');
  }
}
