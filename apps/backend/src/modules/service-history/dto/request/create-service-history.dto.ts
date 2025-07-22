import { 
  IsString, 
  IsUUID, 
  IsOptional, 
  IsInt, 
  Min,
  IsDateString,
  MaxLength
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO для создания записи истории обслуживания
 * 🔒 SECURITY: companyId автоматически определяется через vehicle ownership
 */
export class CreateServiceHistoryDto {
  // 🔥 ИСПРАВЛЕНО: Убрали companyId - определяется через автомобиль

  @ApiProperty({ 
    example: '123e4567-e89b-12d3-a456-426614174000', 
    description: 'ID автомобиля (должен принадлежать компании пользователя)' 
  })
  @IsUUID(4, { message: 'ID автомобиля должен быть валидным UUID' })
  vehicleId: string;

  @ApiPropertyOptional({ 
    example: '123e4567-e89b-12d3-a456-426614174001', 
    description: 'ID связанного заказа (если есть)' 
  })
  @IsUUID(4, { message: 'ID заказа должен быть валидным UUID' })
  @IsOptional()
  orderId?: string;

  @ApiProperty({ 
    example: '2023-01-01', 
    description: 'Дата выполнения обслуживания' 
  })
  @IsDateString({}, { message: 'Дата должна быть в формате YYYY-MM-DD' })
  date: string;

  @ApiPropertyOptional({ 
    example: 50000, 
    description: 'Пробег на момент обслуживания (км)',
    minimum: 0
  })
  @IsInt({ message: 'Пробег должен быть целым числом' })
  @Min(0, { message: 'Пробег не может быть отрицательным' })
  @IsOptional()
  mileage?: number;

  @ApiProperty({ 
    example: 'Замена масла, масляного фильтра, диагностика двигателя', 
    description: 'Описание выполненных работ' 
  })
  @IsString({ message: 'Описание должно быть строкой' })
  @MaxLength(1000, { message: 'Описание не может превышать 1000 символов' })
  description: string;

  @ApiPropertyOptional({ 
    example: '2023-07-01', 
    description: 'Рекомендуемая дата следующего обслуживания' 
  })
  @IsDateString({}, { message: 'Дата должна быть в формате YYYY-MM-DD' })
  @IsOptional()
  nextServiceDate?: string;

  @ApiPropertyOptional({ 
    example: 'Рекомендуется замена тормозных колодок при следующем ТО', 
    description: 'Дополнительные примечания и рекомендации' 
  })
  @IsString({ message: 'Примечания должны быть строкой' })
  @MaxLength(500, { message: 'Примечания не могут превышать 500 символов' })
  @IsOptional()
  notes?: string;
}
