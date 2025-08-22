// path: apps/backend/src/database/entities/vehicle.entity.ts
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
import { Company } from './company.entity';
import { Customer } from './customer.entity';
import { VehicleModel } from './vehicle-model.entity';
import { VehicleType } from './vehicle-type.entity';
import { VehicleServiceHistory } from './service-history.entity';

export enum EngineType {
  PETROL = 'petrol',
  DIESEL = 'diesel',
  ELECTRIC = 'electric',
  HYBRID = 'hybrid'
}

@Entity('vehicles')
@Index(['companyId'])
@Index(['customerId'])
@Index(['vin'], { unique: true, where: 'vin IS NOT NULL AND is_deleted = false' })
@Index(['licensePlate', 'companyId'], { unique: true, where: 'license_plate IS NOT NULL AND is_deleted = false' })
@Index(['isDeleted'])
@Index(['isActive']) // 🔥 ДОБАВЛЕНО: Индекс для isActive
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'model_id', type: 'uuid' })
  modelId: string;

  @Column({ name: 'vehicle_type_id', type: 'uuid' })
  vehicleTypeId: string;

  @Column({ type: 'varchar', length: 17, nullable: true })
  vin: string;

  @Column({ name: 'license_plate', type: 'varchar', length: 20, nullable: true })
  licensePlate: string;

  @Column({ type: 'integer', nullable: true })
  year: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color: string;

  @Column({ 
    name: 'engine_type', 
    type: 'varchar',
    length: 20,
    enum: EngineType,
    default: EngineType.PETROL,
    nullable: true 
  })
  engineType: EngineType;

  @Column({ name: 'engine_volume', type: 'decimal', precision: 3, scale: 1, nullable: true })
  engineVolume: number;

  @Column({ type: 'integer', nullable: true })
  mileage: number;

  @Column({ name: 'last_service_date', type: 'date', nullable: true })
  lastServiceDate: Date;

  @Column({ name: 'next_service_date', type: 'date', nullable: true })
  nextServiceDate: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // 🔥 ДОБАВЛЕНО: Поле isActive для управления активностью
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Customer, customer => customer.vehicles)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => VehicleModel, model => model.vehicles)
  @JoinColumn({ name: 'model_id' })
  model: VehicleModel;

  @ManyToOne(() => VehicleType, vehicleType => vehicleType.vehicles)
  @JoinColumn({ name: 'vehicle_type_id' })
  vehicleType: VehicleType;

  @OneToMany(() => VehicleServiceHistory, history => history.vehicle)
  serviceHistory: VehicleServiceHistory[];
}
