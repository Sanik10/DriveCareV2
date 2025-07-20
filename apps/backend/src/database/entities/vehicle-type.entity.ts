// src/vehicle-types/entities/vehicle-type.entity.ts
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn,
  OneToMany 
} from 'typeorm';
import { Vehicle } from './vehicle.entity';

@Entity('vehicle_types')
export class VehicleType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  // Отношения
  @OneToMany(() => Vehicle, vehicle => vehicle.vehicleType)
  vehicles: Vehicle[];
}