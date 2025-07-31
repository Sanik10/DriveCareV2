// src/modules/orders/dto/request/update-order.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateOrderDto } from './create-order.dto';

export class UpdateOrderDto extends PartialType(
  OmitType(CreateOrderDto, ['companyId', 'createdBy'] as const)
) {
  @ApiPropertyOptional({ 
    description: 'Результаты диагностики', 
    example: 'Износ тормозных колодок передней оси, замена рекомендуется' 
  })
  @IsString()
  @IsOptional()
  diagnosticResults?: string;

  @ApiPropertyOptional({ 
    description: 'Фактическое время завершения', 
    example: '2025-01-01T15:30:00Z' 
  })
  @IsDateString()
  @IsOptional()
  actualCompletionTime?: string;

  @ApiPropertyOptional({ 
    description: 'ID пользователя, вносящего изменения (для аудита)' 
  })
  @IsOptional()
  updatedBy?: string;
}
