// path: apps/backend/src/database/entities/subscription-consent.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Subscription } from './subscription.entity';
import { Company } from './company.entity';
import { User } from './user.entity';

export enum ConsentType {
  PDN_PROCESSING = 'pdn_processing',
  PDN_STORAGE = 'pdn_storage',
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  THIRD_PARTY_SHARING = 'third_party_sharing',
}

export enum ConsentStatus {
  GRANTED = 'granted',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

@Entity('subscription_consents')
@Index('uniq_active_consent_per_type', ['subscriptionId', 'consentType'], {
  unique: true,
  where: "status = 'granted'",
})
export class SubscriptionConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subscription_id', type: 'uuid' })
  @Index()
  subscriptionId: string;

  @Column({ name: 'company_id', type: 'uuid' })
  @Index()
  companyId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({
    name: 'consent_type',
    type: 'enum',
    enum: ConsentType,
    enumName: 'subscription_consent_type_enum',
  })
  @Index()
  consentType: ConsentType;

  @Column({
    type: 'enum',
    enum: ConsentStatus,
    enumName: 'subscription_consent_status_enum',
    default: ConsentStatus.PENDING,
  })
  @Index()
  status: ConsentStatus;

  // Рекомендуем хранить хэш текста/политики, а не весь текст
  @Column({ name: 'consent_text', type: 'text', nullable: true })
  consentText: string | null;

  @Column({ name: 'consent_text_hash', type: 'varchar', length: 64, nullable: true })
  consentTextHash: string | null;

  @Column({ name: 'policy_version', type: 'varchar', length: 20, nullable: true })
  policyVersion: string | null;

  @Column({ name: 'data_categories', type: 'jsonb' })
  dataCategories: string[];

  @Column({ name: 'processing_purposes', type: 'jsonb' })
  processingPurposes: string[];

  @Column({ name: 'retention_period_days', type: 'integer' })
  retentionPeriodDays: number;

  @Column({ name: 'granted_at', type: 'timestamptz', nullable: true })
  grantedAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 255 })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'consent_method', type: 'varchar', length: 50 })
  consentMethod: string;

  @Column({ name: 'legal_basis', type: 'varchar', length: 100 })
  legalBasis: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Subscription)
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;
}
