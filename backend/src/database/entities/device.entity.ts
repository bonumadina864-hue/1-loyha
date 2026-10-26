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

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.devices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', length: 500, nullable: true })
  deviceToken!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceName!: string | null;

  @Column({ type: 'varchar', length: 10 })
  platform!: 'ios' | 'android';

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  refreshTokenHash!: string | null;

  @Index()
  @Column({ type: 'uuid', default: () => 'gen_random_uuid()' })
  refreshTokenFamily!: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  lastActiveAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
