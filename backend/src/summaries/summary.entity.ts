import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PullRequest } from './pull-request.entity';

export type SummaryStatus = 'pending' | 'ready' | 'failed';

@Entity('summaries')
export class Summary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PullRequest, (p) => p.summaries, { onDelete: 'CASCADE' })
  pullRequest: PullRequest;

  @Index()
  @Column({ name: 'pull_request_id' })
  pullRequestId: string;

  @Column({ name: 'head_sha' })
  headSha: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: SummaryStatus;

  @Column({ type: 'text', nullable: true })
  overview: string;

  @Column({ type: 'jsonb', nullable: true })
  pros: string[];

  @Column({ type: 'jsonb', nullable: true })
  cons: string[];

  @Column({ type: 'jsonb', name: 'watch_outs', nullable: true })
  watchOuts: string[];

  @Column({ type: 'text', nullable: true, name: 'author_note' })
  authorNote: string;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string;

  @Column({ nullable: true })
  model: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
