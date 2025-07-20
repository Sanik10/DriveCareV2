// src/service-history/entities/service-history.entity.ts
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  JoinColumn 
} from 'typeorm';
import { Vehicle } from './vehicle.entity';

@Entity('vehicles_service_history')
export class VehicleServiceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'integer', nullable: true })
  mileage: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'next_service_date', type: 'date', nullable: true })
  nextServiceDate: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  // Отношения
  @ManyToOne(() => Vehicle, vehicle => vehicle.serviceHistory)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;
}