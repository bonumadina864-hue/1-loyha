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

export type TicketStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'expired';

export interface RestoreProgress {
  total: number;
  delivered: number;
  lastMessageId: string | null;
}

@Entity('restoration_tickets')
export class RestorationTicket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Index()
  @Column({ type: 'uuid' })
  pairId!: string;

  @ManyToOne(() => Pair)
  @JoinColumn({ name: 'pairId' })
  pair!: Pair;

  @Index()
  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'completed', 'expired'],
    default: 'pending',
  })
  status!: TicketStatus;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'timestamptz', nullable: true })
  timeRangeStart!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  timeRangeEnd!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @ManyToOne(() => AdminUser, { nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer?: AdminUser;

  @Column({ type: 'uuid', nullable: true })
  secondApproverId!: string | null;

  @ManyToOne(() => AdminUser, { nullable: true })
  @JoinColumn({ name: 'secondApproverId' })
  secondApprover?: AdminUser;

  @Column({ type: 'text', nullable: true })
  reviewNote!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  restoredAt!: Date | null;

  @Column({
    type: 'jsonb',
    default: () => '\'{"total": 0, "delivered": 0, "lastMessageId": null}\'',
  })
  restoreProgress!: RestoreProgress;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
