// path: apps/backend/src/database/entities/user-invite.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Company } from './company.entity';
import { Role } from './role.entity';
import { User } from './user.entity';

export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

@Entity('user_invite')
export class UserInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 🔐 SECURITY: companyId может быть NULL только для системных ролей.
   * Валидация происходит на уровне бизнес-логики (UsersInvitationsService + RoleHierarchyService).
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  companyId: string | null;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company | null;

  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column({ type: 'uuid' })
  roleId: string;

  @ManyToOne(() => Role, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column({ type: 'uuid', nullable: true })
  invitedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invitedByUserId' })
  invitedByUser?: User;

  /**
   * 🔧 ОБНОВЛЕНО: Размер токена теперь 64 символа (32 байта в hex)
   * Было: 128 символов (64 байта)
   * Стало: 64 символа (32 байта)
   */
  @Column({ type: 'varchar', length: 64, unique: true })
  token: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  @Index()
  status: InviteStatus;

  @Column({ type: 'uuid', nullable: true })
  acceptedByUserId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'acceptedByUserId' })
  acceptedByUser?: User;

  @Column({ type: 'timestamptz', nullable: true })
  acceptedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
