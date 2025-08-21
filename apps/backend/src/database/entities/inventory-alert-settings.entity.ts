// path: apps/backend/src/database/entities/inventory-alert-settings.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  Check,
} from 'typeorm';

@Entity('inventory_alert_settings')
@Index('idx_alert_settings_companyid', ['companyId'])
@Unique('uq_alert_settings_company_user', ['companyId', 'userId'])
@Check('chk_alert_settings_low_nonneg', '"lowStockThreshold" >= 0')
@Check('chk_alert_settings_critical_nonneg', '"criticalStockThreshold" >= 0')
@Check('chk_alert_settings_auto_hours_range', '"autoDismissAfterHours" >= 1 AND "autoDismissAfterHours" <= 168')
export class InventoryAlertSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  // Персональные настройки (опционально). Если null — используются настройки компании
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  // Notifications
  @Column({ type: 'boolean', default: true })
  enableEmailNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  enablePushNotifications: boolean;

  @Column({ type: 'text', array: true, default: '{}' })
  emailAddresses: string[];

  // Thresholds
  @Column({ type: 'integer', default: 5 })
  lowStockThreshold: number;

  @Column({ type: 'integer', default: 2 })
  criticalStockThreshold: number;

  @Column({ type: 'integer', default: 5 })
  overstockMultiplier: number;

  // Types/frequency
  @Column({ type: 'text', array: true, default: '{low_stock,out_of_stock,overstock}' })
  enabledAlertTypes: string[];

  @Column({ type: 'varchar', length: 20, default: 'immediate' })
  alertFrequency: 'immediate' | 'hourly' | 'daily';

  // Auto actions
  @Column({ type: 'boolean', default: true })
  autoDismissAfterRestock: boolean;

  @Column({ type: 'integer', default: 72 })
  autoDismissAfterHours: number;

  // Working hours
  @Column({ type: 'varchar', length: 5, nullable: true })
  workingHoursStart: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  workingHoursEnd: string | null;

  @Column({ type: 'smallint', array: true, nullable: true })
  workingDays: number[] | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  timezone: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastNotificationSent: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
