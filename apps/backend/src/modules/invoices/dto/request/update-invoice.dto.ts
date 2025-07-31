// src/modules/invoices/dto/request/update-invoice.dto.ts (ИСПРАВЛЕННАЯ ВЕРСИЯ)
import { IsOptional, IsEnum, IsDateString, IsNumber, Min, Max, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InvoiceStatus } from '../../types/invoices.types';
import { INVOICES_CONSTANTS } from '../../constants/invoices.constants';

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ 
    description: 'Статус счета', 
    enum: InvoiceStatus,
    example: InvoiceStatus.PAID
  })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @ApiPropertyOptional({ 
    description: 'Новый срок оплаты', 
    example: '2025-02-15',
    format: 'date'
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ 
    description: 'Сумма без налогов', 
    example: 16000,
    minimum: INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN,
    maximum: INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN)
  @Max(INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX)
  @IsOptional()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({ 
    description: 'Сумма налога', 
    example: 3200,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  taxAmount?: number;

  @ApiPropertyOptional({ 
    description: 'Общая сумма', 
    example: 19200,
    minimum: INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN)
  @Max(INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX)
  @IsOptional()
  @Type(() => Number)
  totalAmount?: number;

  @ApiPropertyOptional({ 
    description: 'Примечания к счету', 
    example: 'Обновленные условия оплаты',
    maxLength: INVOICES_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
