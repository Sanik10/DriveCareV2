// src/database/entities/payment-method.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // 🔥 НОВЫЕ ПОЛЯ для Enterprise функций
  @Column({ type: 'varchar', length: 50, default: 'cash' })
  type: string; // 'cash', 'card', 'bank_transfer', 'installments', 'corporate', etc.

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  processingFeePercent: number; // Комиссия в процентах

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  minAmount: number; // Минимальная сумма

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxAmount: number; // Максимальная сумма

  @Column({ type: 'integer', nullable: true })
  dailyTransactionLimit: number; // Дневной лимит транзакций

  @Column({ type: 'boolean', default: true })
  supportsRefunds: boolean; // Поддерживает ли возвраты

  @Column({ type: 'boolean', default: false })
  requiresVerification: boolean; // Требует ли верификации

  // 🔥 Installments config (JSON fields)
  @Column({ type: 'integer', nullable: true })
  installmentMaxPeriodMonths: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  installmentInterestRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  installmentMinDownPaymentPercent: number;

  // 🔥 Integration config
  @Column({ type: 'varchar', length: 50, nullable: true })
  gatewayType: string; // 'stripe', 'yookassa', 'sberbank', etc.

  @Column({ type: 'varchar', length: 255, nullable: true })
  gatewayApiKey: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  gatewayMerchantId: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  gatewayWebhookUrl: string;

  @Column({ type: 'boolean', default: true })
  gatewayTestMode: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
