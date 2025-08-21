// path: apps/backend/src/database/entities/customer.entity.ts
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Company } from './company.entity';
import { Vehicle } from './vehicle.entity';

export enum CustomerType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company'
}

function stripHtml(input?: string | null): string | null {
  if (input === null || input === undefined) return null;
  return String(input).replace(/<[^>]*>/g, '').trim();
}

function normalizeEmail(input?: string | null): string | null {
  if (input === null || input === undefined) return null;
  return String(input).trim().toLowerCase();
}

function normalizePhoneE164(input?: string | null): string | null {
  if (input === null || input === undefined) return null;
  const raw = String(input);
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    const normalized = '+' + digits.replace(/[^\d]/g, '').slice(0, 15);
    return normalized;
  }
  const onlyDigits = digits.replace(/\D/g, '');
  if (onlyDigits.length === 11 && (onlyDigits.startsWith('7') || onlyDigits.startsWith('8'))) {
    return '+7' + onlyDigits.slice(1);
  }
  if (onlyDigits.length === 10) {
    return '+7' + onlyDigits;
  }
  if (onlyDigits.length > 0 && onlyDigits.length <= 15) {
    return '+' + onlyDigits;
  }
  return null;
}

@Entity('customers')
@Index(['companyId'])
@Index(['email', 'companyId'], { unique: true })
@Index(['companyId', 'emailNormalized'], { unique: true })
@Index(['companyId', 'phoneE164'])
@Index(['isDeleted'])
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: CustomerType,
    default: CustomerType.INDIVIDUAL
  })
  type: CustomerType;

  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  lastName: string;

  @Column({ name: 'company_name', type: 'varchar', length: 255, nullable: true })
  companyName: string;

  @Column({ name: 'tax_number', type: 'varchar', length: 50, nullable: true })
  taxNumber: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'email_normalized', type: 'varchar', length: 255 })
  emailNormalized: string;

  @Column({ type: 'varchar', length: 50 })
  phone: string;

  @Column({ name: 'phone_e164', type: 'varchar', length: 20, nullable: true })
  phoneE164: string | null;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  source: string;

  @Column({ name: 'loyalty_points', type: 'integer', default: 0 })
  loyaltyPoints: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'marketing_consent', type: 'boolean', default: false })
  marketingConsent: boolean;

  @Column({ name: 'marketing_consent_date', type: 'timestamptz', nullable: true })
  marketingConsentDate: Date | null;

  @Column({ name: 'pdp_consent_version', type: 'varchar', length: 50, nullable: true })
  pdpConsentVersion: string | null;

  @Column({ name: 'pdp_consent_date', type: 'timestamptz', nullable: true })
  pdpConsentDate: Date | null;

  @Column({ name: 'data_retention_until', type: 'timestamptz', nullable: true })
  dataRetentionUntil: Date | null;

  // Поля анонимизации
  @Column({ name: 'anonymized_at', type: 'timestamptz', nullable: true })
  anonymizedAt: Date | null;

  @Column({ name: 'anonymized_by', type: 'uuid', nullable: true })
  anonymizedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => Vehicle, vehicle => vehicle.customer)
  vehicles: Vehicle[];

  @BeforeInsert()
  beforeInsert() {
    this.applySanitizationAndNormalization();
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.applySanitizationAndNormalization();
  }

  private applySanitizationAndNormalization() {
    this.firstName = stripHtml(this.firstName) ?? null;
    this.lastName = stripHtml(this.lastName) ?? null;
    this.companyName = stripHtml(this.companyName) ?? null;
    this.taxNumber = stripHtml(this.taxNumber) ?? null;
    this.address = stripHtml(this.address) ?? null;
    this.source = stripHtml(this.source) ?? null;
    this.notes = stripHtml(this.notes) ?? null;

    this.email = this.email?.trim();
    this.emailNormalized = normalizeEmail(this.email);
    this.phone = this.phone?.trim();
    this.phoneE164 = normalizePhoneE164(this.phone);
  }
}
