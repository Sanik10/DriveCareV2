// path: apps/backend/src/database/entities/vehicle-brand.entity.ts
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index
} from 'typeorm';
import { VehicleModel } from './vehicle-model.entity';

@Entity('vehicle_brands')
@Index(['name'], { unique: true }) // Уникальный индекс для имени
@Index(['isDeleted']) // Индекс для soft delete
export class VehicleBrand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  // Убираем @Index() - уже есть на уровне класса
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  country: string;

  @Column({ name: 'logo_url', type: 'varchar', length: 255, nullable: true })
  logoUrl: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  // Убираем @Index() - уже есть на уровне класса
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => VehicleModel, model => model.brand)
  models: VehicleModel[];
}