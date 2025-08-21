// path: apps/backend/src/modules/customers/dto/request/revoke-consent.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

function sanitizePlainText(value?: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;
  return value.replace(/<[^>]*>/g, '').trim();
}

export class RevokeCustomerConsentDto {
  @ApiPropertyOptional({
    description: 'Тип согласия для отзыва',
    enum: ['pdn_processing', 'marketing'],
    default: 'pdn_processing',
  })
  @IsIn(['pdn_processing', 'marketing'])
  consentType?: 'pdn_processing' | 'marketing' = 'pdn_processing';

  @ApiPropertyOptional({ description: 'Причина/основание отзыва (для аудита)', maxLength: 500 })
  @Transform(({ value }) => sanitizePlainText(value))
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string;
}
