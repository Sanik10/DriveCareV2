// path: apps/backend/src/database/entities/schedule-exception.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';

export enum ExceptionType {
  VACATION = 'vacation',
  SICK_LEAVE = 'sick_leave',
  HOLIDAY = 'holiday',
  TRAINING = 'training',
  OVERTIME = 'overtime',
  PERSONAL = 'personal',
}

export enum ExceptionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('schedule_exceptions')
@Index('idx_se_company_user', ['companyId', 'userId'])
@Index('idx_se_company_status', ['companyId', 'status'])
@Index('idx_se_company_start_end', ['companyId', 'startDate', 'endDate'])
@Check('chk_se_date_range', '("endDate" >= "startDate")')
@Check(
  'chk_se_partial_time_valid',
  '("isFullDay" = true) OR ("startTime" IS NOT NULL AND "endTime" IS NOT NULL AND "endTime" > "startTime")',
)
export class ScheduleException {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: ExceptionType,
  })
  type: ExceptionType;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'boolean', default: true })
  isFullDay: boolean;

  @Column({ type: 'time', nullable: true })
  startTime: string | null;

  @Column({ type: 'time', nullable: true })
  endTime: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({
    type: 'enum',
    enum: ExceptionStatus,
    default: ExceptionStatus.PENDING,
  })
  status: ExceptionStatus;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  // Список ID затронутых записей (jsonb) — удобно для последующей аналитики
  @Column({ type: 'jsonb', nullable: false, default: () => `('[]')::jsonb` })
  affectedAppointments: string[];

  @Column({ type: 'jsonb', nullable: true })
  coverageAnalysis: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
