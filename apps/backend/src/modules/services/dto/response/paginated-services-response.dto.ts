// path: apps/backend/src/modules/services/dto/response/paginated-services-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ServiceResponseDto } from './service-response.dto';

export class ServicesPaginationDto {
  @ApiProperty({
    description: 'Общее количество услуг',
    example: 150
  })
  total: number;

  @ApiProperty({
    description: 'Текущая страница',
    example: 1
  })
  page: number;

  @ApiProperty({
    description: 'Количество элементов на странице',
    example: 20
  })
  limit: number;

  @ApiProperty({
    description: 'Общее количество страниц',
    example: 8
  })
  totalPages: number;

  @ApiProperty({
    description: 'Есть ли следующая страница',
    example: true
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Есть ли предыдущая страница',
    example: false
  })
  hasPrevious: boolean;
}

export class PaginatedServicesResponseDto {
  @ApiProperty({
    description: 'Массив услуг',
    type: [ServiceResponseDto]
  })
  data: ServiceResponseDto[];

  @ApiProperty({
    description: 'Информация о пагинации',
    type: ServicesPaginationDto
  })
  pagination: ServicesPaginationDto;
}
