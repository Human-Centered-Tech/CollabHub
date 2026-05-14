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
import { Repository } from '../github/repository.entity';
import { Summary } from './summary.entity';

@Entity('pull_requests')
@Index(['repositoryId', 'number'], { unique: true })
export class PullRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Repository, (r) => r.pullRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'repository_id' })
  repository: Repository;

  @Column({ name: 'repository_id', type: 'uuid' })
  repositoryId: string;

  @Column()
  number: number;

  @Column()
  title: string;

  @Column({ name: 'author_login' })
  authorLogin: string;

  @Column({ name: 'author_avatar_url', nullable: true })
  authorAvatarUrl: string;

  @Column({ name: 'head_sha' })
  headSha: string;

  @Column()
  state: string;

  @Column({ name: 'html_url' })
  htmlUrl: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ default: false })
  merged: boolean;

  @Column({ name: 'merged_at', type: 'timestamp', nullable: true })
  mergedAt: Date | null;

  @OneToMany(() => Summary, (s) => s.pullRequest)
  summaries: Summary[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
