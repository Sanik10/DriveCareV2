// path: apps/backend/src/database/entities/work-schedule.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
  Check,
} from 'typeorm';

@Entity('work_schedules')
@Unique('uq_work_schedule_company_user_day', ['companyId', 'userId', 'dayOfWeek'])
@Index('idx_work_schedule_company', ['companyId'])
@Index('idx_work_schedule_company_active', ['companyId', 'isActive'])
@Index('idx_work_schedule_company_day', ['companyId', 'dayOfWeek'])
@Check('chk_ws_time_range', '("isDayOff" = true) OR ("endTime" > "startTime")')
@Check('chk_ws_efficiency_bounds', '("efficiency" >= 0.5 AND "efficiency" <= 2.0)')
@Check(
  'chk_ws_break_within_work',
  '("breakStartTime" IS NULL AND "breakEndTime" IS NULL) OR ("breakStartTime" >= "startTime" AND "breakEndTime" <= "endTime" AND "breakEndTime" > "breakStartTime")',
)
@Check(
  'chk_ws_break_duration_bounds',
  '(("breakStartTime" IS NULL AND "breakEndTime" IS NULL) OR ((EXTRACT(EPOCH FROM ("breakEndTime"::time - "breakStartTime"::time))/60) BETWEEN 15 AND 120))',
)
@Check(
  'chk_ws_shift_duration_bounds',
  '("isDayOff" = true) OR ((EXTRACT(EPOCH FROM ("endTime"::time - "startTime"::time))/3600) BETWEEN 2 AND 12)',
)
export class WorkSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'integer' })
  dayOfWeek: number; // 0-6 (Sunday-Saturday)

  @Column({ type: 'time', nullable: true })
  startTime: string | null;

  @Column({ type: 'time', nullable: true })
  endTime: string | null;

  @Column({ type: 'boolean', default: false })
  isDayOff: boolean;

  @Column({ type: 'time', nullable: true })
  breakStartTime: string | null;

  @Column({ type: 'time', nullable: true })
  breakEndTime: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  efficiency: string; // decimal как string в TypeORM; приводим в маппере

  @Column({ type: 'jsonb', nullable: true, default: () => `('[]')::jsonb` })
  skillMatrix: string[] | null;

  @Column({ type: 'varchar', length: 50, default: 'flexible' })
  shiftType: string; // 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible'

  @Column({ type: 'integer', default: 5 })
  maxConsecutiveDays: number; // Максимум дней подряд

  @Column({ type: 'jsonb', nullable: true, default: () => `('[]')::jsonb` })
  preferredDaysOff: number[] | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
