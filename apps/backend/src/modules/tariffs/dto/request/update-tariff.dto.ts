import { ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsBoolean, 
  IsObject, 
  Min, 
  Max, 
  MaxLength 
} from 'class-validator';
import { Type } from 'class-transformer';
import { TARIFFS_CONSTANTS } from '../../constants/tariffs.constants';

export class UpdateTariffDto {
  @ApiPropertyOptional({ 
    description: 'Название тарифного плана',
    maxLength: TARIFFS_CONSTANTS.VALIDATION.NAME_MAX_LENGTH
  })
  @IsOptional()
  @IsString({ message: 'Название должно быть строкой' })
  @MaxLength(TARIFFS_CONSTANTS.VALIDATION.NAME_MAX_LENGTH, { 
    message: `Название не может превышать ${TARIFFS_CONSTANTS.VALIDATION.NAME_MAX_LENGTH} символов` 
  })
  name?: string;

  @ApiPropertyOptional({ 
    description: 'Описание тарифного плана',
    maxLength: TARIFFS_CONSTANTS.VALIDATION.DESCRIPTION_MAX_LENGTH
  })
  @IsOptional()
  @IsString({ message: 'Описание должно быть строкой' })
  @MaxLength(TARIFFS_CONSTANTS.VALIDATION.DESCRIPTION_MAX_LENGTH, { 
    message: `Описание не может превышать ${TARIFFS_CONSTANTS.VALIDATION.DESCRIPTION_MAX_LENGTH} символов` 
  })
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Цена за месяц (в копейках)',
    minimum: TARIFFS_CONSTANTS.VALIDATION.MIN_MONTHLY_PRICE,
    maximum: TARIFFS_CONSTANTS.DEFAULTS.MAX_PRICE * 100
  })
  @IsOptional()
  @IsNumber({}, { message: 'Месячная цена должна быть числом' })
  @Min(TARIFFS_CONSTANTS.VALIDATION.MIN_MONTHLY_PRICE, { 
    message: `Месячная цена не может быть меньше ${TARIFFS_CONSTANTS.VALIDATION.MIN_MONTHLY_PRICE}` 
  })
  @Max(TARIFFS_CONSTANTS.DEFAULTS.MAX_PRICE * 100, { 
    message: `Месячная цена слишком большая` 
  })
  @Type(() => Number)
  priceMonthly?: number;

  @ApiPropertyOptional({ 
    description: 'Цена за год (в копейках)',
    minimum: TARIFFS_CONSTANTS.VALIDATION.MIN_YEARLY_PRICE,
    maximum: TARIFFS_CONSTANTS.DEFAULTS.MAX_PRICE * 100
  })
  @IsOptional()
  @IsNumber({}, { message: 'Годовая цена должна быть числом' })
  @Min(TARIFFS_CONSTANTS.VALIDATION.MIN_YEARLY_PRICE, { 
    message: `Годовая цена не может быть меньше ${TARIFFS_CONSTANTS.VALIDATION.MIN_YEARLY_PRICE}` 
  })
  @Max(TARIFFS_CONSTANTS.DEFAULTS.MAX_PRICE * 100, { 
    message: `Годовая цена слишком большая` 
  })
  @Type(() => Number)
  priceYearly?: number;

  @ApiPropertyOptional({ 
    description: 'Максимальное количество пользователей (null = безлимит)',
    minimum: 1,
    maximum: TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE
  })
  @IsOptional()
  @IsNumber({}, { message: 'Лимит пользователей должен быть числом' })
  @Min(1, { message: 'Лимит пользователей должен быть больше 0' })
  @Max(TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE, { 
    message: `Лимит пользователей слишком большой` 
  })
  @Type(() => Number)
  maxUsers?: number;

  @ApiPropertyOptional({ 
    description: 'Максимальное количество клиентов (null = безлимит)',
    minimum: 1,
    maximum: TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE
  })
  @IsOptional()
  @IsNumber({}, { message: 'Лимит клиентов должен быть числом' })
  @Min(1, { message: 'Лимит клиентов должен быть больше 0' })
  @Max(TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE, { 
    message: `Лимит клиентов слишком большой` 
  })
  @Type(() => Number)
  maxCustomers?: number;

  @ApiPropertyOptional({ 
    description: 'Максимальное количество транспортных средств (null = безлимит)',
    minimum: 1,
    maximum: TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE
  })
  @IsOptional()
  @IsNumber({}, { message: 'Лимит ТС должен быть числом' })
  @Min(1, { message: 'Лимит ТС должен быть больше 0' })
  @Max(TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE, { 
    message: `Лимит ТС слишком большой` 
  })
  @Type(() => Number)
  maxVehicles?: number;

  @ApiPropertyOptional({ 
    description: 'Максимальное количество заказов (null = безлимит)',
    minimum: 1,
    maximum: TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE
  })
  @IsOptional()
  @IsNumber({}, { message: 'Лимит заказов должен быть числом' })
  @Min(1, { message: 'Лимит заказов должен быть больше 0' })
  @Max(TARIFFS_CONSTANTS.VALIDATION.MAX_LIMIT_VALUE, { 
    message: `Лимит заказов слишком большой` 
  })
  @Type(() => Number)
  maxOrders?: number;

  @ApiPropertyOptional({ 
    description: 'Дополнительные возможности тарифа',
    example: {
      reports: true,
      analytics: true,
      api_access: false,
      priority_support: true
    }
  })
  @IsOptional()
  @IsObject({ message: 'Возможности должны быть объектом' })
  features?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'Активен ли тарифный план'
  })
  @IsOptional()
  @IsBoolean({ message: 'Статус активности должен быть булевым значением' })
  isActive?: boolean;
}
