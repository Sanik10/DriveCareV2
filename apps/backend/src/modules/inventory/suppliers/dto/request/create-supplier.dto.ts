// src/modules/inventory/suppliers/dto/request/create-supplier.dto.ts
import { IsEnum, IsEmail, IsOptional, IsString, IsBoolean, IsUrl, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierType, SUPPLIER_CONSTRAINTS } from '../../types/suppliers.types';

export class CreateSupplierDto {
  @ApiProperty({ 
    description: 'Название поставщика',
    example: 'AutoParts Distribution LLC',
    maxLength: 255
  })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_NAME_LENGTH)
  name: string;

  @ApiPropertyOptional({ 
    description: 'Контактное лицо',
    example: 'Иван Петров',
    maxLength: 100
  })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_CONTACT_NAME_LENGTH)
  @IsOptional()
  contactName?: string;

  @ApiPropertyOptional({ 
    description: 'Email поставщика',
    example: 'sales@autoparts.com',
    maxLength: 255
  })
  @IsEmail()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_EMAIL_LENGTH)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ 
    description: 'Телефон поставщика',
    example: '+7 (495) 123-45-67',
    maxLength: 50
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
    example: 'г. Москва, ул. Автомобильная, д. 15, стр. 2',
    maxLength: 500
  })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_ADDRESS_LENGTH)
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ 
    description: 'Город',
    example: 'Москва',
    maxLength: 100
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ 
    description: 'Страна',
    example: 'Россия',
    maxLength: 100
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ 
    description: 'Веб-сайт поставщика',
    example: 'https://autoparts.com',
    maxLength: 255
  })
  @IsUrl()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_WEBSITE_LENGTH)
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ 
    description: 'ИНН или налоговый номер',
    example: '7701234567',
    maxLength: 50
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
    example: 'Предоплата 50%, остальное в течение 14 дней',
    maxLength: 200
  })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_PAYMENT_TERMS_LENGTH)
  @IsOptional()
  paymentTerms?: string;

  @ApiPropertyOptional({ 
    description: 'Условия доставки',
    example: 'Доставка по Москве в течение 2-3 дней',
    maxLength: 200
  })
  @IsString()
  @MaxLength(SUPPLIER_CONSTRAINTS.MAX_DELIVERY_TERMS_LENGTH)
  @IsOptional()
  deliveryTerms?: string;

  @ApiPropertyOptional({ 
    description: 'Дополнительные заметки',
    example: 'Надежный поставщик оригинальных запчастей',
    maxLength: 1000
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
  isActive?: boolean = true;
}
