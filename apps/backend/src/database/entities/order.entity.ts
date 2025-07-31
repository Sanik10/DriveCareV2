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
  Index
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
@Index(['orderNumber'], { unique: true })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'uuid' })
  customerId: string;

  @Column({ type: 'uuid' })
  vehicleId: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  orderNumber: string;

  @Column({ 
    type: 'varchar', 
    length: 20,
    enum: OrderStatus,
    default: OrderStatus.NEW
  })
  status: OrderStatus;

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  assignedTo: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  customerComplaints: string;

  @Column({ type: 'text', nullable: true })
  diagnosticResults: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  finalAmount: number;

  @Column({ type: 'integer', nullable: true })
  mileage: number;

  @Column({ type: 'timestamp', nullable: true })
  estimatedCompletionTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualCompletionTime: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // 🔗 TypeORM Relationships
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @ManyToOne(() => Vehicle)
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  createdByUser: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assignedTo' })
  assignedToUser: User;

  @OneToMany(() => OrderService, orderService => orderService.order)
  orderServices: OrderService[];

  @OneToMany(() => OrderPart, orderPart => orderPart.order)
  orderParts: OrderPart[];
}
