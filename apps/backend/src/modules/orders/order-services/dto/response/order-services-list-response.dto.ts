import { ApiProperty } from '@nestjs/swagger';
import { OrderServiceResponseDto } from './order-service-response.dto';

export class OrderServicesListResponseDto {
  @ApiProperty({ description: 'ID заказа' })
  orderId: string;

  @ApiProperty({ 
    description: 'Список услуг в заказе', 
    type: [OrderServiceResponseDto] 
  })
  services: OrderServiceResponseDto[];

  @ApiProperty({ 
    description: 'Общее количество услуг в заказе', 
    example: 3 
  })
  totalServices: number;

  @ApiProperty({ 
    description: 'Общая стоимость всех услуг', 
    example: 15750.00 
  })
  totalAmount: number;

  // 📊 Дополнительная статистика (опционально)
  @ApiProperty({ 
    description: 'Статистика по статусам', 
    example: {
      planned: 1,
      inProgress: 1,
      completed: 1
    }
  })
  statusStats?: {
    planned: number;
    inProgress: number;
    completed: number;
  };

  @ApiProperty({ 
    description: 'Процент выполнения заказа', 
    example: 66.67 
  })
  completionPercentage?: number;

  @ApiProperty({ 
    description: 'Предполагаемое время завершения всех услуг', 
    example: 180 
  })
  estimatedTotalDuration?: number;
}
