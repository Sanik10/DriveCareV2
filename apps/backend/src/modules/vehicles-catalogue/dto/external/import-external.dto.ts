// path: apps/backend/src/modules/vehicles-catalogue/dto/external/import-external.dto.ts
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportExternalDto {
  @ApiProperty({ enum: ['nhtsa'], default: 'nhtsa' })
  @IsIn(['nhtsa'])
  source: 'nhtsa' = 'nhtsa';

  @ApiPropertyOptional({ description: 'Ограничить импорт конкретным брендом (по имени)' })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiPropertyOptional({ description: 'Максимум брендов для импорта', default: 200, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  maxBrands?: number = 200;

  @ApiPropertyOptional({
    description: 'Максимум моделей на бренд',
    default: 500,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  maxModelsPerBrand?: number = 500;

  @ApiPropertyOptional({ description: 'Режим предварительного просмотра (ничего не сохраняет)', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  dryRun?: boolean = false;
}
