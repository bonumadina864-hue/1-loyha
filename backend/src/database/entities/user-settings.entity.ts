import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_settings')
export class UserSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, (user) => user.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'boolean', default: true })
  biometricEnabled!: boolean;

  @Column({ type: 'boolean', default: false })
  biometricFallbackDeviceCred!: boolean;

  @Column({ type: 'boolean', default: false })
  purgeEnabled!: boolean;

  @Column({ type: 'int', default: 5 })
  purgeMaxAttempts!: number;

  @Column({ type: 'int', default: 0 })
  autoLockTimerSeconds!: number;

  @Column({ type: 'varchar', length: 20, default: 'generic' })
  notificationStyle!: 'generic' | 'silent';

  @Column({ type: 'boolean', default: false })
  readSpoofingEnabled!: boolean;

  @Column({ type: 'boolean', default: false })
  screenshotBlockingEnabled!: boolean;

  @Column({ type: 'boolean', default: false })
  intruderAlertEnabled!: boolean;

  @Column({ type: 'varchar', length: 5, default: 'en' })
  language!: 'en' | 'uz' | 'ru';

  @Column({ type: 'varchar', length: 10, default: 'dark' })
  theme!: 'dark' | 'light' | 'system';

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
