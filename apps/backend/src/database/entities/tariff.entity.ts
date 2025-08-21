// path: apps/backend/src/database/entities/tariff.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Check,
  Index,
} from 'typeorm';

const decimalToNumber = {
  to: (value: number | null) => value,
  from: (value: string | null): number | null => (value !== null ? Number(value) : null),
};

@Entity('tariffs')
@Check(`"price_monthly" >= 0 AND "price_yearly" >= 0`)
@Check(`"max_users" IS NULL OR "max_users" >= -1`)
@Check(`"max_customers" IS NULL OR "max_customers" >= -1`)
@Check(`"max_vehicles" IS NULL OR "max_vehicles" >= -1`)
@Check(`"max_orders" IS NULL OR "max_orders" >= -1`)
export class Tariff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_tariffs_name')
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    name: 'price_monthly',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalToNumber,
  })
  priceMonthly: number;

  @Column({
    name: 'price_yearly',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalToNumber,
  })
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

  @Index('idx_tariffs_active')
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
