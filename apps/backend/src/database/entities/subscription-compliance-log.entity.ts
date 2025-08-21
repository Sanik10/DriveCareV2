// path: apps/backend/src/database/entities/subscription-compliance-log.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Subscription } from './subscription.entity';
import { Company } from './company.entity';
import { User } from './user.entity';

export enum ComplianceType {
  FZ_242 = 'fz242',
  FZ_152 = 'fz152',
  FZ_161 = 'fz161',
  FZ_115 = 'fz115',
  CONSUMER_RIGHTS = 'consumer_rights',
  DATA_PROTECTION = 'data_protection',
}

export enum ComplianceAction {
  GRANTED = 'granted',
  REVOKED = 'revoked',
  CHECKED = 'checked',
  VIOLATED = 'violated',
  REMEDIATED = 'remediated',
  REPORTED = 'reported',
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  VIOLATION = 'violation',
  WARNING = 'warning',
  PENDING = 'pending',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('subscription_compliance_logs')
@Index('idx_comp_logs_company_created', ['companyId', 'createdAt'])
export class SubscriptionComplianceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: false })
  @Index()
  companyId: string;

  @Column({ name: 'subscription_id', type: 'uuid', nullable: true })
  @Index()
  subscriptionId: string | null;

  @Column({
    name: 'compliance_type',
    type: 'enum',
    enum: ComplianceType,
    enumName: 'subscription_compliance_type_enum',
  })
  @Index()
  complianceType: ComplianceType;

  @Column({ name: 'law_reference', type: 'varchar', length: 100, nullable: true })
  lawReference: string | null;

  @Column({
    type: 'enum',
    enum: ComplianceAction,
    enumName: 'subscription_compliance_action_enum',
  })
  action: ComplianceAction;

  @Column({
    type: 'enum',
    enum: ComplianceStatus,
    enumName: 'subscription_compliance_status_enum',
    default: ComplianceStatus.COMPLIANT,
  })
  @Index()
  status: ComplianceStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'violation_details', type: 'jsonb', nullable: true })
  violationDetails: Record<string, any> | null;

  @Column({ name: 'remediation_actions', type: 'jsonb', nullable: true })
  remediationActions: Record<string, any> | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'user_ip_address', type: 'varchar', length: 255, nullable: true })
  userIpAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'server_location', type: 'varchar', length: 10, default: 'RU' })
  serverLocation: string;

  @Column({ name: 'data_processing_location', type: 'varchar', length: 10, default: 'RU' })
  dataProcessingLocation: string;

  @Column({ name: 'compliance_version', type: 'varchar', length: 10, default: '1.0' })
  complianceVersion: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({
    name: 'risk_level',
    type: 'enum',
    enum: RiskLevel,
    enumName: 'subscription_compliance_risk_level_enum',
    default: RiskLevel.LOW,
  })
  @Index()
  riskLevel: RiskLevel;

  @Column({ name: 'requires_notification', type: 'boolean', default: false })
  requiresNotification: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Subscription, { nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;
}
