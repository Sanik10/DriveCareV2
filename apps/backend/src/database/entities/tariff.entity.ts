import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('tariffs')
export class Tariff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'price_monthly', type: 'decimal', precision: 10, scale: 2 })
  priceMonthly: number;

  @Column({ name: 'price_yearly', type: 'decimal', precision: 10, scale: 2 })
  priceYearly: number;

  @Column({ name: 'max_users', type: 'integer', nullable: true })
  maxUsers: number;

  @Column({ name: 'max_customers', type: 'integer', nullable: true })
  maxCustomers: number;

  @Column({ name: 'max_vehicles', type: 'integer', nullable: true })
  maxVehicles: number;

  @Column({ name: 'max_orders', type: 'integer', nullable: true })
  maxOrders: number;

  @Column({ type: 'jsonb', nullable: true })
  features: Record<string, any>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}