// path: apps/backend/src/database/entities/user.entity.ts
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Role } from './role.entity';
import { Company } from './company.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true, type: 'uuid', name: 'company_id' })
  company_id: string | null;

  @ManyToOne(() => Company, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'company_id' })
  company: Company | null;

  @Column({ nullable: false, type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ nullable: false, type: 'varchar', length: 255, name: 'password_hash' })
  password_hash: string;

  @Column({ name: 'first_name', nullable: false, type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', nullable: false, type: 'varchar', length: 100 })
  lastName: string;

  @Column({ nullable: true, type: 'varchar', length: 50 })
  phone: string;

  @Column({ name: 'avatar_url', nullable: true, type: 'varchar', length: 255 })
  avatarUrl: string;

  @Column({ nullable: true, type: 'varchar', length: 100 })
  specialization: string;

  @Index()
  @Column({ name: 'is_active', default: true, type: 'boolean' })
  isActive: boolean;

  @Column({ name: 'last_login_at', nullable: true, type: 'timestamptz' })
  lastLoginAt: Date;

  @ManyToOne(() => Role, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Index()
  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  // 2FA
  @Column({ name: 'two_factor_enabled', type: 'boolean', default: false })
  twoFactorEnabled: boolean;

  @Column({ name: 'two_factor_secret', type: 'varchar', length: 255, nullable: true, select: false })
  twoFactorSecret: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
