// path: apps/backend/src/database/entities/company.entity.ts
import { 
  Column, 
  CreateDateColumn, 
  Entity, 
  OneToMany, 
  PrimaryGeneratedColumn, 
  UpdateDateColumn,
  Index
} from 'typeorm';

@Entity('companies')
@Index(['email'], { unique: true, where: 'email IS NOT NULL' })
@Index(['isActive'])
@Index(['createdAt'])
@Index(['taxNumber'], { where: 'tax_number IS NOT NULL' })
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ 
    type: 'varchar', 
    length: 255,
    comment: 'Название компании (ПДн при наличии ИП)'
  })
  name: string;

  @Column({ 
    name: 'legal_name', 
    type: 'varchar', 
    length: 255,
    comment: 'Юридическое название'
  })
  legalName: string;

  @Column({ 
    name: 'tax_number', 
    type: 'varchar', 
    length: 12, 
    nullable: true,
    comment: 'ИНН (ПДн для ИП)'
  })
  taxNumber: string | null;

  @Column({ 
    type: 'text', 
    nullable: true,
    comment: 'Адрес (может содержать ПДн)'
  })
  address: string | null;

  @Column({ 
    type: 'varchar', 
    length: 20, 
    nullable: true,
    comment: 'Телефон компании'
  })
  phone: string | null;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    unique: true,
    comment: 'Email компании'
  })
  email: string;

  @Column({ 
    type: 'varchar', 
    length: 500, 
    nullable: true 
  })
  website: string | null;

  @Column({ 
    name: 'logo_url', 
    type: 'varchar', 
    length: 1000, 
    nullable: true 
  })
  logoUrl: string | null;

  @Column({ 
    name: 'working_hours', 
    type: 'jsonb', 
    nullable: true,
    comment: 'Часы работы в формате JSON'
  })
  workingHours: Record<string, {
    isOpen: boolean;
    open: string;
    close: string;
  }> | null;

  @Column({ 
    name: 'is_active', 
    type: 'boolean', 
    default: true 
  })
  isActive: boolean;

  // ✅ ДОБАВЛЕНО: Поля для 152-ФЗ compliance
  @Column({
    name: 'data_retention_until',
    type: 'timestamptz',
    nullable: true,
    comment: 'Дата до которой храним ПДн компании (152-ФЗ)'
  })
  dataRetentionUntil: Date | null;

  @Column({
    name: 'pdp_consent_version',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Версия согласия на обработку ПДн'
  })
  pdpConsentVersion: string | null;

  @Column({
    name: 'pdp_consent_date',
    type: 'timestamptz',
    nullable: true,
    comment: 'Дата согласия на обработку ПДн'
  })
  pdpConsentDate: Date | null;

  @CreateDateColumn({ 
    name: 'created_at', 
    type: 'timestamptz' 
  })
  createdAt: Date;

  @UpdateDateColumn({ 
    name: 'updated_at', 
    type: 'timestamptz' 
  })
  updatedAt: Date;

  // ✅ ИСПРАВЛЕНО: Убраны связи которые вызывают ошибки компиляции
  // OneToMany связи будут добавлены позже когда будут нужны и протестированы
  // Пока сосредоточимся на основной функциональности без circular dependencies
}
