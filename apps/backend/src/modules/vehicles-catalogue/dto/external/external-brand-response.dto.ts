// path: apps/backend/src/modules/vehicles-catalogue/dto/external/external-brand-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ExternalBrandResponseDto {
  @ApiProperty({ example: 'nhtsa' })
  source: 'nhtsa';

  @ApiProperty({ example: 440 })
  sourceId: number;

  @ApiProperty({ example: 'Toyota' })
  name: string;
}
