// path: apps/backend/src/database/entities/stock-movement.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Part } from './part.entity';
import { Supplier } from './supplier.entity';

export enum StockMovementType {
  RECEIPT = 'receipt',
  ISSUE = 'issue',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
  RESERVATION = 'reservation',
  RELEASE = 'release',
}

export enum StockMovementReason {
  PURCHASE = 'purchase',
  ORDER_FULFILLMENT = 'order_fulfillment',
  INVENTORY_COUNT = 'inventory_count',
  DAMAGE = 'damage',
  EXPIRY = 'expiry',
  LOSS = 'loss',
  CORRECTION = 'correction',
}

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'uuid' })
  partId: string;

  @ManyToOne(() => Part)
  @JoinColumn({ name: 'part_id' })
  part: Part;

  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ type: 'uuid', nullable: true })
  supplierId: string | null;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier | null;

  @Column({ type: 'enum', enum: StockMovementType })
  type: StockMovementType;

  @Column({ type: 'enum', enum: StockMovementReason })
  reason: StockMovementReason;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalAmount: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  documentNumber: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  reversedByMovementId: string | null;

  @Column({ type: 'uuid', nullable: true })
  reversesMovementId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
