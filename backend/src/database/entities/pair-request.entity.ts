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

export type RequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'blocked';

@Entity('pair_requests')
export class PairRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  fromUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'fromUserId' })
  fromUser!: User;

  @Index()
  @Column({ type: 'uuid' })
  toUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'toUserId' })
  toUser!: User;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'declined', 'expired', 'blocked'],
    default: 'pending',
  })
  status!: RequestStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  respondedAt!: Date | null;

  @Column({
    type: 'timestamptz',
    default: () => "NOW() + INTERVAL '72 hours'",
  })
  expiresAt!: Date;
}
