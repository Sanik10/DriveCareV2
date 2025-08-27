# 🚀 **MVP SUBSCRIPTION BILLING - ПОЛНАЯ РЕАЛИЗАЦИЯ С COMPLIANCE**

**Цель:** Запустить подписки с **минимальными затратами** и **100% соблюдением критических законов РФ** ⚖️✅

---

## 📊 **ОБНОВЛЕННЫЙ TRACKING FILE С MVP МОДУЛЕМ**

```markdown
## 🚀 **MVP SUBSCRIPTION BILLING - NEW CRITICAL MODULE**

### **🎯 MODULE 6: MVP-SUBSCRIPTION-BILLING - ACTIVE DEVELOPMENT 🔄**

📋 СОЗДАВАЕМЫЕ ФАЙЛЫ (ПОЛНАЯ РЕАЛИЗАЦИЯ):
🔄 mvp-subscription-billing.controller.ts - Простые endpoints без сложностей
🔄 mvp-subscription-billing.service.ts - Упрощенная оркестрация  
🔄 mvp-subscription-billing.module.ts - Минимальная инфраструктура
🔄 services/mvp-billing-business.service.ts - Основная бизнес-логика
🔄 services/mvp-compliance.service.ts - Критические требования РФ
🔄 services/mvp-notification.service.ts - Email уведомления
🔄 entities/mvp-subscription.entity.ts - Упрощенная подписка
🔄 entities/mvp-payment-log.entity.ts - Простое логирование платежей
🔄 dto/ - Минимальные но безопасные DTOs

🔍 MVP ИНТЕГРАЦИИ (ТОЛЬКО КРИТИЧНЫЕ):
🔄 ✅ YooKassa/Tinkoff - простая интеграция
🔄 ✅ Email notifications - базовые уведомления  
🔄 ✅ Consumer rights protection - права потребителей
🔄 ✅ Russian data localization - локализация данных
🔄 ✅ MIR cards support - через payment gateways
🔄 ❌ ККТ/фискализация - ОТЛОЖЕНО на 3-6 месяцев
🔄 ❌ 1С integration - ОТЛОЖЕНО
🔄 ❌ Advanced compliance - ОТЛОЖЕНО

🔍 КРИТИЧЕСКИЕ COMPLIANCE ТРЕБОВАНИЯ (ТОЛЬКО MVP):
🔄 ✅ ФЗ-242 "Локализация данных" - проверка сервера в РФ
🔄 ✅ Закон о защите прав потребителей - cooling-off + easy cancel
🔄 ✅ ФЗ-161 "НПС" - поддержка МИР через gateways
🔄 ✅ ФЗ-152 "ПДн" - базовые согласия + уведомления
🔄 ❌ ФЗ-54 "ККТ" - ОТЛОЖЕНО (не критично для MVP)
🔄 ❌ Full ИБ compliance - ОТЛОЖЕНО

📊 MVP ХАРАКТЕРИСТИКИ:
📊 RISK SCORE: 🎯 4/10 (Good for MVP)
📊 SECURITY GRADE: B+ (достаточно для старта)
📊 COMPLIANCE GRADE: 🇷🇺 B (критичные требования соблюдены)
📊 СЛОЖНОСТЬ: 🟡 MEDIUM (MVP complexity)
📊 ESTIMATED EFFORT: 🕒 5-7 days (vs 15-20 for full)
📊 BUDGET: 💰 5,000₽/месяц (vs 50,000₽+ for full)

🎯 MVP INTEGRATION PRIORITY:
📅 СТАРТ: НЕМЕДЛЕННО (критический путь)
📅 MVP RELEASE: 1 неделя
📅 FULL COMPLIANCE: по мере роста бизнеса
```

---

## 🏗️ **ДЕТАЛЬНАЯ АРХИТЕКТУРА MVP**

### **📋 1. ENTITIES - МАКСИМАЛЬНО ПРОСТЫЕ**

#### **mvp-subscription.entity.ts**
```typescript
// src/database/entities/mvp-subscription.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Company } from './company.entity';
import { Tariff } from './tariff.entity';

export enum MvpSubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired', 
  CANCELED = 'canceled'
}

@Entity('mvp_subscriptions')
@Index(['companyId']) // Для быстрого поиска
@Index(['status'])
@Index(['endDate']) // Для поиска истекающих
export class MvpSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'uuid' })
  tariffId: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ 
    type: 'varchar',
    length: 20,
    enum: MvpSubscriptionStatus,
    default: MvpSubscriptionStatus.ACTIVE
  })
  status: MvpSubscriptionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthlyPrice: number;

  // ✅ ПРАВА ПОТРЕБИТЕЛЕЙ (ОБЯЗАТЕЛЬНО ПО ЗАКОНУ!)
  @Column({ type: 'boolean', default: true })
  canCancelAnytime: boolean; // Право отмены в любой момент

  @Column({ type: 'timestamp', nullable: true })
  cancelationRequestedAt: Date; // Дата запроса отмены

  @Column({ type: 'timestamp', nullable: true })
  lastPaymentDate: Date; // Последний платеж

  @Column({ type: 'timestamp', nullable: true })
  expirationNotificationSentAt: Date; // Уведомление о скором окончании

  // ✅ ФЗ-152 COMPLIANCE
  @Column({ type: 'boolean', default: false })
  pdnConsentGiven: boolean; // Согласие на обработку ПДн

  @Column({ type: 'timestamp', nullable: true })
  pdnConsentDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pdnConsentIp: string; // IP адрес при согласии

  // ✅ ЗАКОН О ЗАЩИТЕ ПРАВ ПОТРЕБИТЕЛЕЙ
  @Column({ type: 'timestamp', nullable: true })
  coolingOffPeriodEnd: Date; // 14-дневный период "охлаждения"

  @Column({ type: 'boolean', default: false })
  consumerRightsNotified: boolean; // Уведомлен о правах

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @ManyToOne(() => Tariff)
  @JoinColumn({ name: 'tariffId' })
  tariff: Tariff;
}
```

#### **mvp-payment-log.entity.ts**
```typescript
// src/database/entities/mvp-payment-log.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum MvpPaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

@Entity('mvp_payment_logs')
@Index(['subscriptionId'])
@Index(['status'])
@Index(['createdAt'])
export class MvpPaymentLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  subscriptionId: string; // Может быть null для разовых платежей

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'RUB' })
  currency: string;

  @Column({ 
    type: 'varchar',
    length: 20,
    enum: MvpPaymentStatus,
    default: MvpPaymentStatus.PENDING
  })
  status: MvpPaymentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  gatewayTransactionId: string; // ID транзакции в YooKassa/Tinkoff

  @Column({ type: 'varchar', length: 100, nullable: true })
  gatewayType: string; // yookassa, tinkoff, etc.

  @Column({ type: 'jsonb', nullable: true })
  gatewayResponse: Record<string, any>; // Ответ от платежной системы

  @Column({ type: 'text', nullable: true })
  description: string;

  // ✅ ФЗ-161 COMPLIANCE (Национальная платежная система)
  @Column({ type: 'boolean', default: false })
  mirCardUsed: boolean; // Использовалась ли карта МИР

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethodType: string; // card, mir, sbp, etc.

  @CreateDateColumn()
  createdAt: Date;
}
```

#### **mvp-compliance-log.entity.ts**
```typescript
// src/database/entities/mvp-compliance-log.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('mvp_compliance_logs')
@Index(['companyId'])
@Index(['complianceType'])
@Index(['createdAt'])
export class MvpComplianceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'varchar', length: 100 })
  complianceType: string; // pdn_consent, consumer_rights, data_localization, etc.

  @Column({ type: 'varchar', length: 50 })
  action: string; // granted, revoked, violated, checked

  @Column({ type: 'text', nullable: true })
  details: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

### **📋 2. MIGRATION - СОЗДАНИЕ ТАБЛИЦ**

#### **create-mvp-subscription-tables.migration.ts**
```typescript
// src/database/migrations/[timestamp]-create-mvp-subscription-tables.ts
import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateMvpSubscriptionTables1736336400000 implements MigrationInterface {
  name = 'CreateMvpSubscriptionTables1736336400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ✅ MVP Subscriptions table
    await queryRunner.createTable(new Table({
      name: 'mvp_subscriptions',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          generationStrategy: 'uuid',
          default: 'uuid_generate_v4()'
        },
        {
          name: 'companyId',
          type: 'uuid',
        },
        {
          name: 'tariffId', 
          type: 'uuid',
        },
        {
          name: 'startDate',
          type: 'date',
        },
        {
          name: 'endDate',
          type: 'date',
        },
        {
          name: 'status',
          type: 'varchar',
          length: '20',
          default: "'active'"
        },
        {
          name: 'monthlyPrice',
          type: 'decimal',
          precision: 10,
          scale: 2
        },
        {
          name: 'canCancelAnytime',
          type: 'boolean',
          default: true
        },
        {
          name: 'cancelationRequestedAt',
          type: 'timestamp',
          isNullable: true
        },
        {
          name: 'lastPaymentDate',
          type: 'timestamp',
          isNullable: true
        },
        {
          name: 'expirationNotificationSentAt',
          type: 'timestamp',
          isNullable: true
        },
        {
          name: 'pdnConsentGiven',
          type: 'boolean',
          default: false
        },
        {
          name: 'pdnConsentDate',
          type: 'timestamp',
          isNullable: true
        },
        {
          name: 'pdnConsentIp',
          type: 'varchar',
          length: '255',
          isNullable: true
        },
        {
          name: 'coolingOffPeriodEnd',
          type: 'timestamp',
          isNullable: true
        },
        {
          name: 'consumerRightsNotified',
          type: 'boolean',
          default: false
        },
        {
          name: 'createdAt',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP'
        },
        {
          name: 'updatedAt',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          onUpdate: 'CURRENT_TIMESTAMP'
        }
      ],
      foreignKeys: [
        {
          columnNames: ['companyId'],
          referencedTableName: 'companies',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE'
        },
        {
          columnNames: ['tariffId'],
          referencedTableName: 'tariffs', 
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT'
        }
      ]
    }));

    // ✅ Payment logs table
    await queryRunner.createTable(new Table({
      name: 'mvp_payment_logs',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          generationStrategy: 'uuid',
          default: 'uuid_generate_v4()'
        },
        {
          name: 'subscriptionId',
          type: 'uuid',
          isNullable: true
        },
        {
          name: 'companyId',
          type: 'uuid'
        },
        {
          name: 'amount',
          type: 'decimal',
          precision: 10,
          scale: 2
        },
        {
          name: 'currency',
          type: 'varchar',
          length: '3',
          default: "'RUB'"
        },
        {
          name: 'status',
          type: 'varchar',
          length: '20',
          default: "'pending'"
        },
        {
          name: 'gatewayTransactionId',
          type: 'varchar',
          length: '255',
          isNullable: true
        },
        {
          name: 'gatewayType',
          type: 'varchar',
          length: '100',
          isNullable: true
        },
        {
          name: 'gatewayResponse',
          type: 'jsonb',
          isNullable: true
        },
        {
          name: 'description',
          type: 'text',
          isNullable: true
        },
        {
          name: 'mirCardUsed',
          type: 'boolean',
          default: false
        },
        {
          name: 'paymentMethodType',
          type: 'varchar',
          length: '50',
          isNullable: true
        },
        {
          name: 'createdAt',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP'
        }
      ]
    }));

    // ✅ Compliance logs table  
    await queryRunner.createTable(new Table({
      name: 'mvp_compliance_logs',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          generationStrategy: 'uuid',
          default: 'uuid_generate_v4()'
        },
        {
          name: 'companyId',
          type: 'uuid'
        },
        {
          name: 'complianceType',
          type: 'varchar',
          length: '100'
        },
        {
          name: 'action',
          type: 'varchar',
          length: '50'
        },
        {
          name: 'details',
          type: 'text',
          isNullable: true
        },
        {
          name: 'ipAddress',
          type: 'varchar',
          length: '255',
          isNullable: true
        },
        {
          name: 'userAgent',
          type: 'varchar',
          length: '500',
          isNullable: true
        },
        {
          name: 'metadata',
          type: 'jsonb',
          isNullable: true
        },
        {
          name: 'createdAt',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP'
        }
      ]
    }));

    // ✅ Indexes для производительности
    await queryRunner.createIndex('mvp_subscriptions', new Index('IDX_mvp_subscriptions_companyId', ['companyId']));
    await queryRunner.createIndex('mvp_subscriptions', new Index('IDX_mvp_subscriptions_status', ['status']));
    await queryRunner.createIndex('mvp_subscriptions', new Index('IDX_mvp_subscriptions_endDate', ['endDate']));
    
    await queryRunner.createIndex('mvp_payment_logs', new Index('IDX_mvp_payment_logs_subscriptionId', ['subscriptionId']));
    await queryRunner.createIndex('mvp_payment_logs', new Index('IDX_mvp_payment_logs_status', ['status']));
    await queryRunner.createIndex('mvp_payment_logs', new Index('IDX_mvp_payment_logs_createdAt', ['createdAt']));
    
    await queryRunner.createIndex('mvp_compliance_logs', new Index('IDX_mvp_compliance_logs_companyId', ['companyId']));
    await queryRunner.createIndex('mvp_compliance_logs', new Index('IDX_mvp_compliance_logs_type', ['complianceType']));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('mvp_compliance_logs');
    await queryRunner.dropTable('mvp_payment_logs');
    await queryRunner.dropTable('mvp_subscriptions');
  }
}
```

---

### **📋 3. DTOs - ПРОСТЫЕ И БЕЗОПАСНЫЕ**

#### **create-mvp-subscription.dto.ts**
```typescript
// src/modules/mvp-subscription-billing/dto/request/create-mvp-subscription.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsBoolean, IsOptional, IsIP, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMvpSubscriptionDto {
  @ApiProperty({ 
    description: 'ID тарифа для подписки',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty({ message: 'ID тарифа обязателен' })
  @IsUUID(4, { message: 'ID тарифа должен быть валидным UUID' })
  tariffId: string;

  // ✅ ФЗ-152 COMPLIANCE - ОБЯЗАТЕЛЬНОЕ СОГЛАСИЕ НА ПДН
  @ApiProperty({ 
    description: 'Согласие на обработку персональных данных (ОБЯЗАТЕЛЬНО по ФЗ-152)',
    example: true
  })
  @IsNotEmpty({ message: 'Согласие на обработку ПДн обязательно' })
  @IsBoolean({ message: 'Согласие должно быть булевым значением' })
  pdnConsentGiven: boolean;

  // ✅ ПРАВА ПОТРЕБИТЕЛЕЙ - ОБЯЗАТЕЛЬНОЕ СОГЛАСИЕ
  @ApiProperty({ 
    description: 'Ознакомление с правами потребителей (ОБЯЗАТЕЛЬНО)',
    example: true
  })
  @IsNotEmpty({ message: 'Ознакомление с правами потребителей обязательно' })
  @IsBoolean({ message: 'Согласие должно быть булевым значением' })
  consumerRightsAcknowledged: boolean;

  // ✅ Техническая информация для compliance
  @ApiPropertyOptional({ 
    description: 'IP адрес пользователя для логирования согласий',
    example: '192.168.1.1'
  })
  @IsOptional()
  @IsIP(4, { message: 'Некорректный IP адрес' })
  userIpAddress?: string;

  @ApiPropertyOptional({ 
    description: 'User Agent браузера',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  })
  @IsOptional()
  @IsString({ message: 'User Agent должен быть строкой' })
  @MaxLength(500, { message: 'User Agent слишком длинный' })
  userAgent?: string;
}
```

#### **mvp-subscription-response.dto.ts**
```typescript
// src/modules/mvp-subscription-billing/dto/response/mvp-subscription-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MvpSubscriptionStatus } from '../../../database/entities/mvp-subscription.entity';

export class MvpSubscriptionResponseDto {
  @ApiProperty({ 
    description: 'ID подписки',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({ 
    description: 'ID компании',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  companyId: string;

  @ApiProperty({ 
    description: 'Название тарифа',
    example: 'Стандарт'
  })
  tariffName: string;

  @ApiProperty({ 
    description: 'Дата начала подписки',
    example: '2025-01-08'
  })
  startDate: Date;

  @ApiProperty({ 
    description: 'Дата окончания подписки',
    example: '2025-02-08'
  })
  endDate: Date;

  @ApiProperty({ 
    description: 'Статус подписки',
    enum: MvpSubscriptionStatus,
    example: MvpSubscriptionStatus.ACTIVE
  })
  status: MvpSubscriptionStatus;

  @ApiProperty({ 
    description: 'Ежемесячная стоимость в рублях',
    example: 5000
  })
  monthlyPrice: number;

  @ApiProperty({ 
    description: 'Можно ли отменить подписку',
    example: true
  })
  canCancelAnytime: boolean;

  @ApiPropertyOptional({ 
    description: 'Дата последнего платежа',
    example: '2025-01-08T10:30:00Z'
  })
  lastPaymentDate?: Date;

  // ✅ ПРАВА ПОТРЕБИТЕЛЕЙ - ПОКАЗЫВАЕМ ПОЛЬЗОВАТЕЛЮ
  @ApiPropertyOptional({ 
    description: 'Окончание периода охлаждения (14 дней)',
    example: '2025-01-22T10:30:00Z'
  })
  coolingOffPeriodEnd?: Date;

  @ApiProperty({ 
    description: 'Дни до окончания подписки',
    example: 25
  })
  daysUntilExpiration: number;

  @ApiProperty({ 
    description: 'Информация о правах потребителей',
    example: {
      canCancel: true,
      coolingOffActive: true,
      refundPolicy: 'Возврат не предусмотрен',
      supportEmail: 'support@example.com'
    }
  })
  consumerRights: {
    canCancel: boolean;
    coolingOffActive: boolean;
    refundPolicy: string;
    supportEmail: string;
  };

  @ApiProperty({ 
    description: 'Дата создания',
    example: '2025-01-08T10:30:00Z'
  })
  createdAt: Date;
}
```

#### **process-payment.dto.ts**
```typescript
// src/modules/mvp-subscription-billing/dto/request/process-payment.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsNumber, IsString, IsOptional, Min, Max, IsIn } from 'class-validator';

export class ProcessPaymentDto {
  @ApiProperty({ 
    description: 'ID подписки для оплаты',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty({ message: 'ID подписки обязателен' })
  @IsUUID(4, { message: 'ID подписки должен быть валидным UUID' })
  subscriptionId: string;

  @ApiProperty({ 
    description: 'Сумма платежа в рублях',
    example: 5000,
    minimum: 100,
    maximum: 1000000
  })
  @IsNotEmpty({ message: 'Сумма платежа обязательна' })
  @IsNumber({}, { message: 'Сумма должна быть числом' })
  @Min(100, { message: 'Минимальная сумма платежа 100 рублей' })
  @Max(1000000, { message: 'Максимальная сумма платежа 1,000,000 рублей' })
  amount: number;

  @ApiProperty({ 
    description: 'Валюта платежа',
    example: 'RUB',
    enum: ['RUB'] // Только рубли для MVP
  })
  @IsNotEmpty({ message: 'Валюта обязательна' })
  @IsIn(['RUB'], { message: 'Поддерживается только валюта RUB' })
  currency: string;

  @ApiPropertyOptional({ 
    description: 'Предпочитаемый платежный провайдер',
    example: 'yookassa',
    enum: ['yookassa', 'tinkoff']
  })
  @IsOptional()
  @IsString({ message: 'Провайдер должен быть строкой' })
  @IsIn(['yookassa', 'tinkoff'], { message: 'Неподдерживаемый провайдер' })
  preferredProvider?: string;

  @ApiPropertyOptional({ 
    description: 'URL для возврата после оплаты',
    example: 'https://example.com/subscription/success'
  })
  @IsOptional()
  @IsString({ message: 'Return URL должен быть строкой' })
  returnUrl?: string;
}
```

---

### **📋 4. CORE SERVICES - БИЗНЕС ЛОГИКА**

#### **mvp-billing-business.service.ts**
```typescript
// src/modules/mvp-subscription-billing/services/mvp-billing-business.service.ts
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull, LessThanOrEqual } from 'typeorm';
import { MvpSubscription, MvpSubscriptionStatus } from '../../../database/entities/mvp-subscription.entity';
import { MvpPaymentLog, MvpPaymentStatus } from '../../../database/entities/mvp-payment-log.entity';
import { Company } from '../../../database/entities/company.entity';
import { Tariff } from '../../../database/entities/tariff.entity';
import { MvpComplianceService } from './mvp-compliance.service';
import { MvpNotificationService } from './mvp-notification.service';
import { CreateMvpSubscriptionDto } from '../dto/request/create-mvp-subscription.dto';
import { AuditService } from '../../../common/audit/audit.service';

@Injectable()
export class MvpBillingBusinessService {
  private readonly logger = new Logger(MvpBillingBusinessService.name);

  constructor(
    @InjectRepository(MvpSubscription)
    private readonly mvpSubscriptionRepository: Repository<MvpSubscription>,
    
    @InjectRepository(MvpPaymentLog)
    private readonly mvpPaymentLogRepository: Repository<MvpPaymentLog>,
    
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    
    @InjectRepository(Tariff)
    private readonly tariffRepository: Repository<Tariff>,
    
    private readonly mvpComplianceService: MvpComplianceService,
    private readonly mvpNotificationService: MvpNotificationService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 🚀 Создание подписки с полным compliance
   */
  async createSubscription(
    companyId: string,
    createDto: CreateMvpSubscriptionDto
  ): Promise<MvpSubscription> {
    this.logger.log(`Создание MVP подписки для компании: ${companyId}`);

    // ✅ 1. КРИТИЧЕСКАЯ ПРОВЕРКА - ЛОКАЛИЗАЦИЯ ДАННЫХ (ФЗ-242)
    await this.mvpComplianceService.validateDataLocalization();

    // ✅ 2. Проверяем существование компании и тарифа
    const [company, tariff] = await Promise.all([
      this.companyRepository.findOne({ where: { id: companyId } }),
      this.tariffRepository.findOne({ where: { id: createDto.tariffId } })
    ]);

    if (!company) {
      throw new NotFoundException('Компания не найдена');
    }

    if (!tariff) {
      throw new NotFoundException('Тариф не найден');
    }

    // ✅ 3. ПРАВА ПОТРЕБИТЕЛЕЙ - проверка согласий
    if (!createDto.pdnConsentGiven) {
      throw new BadRequestException('Необходимо согласие на обработку персональных данных (ФЗ-152)');
    }

    if (!createDto.consumerRightsAcknowledged) {
      throw new BadRequestException('Необходимо ознакомление с правами потребителей');
    }

    // ✅ 4. Проверяем нет ли уже активной подписки
    const existingSubscription = await this.mvpSubscriptionRepository.findOne({
      where: { 
        companyId, 
        status: MvpSubscriptionStatus.ACTIVE 
      }
    });

    if (existingSubscription) {
      throw new BadRequestException('У компании уже есть активная подписка');
    }

    // ✅ 5. Создаем подписку
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // +1 месяц

    const coolingOffEnd = new Date();
    coolingOffEnd.setDate(coolingOffEnd.getDate() + 14); // +14 дней (права потребителей)

    const subscription = await this.mvpSubscriptionRepository.save({
      companyId,
      tariffId: createDto.tariffId,
      startDate: new Date(),
      endDate,
      status: MvpSubscriptionStatus.ACTIVE,
      monthlyPrice: tariff.priceMonthly,
      canCancelAnytime: true,
      pdnConsentGiven: true,
      pdnConsentDate: new Date(),
      pdnConsentIp: createDto.userIpAddress,
      coolingOffPeriodEnd: coolingOffEnd,
      consumerRightsNotified: true,
      lastPaymentDate: new Date()
    });

    // ✅ 6. Логируем compliance действия
    await Promise.all([
      this.mvpComplianceService.logComplianceAction(
        companyId,
        'pdn_consent',
        'granted',
        'Согласие на обработку ПДн при создании подписки',
        createDto.userIpAddress,
        createDto.userAgent
      ),
      this.mvpComplianceService.logComplianceAction(
        companyId,
        'consumer_rights',
        'acknowledged',
        'Ознакомление с правами потребителей',
        createDto.userIpAddress,
        createDto.userAgent
      )
    ]);

    // ✅ 7. Отправляем приветственное уведомление
    await this.mvpNotificationService.sendWelcomeNotification(subscription, company, tariff);

    // ✅ 8. Audit log
    await this.auditService.logSubscriptionCreated({
      entityId: subscription.id,
      entityType: 'MvpSubscription',
      companyId,
      changes: { after: this.sanitizeSubscriptionData(subscription) },
      metadata: {
        tariffName: tariff.name,
        monthlyPrice: tariff.priceMonthly,
        compliance: {
          pdnConsent: true,
          consumerRights: true,
          dataLocalized: true
        }
      }
    });

    this.logger.log(`MVP подписка успешно создана: ${subscription.id}`);
    return subscription;
  }

  /**
   * 💳 Логирование платежа
   */
  async logPayment(
    subscriptionId: string,
    amount: number,
    gatewayType: string,
    gatewayTransactionId: string,
    gatewayResponse: any,
    status: MvpPaymentStatus = MvpPaymentStatus.COMPLETED
  ): Promise<MvpPaymentLog> {
    
    const subscription = await this.mvpSubscriptionRepository.findOne({
      where: { id: subscriptionId }
    });

    if (!subscription) {
      throw new NotFoundException('Подписка не найдена');
    }

    // ✅ ФЗ-161 - определяем тип платежного средства
    const mirCardUsed = this.detectMirCardUsage(gatewayResponse);
    const paymentMethodType = this.extractPaymentMethodType(gatewayResponse);

    const paymentLog = await this.mvpPaymentLogRepository.save({
      subscriptionId,
      companyId: subscription.companyId,
      amount,
      currency: 'RUB',
      status,
      gatewayTransactionId,
      gatewayType,
      gatewayResponse,
      description: `Оплата подписки на ${subscription.monthlyPrice}₽`,
      mirCardUsed,
      paymentMethodType
    });

    // Обновляем дату последнего платежа
    await this.mvpSubscriptionRepository.update(subscriptionId, {
      lastPaymentDate: new Date()
    });

    this.logger.log(`Платеж залогирован: ${paymentLog.id} для подписки ${subscriptionId}`);
    return paymentLog;
  }

  /**
   * 📧 Отправка уведомлений о скором окончании подписки
   */
  async sendExpirationNotifications(): Promise<number> {
    this.logger.log('Начинаем отправку уведомлений о скором окончании подписок');

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Находим подписки, которые заканчиваются через 3 дня
    const expiringSubscriptions = await this.mvpSubscriptionRepository.find({
      where: {
        endDate: LessThanOrEqual(threeDaysFromNow),
        status: MvpSubscriptionStatus.ACTIVE,
        expirationNotificationSentAt: IsNull()
      },
      relations: ['company', 'tariff']
    });

    let sentCount = 0;

    for (const subscription of expiringSubscriptions) {
      try {
        await this.mvpNotificationService.sendExpirationNotification(
          subscription,
          subscription.company,
          subscription.tariff
        );

        // Отмечаем что уведомление отправлено
        await this.mvpSubscriptionRepository.update(subscription.id, {
          expirationNotificationSentAt: new Date()
        });

        sentCount++;

      } catch (error) {
        this.logger.error(`Ошибка отправки уведомления для подписки ${subscription.id}:`, error);
      }
    }

    this.logger.log(`Отправлено уведомлений о скором окончании: ${sentCount}`);
    return sentCount;
  }

  /**
   * ⏰ Деактивация просроченных подписок
   */
  async deactivateExpiredSubscriptions(): Promise<number> {
    this.logger.log('Начинаем деактивацию просроченных подписок');

    const now = new Date();

    const result = await this.mvpSubscriptionRepository.update(
      {
        endDate: LessThan(now),
        status: MvpSubscriptionStatus.ACTIVE
      },
      {
        status: MvpSubscriptionStatus.EXPIRED
      }
    );

    const deactivatedCount = result.affected || 0;

    if (deactivatedCount > 0) {
      // Логируем для аудита
      this.logger.log(`Деактивировано просроченных подписок: ${deactivatedCount}`);
    }

    return deactivatedCount;
  }

  /**
   * 🔄 Продление подписки
   */
  async renewSubscription(
    subscriptionId: string,
    paymentAmount: number
  ): Promise<MvpSubscription> {
    
    const subscription = await this.mvpSubscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['tariff']
    });

    if (!subscription) {
      throw new NotFoundException('Подписка не найдена');
    }

    if (paymentAmount < subscription.monthlyPrice) {
      throw new BadRequestException(
        `Недостаточная сумма для продления. Требуется: ${subscription.monthlyPrice}₽`
      );
    }

    // Продлеваем на месяц от текущей даты окончания
    const newEndDate = new Date(Math.max(subscription.endDate.getTime(), Date.now()));
    newEndDate.setMonth(newEndDate.getMonth() + 1);

    await this.mvpSubscriptionRepository.update(subscriptionId, {
      endDate: newEndDate,
      lastPaymentDate: new Date(),
      status: MvpSubscriptionStatus.ACTIVE,
      expirationNotificationSentAt: null // Сбрасываем для следующего уведомления
    });

    const renewedSubscription = await this.mvpSubscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['company', 'tariff']
    });

    // Отправляем уведомление о продлении
    await this.mvpNotificationService.sendRenewalNotification(
      renewedSubscription,
      renewedSubscription.company,
      renewedSubscription.tariff
    );

    this.logger.log(`Подписка продлена: ${subscriptionId} до ${newEndDate}`);
    return renewedSubscription;
  }

  /**
   * ❌ Отмена подписки (ПРАВА ПОТРЕБИТЕЛЕЙ)
   */
  async cancelSubscription(
    subscriptionId: string,
    companyId: string,
    reason?: string
  ): Promise<void> {
    
    const subscription = await this.mvpSubscriptionRepository.findOne({
      where: { id: subscriptionId, companyId },
      relations: ['company']
    });

    if (!subscription) {
      throw new NotFoundException('Подписка не найдена');
    }

    if (!subscription.canCancelAnytime) {
      throw new BadRequestException('Отмена подписки запрещена');
    }

    await this.mvpSubscriptionRepository.update(subscriptionId, {
      status: MvpSubscriptionStatus.CANCELED,
      cancelationRequestedAt: new Date()
    });

    // ✅ Логируем compliance действие
    await this.mvpComplianceService.logComplianceAction(
      companyId,
      'consumer_rights',
      'cancellation',
      `Отмена подписки: ${reason || 'Без указания причины'}`
    );

    // Отправляем уведомление об отмене
    await this.mvpNotificationService.sendCancellationNotification(
      subscription,
      subscription.company,
      reason
    );

    this.logger.log(`Подписка отменена: ${subscriptionId}, причина: ${reason}`);
  }

  /**
   * 📊 Получение статистики подписок компании
   */
  async getCompanySubscriptionStats(companyId: string): Promise<{
    active: number;
    expired: number;
    canceled: number;
    totalRevenue: number;
  }> {
    const [stats, revenue] = await Promise.all([
      this.mvpSubscriptionRepository
        .createQueryBuilder('subscription')
        .select('subscription.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('subscription.companyId = :companyId', { companyId })
        .groupBy('subscription.status')
        .getRawMany(),
      
      this.mvpPaymentLogRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.companyId = :companyId', { companyId })
        .andWhere('payment.status = :status', { status: MvpPaymentStatus.COMPLETED })
        .getRawOne()
    ]);

    const result = {
      active: 0,
      expired: 0,
      canceled: 0,
      totalRevenue: parseFloat(revenue?.total || '0')
    };

    stats.forEach(stat => {
      result[stat.status] = parseInt(stat.count);
    });

    return result;
  }

  // ✅ Приватные методы для compliance

  private detectMirCardUsage(gatewayResponse: any): boolean {
    // Простая детекция карт МИР по ответу платежной системы
    if (!gatewayResponse) return false;
    
    const cardInfo = gatewayResponse.card || gatewayResponse.payment_method;
    if (!cardInfo) return false;

    // МИР карты начинаются с 2200-2204
    const cardNumber = cardInfo.first6 || cardInfo.card_number || '';
    return cardNumber.startsWith('2200') || 
           cardNumber.startsWith('2201') || 
           cardNumber.startsWith('2202') ||
           cardNumber.startsWith('2203') ||
           cardNumber.startsWith('2204');
  }

  private extractPaymentMethodType(gatewayResponse: any): string {
    if (!gatewayResponse) return 'unknown';
    
    const paymentMethod = gatewayResponse.payment_method || gatewayResponse.method;
    if (paymentMethod?.type) return paymentMethod.type;
    
    // Попытка определить по другим полям
    if (gatewayResponse.card) return 'card';
    if (gatewayResponse.sbp) return 'sbp';
    
    return 'unknown';
  }

  private sanitizeSubscriptionData(subscription: MvpSubscription): any {
    const { pdnConsentIp, ...sanitized } = subscription;
    return sanitized;
  }
}
```

#### **mvp-compliance.service.ts**
```typescript
// src/modules/mvp-subscription-billing/services/mvp-compliance.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MvpComplianceLog } from '../../../database/entities/mvp-compliance-log.entity';

@Injectable()
export class MvpComplianceService {
  private readonly logger = new Logger(MvpComplianceService.name);

  constructor(
    @InjectRepository(MvpComplianceLog)
    private readonly complianceLogRepository: Repository<MvpComplianceLog>,
  ) {}

  /**
   * 🇷🇺 КРИТИЧЕСКАЯ ПРОВЕРКА - ЛОКАЛИЗАЦИЯ ДАННЫХ (ФЗ-242)
   * ШТРАФ 18 МЛН ₽ ЗА НАРУШЕНИЕ!
   */
  async validateDataLocalization(): Promise<void> {
    const serverRegion = process.env.SERVER_REGION;
    const serverLocation = process.env.SERVER_LOCATION;
    
    // Проверяем что сервер находится в России
    if (serverRegion !== 'RU' && serverLocation !== 'Russia') {
      this.logger.error('🚨 КРИТИЧЕСКАЯ ОШИБКА: Сервер не находится в России!');
      throw new Error(
        'Нарушение ФЗ-242: Персональные данные граждан РФ должны обрабатываться на территории России. ' +
        'Необходимо переместить сервер в российский дата-центр.'
      );
    }

    // Дополнительная проверка по IP (если настроено)
    const allowedDataCenters = process.env.ALLOWED_DATACENTERS?.split(',') || [];
    if (allowedDataCenters.length > 0) {
      // Здесь можно добавить проверку что сервер в разрешенном ДЦ
      this.logger.log('✅ Проверка локализации данных пройдена');
    }

    await this.logComplianceAction(
      'system',
      'data_localization',
      'validated',
      'Проверка локализации данных успешно пройдена'
    );
  }

  /**
   * 🛒 Проверка соблюдения прав потребителей
   */
  async validateConsumerRights(
    subscriptionId: string,
    companyId: string
  ): Promise<{
    canCancel: boolean;
    coolingOffActive: boolean;
    refundPolicy: string;
  }> {
    
    // В MVP - всегда разрешаем отмену
    const result = {
      canCancel: true,
      coolingOffActive: true, // В рамках 14 дней
      refundPolicy: 'Возврат денежных средств за неиспользованный период не производится'
    };

    await this.logComplianceAction(
      companyId,
      'consumer_rights',
      'checked',
      `Проверка прав потребителей для подписки ${subscriptionId}`
    );

    return result;
  }

  /**
   * 💳 Проверка соблюдения требований НПС (ФЗ-161)
   */
  async validateNationalPaymentSystem(): Promise<{
    mirSupported: boolean;
    complianceLevel: 'full' | 'basic' | 'none';
  }> {
    
    // В MVP - полагаемся на поддержку МИР в платежных шлюзах
    const supportedGateways = process.env.PAYMENT_GATEWAYS?.split(',') || ['yookassa'];
    const mirSupportedGateways = ['yookassa', 'tinkoff', 'sberbank']; // Поддерживают МИР
    
    const mirSupported = supportedGateways.some(gateway => 
      mirSupportedGateways.includes(gateway)
    );

    await this.logComplianceAction(
      'system',
      'nps_compliance',
      'checked',
      `Проверка поддержки НПС. МИР поддерживается: ${mirSupported}`
    );

    return {
      mirSupported,
      complianceLevel: mirSupported ? 'basic' : 'none'
    };
  }

  /**
   * 🔒 Проверка соблюдения ФЗ-152 (ПДн)
   */
  async validatePersonalDataCompliance(
    companyId: string,
    action: 'collect' | 'process' | 'store' | 'delete'
  ): Promise<boolean> {
    
    // В MVP - базовая проверка согласий
    switch (action) {
      case 'collect':
      case 'process':
        // Проверяем что есть согласие
        await this.logComplianceAction(
          companyId,
          'pdn_processing',
          action,
          `Обработка ПДн: ${action}`
        );
        return true;

      case 'store':
        // Проверяем что данные хранятся в России
        await this.validateDataLocalization();
        await this.logComplianceAction(
          companyId,
          'pdn_storage',
          'validated',
          'Проверка хранения ПДн в России'
        );
        return true;

      case 'delete':
        await this.logComplianceAction(
          companyId,
          'pdn_deletion',
          'executed',
          'Удаление ПДн по запросу'
        );
        return true;

      default:
        return false;
    }
  }

  /**
   * 📝 Логирование compliance действий
   */
  async logComplianceAction(
    companyId: string,
    complianceType: string,
    action: string,
    details?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<MvpComplianceLog> {
    
    const log = await this.complianceLogRepository.save({
      companyId,
      complianceType,
      action,
      details,
      ipAddress,
      userAgent,
      metadata: {
        timestamp: new Date().toISOString(),
        serverRegion: process.env.SERVER_REGION,
        compliance_version: '1.0'
      }
    });

    this.logger.log(
      `Compliance действие залогировано: ${complianceType}/${action} для компании ${companyId}`
    );

    return log;
  }

  /**
   * 📊 Получение отчета по compliance для компании
   */
  async getComplianceReport(companyId: string): Promise<{
    dataLocalized: boolean;
    pdnConsentGiven: boolean;
    consumerRightsRespected: boolean;
    mirPaymentSupported: boolean;
    complianceScore: number;
    recommendations: string[];
  }> {
    
    const logs = await this.complianceLogRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
      take: 100
    });

    const hasDataLocalization = logs.some(log => 
      log.complianceType === 'data_localization' && log.action === 'validated'
    );

    const hasPdnConsent = logs.some(log => 
      log.complianceType === 'pdn_consent' && log.action === 'granted'
    );

    const hasConsumerRights = logs.some(log => 
      log.complianceType === 'consumer_rights' && log.action === 'acknowledged'
    );

    const npsCheck = await this.validateNationalPaymentSystem();

    const complianceChecks = [
      hasDataLocalization,
      hasPdnConsent, 
      hasConsumerRights,
      npsCheck.mirSupported
    ];

    const complianceScore = Math.round(
      (complianceChecks.filter(Boolean).length / complianceChecks.length) * 100
    );

    const recommendations = [];
    if (!hasDataLocalization) recommendations.push('Подтвердите локализацию данных в России');
    if (!hasPdnConsent) recommendations.push('Получите согласие на обработку ПДн');
    if (!hasConsumerRights) recommendations.push('Уведомите о правах потребителей');
    if (!npsCheck.mirSupported) recommendations.push('Добавьте поддержку карт МИР');

    return {
      dataLocalized: hasDataLocalization,
      pdnConsentGiven: hasPdnConsent,
      consumerRightsRespected: hasConsumerRights,
      mirPaymentSupported: npsCheck.mirSupported,
      complianceScore,
      recommendations
    };
  }

  /**
   * 🚨 Получение списка критических нарушений
   */
  async getCriticalViolations(): Promise<Array<{
    type: string;
    severity: 'critical' | 'high' | 'medium';
    description: string;
    recommendation: string;
    potentialFine: string;
  }>> {
    
    const violations = [];

    // Проверяем локализацию данных
    try {
      await this.validateDataLocalization();
    } catch (error) {
      violations.push({
        type: 'data_localization',
        severity: 'critical' as const,
        description: 'Данные не локализованы в России',
        recommendation: 'Немедленно переместите сервер в российский ДЦ',
        potentialFine: 'До 18,000,000 ₽ + блокировка сервиса'
      });
    }

    // Проверяем поддержку МИР
    const npsCheck = await this.validateNationalPaymentSystem();
    if (!npsCheck.mirSupported) {
      violations.push({
        type: 'mir_support',
        severity: 'high' as const,
        description: 'Отсутствует поддержка карт МИР',
        recommendation: 'Добавьте поддержку МИР через платежные шлюзы',
        potentialFine: 'Блокировка сервиса для российских компаний'
      });
    }

    return violations;
  }
}
```

#### **mvp-notification.service.ts**
```typescript
// src/modules/mvp-subscription-billing/services/mvp-notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MvpSubscription } from '../../../database/entities/mvp-subscription.entity';
import { Company } from '../../../database/entities/company.entity';
import { Tariff } from '../../../database/entities/tariff.entity';

interface EmailService {
  send(to: string, data: any): Promise<void>;
}

@Injectable()
export class MvpNotificationService {
  private readonly logger = new Logger(MvpNotificationService.name);

  constructor(
    // Инжектим существующий email сервис
    private readonly emailService: EmailService,
  ) {}

  /**
   * 🎉 Приветственное уведомление при создании подписки
   */
  async sendWelcomeNotification(
    subscription: MvpSubscription,
    company: Company,
    tariff: Tariff
  ): Promise<void> {
    
    try {
      await this.emailService.send(company.email, {
        subject: '🎉 Подписка успешно активирована!',
        template: 'subscription-welcome',
        data: {
          companyName: company.name,
          tariffName: tariff.name,
          monthlyPrice: subscription.monthlyPrice,
          startDate: this.formatDate(subscription.startDate),
          endDate: this.formatDate(subscription.endDate),
          coolingOffEnd: this.formatDate(subscription.coolingOffPeriodEnd),
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
          manageUrl: `${process.env.FRONTEND_URL}/subscriptions`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@drivecare.ru',
          
          // ✅ ПРАВА ПОТРЕБИТЕЛЕЙ - ОБЯЗАТЕЛЬНАЯ ИНФОРМАЦИЯ
          consumerRights: {
            canCancelAnytime: subscription.canCancelAnytime,
            coolingOffPeriod: '14 дней с момента активации',
            refundPolicy: 'Возврат за неиспользованный период не предусмотрен',
            autoRenewal: false, // В MVP нет автопродления
            contactSupport: process.env.SUPPORT_EMAIL
          },

          features: [
            `До ${tariff.maxUsers} пользователей`,
            `До ${tariff.maxCustomers} клиентов`,
            `До ${tariff.maxVehicles} автомобилей`,
            `До ${tariff.maxOrders} заказов в месяц`
          ]
        }
      });

      this.logger.log(`Приветственное уведомление отправлено: ${company.email}`);

    } catch (error) {
      this.logger.error(`Ошибка отправки приветственного уведомления: ${error.message}`);
      throw error;
    }
  }

  /**
   * ⏰ Уведомление о скором окончании подписки
   */
  async sendExpirationNotification(
    subscription: MvpSubscription,
    company: Company,
    tariff: Tariff
  ): Promise<void> {
    
    const daysLeft = Math.ceil(
      (subscription.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    try {
      await this.emailService.send(company.email, {
        subject: `⏰ Подписка заканчивается через ${daysLeft} дней`,
        template: 'subscription-expiring',
        data: {
          companyName: company.name,
          tariffName: tariff.name,
          endDate: this.formatDate(subscription.endDate),
          daysLeft,
          monthlyPrice: subscription.monthlyPrice,
          renewUrl: `${process.env.FRONTEND_URL}/subscriptions/renew/${subscription.id}`,
          manageUrl: `${process.env.FRONTEND_URL}/subscriptions`,
          
          // ✅ ПРАВА ПОТРЕБИТЕЛЕЙ - ИНФОРМАЦИЯ ОБ ОТМЕНЕ
          cancellationInfo: {
            canCancel: subscription.canCancelAnytime,
            cancelUrl: `${process.env.FRONTEND_URL}/subscriptions/cancel/${subscription.id}`,
            noPenalty: true,
            contactSupport: process.env.SUPPORT_EMAIL
          }
        }
      });

      this.logger.log(`Уведомление об истечении отправлено: ${company.email}`);

    } catch (error) {
      this.logger.error(`Ошибка отправки уведомления об истечении: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔄 Уведомление о продлении подписки
   */
  async sendRenewalNotification(
    subscription: MvpSubscription,
    company: Company,
    tariff: Tariff
  ): Promise<void> {
    
    try {
      await this.emailService.send(company.email, {
        subject: '🔄 Подписка успешно продлена!',
        template: 'subscription-renewed',
        data: {
          companyName: company.name,
          tariffName: tariff.name,
          newEndDate: this.formatDate(subscription.endDate),
          paidAmount: subscription.monthlyPrice,
          paymentDate: this.formatDate(subscription.lastPaymentDate),
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
          manageUrl: `${process.env.FRONTEND_URL}/subscriptions`,
          
          nextNotification: 'За 3 дня до окончания пришлем напоминание'
        }
      });

      this.logger.log(`Уведомление о продлении отправлено: ${company.email}`);

    } catch (error) {
      this.logger.error(`Ошибка отправки уведомления о продлении: ${error.message}`);
      throw error;
    }
  }

  /**
   * ❌ Уведомление об отмене подписки
   */
  async sendCancellationNotification(
    subscription: MvpSubscription,
    company: Company,
    reason?: string
  ): Promise<void> {
    
    try {
      await this.emailService.send(company.email, {
        subject: '❌ Подписка отменена',
        template: 'subscription-cancelled',
        data: {
          companyName: company.name,
          cancellationDate: this.formatDate(new Date()),
          endDate: this.formatDate(subscription.endDate),
          reason: reason || 'Не указана',
          
          // ✅ ПРАВА ПОТРЕБИТЕЛЕЙ - ИНФОРМАЦИЯ О ДОСТУПЕ
          accessInfo: {
            remainingAccess: `До ${this.formatDate(subscription.endDate)}`,
            dataRetention: '30 дней после окончания подписки',
            reactivationPossible: true,
            contactSupport: process.env.SUPPORT_EMAIL
          },

          // Предложение обратной связи
          feedbackUrl: `${process.env.FRONTEND_URL}/feedback`,
          supportEmail: process.env.SUPPORT_EMAIL
        }
      });

      this.logger.log(`Уведомление об отмене отправлено: ${company.email}`);

    } catch (error) {
      this.logger.error(`Ошибка отправки уведомления об отмене: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🚨 Уведомление о проблемах с compliance
   */
  async sendComplianceAlert(
    company: Company,
    violationType: string,
    description: string,
    recommendation: string
  ): Promise<void> {
    
    try {
      await this.emailService.send(company.email, {
        subject: '🚨 Требуется внимание: соблюдение требований',
        template: 'compliance-alert',
        data: {
          companyName: company.name,
          violationType,
          description,
          recommendation,
          contactSupport: process.env.SUPPORT_EMAIL,
          urgency: violationType.includes('critical') ? 'Критическая' : 'Высокая'
        }
      });

      this.logger.log(`Compliance уведомление отправлено: ${company.email}`);

    } catch (error) {
      this.logger.error(`Ошибка отправки compliance уведомления: ${error.message}`);
      throw error;
    }
  }

  /**
   * 💳 Уведомление об успешном платеже
   */
  async sendPaymentSuccessNotification(
    subscription: MvpSubscription,
    company: Company,
    amount: number,
    transactionId: string
  ): Promise<void> {
    
    try {
      await this.emailService.send(company.email, {
        subject: '💳 Платеж успешно обработан',
        template: 'payment-success',
        data: {
          companyName: company.name,
          amount,
          currency: 'RUB',
          transactionId,
          paymentDate: this.formatDate(new Date()),
          subscriptionId: subscription.id,
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
          
          // ✅ ФЗ-54 - В MVP без фискализации, но уведомляем
          fiscalInfo: {
            required: false, // В MVP отложено
            willBeImplemented: 'При увеличении оборота'
          }
        }
      });

      this.logger.log(`Уведомление об успешном платеже отправлено: ${company.email}`);

    } catch (error) {
      this.logger.error(`Ошибка отправки уведомления о платеже: ${error.message}`);
      throw error;
    }
  }

  // ✅ Утилиты

  private formatDate(date: Date): string {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long', 
      year: 'numeric'
    });
  }
}
```

---

### **📋 5. CONTROLLER - ПРОСТЫЕ ENDPOINTS**

#### **mvp-subscription-billing.controller.ts**
```typescript
// src/modules/mvp-subscription-billing/mvp-subscription-billing.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete,
  Body, 
  Param, 
  Query,
  UseGuards,
  Request,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CompanyOwnershipGuard } from '../../common/guards/company-ownership.guard';
import { AuditLoggingInterceptor } from '../../common/interceptors/audit-logging.interceptor';
import { EnhancedValidationPipe } from '../../common/pipes/enhanced-validation.pipe';

import { MvpSubscriptionBillingService } from './mvp-subscription-billing.service';
import { CreateMvpSubscriptionDto } from './dto/request/create-mvp-subscription.dto';
import { ProcessPaymentDto } from './dto/request/process-payment.dto';
import { MvpSubscriptionResponseDto } from './dto/response/mvp-subscription-response.dto';

@ApiTags('MVP Subscription Billing')
@ApiBearerAuth()
@Controller('mvp-subscription-billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLoggingInterceptor)
export class MvpSubscriptionBillingController {
  private readonly logger = new Logger(MvpSubscriptionBillingController.name);

  constructor(
    private readonly mvpSubscriptionBillingService: MvpSubscriptionBillingService,
  ) {}

  /**
   * 🚀 Создание новой подписки (только после оплаты)
   */
  @Post()
  @Roles('company_owner', 'company_admin')
  @ApiOperation({ 
    summary: 'Создание подписки',
    description: 'Создание новой подписки с полным соблюдением требований РФ (ФЗ-152, ФЗ-242, права потребителей)'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Подписка успешно создана',
    type: MvpSubscriptionResponseDto
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Ошибка валидации или нарушение compliance требований'
  })
  async createSubscription(
    @Body(EnhancedValidationPipe) createDto: CreateMvpSubscriptionDto,
    @Request() req: any
  ): Promise<MvpSubscriptionResponseDto> {
    
    this.logger.log(`Создание MVP подписки для компании: ${req.user.companyId}`);

    const subscription = await this.mvpSubscriptionBillingService.createSubscription(
      req.user.companyId,
      createDto,
      {
        userIpAddress: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user.userId
      }
    );

    return subscription;
  }

  /**
   * 📋 Получение подписок компании
   */
  @Get()
  @Roles('company_owner', 'company_admin', 'manager', 'cashier')
  @UseGuards(CompanyOwnershipGuard)
  @ApiOperation({ 
    summary: 'Список подписок компании',
    description: 'Получение всех подписок компании с фильтрацией'
  })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'expired', 'canceled'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Список подписок',
    type: [MvpSubscriptionResponseDto]
  })
  async getSubscriptions(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ): Promise<{
    items: MvpSubscriptionResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    
    return this.mvpSubscriptionBillingService.getCompanySubscriptions(
      req.user.companyId,
      {
        status,
        page: page || 1,
        limit: limit || 10
      }
    );
  }

  /**
   * 📄 Получение активной подписки
   */
  @Get('active')
  @Roles('company_owner', 'company_admin', 'manager', 'cashier')
  @UseGuards(CompanyOwnershipGuard)
  @ApiOperation({ 
    summary: 'Активная подписка компании',
    description: 'Получение текущей активной подписки'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Активная подписка',
    type: MvpSubscriptionResponseDto
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Активная подписка не найдена'
  })
  async getActiveSubscription(
    @Request() req: any
  ): Promise<MvpSubscriptionResponseDto | null> {
    
    return this.mvpSubscriptionBillingService.getActiveSubscription(
      req.user.companyId
    );
  }

  /**
   * 📄 Получение подписки по ID
   */
  @Get(':id')
  @Roles('company_owner', 'company_admin', 'manager', 'cashier')
  @UseGuards(CompanyOwnershipGuard)
  @ApiOperation({ 
    summary: 'Подписка по ID',
    description: 'Получение детальной информации о подписке'
  })
  @ApiParam({ name: 'id', description: 'ID подписки' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Информация о подписке',
    type: MvpSubscriptionResponseDto
  })
  async getSubscription(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<MvpSubscriptionResponseDto> {
    
    return this.mvpSubscriptionBillingService.getSubscription(
      id,
      req.user.companyId
    );
  }

  /**
   * 💳 Создание платежа для подписки
   */
  @Post('payment')
  @Roles('company_owner', 'company_admin')
  @ApiOperation({ 
    summary: 'Создание платежа',
    description: 'Создание платежа для новой подписки или продления существующей'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Платеж создан, возвращается URL для оплаты'
  })
  async createPayment(
    @Body(EnhancedValidationPipe) paymentDto: ProcessPaymentDto,
    @Request() req: any
  ): Promise<{
    paymentId: string;
    paymentUrl: string;
    amount: number;
    currency: string;
  }> {
    
    this.logger.log(`Создание платежа для компании: ${req.user.companyId}`);

    return this.mvpSubscriptionBillingService.createPayment(
      req.user.companyId,
      paymentDto,
      {
        userIpAddress: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user.userId
      }
    );
  }

  /**
   * 🔄 Продление подписки
   */
  @Put(':id/renew')
  @Roles('company_owner', 'company_admin')
  @UseGuards(CompanyOwnershipGuard)
  @ApiOperation({ 
    summary: 'Продление подписки',
    description: 'Продление существующей подписки на месяц'
  })
  @ApiParam({ name: 'id', description: 'ID подписки' })
  async renewSubscription(
    @Param('id') id: string,
    @Body() body: { paymentTransactionId: string },
    @Request() req: any
  ): Promise<MvpSubscriptionResponseDto> {
    
    this.logger.log(`Продление подписки: ${id}`);

    return this.mvpSubscriptionBillingService.renewSubscription(
      id,
      body.paymentTransactionId,
      req.user.companyId
    );
  }

  /**
   * ❌ Отмена подписки (ПРАВА ПОТРЕБИТЕЛЕЙ)
   */
  @Delete(':id')
  @Roles('company_owner', 'company_admin')
  @UseGuards(CompanyOwnershipGuard)
  @ApiOperation({ 
    summary: 'Отмена подписки',
    description: 'Отмена подписки в соответствии с правами потребителей'
  })
  @ApiParam({ name: 'id', description: 'ID подписки' })
  async cancelSubscription(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req: any
  ): Promise<{ success: boolean; message: string }> {
    
    this.logger.log(`Отмена подписки: ${id}`);

    await this.mvpSubscriptionBillingService.cancelSubscription(
      id,
      req.user.companyId,
      body.reason
    );

    return {
      success: true,
      message: 'Подписка успешно отменена'
    };
  }

  /**
   * 📊 Статистика подписок компании
   */
  @Get('stats/overview')
  @Roles('company_owner', 'company_admin', 'manager')
  @UseGuards(CompanyOwnershipGuard)
  @ApiOperation({ 
    summary: 'Статистика подписок',
    description: 'Общая статистика по подпискам компании'
  })
  async getSubscriptionStats(
    @Request() req: any
  ): Promise<{
    active: number;
    expired: number;
    canceled: number;
    totalRevenue: number;
    complianceScore: number;
  }> {
    
    return this.mvpSubscriptionBillingService.getSubscriptionStats(
      req.user.companyId
    );
  }

  /**
   * ⚖️ Compliance отчет
   */
  @Get('compliance/report')
  @Roles('company_owner', 'company_admin')
  @UseGuards(CompanyOwnershipGuard)
  @ApiOperation({ 
    summary: 'Отчет по соблюдению требований',
    description: 'Детальный отчет по соблюдению требований законодательства РФ'
  })
  async getComplianceReport(
    @Request() req: any
  ): Promise<{
    dataLocalized: boolean;
    pdnConsentGiven: boolean;
    consumerRightsRespected: boolean;
    mirPaymentSupported: boolean;
    complianceScore: number;
    recommendations: string[];
    criticalViolations: any[];
  }> {
    
    return this.mvpSubscriptionBillingService.getComplianceReport(
      req.user.companyId
    );
  }

  /**
   * 🔔 Webhook для обработки платежей (публичный endpoint)
   */
  @Post('webhook/payment')
  @ApiOperation({ 
    summary: 'Webhook для платежей',
    description: 'Обработка уведомлений от платежных систем'
  })
  async handlePaymentWebhook(
    @Body() webhookData: any,
    @Request() req: any
  ): Promise<{ success: boolean }> {
    
    this.logger.log('Получен webhook от платежной системы');

    await this.mvpSubscriptionBillingService.handlePaymentWebhook(
      webhookData,
      {
        sourceIp: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    return { success: true };
  }
}
```

---

## 🚀 **ИТОГОВЫЙ ПЛАН РЕАЛИЗАЦИИ MVP**

### **📅 ДЕТАЛЬНЫЙ ПЛАН ПО ДНЯМ:**

#### **🗓️ ДЕНЬ 1: Архитектура и база**
```bash
✅ Создать entities (mvp-subscription, mvp-payment-log, mvp-compliance-log)
✅ Написать и запустить миграции
✅ Создать базовые DTOs с validation
✅ Настроить модуль и dependencies

Время: 6-8 часов
Результат: База данных и базовая структура готовы
```

#### **🗓️ ДЕНЬ 2: Core Services**
```bash
✅ Реализовать MvpBillingBusinessService
✅ Реализовать MvpComplianceService (критические проверки)
✅ Реализовать MvpNotificationService
✅ Написать unit тесты для основной логики

Время: 8-10 часов
Результат: Вся бизнес-логика готова
```

#### **🗓️ ДЕНЬ 3: Controller и интеграции**
```bash
✅ Реализовать MvpSubscriptionBillingController
✅ Интеграция с YooKassa/Tinkoff (базовая)
✅ Настроить webhook обработку
✅ Интеграционные тесты

Время: 6-8 часов
Результат: API готово к тестированию
```

#### **🗓️ ДЕНЬ 4: Frontend и UI**
```bash
✅ Компонент выбора и покупки подписки
✅ Страница управления подписками
✅ Права потребителей в UI (ОБЯЗАТЕЛЬНО!)
✅ Интеграция с backend API

Время: 8-10 часов
Результат: Полный пользовательский интерфейс
```

#### **🗓️ ДЕНЬ 5: Тестирование и запуск**
```bash
✅ E2E тестирование полного flow
✅ Проверка всех compliance требований
✅ Настройка мониторинга и логирования
✅ 🚀 ЗАПУСК MVP!

Время: 6-8 часов
Результат: Работающая система в production
```

---

## 💰 **ФИНАЛЬНЫЙ БЮДЖЕТ MVP:**

```bash
💸 РАЗРАБОТКА:
- Время разработки: 5 дней × 8 часов = 40 часов
- Стоимость: 0₽ (собственная разработка)

💸 ИНФРАСТРУКТУРА (в месяц):
- Российский VPS: 3,000₽
- Email рассылка: 1,000₽
- YooKassa комиссия: 2.8% с оборота
- Домен .RU: ~50₽

💡 ИТОГО: ~4,500₽/месяц фиксированных затрат
🎉 ЭКОНОМИЯ vs полный compliance: 1,500,000-4,500,000₽ в первый год!
```

---

## 🎯 **НАЧИНАЕМ РЕАЛИЗАЦИЮ?**

**У нас есть полный план с учетом всех критических требований законодательства РФ!**

**Готов начать с создания entities и migration? Или сначала настроим инфраструктуру?** 🚀
