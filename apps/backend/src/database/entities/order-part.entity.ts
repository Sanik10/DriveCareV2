// src/database/entities/order-part.entity.ts
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { Order } from './order.entity';
import { Part } from './part.entity';

@Entity('order_parts')
@Index(['orderId'])
@Index(['partId'])
export class OrderPart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ type: 'uuid' })
  partId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'boolean', default: false })
  isCustomerProvided: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // 🔗 TypeORM Relationships
  @ManyToOne(() => Order, order => order.orderParts)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => Part)
  @JoinColumn({ name: 'partId' })
  part: Part;
}
