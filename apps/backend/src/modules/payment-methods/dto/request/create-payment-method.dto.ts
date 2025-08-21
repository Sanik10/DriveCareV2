// path: apps/backend/src/modules/payment-methods/dto/request/create-payment-method.dto.ts
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  ValidateNested,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PAYMENT_METHODS_CONSTANTS, PAYMENT_METHOD_VALIDATION_MESSAGES } from '../../constants/payment-methods.constants';

export class InstallmentConfigDto {
  @ApiProperty({ description: 'Максимальный период рассрочки в месяцах', example: 12 })
  @IsNumber({}, { message: 'Период рассрочки должен быть числом' })
  @Min(1, { message: 'Минимальный период рассрочки - 1 месяц' })
  @Max(PAYMENT_METHODS_CONSTANTS.MAX_INSTALLMENT_MONTHS)
  maxPeriodMonths: number;

  @ApiProperty({ description: 'Процентная ставка', example: 0.15 })
  @IsNumber({}, { message: 'Процентная ставка должна быть числом' })
  @Min(0, { message: 'Процентная ставка не может быть отрицательной' })
  @Max(100, { message: 'Процентная ставка не может превышать 100%' })
  interestRate: number;

  @ApiProperty({ description: 'Минимальный первоначальный взнос, %', example: 20 })
  @IsNumber()
  @Min(PAYMENT_METHODS_CONSTANTS.MIN_DOWN_PAYMENT_PERCENT)
  @Max(100)
  minDownPaymentPercent: number;
}

export class IntegrationConfigDto {
  @ApiProperty({ description: 'Тип платежного шлюза', enum: PAYMENT_METHODS_CONSTANTS.SUPPORTED_GATEWAYS })
  @IsEnum(PAYMENT_METHODS_CONSTANTS.SUPPORTED_GATEWAYS, {
    message: PAYMENT_METHOD_VALIDATION_MESSAGES.GATEWAY_NOT_SUPPORTED,
  })
  gatewayType: string;

  @ApiPropertyOptional({ description: 'API ключ для интеграции' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'ID мерчанта' })
  @IsOptional()
  @IsString()
  merchantId?: string;

  @ApiPropertyOptional({ description: 'URL для webhook уведомлений' })
  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @ApiProperty({ description: 'Тестовый режим', example: false })
  @IsBoolean()
  testMode: boolean;
}

export class PaymentLimitsDto {
  @ApiPropertyOptional({ description: 'Минимальная сумма платежа', example: 100 })
  @IsOptional()
  @IsNumber({}, { message: 'Минимальная сумма должна быть числом' })
  @Min(PAYMENT_METHODS_CONSTANTS.MIN_AMOUNT_LIMIT)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Максимальная сумма платежа', example: 100000 })
  @IsOptional()
  @IsNumber({}, { message: 'Максимальная сумма должна быть числом' })
  @Max(PAYMENT_METHODS_CONSTANTS.MAX_AMOUNT_LIMIT)
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Дневной лимит транзакций', example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(PAYMENT_METHODS_CONSTANTS.MAX_DAILY_TRANSACTIONS)
  dailyTransactionLimit?: number;
}

export class CreatePaymentMethodDto {
  @ApiProperty({ description: 'Название способа оплаты', example: 'Банковская карта' })
  @IsString({ message: PAYMENT_METHOD_VALIDATION_MESSAGES.NAME_REQUIRED })
  @Length(1, PAYMENT_METHODS_CONSTANTS.MAX_NAME_LENGTH, {
    message: PAYMENT_METHOD_VALIDATION_MESSAGES.NAME_TOO_LONG,
  })
  name: string;

  @ApiPropertyOptional({ description: 'Описание способа оплаты' })
  @IsOptional()
  @IsString()
  @Length(0, PAYMENT_METHODS_CONSTANTS.MAX_DESCRIPTION_LENGTH, {
    message: PAYMENT_METHOD_VALIDATION_MESSAGES.DESCRIPTION_TOO_LONG,
  })
  description?: string;

  @ApiProperty({
    description: 'Тип платежного метода',
    enum: ['cash', 'card', 'bank_transfer', 'installments', 'corporate', 'digital_wallet', 'cryptocurrency'],
  })
  @IsEnum(['cash', 'card', 'bank_transfer', 'installments', 'corporate', 'digital_wallet', 'cryptocurrency'], {
    message: 'Некорректный тип платежного метода',
  })
  type: string;

  @ApiPropertyOptional({ description: 'Комиссия за обработку в процентах', example: 2.5 })
  @IsOptional()
  @IsNumber({}, { message: PAYMENT_METHOD_VALIDATION_MESSAGES.PROCESSING_FEE_INVALID })
  @Min(PAYMENT_METHODS_CONSTANTS.MIN_PROCESSING_FEE)
  @Max(PAYMENT_METHODS_CONSTANTS.MAX_PROCESSING_FEE)
  processingFeePercent?: number;

  @ApiPropertyOptional({ description: 'Активен ли способ оплаты', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Лимиты платежей', type: PaymentLimitsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentLimitsDto)
  limits?: PaymentLimitsDto;

  @ApiPropertyOptional({ description: 'Настройки рассрочки', type: InstallmentConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InstallmentConfigDto)
  installmentConfig?: InstallmentConfigDto;

  @ApiPropertyOptional({ description: 'Настройки интеграции', type: IntegrationConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IntegrationConfigDto)
  integrationConfig?: IntegrationConfigDto;

  @ApiPropertyOptional({ description: 'Требует ли верификации', default: false })
  @IsOptional()
  @IsBoolean()
  requiresVerification?: boolean;

  @ApiPropertyOptional({ description: 'Поддерживает ли возвраты', default: true })
  @IsOptional()
  @IsBoolean()
  supportsRefunds?: boolean;
}
