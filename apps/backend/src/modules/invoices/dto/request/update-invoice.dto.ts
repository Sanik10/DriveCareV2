// src/modules/invoices/dto/request/update-invoice.dto.ts (КРИТИЧЕСКИ ИСПРАВЛЕННЫЙ)
import { 
  IsOptional, IsEnum, IsDateString, IsNumber, Min, Max, IsString, 
  Length, Matches, ValidateIf 
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { InvoiceStatus } from '../../types/invoices.types';
import { INVOICES_CONSTANTS } from '../../constants/invoices.constants';

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ 
    description: 'Статус счета', 
    enum: InvoiceStatus,
    example: InvoiceStatus.PAID
  })
  @IsEnum(InvoiceStatus, { message: 'Статус должен быть одним из допустимых значений' })
  @IsOptional()
  status?: InvoiceStatus;

  @ApiPropertyOptional({ 
    description: 'Новый срок оплаты', 
    example: '2025-02-15',
    format: 'date'
  })
  @IsDateString({}, { message: 'Срок оплаты должен быть в формате YYYY-MM-DD' })
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ 
    description: 'Сумма без налогов', 
    example: 16000,
    minimum: INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN,
    maximum: INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Сумма должна быть числом с максимум 2 знаками после запятой' })
  @Min(INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN, { 
    message: `Сумма должна быть не менее ${INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN}` 
  })
  @Max(INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX, { 
    message: `Сумма не должна превышать ${INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX}` 
  })
  @IsOptional()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({ 
    description: 'Сумма налога', 
    example: 3200,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Сумма налога должна быть числом' })
  @Min(0, { message: 'Сумма налога не может быть отрицательной' })
  @Max(INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX, { 
    message: `Сумма налога не должна превышать ${INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX}` 
  })
  @IsOptional()
  @Type(() => Number)
  taxAmount?: number;

  @ApiPropertyOptional({ 
    description: 'Общая сумма', 
    example: 19200,
    minimum: INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Общая сумма должна быть числом' })
  @Min(INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN, { 
    message: `Общая сумма должна быть не менее ${INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN}` 
  })
  @Max(INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX, { 
    message: `Общая сумма не должна превышать ${INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX}` 
  })
  @IsOptional()
  @Type(() => Number)
  totalAmount?: number;

  @ApiPropertyOptional({ 
    description: 'Примечания к счету', 
    example: 'Обновленные условия оплаты',
    maxLength: INVOICES_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH
  })
  @IsString({ message: 'Примечания должны быть строкой' })
  @Length(0, INVOICES_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH, {
    message: `Примечания не должны превышать ${INVOICES_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH} символов`
  })
  // 🔒 КРИТИЧЕСКАЯ XSS ЗАЩИТА
  @Matches(INVOICES_CONSTANTS.VALIDATION.NOTES.SAFE_PATTERN, {
    message: 'Примечания содержат недопустимые символы. Разрешены только буквы, цифры и основные знаки препинания'
  })
  // 🔒 БЛОКИРОВКА HTML ТЕГОВ
  @ValidateIf((o) => o.notes && /<[^>]*>/g.test(o.notes), {
    message: 'Примечания не должны содержать HTML теги'
  })
  @Transform(({ value }) => value?.trim())
  @IsOptional()
  notes?: string;
}
