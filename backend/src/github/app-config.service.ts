import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GithubAppConfig, ResolvedAppConfig } from './app-config.entity';

const SINGLETON_ID = 'singleton';

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);
  private cached: ResolvedAppConfig | null | undefined; // undefined = not loaded yet

  constructor(
    @InjectRepository(GithubAppConfig)
    private readonly repo: Repository<GithubAppConfig>,
    private readonly config: ConfigService,
  ) {}

  async resolved(): Promise<ResolvedAppConfig | null> {
    if (this.cached !== undefined) return this.cached;
    this.cached = await this.load();
    return this.cached;
  }

  /** Force a re-read from env + DB on the next call. */
  invalidate(): void {
    this.cached = undefined;
  }

  async save(values: {
    appId: string | number;
    slug: string;
    clientId: string;
    clientSecret: string;
    webhookSecret: string;
    privateKey: string;
    htmlUrl?: string;
  }): Promise<void> {
    const existing = await this.repo.findOne({ where: { id: SINGLETON_ID } });
    const row = existing ?? this.repo.create({ id: SINGLETON_ID });
    row.appId = String(values.appId);
    row.slug = values.slug;
    row.clientId = values.clientId;
    row.clientSecret = values.clientSecret;
    row.webhookSecret = values.webhookSecret;
    row.privateKey = values.privateKey;
    row.htmlUrl = values.htmlUrl ?? row.htmlUrl;
    await this.repo.save(row);
    this.invalidate();
    this.logger.log(`GitHub App config saved (slug=${values.slug}, id=${values.appId})`);
  }

  private async load(): Promise<ResolvedAppConfig | null> {
    const env = {
      appId: this.config.get<string>('GITHUB_APP_ID'),
      slug: this.config.get<string>('GITHUB_APP_SLUG'),
      clientId: this.config.get<string>('GITHUB_APP_CLIENT_ID'),
      clientSecret: this.config.get<string>('GITHUB_APP_CLIENT_SECRET'),
      webhookSecret: this.config.get<string>('GITHUB_APP_WEBHOOK_SECRET'),
      privateKey: this.config.get<string>('GITHUB_APP_PRIVATE_KEY'),
    };

    const envIsComplete = Object.values(env).every(
      (v) => v && v !== 'REPLACE_ME' && v.length > 0,
    );

    if (envIsComplete) {
      const pk = env.privateKey!.includes('\\n')
        ? env.privateKey!.replace(/\\n/g, '\n')
        : env.privateKey!;
      return {
        appId: env.appId!,
        slug: env.slug!,
        clientId: env.clientId!,
        clientSecret: env.clientSecret!,
        webhookSecret: env.webhookSecret!,
        privateKey: pk,
        source: 'env',
      };
    }

    const row = await this.repo.findOne({ where: { id: SINGLETON_ID } });
    if (!row) return null;
    return {
      appId: row.appId,
      slug: row.slug,
      clientId: row.clientId,
      clientSecret: row.clientSecret,
      webhookSecret: row.webhookSecret,
      privateKey: row.privateKey,
      source: 'db',
    };
  }
}
