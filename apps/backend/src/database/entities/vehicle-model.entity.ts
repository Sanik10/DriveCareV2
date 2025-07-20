// src/vehicle-models/entities/vehicle-model.entity.ts
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany 
} from 'typeorm';
import { VehicleBrand } from './vehicle-brand.entity';
import { Vehicle } from './vehicle.entity';

@Entity('vehicle_models')
export class VehicleModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'brand_id', type: 'uuid' })
  brandId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'year_from', type: 'integer', nullable: true })
  yearFrom: number;

  @Column({ name: 'year_to', type: 'integer', nullable: true })
  yearTo: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  class: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  // Отношения
  @ManyToOne(() => VehicleBrand, brand => brand.models)
  @JoinColumn({ name: 'brand_id' })
  brand: VehicleBrand;

  @OneToMany(() => Vehicle, vehicle => vehicle.model)
  vehicles: Vehicle[];
}