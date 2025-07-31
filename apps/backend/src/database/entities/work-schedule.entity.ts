// src/database/entities/work-schedule.entity.ts (РАСШИРЕННАЯ ВЕРСИЯ)
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('work_schedules')
export class WorkSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'integer' })
  dayOfWeek: number; // 0-6 (Sunday-Saturday)

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ type: 'boolean', default: false })
  isDayOff: boolean;

  // 🔥 NEW: Enterprise fields
  @Column({ type: 'time', nullable: true })
  breakStartTime: string; // Время начала обеда

  @Column({ type: 'time', nullable: true })
  breakEndTime: string; // Время окончания обеда

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  efficiency: number; // Коэффициент производительности (0.5-2.0)

  @Column({ type: 'json', nullable: true })
  skillMatrix: string; // JSON массив serviceIds которые может выполнять

  @Column({ type: 'varchar', length: 50, default: 'flexible' })
  shiftType: string; // 'morning' | 'afternoon' | 'evening' | 'flexible'

  @Column({ type: 'integer', default: 5 })
  maxConsecutiveDays: number; // Максимум дней подряд

  @Column({ type: 'json', nullable: true })
  preferredDaysOff: string; // JSON массив предпочитаемых выходных [0,6]

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
