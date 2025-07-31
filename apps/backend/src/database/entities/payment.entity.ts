// src/database/entities/payment.entity.ts (ФИНАЛЬНАЯ ВЕРСИЯ)
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Invoice } from './invoice.entity';
import { PaymentMethod } from './payment-method.entity';
import { Company } from './company.entity';

// ✅ ИСПОЛЬЗУЕМ СТАТУСЫ ИЗ TYPES (единый источник истины)
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing', 
  PROCESSED = 'processed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  DISPUTED = 'disputed',
  CHARGEBACK = 'chargeback',
  EXPIRED = 'expired',
}

// ✅ ВАЛЮТЫ
export enum PaymentCurrency {
  RUB = 'RUB',
  USD = 'USD', 
  EUR = 'EUR',
  GBP = 'GBP',
  CNY = 'CNY',
  JPY = 'JPY',
  KZT = 'KZT',
  BYN = 'BYN',
  UAH = 'UAH',
}

@Entity('payments')
@Index(['companyId'])
@Index(['invoiceId'])
@Index(['paymentMethodId'])
@Index(['status'])
@Index(['paymentDate'])
@Index(['currency'])
@Index(['gatewayTransactionId'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'uuid' })
  invoiceId: string;

  @Column({ type: 'uuid' })
  paymentMethodId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'timestamp' })
  paymentDate: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionId: string;

  @Column({
    type: 'varchar',
    length: 30,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  status: PaymentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // ✅ НОВЫЕ ПОЛЯ ДЛЯ МЕЖДУНАРОДНЫХ ОПЕРАЦИЙ
  @Column({ 
    type: 'varchar', 
    length: 3, 
    enum: PaymentCurrency,
    default: PaymentCurrency.RUB 
  })
  currency: PaymentCurrency;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  exchangeRate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  originalAmount: number;

  @Column({ 
    type: 'varchar', 
    length: 3, 
    enum: PaymentCurrency,
    nullable: true 
  })
  originalCurrency: PaymentCurrency;

  // ✅ GATEWAY ИНТЕГРАЦИЯ
  @Column({ type: 'varchar', length: 255, nullable: true })
  gatewayTransactionId: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  gatewayFee: number;

  // ✅ МЕТАДАННЫЕ (JSON)
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // 🔗 TypeORM Relationships
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @ManyToOne(() => Invoice, invoice => invoice.payments)
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @ManyToOne(() => PaymentMethod)
  @JoinColumn({ name: 'paymentMethodId' })
  paymentMethod: PaymentMethod;
}
