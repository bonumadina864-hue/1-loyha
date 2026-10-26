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

@Entity('blocks')
@Unique(['blockerId', 'blockedId'])
export class Block {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  blockerId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'blockerId' })
  blocker!: User;

  @Index()
  @Column({ type: 'uuid' })
  blockedId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'blockedId' })
  blocked!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
