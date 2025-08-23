// path: apps/backend/src/modules/services/dto/request/create-service.dto.ts
import { IsString, IsUUID, IsNumber, IsOptional, IsBoolean, Min, Max, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SERVICES_CONSTANTS, SERVICE_VALIDATION_MESSAGES } from '../../constants/services.constants';

export class CreateServiceDto {
  @ApiProperty({
    description: 'ID категории услуги',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID('4', { message: SERVICE_VALIDATION_MESSAGES.CATEGORY_REQUIRED })
  categoryId: string;

  @ApiProperty({
    description: 'Название услуги',
    example: 'Замена масла',
    maxLength: 255
  })
  @IsString({ message: SERVICE_VALIDATION_MESSAGES.NAME_REQUIRED })
  @Length(1, 255, { message: SERVICE_VALIDATION_MESSAGES.NAME_TOO_LONG })
  name: string;

  @ApiPropertyOptional({
    description: 'Описание услуги',
    example: 'Замена моторного масла с фильтром',
    maxLength: 1000
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000, { message: SERVICE_VALIDATION_MESSAGES.DESCRIPTION_TOO_LONG })
  description?: string;

  @ApiProperty({
    description: 'Цена услуги',
    example: 2500.00,
    minimum: SERVICES_CONSTANTS.MIN_SERVICE_PRICE,
    maximum: SERVICES_CONSTANTS.MAX_SERVICE_PRICE
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: SERVICE_VALIDATION_MESSAGES.PRICE_INVALID })
  @Min(SERVICES_CONSTANTS.MIN_SERVICE_PRICE, { message: SERVICE_VALIDATION_MESSAGES.PRICE_INVALID })
  @Max(SERVICES_CONSTANTS.MAX_SERVICE_PRICE, { message: SERVICE_VALIDATION_MESSAGES.PRICE_TOO_HIGH })
  price: number;

  @ApiProperty({
    description: 'Длительность выполнения услуги в минутах',
    example: 60,
    minimum: SERVICES_CONSTANTS.MIN_DURATION_MINUTES,
    maximum: SERVICES_CONSTANTS.MAX_DURATION_MINUTES
  })
  @IsNumber({}, { message: SERVICE_VALIDATION_MESSAGES.DURATION_INVALID })
  @Min(SERVICES_CONSTANTS.MIN_DURATION_MINUTES, { message: SERVICE_VALIDATION_MESSAGES.DURATION_INVALID })
  @Max(SERVICES_CONSTANTS.MAX_DURATION_MINUTES, { message: SERVICE_VALIDATION_MESSAGES.DURATION_TOO_LONG })
  durationMinutes: number;

  @ApiPropertyOptional({
    description: 'Активна ли услуга',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
