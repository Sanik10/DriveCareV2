// src/modules/payments/dto/request/update-payment.dto.ts (✅ XSS PROTECTED)
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import * as sanitizeHtml from 'sanitize-html';
import { 
  IsOptional, 
  IsString, 
  IsEnum,
  IsNumber,
  MaxLength,
  IsObject,
  Matches,
  Min
} from 'class-validator';
import { PaymentStatus } from '../../types/payments.types';
import { PAYMENTS_CONSTANTS } from '../../constants/payments.constants';

export class UpdatePaymentDto {
  @ApiPropertyOptional({ 
    description: 'Новый статус платежа',
    enum: PaymentStatus,
    example: PaymentStatus.PROCESSED
  })
  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'Некорректный статус платежа' }) // ✅ ИСПРАВЛЕНО на русский
  status?: PaymentStatus;

  @ApiPropertyOptional({ 
    description: 'ID транзакции',
    example: 'TXN_ABC123',
    maxLength: PAYMENTS_CONSTANTS.VALIDATION.TRANSACTION_ID.MAX_LENGTH
  })
  @IsOptional()
  @Transform(({ value }) => sanitizeHtml(value, { allowedTags: [] })) // ✅ XSS PROTECTION
  @IsString({ message: 'ID транзакции должен быть строкой' }) // ✅ ИСПРАВЛЕНО на русский
  @Matches(PAYMENTS_CONSTANTS.VALIDATION.TRANSACTION_ID.PATTERN, {
    message: 'ID транзакции содержит недопустимые символы'
  }) // ✅ ДОБАВЛЕНА REGEX VALIDATION
  @MaxLength(PAYMENTS_CONSTANTS.VALIDATION.TRANSACTION_ID.MAX_LENGTH, {
    message: `ID транзакции не может превышать ${PAYMENTS_CONSTANTS.VALIDATION.TRANSACTION_ID.MAX_LENGTH} символов`
  })
  transactionId?: string;

  @ApiPropertyOptional({ 
    description: 'Примечания к платежу',
    example: 'Обновленная информация о платеже',
    maxLength: PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH
  })
  @IsOptional()
  @Transform(({ value }) => sanitizeHtml(value, { allowedTags: [] })) // ✅ XSS PROTECTION
  @IsString({ message: 'Примечания должны быть строкой' }) // ✅ ИСПРАВЛЕНО на русский
  @MaxLength(PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH, {
    message: `Примечания не могут превышать ${PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH} символов`
  })
  notes?: string;

  @ApiPropertyOptional({ 
    description: 'ID транзакции в платежном шлюзе',
    example: 'GATEWAY_TXN_XYZ789'
  })
  @IsOptional()
  @Transform(({ value }) => sanitizeHtml(value, { allowedTags: [] })) // ✅ XSS PROTECTION
  @IsString({ message: 'ID транзакции шлюза должен быть строкой' })
  @MaxLength(255, { message: 'ID транзакции шлюза слишком длинный' }) // ✅ ДОБАВЛЕНО
  gatewayTransactionId?: string;

  @ApiPropertyOptional({ 
    description: 'Комиссия платежного шлюза',
    example: 45.00
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Комиссия должна быть числом' }) // ✅ ДОБАВЛЕНО
  @Min(0, { message: 'Комиссия не может быть отрицательной' }) // ✅ ДОБАВЛЕНО
  gatewayFee?: number; // ✅ ДОБАВЛЕНО

  @ApiPropertyOptional({ 
    description: 'Дополнительные метаданные (максимум 5KB)',
    example: { gateway: 'stripe', customer_id: 'cus_123' }
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return value;
    // ✅ SIZE LIMIT для metadata
    const size = Buffer.byteLength(JSON.stringify(value), 'utf8');
    if (size > 5120) { // 5KB limit для update
      throw new Error('Metadata size cannot exceed 5KB');
    }
    return value;
  })
  @IsObject({ message: 'Метаданные должны быть объектом' })
  metadata?: Record<string, any>;
}
