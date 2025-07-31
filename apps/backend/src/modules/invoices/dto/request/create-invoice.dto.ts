// src/modules/invoices/dto/request/create-invoice.dto.ts (ИСПРАВЛЕННАЯ ВЕРСИЯ)
import { IsString, IsUUID, IsOptional, IsEnum, IsDateString, IsNumber, Min, Max, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InvoiceStatus } from '../../types/invoices.types';
import { INVOICES_CONSTANTS } from '../../constants/invoices.constants';

export class CreateInvoiceDto {
  @ApiPropertyOptional({ 
    description: 'ID компании (автоматически устанавливается из токена)', 
    example: '123e4567-e89b-12d3-a456-426614174000' 
  })
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @ApiProperty({ 
    description: 'ID заказа для создания счета', 
    example: '123e4567-e89b-12d3-a456-426614174001' 
  })
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional({ 
    description: 'Номер счета (автогенерируется если не указан)', 
    example: 'INV-2025-00001',
    pattern: INVOICES_CONSTANTS.VALIDATION.INVOICE_NUMBER.PATTERN.source
  })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({ 
    description: 'Статус счета', 
    enum: InvoiceStatus, 
    default: InvoiceStatus.ISSUED,
    example: InvoiceStatus.ISSUED
  })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @ApiPropertyOptional({ 
    description: 'Дата выставления счета (по умолчанию текущая)', 
    example: '2025-01-01',
    format: 'date'
  })
  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @ApiProperty({ 
    description: 'Срок оплаты счета', 
    example: '2025-01-31',
    format: 'date'
  })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ 
    description: 'Сумма без налогов', 
    example: 15000,
    minimum: INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN,
    maximum: INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN)
  @Max(INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ 
    description: 'Сумма налога (автоматически рассчитывается если не указана)', 
    example: 3000,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  taxAmount?: number;

  @ApiPropertyOptional({ 
    description: 'Общая сумма к оплате (автоматически рассчитывается)', 
    example: 18000,
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
    example: 'Счет за техническое обслуживание автомобиля',
    maxLength: INVOICES_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

// Остальной код CreateInvoiceFromOrderDto остается без изменений...
export class CreateInvoiceFromOrderDto {
  @ApiProperty({ 
    description: 'ID заказа для создания счета', 
    example: '123e4567-e89b-12d3-a456-426614174001' 
  })
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional({ 
    description: 'Срок оплаты (дней от текущей даты)', 
    example: 30,
    default: INVOICES_CONSTANTS.DEFAULTS.PAYMENT_TERMS_DAYS,
    minimum: INVOICES_CONSTANTS.VALIDATION.DUE_DATE.MIN_DAYS_FROM_NOW,
    maximum: INVOICES_CONSTANTS.VALIDATION.DUE_DATE.MAX_DAYS_FROM_NOW
  })
  @IsNumber()
  @Min(INVOICES_CONSTANTS.VALIDATION.DUE_DATE.MIN_DAYS_FROM_NOW)
  @Max(INVOICES_CONSTANTS.VALIDATION.DUE_DATE.MAX_DAYS_FROM_NOW)
  @IsOptional()
  @Type(() => Number)
  paymentTermsDays?: number;

  @ApiPropertyOptional({ 
    description: 'Применить скидку (%)', 
    example: 10,
    minimum: 0,
    maximum: 100
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  discountPercent?: number;

  @ApiPropertyOptional({ 
    description: 'Дополнительные примечания', 
    example: 'Скидка 10% за быструю оплату'
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
