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
import { User } from './user.entity';
import { Pair } from './pair.entity';

@Entity('cloud_backups')
@Unique(['userId', 'pairId', 'backupVersion'])
export class CloudBackup {
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

  @Column({ type: 'varchar', length: 500 })
  encryptedBlobUrl!: string;

  @Column({ type: 'bytea' })
  argon2Salt!: Buffer;

  @Column({ type: 'bigint', default: 0 })
  blobSizeBytes!: number;

  @Column({ type: 'int', default: 0 })
  messageCount!: number;

  @Column({ type: 'int', default: 1 })
  backupVersion!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
