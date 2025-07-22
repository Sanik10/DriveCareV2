import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, IsBoolean, IsObject, MaxLength } from 'class-validator';
import { COMPANIES_CONSTANTS } from '../../constants/companies.constants';

export class CreateCompanyDto {
  @ApiProperty({ 
    description: 'Название компании', 
    example: 'АвтоСервис "Профи"',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH
  })
  @IsNotEmpty({ message: 'Название компании обязательно' })
  @IsString({ message: 'Название должно быть строкой' })
  @MaxLength(COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH, { 
    message: `Название не может превышать ${COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH} символов` 
  })
  name: string;

  @ApiProperty({ 
    description: 'Юридическое название', 
    example: 'ООО "АвтоСервис Профи"',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH
  })
  @IsNotEmpty({ message: 'Юридическое название обязательно' })
  @IsString({ message: 'Юридическое название должно быть строкой' })
  @MaxLength(COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH, { 
    message: `Юридическое название не может превышать ${COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH} символов` 
  })
  legalName: string;

  @ApiPropertyOptional({ 
    description: 'ИНН/налоговый номер', 
    example: '7712345678',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.TAX_NUMBER_MAX_LENGTH
  })
  @IsOptional()
  @IsString({ message: 'Налоговый номер должен быть строкой' })
  @MaxLength(COMPANIES_CONSTANTS.VALIDATION.TAX_NUMBER_MAX_LENGTH, { 
    message: `Налоговый номер не может превышать ${COMPANIES_CONSTANTS.VALIDATION.TAX_NUMBER_MAX_LENGTH} символов` 
  })
  taxNumber?: string;

  @ApiPropertyOptional({ 
    description: 'Адрес компании', 
    example: 'г. Москва, ул. Автомобильная, д. 15'
  })
  @IsOptional()
  @IsString({ message: 'Адрес должен быть строкой' })
  address?: string;

  @ApiPropertyOptional({ 
    description: 'Телефон компании', 
    example: '+7 (495) 123-45-67',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.PHONE_MAX_LENGTH
  })
  @IsOptional()
  @IsString({ message: 'Телефон должен быть строкой' })
  @MaxLength(COMPANIES_CONSTANTS.VALIDATION.PHONE_MAX_LENGTH, { 
    message: `Телефон не может превышать ${COMPANIES_CONSTANTS.VALIDATION.PHONE_MAX_LENGTH} символов` 
  })
  phone?: string;

  @ApiProperty({ 
    description: 'Email компании', 
    example: 'info@autoservice-profi.ru',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.EMAIL_MAX_LENGTH
  })
  @IsNotEmpty({ message: 'Email обязателен' })
  @IsEmail({}, { message: 'Некорректный формат email' })
  @MaxLength(COMPANIES_CONSTANTS.VALIDATION.EMAIL_MAX_LENGTH, { 
    message: `Email не может превышать ${COMPANIES_CONSTANTS.VALIDATION.EMAIL_MAX_LENGTH} символов` 
  })
  email: string;

  @ApiPropertyOptional({ 
    description: 'Веб-сайт компании', 
    example: 'https://autoservice-profi.ru',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.WEBSITE_MAX_LENGTH
  })
  @IsOptional()
  @IsUrl({}, { message: 'Некорректный формат URL' })
  @MaxLength(COMPANIES_CONSTANTS.VALIDATION.WEBSITE_MAX_LENGTH, { 
    message: `URL веб-сайта не может превышать ${COMPANIES_CONSTANTS.VALIDATION.WEBSITE_MAX_LENGTH} символов` 
  })
  website?: string;

  @ApiPropertyOptional({ 
    description: 'URL логотипа', 
    example: 'https://autoservice-profi.ru/logo.png',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.LOGO_URL_MAX_LENGTH
  })
  @IsOptional()
  @IsUrl({}, { message: 'Некорректный формат URL для логотипа' })
  @MaxLength(COMPANIES_CONSTANTS.VALIDATION.LOGO_URL_MAX_LENGTH, { 
    message: `URL логотипа не может превышать ${COMPANIES_CONSTANTS.VALIDATION.LOGO_URL_MAX_LENGTH} символов` 
  })
  logoUrl?: string;

  @ApiPropertyOptional({ 
    description: 'Часы работы в JSON формате',
    example: COMPANIES_CONSTANTS.DEFAULTS.DEFAULT_WORKING_HOURS
  })
  @IsOptional()
  @IsObject({ message: 'Часы работы должны быть объектом' })
  workingHours?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'Активна ли компания', 
    default: true 
  })
  @IsOptional()
  @IsBoolean({ message: 'Статус активности должен быть булевым значением' })
  isActive?: boolean;
}
