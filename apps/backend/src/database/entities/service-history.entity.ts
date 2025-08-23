// path: apps/backend/src/database/entities/service-history.entity.ts
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
import { Company } from './company.entity';
import { Vehicle } from './vehicle.entity';

@Entity('vehicles_service_history')
@Index(['companyId'])
@Index(['vehicleId'])
@Index(['date'])
@Index(['isDeleted'])
@Index(['nextServiceDate'])
export class VehicleServiceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'integer', nullable: true })
  mileage: number | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'next_service_date', type: 'date', nullable: true })
  nextServiceDate: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.serviceHistory)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;
}
