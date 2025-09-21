// path: apps/backend/src/modules/vehicles-catalogue/dto/suggest/suggest-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { BrandResponseDto } from '../brands/brand-response.dto';
import { ModelResponseDto } from '../models/model-response.dto';

export class CatalogueSuggestResponseDto {
  @ApiProperty({ example: 'lada' })
  query: string;

  @ApiProperty({ type: [BrandResponseDto] })
  brands: BrandResponseDto[];

  @ApiProperty({ type: [ModelResponseDto] })
  models: ModelResponseDto[];
}
