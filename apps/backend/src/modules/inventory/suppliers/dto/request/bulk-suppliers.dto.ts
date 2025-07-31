// src/modules/inventory/suppliers/dto/request/bulk-suppliers.dto.ts
import { IsArray, IsEnum, IsOptional, IsBoolean, ValidateNested, ArrayMaxSize, IsString, MaxLength, IsEmail, IsUrl, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SupplierType, SUPPLIER_CONSTRAINTS } from '../../types/suppliers.types';

export class BulkSupplierItem {
  @ApiPropertyOptional({ 
    description: 'ID поставщика (для операций update/deactivate)',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ 
    description: 'Название поставщика',
    example: 'AutoParts Distribution LLC'
  })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_NAME_LENGTH)
  name: string;

  @ApiPropertyOptional({ 
    description: 'Контактное лицо',
    example: 'Иван Петров'
  })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_CONTACT_NAME_LENGTH)
  @IsOptional()
  contactName?: string;

  @ApiPropertyOptional({ 
    description: 'Email поставщика',
    example: 'sales@autoparts.com'
  })
  @IsEmail()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_EMAIL_LENGTH)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ 
    description: 'Телефон поставщика',
    example: '+7 (495) 123-45-67'
  })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_PHONE_LENGTH)
  @Matches(/^[\+\d\sKATEX_INLINE_OPENKATEX_INLINE_CLOSE\-]+$/, {
    message: 'Телефон должен содержать только цифры, пробелы и символы +()-'
  })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ 
    description: 'Адрес поставщика',
    example: 'г. Москва, ул. Автомобильная, д. 15, стр. 2'
  })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_ADDRESS_LENGTH)
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Город' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Страна' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ 
    description: 'Веб-сайт поставщика',
    example: 'https://autoparts.com'
  })
  @IsUrl()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_WEBSITE_LENGTH)
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ 
    description: 'ИНН или налоговый номер',
    example: '7701234567'
  })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_TAX_NUMBER_LENGTH)
  @IsOptional()
  taxNumber?: string;

  @ApiProperty({ 
    description: 'Тип поставщика',
    enum: ['manufacturer', 'distributor', 'wholesaler', 'retailer', 'service_provider', 'other'],
    example: 'distributor'
  })
  @IsEnum(['manufacturer', 'distributor', 'wholesaler', 'retailer', 'service_provider', 'other'])
  supplierType: SupplierType;

  @ApiPropertyOptional({ 
    description: 'Условия оплаты',
    example: 'Предоплата 50%, остальное в течение 14 дней'
  })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_PAYMENT_TERMS_LENGTH)
  @IsOptional()
  paymentTerms?: string;

  @ApiPropertyOptional({ 
    description: 'Условия доставки',
    example: 'Доставка по Москве в течение 2-3 дней'
  })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_DELIVERY_TERMS_LENGTH)
  @IsOptional()
  deliveryTerms?: string;

  @ApiPropertyOptional({ 
    description: 'Дополнительные заметки',
    example: 'Надежный поставщик оригинальных запчастей'
  })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_NOTES_LENGTH)
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ 
    description: 'Активен ли поставщик',
    example: true,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class BulkSuppliersDto {
  @ApiProperty({ 
    description: 'Тип операции',
    enum: ['create', 'update', 'deactivate', 'activate'],
    example: 'create'
  })
  @IsEnum(['create', 'update', 'deactivate', 'activate'])
  operation: 'create' | 'update' | 'deactivate' | 'activate';

  @ApiProperty({ 
    description: 'Список поставщиков для обработки',
    type: [BulkSupplierItem],
    maxItems: 100
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(SUPPLIER_CONSTRAINTS.MAX_BULK_OPERATIONS)
  @Type(() => BulkSupplierItem)
  suppliers: BulkSupplierItem[];

  @ApiPropertyOptional({ 
    description: 'Пропустить валидацию (только для суперадминов)',
    example: false,
    default: false
  })
  @IsBoolean()
  @IsOptional()
  skipValidation?: boolean = false;

  @ApiPropertyOptional({ 
    description: 'Продолжить выполнение при ошибках',
    example: true,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  continueOnError?: boolean = true;

  @ApiPropertyOptional({ 
    description: 'Уведомить о завершении операции',
    example: false,
    default: false
  })
  @IsBoolean()
  @IsOptional()
  notifyOnCompletion?: boolean = false;

  @ApiPropertyOptional({ 
    description: 'Дополнительные заметки к bulk операции',
    example: 'Импорт поставщиков из Excel файла',
    maxLength: 500
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}
