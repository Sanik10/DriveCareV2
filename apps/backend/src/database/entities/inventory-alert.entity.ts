// path: apps/backend/src/database/entities/inventory-alert.entity.ts
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
import { Part } from './part.entity';

@Entity('inventory_alerts')
@Index('idx_inventory_alerts_companyid', ['companyId'])
@Index('idx_inventory_alerts_partid', ['partId'])
@Index('idx_inventory_alerts_createdat', ['createdAt'])
@Check('chk_alert_current_qty_nonneg', '"currentQuantity" IS NULL OR "currentQuantity" >= 0')
@Check('chk_alert_threshold_qty_nonneg', '"thresholdQuantity" IS NULL OR "thresholdQuantity" >= 0')
export class InventoryAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'uuid', name: 'part_id' })
  partId: string;

  @ManyToOne(() => Part, { eager: false })
  @JoinColumn({ name: 'part_id', referencedColumnName: 'id' })
  part: Part;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'low_stock',
  })
  type: 'low_stock' | 'out_of_stock' | 'overstock' | 'expired_reservation';

  @Column({
    type: 'varchar',
    length: 20,
    default: 'medium',
  })
  priority: 'low' | 'medium' | 'high' | 'critical';

  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'integer', nullable: true })
  currentQuantity: number | null;

  @Column({ type: 'integer', nullable: true })
  thresholdQuantity: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isDismissed: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  dismissedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  dismissedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  triggeredBy: string | null;

  // Legacy-compatible fields
  @Column({ type: 'integer', default: 0 })
  minQuantity: number;

  @Column({ type: 'boolean', default: true })
  alertEnabled: boolean;

  @Column({ type: 'simple-array', nullable: true })
  alertEmails: string[] | null;

  @Column({ type: 'boolean', default: false })
  notified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastNotificationDate: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
