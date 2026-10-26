import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Message } from './message.entity';
import { User } from './user.entity';

@Entity('message_receipts')
@Unique(['messageId', 'recipientId'])
export class MessageReceipt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  messageId!: string;

  @ManyToOne(() => Message, (message) => message.receipts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message!: Message;

  @Index()
  @Column({ type: 'uuid' })
  recipientId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipientId' })
  recipient!: User;

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  readSpoofed!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  spoofedReleasedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
