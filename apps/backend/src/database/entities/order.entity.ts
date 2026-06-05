// src/database/entities/order.entity.ts
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
import { Company } from './company.entity';
import { Customer } from './customer.entity';
import { Vehicle } from './vehicle.entity';
import { User } from './user.entity';
import { OrderService } from './order-service.entity';
import { OrderPart } from './order-part.entity';

export enum OrderStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  AWAITING_PARTS = 'awaiting_parts',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
}

@Entity('orders')
@Index(['companyId'])
@Index(['customerId'])
@Index(['vehicleId'])
@Index(['status'])
@Index(['createdBy'])
@Index(['assignedTo'])
@Index(['companyId', 'orderNumber'], { unique: true }) // уникальность номера внутри компании
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'uuid' })
  customerId: string;

  @Column({ type: 'uuid' })
  vehicleId: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string | null;

  @Column({ type: 'varchar', length: 50 })
  orderNumber: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: OrderStatus.NEW,
    comment: 'Статус заказа (enum как строка)',
  })
  status: OrderStatus;

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  assignedTo: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  customerComplaints: string | null;

  @Column({ type: 'text', nullable: true })
  diagnosticResults: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  finalAmount: number;

  @Column({ type: 'integer', nullable: true })
  mileage: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  estimatedCompletionTime: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  actualCompletionTime: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @ManyToOne(() => Vehicle, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdBy' })
  createdByUser: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedTo' })
  assignedToUser: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updatedBy' })
  updatedByUser: User;

  @OneToMany(() => OrderService, (orderService) => orderService.order)
  orderServices: OrderService[];

  @OneToMany(() => OrderPart, (orderPart) => orderPart.order)
  orderParts: OrderPart[];
}
