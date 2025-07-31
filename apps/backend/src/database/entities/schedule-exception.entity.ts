// src/database/entities/schedule-exception.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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
export class ScheduleException {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'varchar',
    length: 20,
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
  startTime: string;

  @Column({ type: 'time', nullable: true })
  endTime: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: ExceptionStatus,
    default: ExceptionStatus.PENDING
  })
  status: ExceptionStatus;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'integer', default: 0 })
  affectedAppointments: number;

  @Column({ type: 'json', nullable: true })
  coverageAnalysis: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
