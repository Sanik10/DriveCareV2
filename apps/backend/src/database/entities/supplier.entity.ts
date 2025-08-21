// path: apps/backend/src/database/entities/supplier.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('suppliers')
@Index('idx_suppliers_companyid', ['companyId'])
@Index('idx_suppliers_isactive', ['isActive'])
@Index('idx_suppliers_company_email_unique', ['companyId', 'email'], {
  unique: true,
  where: '"email" IS NOT NULL',
})
@Index('idx_suppliers_company_taxnumber_unique', ['companyId', 'taxNumber'], {
  unique: true,
  where: '"taxNumber" IS NOT NULL',
})
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

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  taxNumber: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  @Column({
    type: 'enum',
    enum: ['manufacturer', 'distributor', 'wholesaler', 'retailer', 'service_provider', 'other'],
    default: 'distributor',
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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
