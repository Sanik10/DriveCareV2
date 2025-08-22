// path: apps/backend/src/modules/vehicles/dto/request/update-vehicle.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsUUID, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateVehicleDto } from './create-vehicle.dto';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';
import { VEHICLES_CONSTANTS } from '../../constants/vehicles.constants';

export class UpdateVehicleDto extends PartialType(OmitType(CreateVehicleDto, ['customerId'] as const)) {
  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Дата последнего технического обслуживания',
    format: 'date',
  })
  @IsDateString({}, { message: 'Дата последнего ТО должна быть в формате YYYY-MM-DD' })
  @IsOptional()
  lastServiceDate?: string;

  @ApiPropertyOptional({
    example: '2024-07-15',
    description: 'Дата следующего планового ТО',
    format: 'date',
  })
  @IsDateString({}, { message: 'Дата следующего ТО должна быть в формате YYYY-MM-DD' })
  @IsOptional()
  nextServiceDate?: string;

  // Переопределяем поле notes, чтобы добавить санитизацию и ограничения
  @ApiPropertyOptional({
    example: 'Обновлены тормозные колодки',
    description: 'Примечания об автомобиле',
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
