// src/modules/payments/dto/request/refund-payment.dto.ts (ИСПРАВЛЕННАЯ ВЕРСИЯ)
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsNumber, 
  IsString, 
  IsOptional, 
  IsUUID,
  Min, 
  MaxLength 
} from 'class-validator';
import { PAYMENTS_CONSTANTS } from '../../constants/payments.constants';

export class RefundPaymentDto {
  @ApiProperty({ 
    description: 'ID платежа для возврата',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID(4, { message: 'ID платежа должен быть валидным UUID' })
  paymentId: string;

  @ApiProperty({ 
    description: 'Сумма возврата',
    example: 5000.00,
    minimum: PAYMENTS_CONSTANTS.VALIDATION.REFUND.MIN_AMOUNT
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Сумма возврата должна быть числом с максимум 2 знаками после запятой' })
  @Min(PAYMENTS_CONSTANTS.VALIDATION.REFUND.MIN_AMOUNT, { 
    message: `Минимальная сумма возврата: ${PAYMENTS_CONSTANTS.VALIDATION.REFUND.MIN_AMOUNT}` 
  })
  amount: number;

  @ApiProperty({ 
    description: 'Причина возврата',
    example: 'Некачественная услуга',
    maxLength: PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH
  })
  @IsString({ message: 'Причина возврата должна быть строкой' })
  @MaxLength(PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH, {
    message: `Причина возврата не может превышать ${PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH} символов`
  })
  reason: string;

  @ApiPropertyOptional({ 
    description: 'Дополнительные примечания к возврату',
    example: 'Возврат по требованию клиента',
    maxLength: PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH
  })
  @IsOptional()
  @IsString({ message: 'Примечания должны быть строкой' })
  @MaxLength(PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH, {
    message: `Примечания не могут превышать ${PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH} символов`
  })
  notes?: string;

  @ApiPropertyOptional({ 
    description: 'ID способа возврата (может отличаться от оригинального платежа)',
    example: '789e0123-e89b-12d3-a456-426614174002'
  })
  @IsOptional()
  @IsUUID(4, { message: 'ID способа возврата должен быть валидным UUID' })
  refundMethodId?: string;
}
