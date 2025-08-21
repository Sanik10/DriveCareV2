// path: apps/backend/src/database/entities/subscription.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { Company } from './company.entity';
import { Tariff } from './tariff.entity';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
  INACTIVE = 'inactive',
}

@Entity('subscriptions')
@Index('idx_subscriptions_company_status', ['companyId', 'status'])
@Index('idx_subscriptions_company_end_date', ['companyId', 'endDate'])
@Index('uniq_active_subscription_per_company', ['companyId'], { unique: true, where: "status = 'active'" })
@Check(`"end_date" > "start_date"`)
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  @Index()
  companyId: string;

  @Column({ name: 'tariff_id', type: 'uuid' })
  tariffId: string;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamptz' })
  @Index()
  endDate: Date;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    enumName: 'subscription_status_enum',
    default: SubscriptionStatus.PENDING,
  })
  @Index()
  status: SubscriptionStatus;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod: string;

  @Column({ name: 'auto_renew', type: 'boolean', default: false })
  autoRenew: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Tariff, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tariff_id' })
  tariff: Tariff;
}
