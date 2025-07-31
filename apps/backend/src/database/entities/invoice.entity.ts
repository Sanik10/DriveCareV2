// src/database/entities/invoice.entity.ts (ДОПОЛНЕННАЯ ВЕРСИЯ)
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { Order } from './order.entity';
import { Payment } from './payment.entity';
import { Company } from './company.entity';

export enum InvoiceStatus {
  ISSUED = 'issued',
  PAID = 'paid',
  CANCELED = 'canceled',
}

@Entity('invoices')
@Index(['companyId'])
@Index(['orderId'])
@Index(['status'])
@Index(['dueDate'])
@Index(['invoiceNumber'], { unique: true })
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
    enum: InvoiceStatus,
    default: InvoiceStatus.ISSUED
  })
  status: InvoiceStatus;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // 🔗 TypeORM Relationships
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @OneToMany(() => Payment, payment => payment.invoice)
  payments: Payment[];
}
