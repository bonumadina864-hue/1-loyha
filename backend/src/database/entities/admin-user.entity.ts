import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type AdminRole = 'SUPER_ADMIN' | 'SUPPORT';

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 255 })
  fullName!: string;

  @Column({
    type: 'enum',
    enum: ['SUPER_ADMIN', 'SUPPORT'],
    default: 'SUPPORT',
  })
  role!: AdminRole;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  totpSecretEnc!: string | null;

  @Column({ type: 'boolean', default: false })
  totpEnabled!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
