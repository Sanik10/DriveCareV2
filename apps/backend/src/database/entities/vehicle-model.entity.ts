// path: apps/backend/src/database/entities/vehicle-model.entity.ts
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index
} from 'typeorm';
import { VehicleBrand } from './vehicle-brand.entity';
import { Vehicle } from './vehicle.entity';

@Entity('vehicle_models')
@Index(['brandId']) // 🔥 ДОБАВЛЕНО: Индекс для фильтрации по бренду
@Index(['name', 'brandId'], { unique: true, where: 'is_deleted = false' }) // 🔥 ДОБАВЛЕНО: Уникальность модели в рамках бренда
@Index(['isDeleted']) // 🔥 ДОБАВЛЕНО: Soft delete индекс
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

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // 🔥 ДОБАВЛЕНО: Soft Delete поддержка
  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  // 🔥 ДОБАВЛЕНО: UpdateDateColumn
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  // Отношения
  @ManyToOne(() => VehicleBrand, brand => brand.models)
  @JoinColumn({ name: 'brand_id' })
  brand: VehicleBrand;

  @OneToMany(() => Vehicle, vehicle => vehicle.model)
  vehicles: Vehicle[];
}
