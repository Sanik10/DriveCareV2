import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateVehicleDto } from './create-vehicle.dto';

export class UpdateVehicleDto extends PartialType(
  OmitType(CreateVehicleDto, ['customerId'] as const)
) {
  @ApiPropertyOptional({ 
    example: '2024-01-15', 
    description: 'Дата последнего технического обслуживания',
    format: 'date'
  })
  @IsDateString({}, { message: 'Дата последнего ТО должна быть в формате YYYY-MM-DD' })
  @IsOptional()
  lastServiceDate?: string;

  @ApiPropertyOptional({ 
    example: '2024-07-15', 
    description: 'Дата следующего планового ТО',
    format: 'date'
  })
  @IsDateString({}, { message: 'Дата следующего ТО должна быть в формате YYYY-MM-DD' })
  @IsOptional()
  nextServiceDate?: string;
}
