import { ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsEmail, 
  IsOptional, 
  IsString, 
  IsUrl, 
  IsBoolean, 
  MaxLength,
  Matches,
  ValidateNested
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import * as sanitizeHtml from 'sanitize-html';
import { COMPANIES_CONSTANTS } from '../../constants/companies.constants';
import { WorkingHoursDto } from './create-company.dto'; // ✅ ИСПРАВЛЕНО: Импорт строгой типизации

export class UpdateCompanyDto {
  @ApiPropertyOptional({ 
    description: '🔒 Название компании (автоматически очищается от HTML)',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH
  })
  @IsOptional()
  @IsString({ message: 'Название должно быть строкой' })
  @MaxLength(COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH, { 
    message: `Название не может превышать ${COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH} символов` 
  })
  @Matches(/^[a-zA-Zа-яА-Я0-9\s\-"'№\.(),]+$/, {
    message: 'Название содержит недопустимые символы'
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    
    // ✅ ИСПРАВЛЕНО: XSS Protection
    const sanitized = sanitizeHtml(value.trim(), {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'discard'
    });
    
    return sanitized.replace(/[<>]/g, '');
  })
  name?: string;

  @ApiPropertyOptional({ 
    description: '🔒 Юридическое название (автоматически очищается от HTML)',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH
  })
  @IsOptional()
  @IsString({ message: 'Юридическое название должно быть строкой' })
  @MaxLength(COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH, { 
    message: `Юридическое название не может превышать ${COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH} символов` 
  })
  @Matches(/^[a-zA-Zа-яА-Я0-9\s\-"'№\.(),]+$/, {
    message: 'Юридическое название содержит недопустимые символы'
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    
    // ✅ ИСПРАВЛЕНО: XSS Protection
    const sanitized = sanitizeHtml(value.trim(), {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'discard'
    });
    
    return sanitized.replace(/[<>]/g, '');
  })
  legalName?: string;

  @ApiPropertyOptional({ 
    description: '🔒 ИНН/налоговый номер (только цифры)',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.TAX_NUMBER_MAX_LENGTH
  })
  @IsOptional()
  @IsString({ message: 'Налоговый номер должен быть строкой' })
  @MaxLength(COMPANIES_CONSTANTS.VALIDATION.TAX_NUMBER_MAX_LENGTH, { 
    message: `Налоговый номер не может превышать ${COMPANIES_CONSTANTS.VALIDATION.TAX_NUMBER_MAX_LENGTH} символов` 
  })
  @Matches(/^[0-9]{10,12}$/, {
    message: 'ИНН должен содержать только цифры (10-12 символов)'
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.replace(/\D/g, '');
  })
  taxNumber?: string;

  @ApiPropertyOptional({ 
    description: '🔒 Адрес компании (очищается от HTML, макс. 500 символов)',
    maxLength: 500 // ✅ ИСПРАВЛЕНО: Добавлен лимит
  })
  @IsOptional()
  @IsString({ message: 'Адрес должен быть строкой' })
  @MaxLength(500, { 
    message: 'Адрес не может превышать 500 символов' 
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    
    // ✅ ИСПРАВЛЕНО: XSS Protection для address
    const sanitized = sanitizeHtml(value.trim(), {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'discard'
    });
    
    return sanitized.replace(/[<>]/g, '');
  })
  address?: string;

  @ApiPropertyOptional({ 
    description: '🔒 Телефон компании (автоматическая нормализация)',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.PHONE_MAX_LENGTH
  })
  @IsOptional()
  @IsString({ message: 'Телефон должен быть строкой' })
  @MaxLength(COMPANIES_CONSTANTS.VALIDATION.PHONE_MAX_LENGTH, { 
    message: `Телефон не может превышать ${COMPANIES_CONSTANTS.VALIDATION.PHONE_MAX_LENGTH} символов` 
  })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Некорректный формат телефона. Используйте международный формат'
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.replace(/[^\d+]/g, '');
  })
  phone?: string;

  @ApiPropertyOptional({ 
    description: '🔒 Email компании (автоматическая нормализация)',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.EMAIL_MAX_LENGTH
  })
  @IsOptional()
  @IsEmail({ 
    allow_utf8_local_part: false,
    require_tld: true 
  }, { message: 'Некорректный формат email' })
  @MaxLength(COMPANIES_CONSTANTS.VALIDATION.EMAIL_MAX_LENGTH, { 
    message: `Email не может превышать ${COMPANIES_CONSTANTS.VALIDATION.EMAIL_MAX_LENGTH} символов` 
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim().toLowerCase();
  })
  email?: string;

  @ApiPropertyOptional({ 
    description: 'Веб-сайт компании (строгая валидация URL)',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.WEBSITE_MAX_LENGTH
  })
  @IsOptional()
  @IsUrl({ 
    protocols: ['http', 'https'],
    require_protocol: true 
  }, { message: 'Некорректный формат URL. Используйте http:// или https://' })
  @MaxLength(COMPANIES_CONSTANTS.VALIDATION.WEBSITE_MAX_LENGTH, { 
    message: `URL веб-сайта не может превышать ${COMPANIES_CONSTANTS.VALIDATION.WEBSITE_MAX_LENGTH} символов` 
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim().toLowerCase();
  })
  website?: string;

  @ApiPropertyOptional({ 
    description: 'URL логотипа (только изображения)',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.LOGO_URL_MAX_LENGTH
  })
  @IsOptional()
  @IsUrl({ 
    protocols: ['http', 'https'],
    require_protocol: true 
  }, { message: 'Некорректный формат URL для логотипа' })
  @MaxLength(COMPANIES_CONSTANTS.VALIDATION.LOGO_URL_MAX_LENGTH, { 
    message: `URL логотипа не может превышать ${COMPANIES_CONSTANTS.VALIDATION.LOGO_URL_MAX_LENGTH} символов` 
  })
  @Matches(/\.(jpg|jpeg|png|gif|svg|webp)(\?.*)?$/i, {
    message: 'URL логотипа должен указывать на изображение'
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim();
  })
  logoUrl?: string;

  @ApiPropertyOptional({ 
    description: '🔒 Часы работы (строгая типизация, защита от JSON injection)',
    type: WorkingHoursDto,
    example: COMPANIES_CONSTANTS.DEFAULTS.DEFAULT_WORKING_HOURS
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto; // ✅ ИСПРАВЛЕНО: Строгая типизация

  @ApiPropertyOptional({ description: 'Активна ли компания' })
  @IsOptional()
  @IsBoolean({ message: 'Статус активности должен быть булевым значением' })
  isActive?: boolean;
}
