// path: apps/backend/src/database/entities/vehicle-type.entity.ts
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index
} from 'typeorm';
import { Vehicle } from './vehicle.entity';

@Entity('vehicle_types')
@Index(['name'], { unique: true, where: 'is_deleted = false' }) // 🔥 ДОБАВЛЕНО: Уникальность названия типа
@Index(['isDeleted']) // 🔥 ДОБАВЛЕНО: Soft delete индекс
export class VehicleType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

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
  @OneToMany(() => Vehicle, vehicle => vehicle.vehicleType)
  vehicles: Vehicle[];
}
