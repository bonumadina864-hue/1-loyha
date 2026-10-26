import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  OneToMany,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { PairEncryptionKey } from './pair-encryption-key.entity';
import { Message } from './message.entity';

export type PairStatus = 'active' | 'unpaired' | 'blocked';

@Entity('pairs')
@Unique(['userAId', 'userBId'])
export class Pair {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userAId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userAId' })
  userA!: User;

  @Index()
  @Column({ type: 'uuid' })
  userBId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userBId' })
  userB!: User;

  @Column({
    type: 'enum',
    enum: ['active', 'unpaired', 'blocked'],
    default: 'active',
  })
  status!: PairStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  userANickname!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  userBNickname!: string | null;

  @Column({ type: 'bigint', default: 0 })
  messageCount!: number;

  @Index()
  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  lastActivity!: Date;

  @OneToOne(() => PairEncryptionKey, (key) => key.pair)
  encryptionKey?: PairEncryptionKey;

  @OneToMany(() => Message, (message) => message.pair)
  messages?: Message[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
