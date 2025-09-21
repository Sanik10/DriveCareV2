// path: apps/backend/src/database/entities/vehicle-brand.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { VehicleModel } from './vehicle-model.entity';

@Entity('vehicle_brands')
@Index(['nameNormalized'], { unique: true, where: 'is_deleted = false' })
@Index(['isDeleted'])
@Index(['name'])
@Index(['isVerified'])
@Index(['isActive'])
export class VehicleBrand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'name_normalized', type: 'varchar', length: 110 })
  nameNormalized: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  country: string;

  @Column({ name: 'logo_url', type: 'varchar', length: 255, nullable: true })
  logoUrl: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // Верификация для модерации — по умолчанию false (импорт/новые записи попадают в очередь)
  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  // Алиасы (синонимы) бренда — используются при слиянии/поиске дублей
  @Column({ name: 'aliases', type: 'simple-array', nullable: true })
  aliases: string[];

  // Источник данных (например, 'nhtsa') и его внутренний идентификатор
  @Column({ name: 'source', type: 'varchar', length: 30, nullable: true })
  source: string | null;

  @Column({ name: 'source_id', type: 'varchar', length: 100, nullable: true })
  sourceId: string | null;

  // Доп. поля модерации
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

  @OneToMany(() => VehicleModel, (model) => model.brand)
  models: VehicleModel[];
}
