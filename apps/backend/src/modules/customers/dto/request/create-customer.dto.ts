// apps/backend/src/modules/customers/dto/request/create-customer.dto.ts
import { 
  IsString, 
  IsEmail, 
  IsEnum, 
  IsOptional, 
  IsBoolean, 
  IsInt,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerType } from '../../../../database/entities/customer.entity';
import { CUSTOMERS_CONSTANTS } from '../../constants/customers.constants';
import { Transform } from 'class-transformer';

/**
 * Простая санитизация: удаление HTML-тегов и trim
 */
function sanitizePlainText(value?: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;
  return value.replace(/<[^>]*>/g, '').trim();
}

/**
 * DTO для создания нового клиента
 * 🔒 SECURITY: companyId автоматически берется из токена пользователя
 */
export class CreateCustomerDto {
  @ApiPropertyOptional({ 
    example: CustomerType.INDIVIDUAL, 
    description: 'Тип клиента (физическое или юридическое лицо)',
    enum: CustomerType,
    default: CustomerType.INDIVIDUAL
  })
  @IsEnum(CustomerType, { message: 'Тип клиента должен быть individual или company' })
  @IsOptional()
  type?: CustomerType = CustomerType.INDIVIDUAL;

  @ApiPropertyOptional({ 
    example: 'Иван', 
    description: 'Имя клиента (обязательно для физических лиц)',
    minLength: CUSTOMERS_CONSTANTS.VALIDATION.MIN_NAME_LENGTH,
    maxLength: CUSTOMERS_CONSTANTS.VALIDATION.MAX_NAME_LENGTH
  })
  @Transform(({ value }) => sanitizePlainText(value))
  @IsString({ message: 'Имя должно быть строкой' })
  @MinLength(CUSTOMERS_CONSTANTS.VALIDATION.MIN_NAME_LENGTH)
  @MaxLength(CUSTOMERS_CONSTANTS.VALIDATION.MAX_NAME_LENGTH)
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ 
    example: 'Иванов', 
    description: 'Фамилия клиента (обязательно для физических лиц)',
    minLength: CUSTOMERS_CONSTANTS.VALIDATION.MIN_NAME_LENGTH,
    maxLength: CUSTOMERS_CONSTANTS.VALIDATION.MAX_NAME_LENGTH
  })
  @Transform(({ value }) => sanitizePlainText(value))
  @IsString({ message: 'Фамилия должна быть строкой' })
  @MinLength(CUSTOMERS_CONSTANTS.VALIDATION.MIN_NAME_LENGTH)
  @MaxLength(CUSTOMERS_CONSTANTS.VALIDATION.MAX_NAME_LENGTH)
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ 
    example: 'ООО "Транспортная компания"', 
    description: 'Название компании (обязательно для юридических лиц)',
    maxLength: CUSTOMERS_CONSTANTS.VALIDATION.MAX_COMPANY_NAME_LENGTH
  })
  @Transform(({ value }) => sanitizePlainText(value))
  @IsString({ message: 'Название компании должно быть строкой' })
  @MaxLength(CUSTOMERS_CONSTANTS.VALIDATION.MAX_COMPANY_NAME_LENGTH)
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ 
    example: '1234567890', 
    description: 'ИНН/налоговый номер (для юридических лиц)',
    maxLength: CUSTOMERS_CONSTANTS.VALIDATION.MAX_TAX_NUMBER_LENGTH
  })
  @Transform(({ value }) => sanitizePlainText(value))
  @IsString({ message: 'Налоговый номер должен быть строкой' })
  @MaxLength(CUSTOMERS_CONSTANTS.VALIDATION.MAX_TAX_NUMBER_LENGTH)
  @IsOptional()
  taxNumber?: string;

  @ApiProperty({ 
    example: 'client@example.com', 
    description: 'Email клиента (уникальный в рамках компании)',
    format: 'email',
    maxLength: CUSTOMERS_CONSTANTS.VALIDATION.MAX_EMAIL_LENGTH
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Некорректный формат email адреса' })
  @MaxLength(CUSTOMERS_CONSTANTS.VALIDATION.MAX_EMAIL_LENGTH)
  email: string;

  @ApiProperty({ 
    example: '+7 (900) 123-45-67', 
    description: 'Телефон клиента в международном формате',
    maxLength: CUSTOMERS_CONSTANTS.VALIDATION.MAX_PHONE_LENGTH
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Телефон должен быть строкой' })
  @MaxLength(CUSTOMERS_CONSTANTS.VALIDATION.MAX_PHONE_LENGTH)
  phone: string;

  @ApiPropertyOptional({ 
    example: 'г. Москва, ул. Примерная, д. 1, кв. 10', 
    description: 'Полный адрес клиента'
  })
  @Transform(({ value }) => sanitizePlainText(value))
  @IsString({ message: 'Адрес должен быть строкой' })
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ 
    example: 'website', 
    description: 'Источник привлечения клиента (сайт, реклама, рекомендация и т.д.)',
    maxLength: CUSTOMERS_CONSTANTS.VALIDATION.MAX_SOURCE_LENGTH
  })
  @Transform(({ value }) => sanitizePlainText(value))
  @IsString({ message: 'Источник должен быть строкой' })
  @MaxLength(CUSTOMERS_CONSTANTS.VALIDATION.MAX_SOURCE_LENGTH)
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ 
    example: 0, 
    description: 'Начальное количество баллов лояльности',
    default: CUSTOMERS_CONSTANTS.DEFAULTS.DEFAULT_LOYALTY_POINTS,
    minimum: 0
  })
  @IsInt({ message: 'Баллы лояльности должны быть целым числом' })
  @Min(0)
  @IsOptional()
  loyaltyPoints?: number = CUSTOMERS_CONSTANTS.DEFAULTS.DEFAULT_LOYALTY_POINTS;

  @ApiPropertyOptional({ 
    example: 'Предпочитает обслуживание в выходные дни', 
    description: 'Дополнительные примечания о клиенте'
  })
  @Transform(({ value }) => sanitizePlainText(value))
  @IsString({ message: 'Примечания должны быть строкой' })
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Активен ли клиент',
    default: CUSTOMERS_CONSTANTS.DEFAULTS.DEFAULT_IS_ACTIVE
  })
  @IsBoolean({ message: 'Статус активности должен быть булевым значением' })
  @IsOptional()
  isActive?: boolean = CUSTOMERS_CONSTANTS.DEFAULTS.DEFAULT_IS_ACTIVE;

  // 152‑ФЗ: согласия
  @ApiPropertyOptional({
    example: true,
    description: 'Согласие на маркетинговые коммуникации (email/SMS/звонки)',
  })
  @IsBoolean()
  @IsOptional()
  marketingConsent?: boolean;

  @ApiPropertyOptional({
    example: '1.0',
    description: 'Версия политики конфиденциальности, на которую дано согласие (должна совпадать с PRIVACY_POLICY_VERSION)',
    maxLength: 50,
  })
  @Transform(({ value }) => sanitizePlainText(value))
  @IsString()
  @MaxLength(50)
  @IsOptional()
  pdpConsentVersion?: string;
}
