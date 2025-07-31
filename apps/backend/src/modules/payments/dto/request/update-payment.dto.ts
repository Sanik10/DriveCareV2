// src/modules/payments/dto/request/update-payment.dto.ts (ИСПРАВЛЕННАЯ ВЕРСИЯ)
import { ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsOptional, 
  IsString, 
  IsEnum,
  MaxLength,
  IsObject
} from 'class-validator';
import { PaymentStatus } from '../../types/payments.types'; // ✅ ИСПРАВЛЕНО
import { PAYMENTS_CONSTANTS } from '../../constants/payments.constants';

export class UpdatePaymentDto {
  @ApiPropertyOptional({ 
    description: 'Новый статус платежа',
    enum: PaymentStatus,
    example: PaymentStatus.PROCESSED
  })
  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'Invalid payment status' })
  status?: PaymentStatus; // ✅ ИСПРАВЛЕНО

  @ApiPropertyOptional({ 
    description: 'ID транзакции',
    example: 'TXN_ABC123',
    maxLength: PAYMENTS_CONSTANTS.VALIDATION.TRANSACTION_ID.MAX_LENGTH
  })
  @IsOptional()
  @IsString({ message: 'Transaction ID must be a string' })
  @MaxLength(PAYMENTS_CONSTANTS.VALIDATION.TRANSACTION_ID.MAX_LENGTH, {
    message: `Transaction ID cannot exceed ${PAYMENTS_CONSTANTS.VALIDATION.TRANSACTION_ID.MAX_LENGTH} characters`
  })
  transactionId?: string;

  @ApiPropertyOptional({ 
    description: 'Примечания к платежу',
    example: 'Обновленная информация о платеже',
    maxLength: PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH, {
    message: `Notes cannot exceed ${PAYMENTS_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH} characters`
  })
  notes?: string;

  @ApiPropertyOptional({ 
    description: 'ID транзакции в платежном шлюзе',
    example: 'GATEWAY_TXN_XYZ789'
  })
  @IsOptional()
  @IsString({ message: 'Gateway transaction ID must be a string' })
  gatewayTransactionId?: string;

  @ApiPropertyOptional({ 
    description: 'Дополнительные метаданные',
    example: { gateway: 'stripe', customer_id: 'cus_123' }
  })
  @IsOptional()
  @IsObject({ message: 'Metadata must be an object' })
  metadata?: Record<string, any>;
}
