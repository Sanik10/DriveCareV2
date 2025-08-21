// path: apps/backend/src/database/entities/part-reservation.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Part } from './part.entity';

export enum ReservationStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  RELEASED = 'released',
  FULFILLED = 'fulfilled',
}

@Entity('part_reservations')
@Index(['companyId'])
@Index(['partId', 'companyId'])
@Index('uq_reservation_idempotency', ['companyId', 'idempotencyKey'], {
  unique: true,
  where: 'idempotency_key IS NOT NULL',
})
export class PartReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @ManyToOne(() => Part)
  @JoinColumn({ name: 'part_id' })
  part: Part;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ type: 'integer' })
  quantity: number; // > 0

  @Column({ name: 'reserved_by', type: 'uuid' })
  reservedBy: string; // userId

  @Column({ name: 'reserved_at', type: 'timestamptz' })
  reservedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({
    type: 'varchar',
    length: 12,
    enum: ReservationStatus,
    default: ReservationStatus.ACTIVE,
  })
  status: ReservationStatus;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date | null;

  @Column({ name: 'released_by', type: 'uuid', nullable: true })
  releasedBy: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 128, nullable: true })
  idempotencyKey: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
