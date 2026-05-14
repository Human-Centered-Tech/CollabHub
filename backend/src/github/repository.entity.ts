import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Installation } from './installation.entity';
import { PullRequest } from '../summaries/pull-request.entity';

@Entity('repositories')
@Index(['githubRepoId'], { unique: true })
export class Repository {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'github_repo_id', type: 'bigint' })
  githubRepoId: string;

  @Column()
  owner: string;

  @Column()
  name: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ default: false, name: 'private' })
  private: boolean;

  @Column({ default: true })
  enabled: boolean;

  @ManyToOne(() => Installation, (i) => i.repositories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'installation_id' })
  installation: Installation;

  @Index()
  @Column({ name: 'installation_id', type: 'uuid' })
  installationId: string;

  @OneToMany(() => PullRequest, (p) => p.repository)
  pullRequests: PullRequest[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
