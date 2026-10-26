import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Pair } from './pair.entity';
import { AdminUser } from './admin-user.entity';

export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  reporterId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporterId' })
  reporter!: User;

  @Index()
  @Column({ type: 'uuid' })
  reportedUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reportedUserId' })
  reportedUser!: User;

  @Column({ type: 'uuid', nullable: true })
  pairId!: string | null;

  @ManyToOne(() => Pair, { nullable: true })
  @JoinColumn({ name: 'pairId' })
  pair?: Pair;

  @Column({ type: 'text' })
  reason!: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ['pending', 'reviewed', 'actioned', 'dismissed'],
    default: 'pending',
  })
  status!: ReportStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @ManyToOne(() => AdminUser, { nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer?: AdminUser;

  @Column({ type: 'text', nullable: true })
  reviewNote!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;
}
