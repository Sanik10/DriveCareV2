import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionResponseDto } from './subscription-response.dto';

export class PaginatedSubscriptionsResponseDto {
  @ApiProperty({ 
    description: 'Список подписок',
    type: [SubscriptionResponseDto]
  })
  items: SubscriptionResponseDto[];

  @ApiProperty({ 
    description: 'Общее количество подписок',
    example: 15
  })
  total: number;

  @ApiProperty({ 
    description: 'Текущая страница',
    example: 1
  })
  page: number;

  @ApiProperty({ 
    description: 'Количество элементов на странице',
    example: 10
  })
  limit: number;

  @ApiProperty({ 
    description: 'Общее количество страниц',
    example: 2
  })
  totalPages: number;
}
