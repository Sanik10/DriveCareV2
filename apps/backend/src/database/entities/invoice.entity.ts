// path: apps/backend/src/database/entities/invoice.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';
import { Payment } from './payment.entity';
import { Company } from './company.entity';

export enum InvoiceStatus {
  ISSUED = 'issued',
  PAID = 'paid',
  CANCELED = 'canceled',
}

/**
 * 54-ФЗ / 402-ФЗ: статус фискализации счета.
 * Примечание: основная фискализация происходит на уровне платежей (чек ККТ на оплату),
 * но на уровне счета фиксируем агрегированный статус для отчетности/блокировок изменений.
 */
export enum InvoiceFiscalizationStatus {
  NOT_REQUIRED = 'not_required',
  PENDING = 'pending',
  DONE = 'done',
  FAILED = 'failed',
}

@Entity('invoices')
@Index(['companyId'])
@Index(['orderId'])
@Index(['status'])
@Index(['dueDate'])
@Index(['fiscalizationStatus'])
@Index(['companyId', 'invoiceNumber'], { unique: true }) // уникальность номера внутри компании
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ type: 'varchar', length: 50 })
  invoiceNumber: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: InvoiceStatus.ISSUED,
  })
  status: InvoiceStatus;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // 54-ФЗ агрегированный статус фискализации по счету (см. примечание к enum)
  @Column({
    type: 'varchar',
    length: 20,
    default: InvoiceFiscalizationStatus.NOT_REQUIRED,
  })
  fiscalizationStatus: InvoiceFiscalizationStatus;

  // Когда счет считается фискализированным (агрегировано по платежам)
  @Column({ type: 'timestamptz', nullable: true })
  fiscalizedAt: Date | null;

  // Поставщик ОФД (для отчетности)
  @Column({ type: 'varchar', length: 100, nullable: true })
  ofdProvider: string | null;

  // Ссылка на агрегированную страницу чека/ОФД по счету (если применимо)
  @Column({ type: 'varchar', length: 255, nullable: true })
  ofdReceiptUrl: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @OneToMany(() => Payment, (payment) => payment.invoice)
  payments: Payment[];
}
