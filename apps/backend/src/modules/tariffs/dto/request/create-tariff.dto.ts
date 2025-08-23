// path: apps/backend/src/modules/tariffs/dto/request/create-tariff.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsObject,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';
import { TARIFFS_CONSTANTS } from '../../constants/tariffs.constants';

export class CreateTariffDto {
  @ApiProperty({
    description: 'Название тарифного плана',
    example: 'Стандарт',
    maxLength: TARIFFS_CONSTANTS.VALIDATION.NAME_MAX_LENGTH,
  })
  @IsNotEmpty({ message: 'Название тарифа обязательно' })
  @IsString({ message: 'Название должно быть строкой' })
  @MaxLength(TARIFFS_CONSTANTS.VALIDATION.NAME_MAX_LENGTH, {
    message: `Название не может превышать ${TARIFFS_CONSTANTS.VALIDATION.NAME_MAX_LENGTH} символов`,
  })
  @Transform(({ value }) =>
    typeof value === 'string'
      ? sanitizeHtml(value.trim().replace(/\s+/g, ' '), { allowedTags: [], allowedAttributes: {} })
      : value,
  )
  name: string;

  @ApiPropertyOptional({
    description: 'Описание тарифного плана',
    example: 'Идеальный выбор для средних автосервисов с базовой аналитикой',
    maxLength: TARIFFS_CONSTANTS.VALIDATION.DESCRIPTION_MAX_LENGTH,
  })
  @IsOptional()
  @IsString({ message: 'Описание должно быть строкой' })
  @MaxLength(TARIFFS_CONSTANTS.VALIDATION.DESCRIPTION_MAX_LENGTH, {
    message: `Описание не может превышать ${TARIFFS_CONSTANTS.VALIDATION.DESCRIPTION_MAX_LENGTH} символов`,
  })
  @Transform(({ value }) =>
    typeof value === 'string'
      ? sanitizeHtml(value.trim().replace(/\s+/g, ' '), { allowedTags: [], allowedAttributes: {} })
      : value,
  )
  description?: string;

  @ApiProperty({
    description: 'Цена за месяц (в рублях)',
    example: 2500,
    minimum: TARIFFS_CONSTANTS.VALIDATION.MIN_MONTHLY_PRICE,
    maximum: TARIFFS_CONSTANTS.DEFAULTS.MAX_PRICE,
  })
  @IsNotEmpty({ message: 'Месячная цена обязательна' })
  @IsNumber({}, { message: 'Месячная цена должна быть числом' })
  @Min(TARIFFS_CONSTANTS.VALIDATION.MIN_MONTHLY_PRICE, {
    message: `Месячная цена не может быть меньше ${TARIFFS_CONSTANTS.VALIDATION.MIN_MONTHLY_PRICE}`,
  })
  @Max(TARIFFS_CONSTANTS.DEFAULTS.MAX_PRICE, {
    message: `Месячная цена слишком большая`,
  })
  @Type(() => Number)
  priceMonthly: number;

  @ApiProperty({
    description: 'Цена за год (в рублях)',
    example: 25000,
    minimum: TARIFFS_CONSTANTS.VALIDATION.MIN_YEARLY_PRICE,
    maximum: TARIFFS_CONSTANTS.DEFAULTS.MAX_PRICE,
  })
  @IsNotEmpty({ message: 'Годовая цена обязательна' })
  @IsNumber({}, { message: 'Годовая цена должна быть числом' })
  @Min(TARIFFS_CONSTANTS.VALIDATION.MIN_YEARLY_PRICE, {
    message: `Годовая цена не может быть меньше ${TARIFFS_CONSTANTS.VALIDATION.MIN_YEARLY_PRICE}`,
  })
  @Max(TARIFFS_CONSTANTS.DEFAULTS.MAX_PRICE, {
    message: `Годовая цена слишком большая`,
  })
  @Type(() => Number)
  priceYearly: number;

  @ApiPropertyOptional({
    description: 'Максимальное количество пользователей (null = безлимит)',
    example: 10,
    minimum: 1,
    maximum: TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Лимит пользователей должен быть числом' })
  @Min(1, { message: 'Лимит пользователей должен быть больше 0' })
  @Max(TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE, {
    message: `Лимит пользователей слишком большой`,
  })
  @Type(() => Number)
  maxUsers?: number;

  @ApiPropertyOptional({
    description: 'Максимальное количество клиентов (null = безлимит)',
    example: 200,
    minimum: 1,
    maximum: TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Лимит клиентов должен быть числом' })
  @Min(1, { message: 'Лимит клиентов должен быть больше 0' })
  @Max(TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE, {
    message: `Лимит клиентов слишком большой`,
  })
  @Type(() => Number)
  maxCustomers?: number;

  @ApiPropertyOptional({
    description: 'Максимальное количество транспортных средств (null = безлимит)',
    example: 500,
    minimum: 1,
    maximum: TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Лимит ТС должен быть числом' })
  @Min(1, { message: 'Лимит ТС должен быть больше 0' })
  @Max(TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE, {
    message: `Лимит ТС слишком большой`,
  })
  @Type(() => Number)
  maxVehicles?: number;

  @ApiPropertyOptional({
    description: 'Максимальное количество заказов (null = безлимит)',
    example: 1000,
    minimum: 1,
    maximum: TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Лимит заказов должен быть числом' })
  @Min(1, { message: 'Лимит заказов должен быть больше 0' })
  @Max(TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE, {
    message: `Лимит заказов слишком большой`,
  })
  @Type(() => Number)
  maxOrders?: number;

  @ApiPropertyOptional({
    description: 'Дополнительные возможности тарифа',
    example: {
      reports: true,
      analytics: false,
      api_access: false,
      priority_support: false,
      custom_fields: true,
    },
  })
  @IsOptional()
  @IsObject({ message: 'Возможности должны быть объектом' })
  features?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Активен ли тарифный план',
    example: true,
    default: TARIFFS_CONSTANTS.DEFAULTS.DEFAULT_IS_ACTIVE,
  })
  @IsOptional()
  @IsBoolean({ message: 'Статус активности должен быть булевым значением' })
  isActive?: boolean;
}
