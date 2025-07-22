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

/**
 * DTO для создания нового клиента
 * 🔒 SECURITY: companyId автоматически берется из токена пользователя
 */
export class CreateCustomerDto {
  // 🔥 ИСПРАВЛЕНО: Убрали companyId - заполняется автоматически из req.user.companyId

  /**
   * Тип клиента: физическое или юридическое лицо
   */
  @ApiPropertyOptional({ 
    example: CustomerType.INDIVIDUAL, 
    description: 'Тип клиента (физическое или юридическое лицо)',
    enum: CustomerType,
    default: CustomerType.INDIVIDUAL
  })
  @IsEnum(CustomerType, { message: 'Тип клиента должен быть individual или company' })
  @IsOptional()
  type?: CustomerType = CustomerType.INDIVIDUAL;

  /**
   * Имя клиента (обязательно для физических лиц)
   */
  @ApiPropertyOptional({ 
    example: 'Иван', 
    description: 'Имя клиента (обязательно для физических лиц)',
    minLength: CUSTOMERS_CONSTANTS.VALIDATION.MIN_NAME_LENGTH,
    maxLength: CUSTOMERS_CONSTANTS.VALIDATION.MAX_NAME_LENGTH
  })
  @IsString({ message: 'Имя должно быть строкой' })
  @MinLength(CUSTOMERS_CONSTANTS.VALIDATION.MIN_NAME_LENGTH, { 
    message: `Имя должно содержать минимум ${CUSTOMERS_CONSTANTS.VALIDATION.MIN_NAME_LENGTH} символа` 
  })
  @MaxLength(CUSTOMERS_CONSTANTS.VALIDATION.MAX_NAME_LENGTH, { 
    message: `Имя не может превышать ${CUSTOMERS_CONSTANTS.VALIDATION.MAX_NAME_LENGTH} символов` 
  })
  @IsOptional()
  firstName?: string;

  /**
   * Фамилия клиента (обязательно для физических лиц)
   */
  @ApiPropertyOptional({ 
    example: 'Иванов', 
    description: 'Фамилия клиента (обязательно для физических лиц)',
    minLength: CUSTOMERS_CONSTANTS.VALIDATION.MIN_NAME_LENGTH,
    maxLength: CUSTOMERS_CONSTANTS.VALIDATION.MAX_NAME_LENGTH
  })
  @IsString({ message: 'Фамилия должна быть строкой' })
  @MinLength(CUSTOMERS_CONSTANTS.VALIDATION.MIN_NAME_LENGTH, { 
    message: `Фамилия должна содержать минимум ${CUSTOMERS_CONSTANTS.VALIDATION.MIN_NAME_LENGTH} символа` 
  })
  @MaxLength(CUSTOMERS_CONSTANTS.VALIDATION.MAX_NAME_LENGTH, { 
    message: `Фамилия не может превышать ${CUSTOMERS_CONSTANTS.VALIDATION.MAX_NAME_LENGTH} символов` 
  })
  @IsOptional()
  lastName?: string;

  /**
   * Название компании (обязательно для юридических лиц)
   */
  @ApiPropertyOptional({ 
    example: 'ООО "Транспортная компания"', 
    description: 'Название компании (обязательно для юридических лиц)',
    maxLength: CUSTOMERS_CONSTANTS.VALIDATION.MAX_COMPANY_NAME_LENGTH
  })
  @IsString({ message: 'Название компании должно быть строкой' })
  @MaxLength(CUSTOMERS_CONSTANTS.VALIDATION.MAX_COMPANY_NAME_LENGTH, { 
    message: `Название компании не может превышать ${CUSTOMERS_CONSTANTS.VALIDATION.MAX_COMPANY_NAME_LENGTH} символов` 
  })
  @IsOptional()
  companyName?: string;

  /**
   * Налоговый номер (ИНН для юридических лиц)
   */
  @ApiPropertyOptional({ 
    example: '1234567890', 
    description: 'ИНН/налоговый номер (для юридических лиц)',
    maxLength: CUSTOMERS_CONSTANTS.VALIDATION.MAX_TAX_NUMBER_LENGTH
  })
  @IsString({ message: 'Налоговый номер должен быть строкой' })
  @MaxLength(CUSTOMERS_CONSTANTS.VALIDATION.MAX_TAX_NUMBER_LENGTH, { 
    message: `Налоговый номер не может превышать ${CUSTOMERS_CONSTANTS.VALIDATION.MAX_TAX_NUMBER_LENGTH} символов` 
  })
  @IsOptional()
  taxNumber?: string;

  /**
   * Email адрес клиента (обязательное поле, уникальное в рамках компании)
   */
  @ApiProperty({ 
    example: 'client@example.com', 
    description: 'Email клиента (уникальный в рамках компании)',
    format: 'email',
    maxLength: CUSTOMERS_CONSTANTS.VALIDATION.MAX_EMAIL_LENGTH
  })
  @IsEmail({}, { message: 'Некорректный формат email адреса' })
  @MaxLength(CUSTOMERS_CONSTANTS.VALIDATION.MAX_EMAIL_LENGTH, { 
    message: `Email не может превышать ${CUSTOMERS_CONSTANTS.VALIDATION.MAX_EMAIL_LENGTH} символов` 
  })
  email: string;

  /**
   * Телефонный номер клиента
   */
  @ApiProperty({ 
    example: '+7 (900) 123-45-67', 
    description: 'Телефон клиента в международном формате',
    maxLength: CUSTOMERS_CONSTANTS.VALIDATION.MAX_PHONE_LENGTH
  })
  @IsString({ message: 'Телефон должен быть строкой' })
  @MaxLength(CUSTOMERS_CONSTANTS.VALIDATION.MAX_PHONE_LENGTH, { 
    message: `Телефон не может превышать ${CUSTOMERS_CONSTANTS.VALIDATION.MAX_PHONE_LENGTH} символов` 
  })
  phone: string;

  /**
   * Адрес клиента
   */
  @ApiPropertyOptional({ 
    example: 'г. Москва, ул. Примерная, д. 1, кв. 10', 
    description: 'Полный адрес клиента'
  })
  @IsString({ message: 'Адрес должен быть строкой' })
  @IsOptional()
  address?: string;

  /**
   * Источник привлечения клиента
   */
  @ApiPropertyOptional({ 
    example: 'website', 
    description: 'Источник привлечения клиента (сайт, реклама, рекомендация и т.д.)',
    maxLength: CUSTOMERS_CONSTANTS.VALIDATION.MAX_SOURCE_LENGTH
  })
  @IsString({ message: 'Источник должен быть строкой' })
  @MaxLength(CUSTOMERS_CONSTANTS.VALIDATION.MAX_SOURCE_LENGTH, { 
    message: `Источник не может превышать ${CUSTOMERS_CONSTANTS.VALIDATION.MAX_SOURCE_LENGTH} символов` 
  })
  @IsOptional()
  source?: string;

  /**
   * Начальные баллы лояльности
   */
  @ApiPropertyOptional({ 
    example: 0, 
    description: 'Начальное количество баллов лояльности',
    default: CUSTOMERS_CONSTANTS.DEFAULTS.DEFAULT_LOYALTY_POINTS,
    minimum: 0
  })
  @IsInt({ message: 'Баллы лояльности должны быть целым числом' })
  @Min(0, { message: 'Баллы лояльности не могут быть отрицательными' })
  @IsOptional()
  loyaltyPoints?: number = CUSTOMERS_CONSTANTS.DEFAULTS.DEFAULT_LOYALTY_POINTS;

  /**
   * Примечания о клиенте
   */
  @ApiPropertyOptional({ 
    example: 'Предпочитает обслуживание в выходные дни', 
    description: 'Дополнительные примечания о клиенте'
  })
  @IsString({ message: 'Примечания должны быть строкой' })
  @IsOptional()
  notes?: string;

  /**
   * Статус активности клиента
   */
  @ApiPropertyOptional({ 
    example: true, 
    description: 'Активен ли клиент',
    default: CUSTOMERS_CONSTANTS.DEFAULTS.DEFAULT_IS_ACTIVE
  })
  @IsBoolean({ message: 'Статус активности должен быть булевым значением' })
  @IsOptional()
  isActive?: boolean = CUSTOMERS_CONSTANTS.DEFAULTS.DEFAULT_IS_ACTIVE;
}
