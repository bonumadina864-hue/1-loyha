import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Pair } from './pair.entity';
import { User } from './user.entity';
import { MessageReceipt } from './message-receipt.entity';

export type MessageType = 'text' | 'image' | 'voice' | 'file';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  pairId!: string;

  @ManyToOne(() => Pair, (pair) => pair.messages)
  @JoinColumn({ name: 'pairId' })
  pair!: Pair;

  @Index()
  @Column({ type: 'uuid' })
  senderId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderId' })
  sender!: User;

  @Column({
    type: 'enum',
    enum: ['text', 'image', 'voice', 'file'],
    default: 'text',
  })
  messageType!: MessageType;

  @Column({ type: 'bytea' })
  encryptedContent!: Buffer;

  @Column({ type: 'bytea' })
  encryptionIv!: Buffer;

  @Column({ type: 'bytea' })
  encryptionTag!: Buffer;

  @Column({ type: 'bytea', nullable: true })
  encryptedMediaUrl!: Buffer | null;

  @Column({ type: 'uuid', nullable: true })
  replyToId!: string | null;

  @ManyToOne(() => Message, { nullable: true })
  @JoinColumn({ name: 'replyToId' })
  replyTo?: Message;

  @Column({ type: 'boolean', default: false })
  isDeleted!: boolean;

  @OneToMany(() => MessageReceipt, (receipt) => receipt.message)
  receipts?: MessageReceipt[];

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
