// src/modules/inventory/suppliers/dto/request/update-supplier.dto.ts
import { IsEnum, IsEmail, IsOptional, IsString, IsBoolean, IsUrl, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierType, SUPPLIER_CONSTRAINTS } from '../../types/suppliers.types';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

const sanitize = (v: any) =>
  typeof v === 'string' ? sanitizeHtml(v.trim(), { allowedTags: [], allowedAttributes: {} }) : v;

export class UpdateSupplierDto {
  @ApiPropertyOptional({ description: 'Название поставщика', example: 'AutoParts Distribution LLC', maxLength: 255 })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_NAME_LENGTH)
  @IsOptional()
  @Transform(({ value }) => sanitize(value))
  name?: string;

  @ApiPropertyOptional({ description: 'Контактное лицо', example: 'Иван Петров', maxLength: 100 })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_CONTACT_NAME_LENGTH)
  @IsOptional()
  @Transform(({ value }) => sanitize(value))
  contactName?: string;

  @ApiPropertyOptional({ description: 'Email поставщика', example: 'sales@autoparts.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_EMAIL_LENGTH)
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  email?: string;

  @ApiPropertyOptional({ description: 'Телефон поставщика (E.164)', example: '+79991234567', maxLength: 50 })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_PHONE_LENGTH)
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Телефон должен быть в формате E.164 (например, +79991234567)' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s+/g, '') : value))
  phone?: string;

  @ApiPropertyOptional({ description: 'Адрес поставщика', example: 'г. Москва, ул. Автомобильная, д. 15, стр. 2', maxLength: 500 })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_ADDRESS_LENGTH)
  @IsOptional()
  @Transform(({ value }) => sanitize(value))
  address?: string;

  @ApiPropertyOptional({ description: 'Город', example: 'Москва', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  @Transform(({ value }) => sanitize(value))
  city?: string;

  @ApiPropertyOptional({ description: 'Страна', example: 'Россия', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  @Transform(({ value }) => sanitize(value))
  country?: string;

  @ApiPropertyOptional({ description: 'Веб-сайт поставщика', example: 'https://autoparts.com', maxLength: 255 })
  @IsUrl()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_WEBSITE_LENGTH)
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  website?: string;

  @ApiPropertyOptional({ description: 'ИНН или налоговый номер', example: '7701234567', maxLength: 50 })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_TAX_NUMBER_LENGTH)
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s+/g, '') : value))
  taxNumber?: string;

  @ApiPropertyOptional({
    description: 'Тип поставщика',
    enum: ['manufacturer', 'distributor', 'wholesaler', 'retailer', 'service_provider', 'other'],
    example: 'distributor',
  })
  @IsEnum(['manufacturer', 'distributor', 'wholesaler', 'retailer', 'service_provider', 'other'])
  @IsOptional()
  supplierType?: SupplierType;

  @ApiPropertyOptional({ description: 'Условия оплаты', example: 'Предоплата 50%, остальное в течение 14 дней', maxLength: 200 })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_PAYMENT_TERMS_LENGTH)
  @IsOptional()
  @Transform(({ value }) => sanitize(value))
  paymentTerms?: string;

  @ApiPropertyOptional({ description: 'Условия доставки', example: 'Доставка по Москве в течение 2-3 дней', maxLength: 200 })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_DELIVERY_TERMS_LENGTH)
  @IsOptional()
  @Transform(({ value }) => sanitize(value))
  deliveryTerms?: string;

  @ApiPropertyOptional({ description: 'Дополнительные заметки', example: 'Надежный поставщик оригинальных запчастей', maxLength: 1000 })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_NOTES_LENGTH)
  @IsOptional()
  @Transform(({ value }) => sanitize(value))
  notes?: string;

  @ApiPropertyOptional({ description: 'Активен ли поставщик', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
