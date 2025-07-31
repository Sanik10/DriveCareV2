// database/entities/inventory-alert.entity.ts - ПОЛНОЕ ОБНОВЛЕНИЕ
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Part } from './part.entity';

@Entity('inventory_alerts')
export class InventoryAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'uuid' })
  partId: string;

  @ManyToOne(() => Part)
  @JoinColumn({ name: 'part_id' })
  part: Part;

  // 🔥 НОВЫЕ ПОЛЯ для расширенной alerts системы
  @Column({ 
    type: 'varchar', 
    length: 50,
    default: 'low_stock' // Значение по умолчанию для совместимости
  })
  type: 'low_stock' | 'out_of_stock' | 'overstock' | 'expired_reservation';

  @Column({ 
    type: 'varchar', 
    length: 20,
    default: 'medium' // Значение по умолчанию
  })
  priority: 'low' | 'medium' | 'high' | 'critical';

  @Column({ 
    type: 'varchar', 
    length: 200,
    nullable: true // Сделаем nullable для совместимости
  })
  title: string | null;

  @Column({ 
    type: 'text',
    nullable: true // Сделаем nullable для совместимости
  })
  message: string | null;

  @Column({ 
    type: 'integer', 
    nullable: true 
  })
  currentQuantity: number | null;

  @Column({ 
    type: 'integer', 
    nullable: true 
  })
  thresholdQuantity: number | null;

  @Column({ 
    type: 'jsonb', 
    nullable: true 
  })
  metadata: Record<string, any> | null;

  @Column({ 
    type: 'boolean', 
    default: true 
  })
  isActive: boolean;

  @Column({ 
    type: 'boolean', 
    default: false 
  })
  isDismissed: boolean;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    nullable: true 
  })
  dismissedBy: string | null;

  @Column({ 
    type: 'timestamp', 
    nullable: true 
  })
  dismissedAt: Date | null;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    nullable: true 
  })
  triggeredBy: string | null;

  // СУЩЕСТВУЮЩИЕ ПОЛЯ (для обратной совместимости)
  @Column({ type: 'integer', default: 0 })
  minQuantity: number;

  @Column({ type: 'boolean', default: true })
  alertEnabled: boolean;

  @Column({ type: 'simple-array', nullable: true })
  alertEmails: string[] | null;

  @Column({ type: 'boolean', default: false })
  notified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastNotificationDate: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
