// src/database/entities/payment.entity.ts
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';
import { PaymentMethod } from './payment-method.entity';
import { Company } from './company.entity';
import { PaymentCurrency, PaymentStatus } from '../../modules/payments/types/payments.types';

@Entity('payments')
@Index(['companyId'])
@Index(['invoiceId'])
@Index(['paymentMethodId'])
@Index(['status'])
@Index(['paymentDate'])
@Index(['currency'])
@Index(['transactionId'])
@Index(['gatewayTransactionId'])
@Index(['fiscalReceiptNumber'])
@Index(['companyId', 'status'])
@Index(['companyId', 'paymentDate'])
@Index(['companyId', 'currency'])
@Index(['companyId', 'status', 'paymentDate'])
@Index(['paymentDate', 'status'], { where: 'deleted_at IS NULL' })
@Check('payment_amount_positive', 'amount > 0')
@Check('payment_exchange_rate_positive', 'exchange_rate IS NULL OR exchange_rate > 0')
@Check('payment_gateway_fee_non_negative', 'gateway_fee IS NULL OR gateway_fee >= 0')
@Check('payment_original_amount_positive', 'original_amount IS NULL OR original_amount > 0')
@Check('payment_vat_amount_non_negative', 'vat_amount IS NULL OR vat_amount >= 0')
@Check('payment_date_not_future', 'payment_date <= CURRENT_TIMESTAMP')
@Check('payment_receipt_date_not_future', 'fiscal_receipt_date IS NULL OR fiscal_receipt_date <= CURRENT_TIMESTAMP')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid', comment: 'ID компании (multi-tenant)' })
  companyId: string;

  @Column({ name: 'invoice_id', type: 'uuid', comment: 'ID счёта на оплату' })
  invoiceId: string;

  @Column({ name: 'payment_method_id', type: 'uuid', comment: 'ID способа оплаты' })
  paymentMethodId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, comment: 'Сумма платежа' })
  amount: number;

  @Column({ name: 'payment_date', type: 'timestamptz', comment: 'Дата и время платежа' })
  paymentDate: Date;

  @Column({ name: 'transaction_id', type: 'varchar', length: 100, nullable: true })
  transactionId: string | null;

  @Column({ type: 'varchar', length: 30, comment: 'Статус платежа' })
  status: PaymentStatus;

  @Column({ type: 'text', nullable: true, comment: 'Примечания к платежу (может содержать ПДн)' })
  notes: string | null;

  @Column({ type: 'varchar', length: 3, default: 'RUB', comment: 'Валюта (ISO 4217)' })
  currency: PaymentCurrency;

  // FX
  @Column({ name: 'exchange_rate', type: 'decimal', precision: 12, scale: 6, nullable: true })
  exchangeRate: number | null;

  @Column({ name: 'original_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  originalAmount: number | null;

  @Column({ name: 'original_currency', type: 'varchar', length: 3, nullable: true })
  originalCurrency: PaymentCurrency | null;

  // Gateway
  @Column({ name: 'gateway_transaction_id', type: 'varchar', length: 255, nullable: true })
  gatewayTransactionId: string | null;

  @Column({ name: 'gateway_fee', type: 'decimal', precision: 10, scale: 2, nullable: true })
  gatewayFee: number | null;

  @Column({ name: 'gateway_status', type: 'varchar', length: 50, nullable: true })
  gatewayStatus: string | null;

  @Column({ name: 'masked_card_number', type: 'varchar', length: 20, nullable: true })
  maskedCardNumber: string | null;

  @Column({ name: 'card_brand', type: 'varchar', length: 50, nullable: true })
  cardBrand: string | null;

  // 54-ФЗ
  @Column({ name: 'vat_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  vatRate: number | null;

  @Column({ name: 'vat_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  vatAmount: number | null;

  @Column({ name: 'fiscal_receipt_number', type: 'varchar', length: 50, nullable: true })
  fiscalReceiptNumber: string | null;

  @Column({ name: 'fiscal_receipt_date', type: 'timestamptz', nullable: true })
  fiscalReceiptDate: Date | null;

  @Column({ name: 'kkt_serial_number', type: 'varchar', length: 50, nullable: true })
  kktSerialNumber: string | null;

  @Column({ name: 'fiscal_document_number', type: 'varchar', length: 50, nullable: true })
  fiscalDocumentNumber: string | null;

  @Column({ name: 'fiscal_document_attribute', type: 'varchar', length: 50, nullable: true })
  fiscalDocumentAttribute: string | null;

  // Фискальный возврат
  @Column({ name: 'fiscal_refund_receipt_number', type: 'varchar', length: 50, nullable: true })
  fiscalRefundReceiptNumber: string | null;

  @Column({ name: 'fiscal_refund_date', type: 'timestamptz', nullable: true })
  fiscalRefundDate: Date | null;

  // 152-ФЗ
  @Column({ name: 'pdp_consent_version', type: 'varchar', length: 50, nullable: true })
  pdpConsentVersion: string | null;

  @Column({ name: 'pdp_consent_date', type: 'timestamptz', nullable: true })
  pdpConsentDate: Date | null;

  @Column({ name: 'data_retention_until', type: 'timestamptz', nullable: true })
  dataRetentionUntil: Date | null;

  @Column({ name: 'pii_anonymized', type: 'boolean', default: false })
  piiAnonymized: boolean;

  @Column({ name: 'safe_metadata', type: 'jsonb', nullable: true })
  safeMetadata: Record<string, any> | null;

  // Soft delete / versioning / audit
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'version', type: 'integer', default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Invoice, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @ManyToOne(() => PaymentMethod, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod: PaymentMethod;
}
