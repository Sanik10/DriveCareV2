import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, Index } from 'typeorm';
import { Company } from './company.entity';
import { Tariff } from './tariff.entity';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
  INACTIVE = 'inactive' // Добавлен новый статус для деактивированных подписок
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  @Index() // Индекс для ускорения поиска
  companyId: string;

  @Column({ name: 'tariff_id', type: 'uuid' })
  tariffId: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  @Index() // Индекс для ускорения поиска по дате окончания
  endDate: Date;

  @Column({ 
    type: 'varchar', 
    length: 20,
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING
  })
  @Index() // Индекс для ускорения поиска по статусу
  status: SubscriptionStatus;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod: string;

  @Column({ name: 'auto_renew', type: 'boolean', default: false })
  autoRenew: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  // Отношения
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Tariff)
  @JoinColumn({ name: 'tariff_id' })
  tariff: Tariff;
}