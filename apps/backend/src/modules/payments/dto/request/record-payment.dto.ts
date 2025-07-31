// src/modules/payments/dto/request/record-payment.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsUUID, 
  IsNumber, 
  IsOptional, 
  IsString, 
  IsDateString, 
  IsEnum, 
  IsObject, 
  Min, 
  Max,
  IsDecimal,
  MaxLength 
} from 'class-validator';
import { PaymentCurrency } from '../../types/payments.types';
import { PAYMENTS_CONSTANTS } from '../../constants/payments.constants';

export class RecordPaymentDto {
  @ApiProperty({ 
    description: 'ID счета для оплаты',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID(4, { message: 'ID счета должен быть валидным UUID' })
  invoiceId: string;

  @ApiProperty({ 
    description: 'ID способа оплаты',
    example: '456e7890-e89b-12d3-a456-426614174001'
  })
  @IsUUID(4, { message: 'ID способа оплаты должен быть валидным UUID' })
  paymentMethodId: string;

  @ApiProperty({ 
    description: 'Сумма платежа',
    example: 15000.00,
    minimum: PAYMENTS_CONSTANTS.VALIDATION.AMOUNT.MIN,
    maximum: PAYMENTS_CONSTANTS.VALIDATION.AMOUNT.MAX
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Сумма должна быть числом с максимум 2 знаками после запятой' })
  @Min(PAYMENTS_CONSTANTS.VALIDATION.AMOUNT.MIN, { 
    message: `Минимальная сумма платежа: ${PAYMENTS_CONSTANTS.VALIDATION.AMOUNT.MIN}` 
  })
  @Max(PAYMENTS_CONSTANTS.VALIDATION.AMOUNT.MAX, { 
    message: `Максимальная сумма платежа: ${PAYMENTS_CONSTANTS.VALIDATION.AMOUNT.MAX}` 
  })
  amount: number;

  @ApiPropertyOptional({ 
    description: 'Валюта платежа',
    enum: PaymentCurrency,
    default: PaymentCurrency.RUB,
    example: PaymentCurrency.RUB
  })
  @IsOptional()
  @IsEnum(PaymentCurrency, { message: 'Некорректная валюта' })
  currency?: PaymentCurrency;

  @ApiPropertyOptional({ 
    description: 'Дата платежа (по умолчанию текущая)',
    example: '2025-01-30T12:00:00.000Z'
  })
  @IsOptional()
  @IsDateString({}, { message: 'Некорректный формат даты платежа' })
  paymentDate?: string;

  @ApiPropertyOptional({ 
    description: 'ID транзакции в платежной системе',
    example: 'TXN_20250130_001',
    maxLength: PAYMENTS_CONSTANTS.VALIDATION.TRANSACTION_ID.MAX_LENGTH
  })
  @IsOptional()
  @IsString({ message: 'ID транзакции должен быть строкой' })
  @MaxLength(PAYMENTS_CONSTANTS.VALIDATION.TRANSACTION_ID.MAX_LENGTH, {
    message: `ID транзакции не может превышать ${PAYMENTS_CONSTANTS.VALIDATION.TRANSACTION_ID.MAX_LENGTH} символов`
  })
  transactionId?: string;

  @ApiPropertyOptional({ 
    description: 'Примечания к платежу',
    example: 'Оплата за ремонт двигателя',
    maxLength: PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH
  })
  @IsOptional()
  @IsString({ message: 'Примечания должны быть строкой' })
  @MaxLength(PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH, {
    message: `Примечания не могут превышать ${PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH} символов`
  })
  notes?: string;

  // 🌍 МЕЖДУНАРОДНЫЕ ПОЛЯ
  @ApiPropertyOptional({ 
    description: 'Курс обмена валют',
    example: 1.0
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 }, { message: 'Курс обмена должен быть числом' })
  @Min(0.000001, { message: 'Курс обмена должен быть больше 0' })
  exchangeRate?: number;

  @ApiPropertyOptional({ 
    description: 'Оригинальная сумма в другой валюте',
    example: 150.00
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Оригинальная сумма должна быть числом' })
  @Min(0.01, { message: 'Оригинальная сумма должна быть больше 0' })
  originalAmount?: number;

  @ApiPropertyOptional({ 
    description: 'Оригинальная валюта',
    enum: PaymentCurrency,
    example: PaymentCurrency.USD
  })
  @IsOptional()
  @IsEnum(PaymentCurrency, { message: 'Некорректная оригинальная валюта' })
  originalCurrency?: PaymentCurrency;

  // 🏦 GATEWAY ИНТЕГРАЦИЯ
  @ApiPropertyOptional({ 
    description: 'ID транзакции в платежном шлюзе',
    example: 'pi_1234567890abcdef'
  })
  @IsOptional()
  @IsString({ message: 'ID транзакции в шлюзе должен быть строкой' })
  @MaxLength(255, { message: 'ID транзакции в шлюзе слишком длинный' })
  gatewayTransactionId?: string;

  @ApiPropertyOptional({ 
    description: 'Ответ от платежного шлюза',
    example: { status: 'succeeded', charge_id: 'ch_1234567890' }
  })
  @IsOptional()
  @IsObject({ message: 'Ответ шлюза должен быть объектом' })
  gatewayResponse?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'Комиссия платежного шлюза',
    example: 45.00
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Комиссия должна быть числом' })
  @Min(0, { message: 'Комиссия не может быть отрицательной' })
  gatewayFee?: number;

  // 📄 МЕТАДАННЫЕ
  @ApiPropertyOptional({ 
    description: 'Дополнительные метаданные',
    example: { source: 'mobile_app', campaign: 'winter_2025' }
  })
  @IsOptional()
  @IsObject({ message: 'Метаданные должны быть объектом' })
  metadata?: Record<string, any>;
}
