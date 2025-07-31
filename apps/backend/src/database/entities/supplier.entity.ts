// src/database/entities/supplier.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contactName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  // 🔥 ДОБАВЛЯЕМ НЕДОСТАЮЩИЕ ПОЛЯ:
  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  taxNumber: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  // 🔥 ДОБАВЛЯЕМ ENUM ПОЛЯ:
  @Column({ 
    type: 'enum', 
    enum: ['manufacturer', 'distributor', 'wholesaler', 'retailer', 'service_provider', 'other'],
    default: 'distributor'
  })
  supplierType: 'manufacturer' | 'distributor' | 'wholesaler' | 'retailer' | 'service_provider' | 'other';

  @Column({ type: 'varchar', length: 200, nullable: true })
  paymentTerms: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  deliveryTerms: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
