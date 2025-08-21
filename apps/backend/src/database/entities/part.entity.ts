// path: apps/backend/src/database/entities/part.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { PartCategory } from './part-category.entity';

@Entity('parts')
@Check('chk_parts_costprice_nonneg', '"costPrice" >= 0')
@Check('chk_parts_sellingprice_nonneg', '"sellingPrice" >= 0')
@Index('idx_parts_companyid', ['companyId'])
@Index('idx_parts_categoryid', ['categoryId'])
@Index('idx_parts_createdat', ['createdAt'])
@Index('idx_parts_company_partnumber_unique', ['companyId', 'partNumber'], {
  unique: true,
  where: '"partNumber" IS NOT NULL',
})
export class Part {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => PartCategory)
  @JoinColumn({ name: 'category_id' })
  category: PartCategory;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  partNumber: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  costPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sellingPrice: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
