import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ description: 'Причина отмены', example: 'Не подошёл тариф' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
