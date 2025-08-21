import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsEmail, 
  IsNotEmpty, 
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

// ✅ ИСПРАВЛЕНО: Обязательные поля для совместимости с types
export class DayScheduleDto {
  @ApiProperty({ description: 'Открыт ли день' })
  @IsBoolean({ message: 'isOpen должно быть булевым значением' })
  isOpen: boolean;

  @ApiProperty({ // ✅ ИСПРАВЛЕНО: Убрано Optional - теперь обязательное
    description: 'Время открытия (HH:mm)', 
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
    example: '09:00'
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Время должно быть в формате HH:mm (например, 09:00)'
  })
  open: string; // ✅ ИСПРАВЛЕНО: Убрано ? - теперь обязательное

  @ApiProperty({ // ✅ ИСПРАВЛЕНО: Убрано Optional - теперь обязательное
    description: 'Время закрытия (HH:mm)', 
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
    example: '18:00'
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Время должно быть в формате HH:mm (например, 18:00)'
  })
  close: string; // ✅ ИСПРАВЛЕНО: Убрано ? - теперь обязательное
}

export class WorkingHoursDto {
  @ApiProperty({ type: DayScheduleDto })
  @ValidateNested()
  @Type(() => DayScheduleDto)
  monday: DayScheduleDto;

  @ApiProperty({ type: DayScheduleDto })
  @ValidateNested()
  @Type(() => DayScheduleDto)
  tuesday: DayScheduleDto;

  @ApiProperty({ type: DayScheduleDto })
  @ValidateNested()
  @Type(() => DayScheduleDto)
  wednesday: DayScheduleDto;

  @ApiProperty({ type: DayScheduleDto })
  @ValidateNested()
  @Type(() => DayScheduleDto)
  thursday: DayScheduleDto;

  @ApiProperty({ type: DayScheduleDto })
  @ValidateNested()
  @Type(() => DayScheduleDto)
  friday: DayScheduleDto;

  @ApiProperty({ type: DayScheduleDto })
  @ValidateNested()
  @Type(() => DayScheduleDto)
  saturday: DayScheduleDto;

  @ApiProperty({ type: DayScheduleDto })
  @ValidateNested()
  @Type(() => DayScheduleDto)
  sunday: DayScheduleDto;

  [day: string]: DayScheduleDto;
}

export class CreateCompanyDto {
  @ApiProperty({ 
    description: '🔒 Название компании (автоматически очищается от HTML и опасных символов)', 
    example: 'АвтоСервис "Профи"',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH
  })
  @IsNotEmpty({ message: 'Название компании обязательно' })
  @IsString({ message: 'Название должно быть строкой' })
  @MaxLength(COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH, { 
    message: `Название не может превышать ${COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH} символов` 
  })
  @Matches(/^[a-zA-Zа-яА-Я0-9\s\-"'№\.(),]+$/, {
    message: 'Название содержит недопустимые символы. Разрешены: буквы, цифры, пробелы, дефисы, кавычки, скобки, точки, номер'
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    
    const sanitized = sanitizeHtml(value.trim(), {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'discard'
    });
    
    return sanitized.replace(/[<>]/g, '');
  })
  name: string;

  @ApiProperty({ 
    description: '🔒 Юридическое название (автоматически очищается от HTML)', 
    example: 'ООО "АвтоСервис Профи"',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH
  })
  @IsNotEmpty({ message: 'Юридическое название обязательно' })
  @IsString({ message: 'Юридическое название должно быть строкой' })
  @MaxLength(COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH, { 
    message: `Юридическое название не может превышать ${COMPANIES_CONSTANTS.VALIDATION.NAME_MAX_LENGTH} символов` 
  })
  @Matches(/^[a-zA-Zа-яА-Я0-9\s\-"'№\.(),]+$/, {
    message: 'Юридическое название содержит недопустимые символы'
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    
    const sanitized = sanitizeHtml(value.trim(), {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'discard'
    });
    
    return sanitized.replace(/[<>]/g, '');
  })
  legalName: string;

  @ApiPropertyOptional({ 
    description: '🔒 ИНН/налоговый номер (только цифры, автоматическая очистка)', 
    example: '7712345678',
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
    example: 'г. Москва, ул. Автомобильная, д. 15',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'Адрес должен быть строкой' })
  @MaxLength(500, { 
    message: 'Адрес не может превышать 500 символов' 
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    
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
    example: '+7 (495) 123-45-67',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.PHONE_MAX_LENGTH
  })
  @IsOptional()
  @IsString({ message: 'Телефон должен быть строкой' })
  @MaxLength(COMPANIES_CONSTANTS.VALIDATION.PHONE_MAX_LENGTH, { 
    message: `Телефон не может превышать ${COMPANIES_CONSTANTS.VALIDATION.PHONE_MAX_LENGTH} символов` 
  })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Некорректный формат телефона. Используйте международный формат (например, +71234567890)'
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.replace(/[^\d+]/g, '');
  })
  phone?: string;

  @ApiProperty({ 
    description: '🔒 Email компании (автоматическая нормализация)', 
    example: 'info@autoservice-profi.ru',
    maxLength: COMPANIES_CONSTANTS.VALIDATION.EMAIL_MAX_LENGTH
  })
  @IsNotEmpty({ message: 'Email обязателен' })
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
  email: string;

  @ApiPropertyOptional({ 
    description: 'Веб-сайт компании (строгая валидация URL)', 
    example: 'https://autoservice-profi.ru',
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
    example: 'https://autoservice-profi.ru/logo.png',
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
    message: 'URL логотипа должен указывать на изображение (jpg, png, gif, svg, webp)'
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
  workingHours?: WorkingHoursDto;

  @ApiPropertyOptional({ 
    description: 'Активна ли компания', 
    default: true 
  })
  @IsOptional()
  @IsBoolean({ message: 'Статус активности должен быть булевым значением' })
  isActive?: boolean;
}
