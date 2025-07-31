// src/modules/orders/dto/request/create-order.dto.ts
import { IsString, IsUUID, IsOptional, IsEnum, IsInt, IsPositive, IsDateString, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OrderStatus } from '../../types/orders.types';

export class CreateOrderDto {
  @ApiPropertyOptional({ 
    description: 'ID компании (автоматически устанавливается из токена)', 
    example: '123e4567-e89b-12d3-a456-426614174000' 
  })
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @ApiProperty({ 
    description: 'ID клиента', 
    example: '123e4567-e89b-12d3-a456-426614174001' 
  })
  @IsUUID()
  customerId: string;

  @ApiProperty({ 
    description: 'ID автомобиля', 
    example: '123e4567-e89b-12d3-a456-426614174002' 
  })
  @IsUUID()
  vehicleId: string;

  @ApiPropertyOptional({ 
    description: 'Статус заказа', 
    enum: OrderStatus, 
    default: OrderStatus.NEW,
    example: OrderStatus.NEW
  })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional({ 
    description: 'ID создателя заказа (автоматически устанавливается)', 
    example: '123e4567-e89b-12d3-a456-426614174003' 
  })
  @IsUUID()
  @IsOptional()
  createdBy?: string;

  @ApiPropertyOptional({ 
    description: 'ID исполнителя', 
    example: '123e4567-e89b-12d3-a456-426614174004' 
  })
  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @ApiPropertyOptional({ 
    description: 'Описание заказа', 
    example: 'Плановое техническое обслуживание' 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Жалобы клиента', 
    example: 'Шум при торможении, вибрация руля' 
  })
  @IsString()
  @IsOptional()
  customerComplaints?: string;

  @ApiPropertyOptional({ 
    description: 'Пробег автомобиля на момент создания заказа', 
    example: 15000 
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  mileage?: number;

  @ApiPropertyOptional({ 
    description: 'Планируемое время завершения', 
    example: '2025-01-01T14:00:00Z' 
  })
  @IsDateString()
  @IsOptional()
  estimatedCompletionTime?: string;

  @ApiPropertyOptional({ 
    description: 'Сумма скидки', 
    example: 500,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  discountAmount?: number;
}
