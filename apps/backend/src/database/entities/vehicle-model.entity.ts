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
  Index,
} from 'typeorm';
import { VehicleBrand } from './vehicle-brand.entity';
import { Vehicle } from './vehicle.entity';

@Entity('vehicle_models')
@Index(['brandId'])
@Index(['brandId', 'nameNormalized'], { unique: true, where: 'is_deleted = false' })
@Index(['isDeleted'])
@Index(['isVerified'])
@Index(['isActive'])
export class VehicleModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'brand_id', type: 'uuid' })
  brandId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'name_normalized', type: 'varchar', length: 110 })
  nameNormalized: string;

  @Column({ name: 'year_from', type: 'integer', nullable: true })
  yearFrom: number;

  @Column({ name: 'year_to', type: 'integer', nullable: true })
  yearTo: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  class: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // Верификация — по умолчанию false
  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  // Алиасы модели (например, региональные названия/вариации)
  @Column({ name: 'aliases', type: 'simple-array', nullable: true })
  aliases: string[];

  // Источник данных и его идентификатор
  @Column({ name: 'source', type: 'varchar', length: 30, nullable: true })
  source: string | null;

  @Column({ name: 'source_id', type: 'varchar', length: 100, nullable: true })
  sourceId: string | null;

  // Поля модерации
  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'reviewed_by_user_id', type: 'uuid', nullable: true })
  reviewedByUserId: string | null;

  @Column({ name: 'assignee_user_id', type: 'uuid', nullable: true })
  assigneeUserId: string | null;

  @Column({ name: 'moderation_notes', type: 'text', nullable: true })
  moderationNotes: string | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => VehicleBrand, (brand) => brand.models)
  @JoinColumn({ name: 'brand_id' })
  brand: VehicleBrand;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.model)
  vehicles: Vehicle[];
}
