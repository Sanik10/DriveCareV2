// path: apps/backend/src/database/entities/payment-method.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import * as crypto from 'crypto';

const decimalToNumber = {
  to: (value: number | null) => value,
  from: (value: string | null): number | null => (value !== null ? Number(value) : null),
};

function getEncKey(): Buffer | null {
  const k = process.env.PM_ENC_KEY || '';
  if (!k) return null;
  try {
    // Ожидаем base64 32 байта
    const buf = Buffer.from(k, 'base64');
    return buf.length === 32 ? buf : null;
  } catch {
    return null;
  }
}

function seal(plaintext: string): string {
  if (plaintext == null) return plaintext as any;
  const key = getEncKey();
  if (!key) return plaintext; // dev fallback; в prod ключ обязателен
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

function open(ciphertext: string): string {
  if (ciphertext == null) return ciphertext as any;
  if (!ciphertext.startsWith('v1:')) return ciphertext; // нешифрованное значение (dev)
  const key = getEncKey();
  if (!key) return ''; // нет ключа — безопасно вернуть пусто
  const [, ivHex, tagHex, dataHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}

const encryptedTransformer = { to: seal, from: open };

export enum PaymentMethodTypeEnum {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  INSTALLMENTS = 'installments',
  CORPORATE = 'corporate',
  DIGITAL_WALLET = 'digital_wallet',
  CRYPTOCURRENCY = 'cryptocurrency',
}

@Entity('payment_methods')
@Index('idx_pm_company', ['companyId'])
@Index('idx_pm_company_type', ['companyId', 'type'])
@Index('idx_pm_company_active', ['companyId', 'isActive'])
@Index('uniq_pm_company_name', ['companyId', 'name'], { unique: true })
@Index('uniq_pm_company_gateway_merchant', ['companyId', 'gatewayType', 'gatewayMerchantId'], {
  unique: true,
  where: 'gateway_type IS NOT NULL AND gateway_merchant_id IS NOT NULL',
})
@Check(`(processing_fee_percent IS NULL OR (processing_fee_percent >= 0 AND processing_fee_percent <= 10))`)
@Check(`(min_amount IS NULL OR min_amount >= 0.01)`)
@Check(`(max_amount IS NULL OR max_amount >= 0.01)`)
@Check(`(min_amount IS NULL OR max_amount IS NULL OR max_amount >= min_amount)`)
@Check(`(daily_transaction_limit IS NULL OR daily_transaction_limit >= 0)`)
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: PaymentMethodTypeEnum,
    enumName: 'payment_method_type_enum',
    default: PaymentMethodTypeEnum.CASH,
  })
  type: PaymentMethodTypeEnum;

  @Column({ name: 'processing_fee_percent', type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: decimalToNumber })
  processingFeePercent: number | null;

  @Column({ name: 'min_amount', type: 'decimal', precision: 12, scale: 2, nullable: true, transformer: decimalToNumber })
  minAmount: number | null;

  @Column({ name: 'max_amount', type: 'decimal', precision: 12, scale: 2, nullable: true, transformer: decimalToNumber })
  maxAmount: number | null;

  @Column({ name: 'daily_transaction_limit', type: 'integer', nullable: true })
  dailyTransactionLimit: number | null;

  @Column({ name: 'supports_refunds', type: 'boolean', default: true })
  supportsRefunds: boolean;

  @Column({ name: 'requires_verification', type: 'boolean', default: false })
  requiresVerification: boolean;

  // Installments
  @Column({ name: 'installment_max_period_months', type: 'integer', nullable: true })
  installmentMaxPeriodMonths: number | null;

  @Column({ name: 'installment_interest_rate', type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: decimalToNumber })
  installmentInterestRate: number | null;

  @Column({ name: 'installment_min_down_payment_percent', type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: decimalToNumber })
  installmentMinDownPaymentPercent: number | null;

  // Integration config (apiKey зашифрован)
  @Column({ name: 'gateway_type', type: 'varchar', length: 50, nullable: true })
  gatewayType: string | null;

  @Column({ name: 'gateway_api_key', type: 'text', nullable: true, transformer: encryptedTransformer })
  gatewayApiKey: string | null;

  @Column({ name: 'gateway_merchant_id', type: 'varchar', length: 255, nullable: true })
  gatewayMerchantId: string | null;

  @Column({ name: 'gateway_webhook_url', type: 'varchar', length: 500, nullable: true })
  gatewayWebhookUrl: string | null;

  @Column({ name: 'gateway_test_mode', type: 'boolean', default: true })
  gatewayTestMode: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
