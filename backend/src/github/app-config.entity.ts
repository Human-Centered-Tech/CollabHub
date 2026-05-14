import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('github_app_config')
export class GithubAppConfig {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ name: 'app_id' })
  appId: string;

  @Column()
  slug: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ name: 'client_secret' })
  clientSecret: string;

  @Column({ name: 'webhook_secret' })
  webhookSecret: string;

  @Column({ type: 'text', name: 'private_key' })
  privateKey: string;

  @Column({ name: 'html_url', nullable: true })
  htmlUrl: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export interface ResolvedAppConfig {
  appId: string;
  slug: string;
  clientId: string;
  clientSecret: string;
  webhookSecret: string;
  privateKey: string;
  source: 'env' | 'db';
}
