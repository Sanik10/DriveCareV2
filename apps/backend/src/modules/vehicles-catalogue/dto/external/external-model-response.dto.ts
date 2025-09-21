// path: apps/backend/src/modules/vehicles-catalogue/dto/external/external-model-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExternalModelResponseDto {
  @ApiProperty({ example: 'nhtsa' })
  source: 'nhtsa';

  @ApiProperty({ example: 'Toyota' })
  brandName: string;

  @ApiProperty({ example: 'Corolla' })
  name: string;

  @ApiPropertyOptional({ example: 440 })
  brandSourceId?: number;
}
