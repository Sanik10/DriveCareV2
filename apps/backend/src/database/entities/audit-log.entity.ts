// path: apps/backend/src/database/entities/audit-log.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AuditAction {
  USER_LOGIN = 'user_login',
  USER_LOGIN_FAILED = 'user_login_failed',
  USER_LOGIN_BLOCKED = 'user_login_blocked',
  USER_LOGOUT = 'user_logout',
  USER_REGISTERED = 'user_registered',
  USER_TOKEN_REFRESH = 'user_token_refresh',
  USER_TOKEN_REFRESH_FAILED = 'user_token_refresh_failed',
  USER_DEVICE_LOGOUT = 'user_device_logout',
  USER_ALL_DEVICES_LOGOUT = 'user_all_devices_logout',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_ACTIVATED = 'user_activated',
  USER_DEACTIVATED = 'user_deactivated',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  ACCESS_DENIED = 'access_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  API_ERROR = 'api_error',
}

export enum AuditLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

@Entity('audit_logs')
@Index('idx_audit_company_created_at', ['companyId', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ name: 'action', type: 'varchar', length: 150 })
  action: string;

  @Column({ name: 'level', type: 'varchar', length: 16, default: AuditLevel.INFO })
  level: 'info' | 'warning' | 'error' | 'critical';

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'resource_id', type: 'varchar', length: 150, nullable: true })
  resourceId: string | null;

  @Column({ name: 'resource_type', type: 'varchar', length: 150, nullable: true })
  resourceType: string | null;

  @Column({ name: 'details', type: 'jsonb', nullable: true })
  details: Record<string, any> | null;

  @Column({ name: 'status', type: 'varchar', length: 32, default: 'success' })
  status: string;

  @Column({ name: 'service', type: 'varchar', length: 64, nullable: true })
  service: string | null;

  @Column({ name: 'device_id', type: 'varchar', length: 150, nullable: true })
  deviceId: string | null;

  // Tamper-evident chain
  @Column({ name: 'chain_prev', type: 'varchar', length: 128, nullable: true })
  chainPrev: string | null;

  @Index('uq_audit_chain_curr', { unique: true })
  @Column({ name: 'chain_curr', type: 'varchar', length: 128 })
  chainCurr: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
