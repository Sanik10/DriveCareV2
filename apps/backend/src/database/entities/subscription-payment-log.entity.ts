// path: apps/backend/src/database/entities/subscription-payment-log.entity.ts
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

export enum SubscriptionPaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentMethodType {
  CARD = 'card',
  MIR = 'mir',
  SBP = 'sbp',
  WALLET = 'wallet',
  BANK_TRANSFER = 'bank_transfer',
}

@Entity('subscription_payment_logs')
@Index('uniq_gateway_tx', ['gatewayType', 'gatewayTransactionId'], { unique: true })
export class SubscriptionPaymentLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subscription_id', type: 'uuid', nullable: true })
  @Index()
  subscriptionId: string | null;

  @Column({ name: 'company_id', type: 'uuid' })
  @Index()
  companyId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @Index()
  amount: string; // decimal как строка

  @Column({ type: 'varchar', length: 3, default: 'RUB' })
  currency: string;

  @Column({
    type: 'enum',
    enum: SubscriptionPaymentStatus,
    enumName: 'subscription_payment_status_enum',
    default: SubscriptionPaymentStatus.PENDING,
  })
  @Index()
  status: SubscriptionPaymentStatus;

  // Gateway
  @Column({ name: 'gateway_type', type: 'varchar', length: 50, nullable: true })
  gatewayType: string | null;

  @Column({ name: 'gateway_transaction_id', type: 'varchar', length: 255, nullable: true })
  gatewayTransactionId: string | null;

  @Column({ name: 'gateway_response', type: 'jsonb', nullable: true })
  gatewayResponse: Record<string, any> | null;

  // ФЗ-161 — НПС
  @Column({ name: 'mir_card_used', type: 'boolean', default: false })
  @Index()
  mirCardUsed: boolean;

  @Column({
    name: 'payment_method_type',
    type: 'enum',
    enum: PaymentMethodType,
    enumName: 'subscription_payment_method_type_enum',
    nullable: true,
  })
  paymentMethodType: PaymentMethodType | null;

  @Column({ name: 'payment_system_compliance', type: 'jsonb', nullable: true })
  paymentSystemCompliance: Record<string, any> | null;

  // ФЗ-115 — AML
  @Column({ name: 'aml_check_status', type: 'varchar', length: 20, default: 'pending' })
  amlCheckStatus: string;

  @Column({ name: 'aml_risk_score', type: 'integer', default: 0 })
  @Index()
  amlRiskScore: number;

  @Column({ name: 'suspicious_activity_reported', type: 'boolean', default: false })
  @Index()
  suspiciousActivityReported: boolean;

  // Audit fields
  @Column({ name: 'user_ip_address', type: 'varchar', length: 255, nullable: true })
  userIpAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'processing_location', type: 'varchar', length: 10, default: 'RU' })
  processingLocation: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt: Date;

  @ManyToOne(() => Subscription, { nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription | null;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
