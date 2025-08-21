// src/modules/invoices/dto/request/create-invoice.dto.ts (КРИТИЧЕСКИ ИСПРАВЛЕННЫЙ)
import { 
  IsString, IsUUID, IsOptional, IsEnum, IsDateString, IsNumber, 
  Min, Max, IsPositive, Length, Matches, ValidateIf 
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { InvoiceStatus } from '../../types/invoices.types';
import { INVOICES_CONSTANTS } from '../../constants/invoices.constants';

export class CreateInvoiceDto {
  @ApiPropertyOptional({ 
    description: 'ID компании (автоматически устанавливается из токена)', 
    example: '123e4567-e89b-12d3-a456-426614174000' 
  })
  @IsUUID(4, { message: 'Company ID должен быть валидным UUID v4' })
  @IsOptional()
  companyId?: string;

  @ApiProperty({ 
    description: 'ID заказа для создания счета', 
    example: '123e4567-e89b-12d3-a456-426614174001' 
  })
  @IsUUID(4, { message: 'Order ID должен быть валидным UUID v4' })
  orderId: string;

  @ApiPropertyOptional({ 
    description: 'Номер счета (автогенерируется если не указан)', 
    example: 'INV-2025-00001',
    pattern: INVOICES_CONSTANTS.VALIDATION.INVOICE_NUMBER.PATTERN.source
  })
  @IsString({ message: 'Номер счета должен быть строкой' })
  @Length(
    INVOICES_CONSTANTS.VALIDATION.INVOICE_NUMBER.MIN_LENGTH,
    INVOICES_CONSTANTS.VALIDATION.INVOICE_NUMBER.MAX_LENGTH,
    { message: `Номер счета должен быть от ${INVOICES_CONSTANTS.VALIDATION.INVOICE_NUMBER.MIN_LENGTH} до ${INVOICES_CONSTANTS.VALIDATION.INVOICE_NUMBER.MAX_LENGTH} символов` }
  )
  @Matches(INVOICES_CONSTANTS.VALIDATION.INVOICE_NUMBER.PATTERN, {
    message: 'Номер счета должен соответствовать формату INV-YYYY-NNNNN'
  })
  // 🔒 XSS ЗАЩИТА: Проверка на опасные символы
  @Matches(/^[A-Z0-9\-]+$/, {
    message: 'Номер счета может содержать только заглавные буквы, цифры и дефисы'
  })
  @Transform(({ value }) => value?.trim()?.toUpperCase())
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({ 
    description: 'Статус счета', 
    enum: InvoiceStatus, 
    default: InvoiceStatus.ISSUED,
    example: InvoiceStatus.ISSUED
  })
  @IsEnum(InvoiceStatus, { message: 'Статус должен быть одним из допустимых значений' })
  @IsOptional()
  status?: InvoiceStatus;

  @ApiPropertyOptional({ 
    description: 'Дата выставления счета (по умолчанию текущая)', 
    example: '2025-01-01',
    format: 'date'
  })
  @IsDateString({}, { message: 'Дата выставления должна быть в формате YYYY-MM-DD' })
  @IsOptional()
  issueDate?: string;

  @ApiProperty({ 
    description: 'Срок оплаты счета', 
    example: '2025-01-31',
    format: 'date'
  })
  @IsDateString({}, { message: 'Срок оплаты должен быть в формате YYYY-MM-DD' })
  dueDate: string;

  @ApiProperty({ 
    description: 'Сумма без налогов', 
    example: 15000,
    minimum: INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN,
    maximum: INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Сумма должна быть числом с максимум 2 знаками после запятой' })
  @IsPositive({ message: 'Сумма должна быть положительной' })
  @Min(INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN, { 
    message: `Сумма должна быть не менее ${INVOICES_CONSTANTS.VALIDATION.AMOUNT.MIN}` 
  })
  @Max(INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX, { 
    message: `Сумма не должна превышать ${INVOICES_CONSTANTS.VALIDATION.AMOUNT.MAX}` 
  })
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ 
    description: 'Сумма налога (автоматически рассчитывается если не указана)', 
    example: 3000,
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
    description: 'Общая сумма к оплате (автоматически рассчитывается)', 
    example: 18000,
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
    example: 'Счет за техническое обслуживание автомобиля',
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
  // 🔒 ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: Блокировка HTML тегов
  @ValidateIf((o) => o.notes && /<[^>]*>/g.test(o.notes), {
    message: 'Примечания не должны содержать HTML теги'
  })
  @Transform(({ value }) => value?.trim())
  @IsOptional()
  notes?: string;
}

export class CreateInvoiceFromOrderDto {
  @ApiProperty({ 
    description: 'ID заказа для создания счета', 
    example: '123e4567-e89b-12d3-a456-426614174001' 
  })
  @IsUUID(4, { message: 'Order ID должен быть валидным UUID v4' })
  orderId: string;

  @ApiPropertyOptional({ 
    description: 'Срок оплаты (дней от текущей даты)', 
    example: 30,
    default: INVOICES_CONSTANTS.DEFAULTS.PAYMENT_TERMS_DAYS,
    minimum: INVOICES_CONSTANTS.VALIDATION.DUE_DATE.MIN_DAYS_FROM_NOW,
    maximum: INVOICES_CONSTANTS.VALIDATION.DUE_DATE.MAX_DAYS_FROM_NOW
  })
  @IsNumber({}, { message: 'Срок оплаты должен быть числом' })
  @Min(INVOICES_CONSTANTS.VALIDATION.DUE_DATE.MIN_DAYS_FROM_NOW, {
    message: `Срок оплаты должен быть не менее ${INVOICES_CONSTANTS.VALIDATION.DUE_DATE.MIN_DAYS_FROM_NOW} дней`
  })
  @Max(INVOICES_CONSTANTS.VALIDATION.DUE_DATE.MAX_DAYS_FROM_NOW, {
    message: `Срок оплаты не должен превышать ${INVOICES_CONSTANTS.VALIDATION.DUE_DATE.MAX_DAYS_FROM_NOW} дней`
  })
  @IsOptional()
  @Type(() => Number)
  paymentTermsDays?: number;

  @ApiPropertyOptional({ 
    description: 'Применить скидку (%)', 
    example: 10,
    minimum: 0,
    maximum: 100
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Скидка должна быть числом' })
  @Min(0, { message: 'Скидка не может быть отрицательной' })
  @Max(100, { message: 'Скидка не может превышать 100%' })
  @IsOptional()
  @Type(() => Number)
  discountPercent?: number;

  @ApiPropertyOptional({ 
    description: 'Дополнительные примечания', 
    example: 'Скидка 10% за быструю оплату'
  })
  @IsString({ message: 'Примечания должны быть строкой' })
  @Length(0, INVOICES_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH, {
    message: `Примечания не должны превышать ${INVOICES_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH} символов`
  })
  // 🔒 XSS ЗАЩИТА
  @Matches(INVOICES_CONSTANTS.VALIDATION.NOTES.SAFE_PATTERN, {
    message: 'Примечания содержат недопустимые символы'
  })
  @Transform(({ value }) => value?.trim())
  @IsOptional()
  notes?: string;
}
