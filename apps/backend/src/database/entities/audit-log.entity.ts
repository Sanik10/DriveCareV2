// path: apps/backend/src/database/entities/audit-log.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @Column({ name: 'level', type: 'varchar', length: 16, default: 'info' })
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
