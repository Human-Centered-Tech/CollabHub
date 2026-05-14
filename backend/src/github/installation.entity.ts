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
import { User } from '../users/user.entity';
import { Repository } from './repository.entity';

@Entity('installations')
export class Installation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'github_installation_id', type: 'bigint' })
  githubInstallationId: string;

  @Column({ name: 'account_login' })
  accountLogin: string;

  @Column({ name: 'account_type' })
  accountType: string; // User or Organization

  @Column({ name: 'account_avatar_url', nullable: true })
  accountAvatarUrl: string;

  @ManyToOne(() => User, (u) => u.installations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToMany(() => Repository, (r) => r.installation)
  repositories: Repository[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
