// path: apps/backend/src/modules/vehicles/dto/request/create-vehicle.dto.ts
import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsEnum,
  IsNumber,
  Min,
  Max,
  Length,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EngineType } from '../../../../database/entities/vehicle.entity';
import { VEHICLES_CONSTANTS } from '../../constants/vehicles.constants';
import { Transform, Type } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

export class CreateVehicleDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID клиента-владельца автомобиля',
    format: 'uuid',
  })
  @IsUUID(4, { message: 'ID клиента должен быть валидным UUID' })
  customerId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'ID модели автомобиля',
    format: 'uuid',
  })
  @IsUUID(4, { message: 'ID модели должен быть валидным UUID' })
  modelId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174002',
    description: 'ID типа автомобиля',
    format: 'uuid',
  })
  @IsUUID(4, { message: 'ID типа автомобиля должен быть валидным UUID' })
  vehicleTypeId: string;

  @ApiPropertyOptional({
    example: 'WBAFR9C50DD123456',
    description: 'VIN номер автомобиля (17 символов)',
    minLength: VEHICLES_CONSTANTS.VALIDATION.VIN_LENGTH,
    maxLength: VEHICLES_CONSTANTS.VALIDATION.VIN_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString({ message: 'VIN должен быть строкой' })
  @Length(VEHICLES_CONSTANTS.VALIDATION.VIN_LENGTH, VEHICLES_CONSTANTS.VALIDATION.VIN_LENGTH, {
    message: `VIN должен содержать ровно ${VEHICLES_CONSTANTS.VALIDATION.VIN_LENGTH} символов`,
  })
  @Matches(/^[A-HJ-NPR-Z0-9]+$/, { message: 'VIN содержит недопустимые символы' })
  @IsOptional()
  vin?: string;

  @ApiPropertyOptional({
    example: 'А123БВ456',
    description: 'Государственный номер автомобиля',
    minLength: VEHICLES_CONSTANTS.VALIDATION.MIN_LICENSE_PLATE_LENGTH,
    maxLength: VEHICLES_CONSTANTS.VALIDATION.MAX_LICENSE_PLATE_LENGTH,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase().replace(/\s+/g, ' ') : value,
  )
  @IsString({ message: 'Номер должен быть строкой' })
  @Length(
    VEHICLES_CONSTANTS.VALIDATION.MIN_LICENSE_PLATE_LENGTH,
    VEHICLES_CONSTANTS.VALIDATION.MAX_LICENSE_PLATE_LENGTH,
    {
      message: `Номер должен содержать от ${VEHICLES_CONSTANTS.VALIDATION.MIN_LICENSE_PLATE_LENGTH} до ${VEHICLES_CONSTANTS.VALIDATION.MAX_LICENSE_PLATE_LENGTH} символов`,
    },
  )
  @Matches(/^[A-ZА-Я0-9\- ]+$/i, { message: 'Номер содержит недопустимые символы' })
  @IsOptional()
  licensePlate?: string;

  @ApiPropertyOptional({
    example: 2020,
    description: 'Год выпуска автомобиля',
    minimum: VEHICLES_CONSTANTS.VALIDATION.MIN_YEAR,
    maximum: VEHICLES_CONSTANTS.VALIDATION.MAX_YEAR,
  })
  @Type(() => Number)
  @IsInt({ message: 'Год должен быть целым числом' })
  @Min(VEHICLES_CONSTANTS.VALIDATION.MIN_YEAR, {
    message: `Год не может быть меньше ${VEHICLES_CONSTANTS.VALIDATION.MIN_YEAR}`,
  })
  @Max(VEHICLES_CONSTANTS.VALIDATION.MAX_YEAR, {
    message: `Год не может быть больше ${VEHICLES_CONSTANTS.VALIDATION.MAX_YEAR}`,
  })
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({
    example: 'Белый',
    description: 'Цвет автомобиля',
    maxLength: VEHICLES_CONSTANTS.VALIDATION.MAX_COLOR_LENGTH,
  })
  @IsString({ message: 'Цвет должен быть строкой' })
  @MaxLength(VEHICLES_CONSTANTS.VALIDATION.MAX_COLOR_LENGTH, {
    message: `Цвет не может превышать ${VEHICLES_CONSTANTS.VALIDATION.MAX_COLOR_LENGTH} символов`,
  })
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({
    example: EngineType.PETROL,
    description: 'Тип двигателя',
    enum: EngineType,
  })
  @IsEnum(EngineType, { message: 'Неверный тип двигателя' })
  @IsOptional()
  engineType?: EngineType;

  @ApiPropertyOptional({
    example: 2.0,
    description: 'Объем двигателя в литрах',
    minimum: VEHICLES_CONSTANTS.VALIDATION.MIN_ENGINE_VOLUME,
    maximum: VEHICLES_CONSTANTS.VALIDATION.MAX_ENGINE_VOLUME,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Объем двигателя должен быть числом' })
  @Min(VEHICLES_CONSTANTS.VALIDATION.MIN_ENGINE_VOLUME, {
    message: `Объем двигателя не может быть меньше ${VEHICLES_CONSTANTS.VALIDATION.MIN_ENGINE_VOLUME}`,
  })
  @Max(VEHICLES_CONSTANTS.VALIDATION.MAX_ENGINE_VOLUME, {
    message: `Объем двигателя не может быть больше ${VEHICLES_CONSTANTS.VALIDATION.MAX_ENGINE_VOLUME}`,
  })
  @IsOptional()
  engineVolume?: number;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Пробег автомобиля в км',
    minimum: 0,
    maximum: VEHICLES_CONSTANTS.VALIDATION.MAX_MILEAGE,
  })
  @Type(() => Number)
  @IsInt({ message: 'Пробег должен быть целым числом' })
  @Min(0, { message: 'Пробег не может быть отрицательным' })
  @Max(VEHICLES_CONSTANTS.VALIDATION.MAX_MILEAGE, {
    message: `Пробег не может превышать ${VEHICLES_CONSTANTS.VALIDATION.MAX_MILEAGE} км`,
  })
  @IsOptional()
  mileage?: number;

  @ApiPropertyOptional({
    example: 'Установлена сигнализация, тонировка',
    description: 'Дополнительные примечания об автомобиле',
    maxLength: VEHICLES_CONSTANTS.VALIDATION.MAX_NOTES_LENGTH,
  })
  @IsString({ message: 'Примечания должны быть строкой' })
  @MaxLength(VEHICLES_CONSTANTS.VALIDATION.MAX_NOTES_LENGTH, {
    message: `Примечания не могут превышать ${VEHICLES_CONSTANTS.VALIDATION.MAX_NOTES_LENGTH} символов`,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim() : value,
  )
  @IsOptional()
  notes?: string;
}
