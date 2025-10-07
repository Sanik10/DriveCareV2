// path: apps/backend/src/modules/subscriptions/subscription-billing/dto/request/cancel-subscription.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ description: 'Причина отмены', example: 'Не подошёл тариф' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
