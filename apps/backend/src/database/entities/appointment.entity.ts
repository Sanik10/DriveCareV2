// path: apps/backend/src/database/entities/appointment.entity.ts
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
import { Company } from './company.entity';
import { Customer } from './customer.entity';
import { Vehicle } from './vehicle.entity';
import { User } from './user.entity';

export enum AppointmentStatus {
  DRAFT = 'draft',                    // Черновик
  SCHEDULED = 'scheduled',            // Запланирована
  CONFIRMED = 'confirmed',            // Подтверждена
  IN_PROGRESS = 'in_progress',        // В процессе
  COMPLETED = 'completed',            // Завершена
  CANCELED = 'canceled',              // Отменена
  NO_SHOW = 'no_show',                // Не явился
  RESCHEDULED = 'rescheduled',        // Перенесена
}

export enum AppointmentPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('appointments')
// Индексы (одиночные)
@Index(['companyId'])
@Index(['customerId'])
@Index(['mechanicId'])
@Index(['startTime'])
@Index(['status'])
@Index(['isDeleted'])
// Композитные индексы (рекомендованные)
@Index('idx_appt_company_start', ['companyId', 'startTime'])
@Index('idx_appt_company_mechanic_start', ['companyId', 'mechanicId', 'startTime'])
@Index('idx_appt_company_status_start', ['companyId', 'status', 'startTime'])
// CHECK-ограничения
@Check('chk_appt_time_positive', 'end_time > start_time')
@Check('chk_appt_est_duration', 'estimated_duration >= 0 AND estimated_duration <= 480')
@Check('chk_appt_actual_duration', 'actual_duration IS NULL OR actual_duration >= 0')
@Check('chk_appt_rating', 'rating IS NULL OR (rating >= 1 AND rating <= 5)')
@Check('chk_appt_costs', '(estimated_cost IS NULL OR estimated_cost >= 0) AND (final_cost IS NULL OR final_cost >= 0)')
@Check('chk_appt_service_ids_array', "jsonb_typeof(service_ids) = 'array'")
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @Column({ name: 'mechanic_id', type: 'uuid' })
  mechanicId: string;

  // Временные параметры (timestamptz для инварианта TZ)
  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  @Column({ name: 'estimated_duration', type: 'integer' })
  estimatedDuration: number; // в минутах

  @Column({ name: 'actual_duration', type: 'integer', nullable: true })
  actualDuration: number | null; // фактическое время (мин)

  // Статус и приоритет (enum-типы)
  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    enumName: 'appointment_status_enum',
    default: AppointmentStatus.DRAFT,
  })
  status: AppointmentStatus;

  @Column({
    name: 'priority',
    type: 'enum',
    enum: AppointmentPriority,
    enumName: 'appointment_priority_enum',
    default: AppointmentPriority.NORMAL,
  })
  priority: AppointmentPriority;

  // Услуги (JSON массив serviceId)
  @Column({ name: 'service_ids', type: 'jsonb', default: () => "'[]'::jsonb" })
  serviceIds: string[];

  // Описание и заметки
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'customer_notes', type: 'text', nullable: true })
  customerNotes: string | null;

  @Column({ name: 'mechanic_notes', type: 'text', nullable: true })
  mechanicNotes: string | null;

  // Контактная информация (ПДн)
  @Column({ name: 'contact_phone', type: 'varchar', length: 50, nullable: true })
  contactPhone: string | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 255, nullable: true })
  contactEmail: string | null;

  // Уведомления
  @Column({ name: 'reminder_sent', type: 'boolean', default: false })
  reminderSent: boolean;

  @Column({ name: 'confirmation_sent', type: 'boolean', default: false })
  confirmationSent: boolean;

  // Оценка и отзыв
  @Column({ type: 'integer', nullable: true })
  rating: number | null; // 1-5

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  // Финансовые данные
  @Column({ name: 'estimated_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
  estimatedCost: string | null;

  @Column({ name: 'final_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
  finalCost: string | null;

  // Ретеншн/анонимизация (152‑ФЗ)
  @Column({ name: 'data_retention_until', type: 'timestamptz', nullable: true })
  dataRetentionUntil: Date | null;

  @Column({ name: 'anonymized_at', type: 'timestamptz', nullable: true })
  anonymizedAt: Date | null;

  @Column({ name: 'anonymized_by', type: 'uuid', nullable: true })
  anonymizedBy: string | null;

  // Мягкое удаление
  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Отношения
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Customer, (customer) => customer.id, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.id, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'mechanic_id' })
  mechanic: User;
}

/*
Примечания для миграций (важно):
- Для запрета пересечения слотов по механик_id используйте EXCLUDE-констрейнт (Postgres):
  CREATE EXTENSION IF NOT EXISTS btree_gist;
  ALTER TABLE appointments
    ADD CONSTRAINT ex_appt_no_overlap
    EXCLUDE USING gist (
      mechanic_id WITH =,
      tstzrange(start_time, end_time) WITH &&
    )
    WHERE (is_deleted = false AND status IN ('draft','scheduled','confirmed','in_progress'));

- Для ускорения поиска по service_ids добавьте GIN индекс:
  CREATE INDEX idx_appt_service_ids_gin ON appointments USING GIN (service_ids jsonb_path_ops);
*/
