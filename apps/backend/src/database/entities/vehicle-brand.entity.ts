// src/vehicle-brands/entities/vehicle-brand.entity.ts
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn,
  OneToMany 
} from 'typeorm';
import { VehicleModel } from './vehicle-model.entity';

@Entity('vehicle_brands')
export class VehicleBrand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  country: string;

  @Column({ type: 'varchar', name: 'logo_url', length: 255, nullable: true })
  logoUrl: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  // Отношения
  @OneToMany(() => VehicleModel, model => model.brand)
  models: VehicleModel[];
}