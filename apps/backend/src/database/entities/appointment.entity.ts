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
  NO_SHOW = 'no_show',               // Не явился
  RESCHEDULED = 'rescheduled'        // Перенесена
}

export enum AppointmentPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

@Entity('appointments')
@Index(['companyId'])
@Index(['customerId'])
@Index(['mechanicId'])
@Index(['startTime'])
@Index(['status'])
@Index(['isDeleted'])
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

  // Временные параметры
  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp' })
  endTime: Date;

  @Column({ name: 'estimated_duration', type: 'integer' }) // в минутах
  estimatedDuration: number;

  @Column({ name: 'actual_duration', type: 'integer', nullable: true }) // фактическое время
  actualDuration: number;

  // Статус и приоритет
  @Column({ 
    type: 'varchar', 
    length: 20,
    enum: AppointmentStatus,
    default: AppointmentStatus.DRAFT
  })
  status: AppointmentStatus;

  @Column({ 
    name: 'priority',
    type: 'varchar', 
    length: 20,
    enum: AppointmentPriority,
    default: AppointmentPriority.NORMAL
  })
  priority: AppointmentPriority;

  // Услуги (JSON массив serviceId)
  @Column({ name: 'service_ids', type: 'jsonb' })
  serviceIds: string[];

  // Описание и заметки
  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'customer_notes', type: 'text', nullable: true })
  customerNotes: string;

  @Column({ name: 'mechanic_notes', type: 'text', nullable: true })
  mechanicNotes: string;

  // Контактная информация
  @Column({ name: 'contact_phone', type: 'varchar', length: 50, nullable: true })
  contactPhone: string;

  @Column({ name: 'contact_email', type: 'varchar', length: 255, nullable: true })
  contactEmail: string;

  // Уведомления
  @Column({ name: 'reminder_sent', type: 'boolean', default: false })
  reminderSent: boolean;

  @Column({ name: 'confirmation_sent', type: 'boolean', default: false })
  confirmationSent: boolean;

  // Оценка и отзыв
  @Column({ type: 'integer', nullable: true })
  rating: number; // 1-5

  @Column({ type: 'text', nullable: true })
  feedback: string;

  // Финансовые данные
  @Column({ name: 'estimated_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
  estimatedCost: number;

  @Column({ name: 'final_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
  finalCost: number;

  // Мягкое удаление
  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  // Отношения
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Customer, customer => customer.id)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Vehicle, vehicle => vehicle.id)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'mechanic_id' })
  mechanic: User;
}
