import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BrandResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Toyota' })
  name: string;

  @ApiPropertyOptional({ example: 'Япония' })
  country?: string;

  @ApiPropertyOptional({ example: 'https://example.com/toyota-logo.png' })
  logoUrl?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ example: 15 })
  modelsCount?: number;
}
