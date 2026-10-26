import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Pair } from './pair.entity';

@Entity('pair_encryption_keys')
export class PairEncryptionKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', unique: true })
  pairId!: string;

  @OneToOne(() => Pair, (pair) => pair.encryptionKey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pairId' })
  pair!: Pair;

  @Column({ type: 'bytea' })
  encryptedDek!: Buffer;

  @Column({ type: 'bytea' })
  iv!: Buffer;

  @Column({ type: 'bytea' })
  tag!: Buffer;

  @Column({ type: 'int', default: 1 })
  dekVersion!: number;

  @Column({ type: 'varchar', length: 100 })
  kekId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  rotatedAt!: Date | null;
}
