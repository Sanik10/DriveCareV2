// path: apps/backend/src/modules/vehicles-catalogue/dto/external/import-external-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ImportExternalResponseDto {
  @ApiProperty()
  importedBrands: number;

  @ApiProperty()
  importedModels: number;

  @ApiProperty()
  skippedBrands: number;

  @ApiProperty()
  skippedModels: number;

  @ApiProperty({
    type: 'object',
    properties: {
      brandsCreated: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } } },
      brandsSkipped: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' } } } },
      modelsCreated: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            brandId: { type: 'string' },
            brandName: { type: 'string' },
            name: { type: 'string' },
          },
        },
      },
      modelsSkipped: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            brandName: { type: 'string' },
            name: { type: 'string' },
          },
        },
      },
    },
  })
  details: {
    brandsCreated: { id: string; name: string }[];
    brandsSkipped: { name: string }[];
    modelsCreated: { id: string; brandId: string; brandName: string; name: string }[];
    modelsSkipped: { brandName: string; name: string }[];
  };
}
