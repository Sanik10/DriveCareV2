import { ApiProperty } from '@nestjs/swagger';
import { CategoryResponseDto } from './category-response.dto';

export class CategoriesPaginationDto {
  @ApiProperty({
    description: 'Общее количество категорий',
    example: 25
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
    example: 2
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

export class PaginatedCategoriesResponseDto {
  @ApiProperty({
    description: 'Массив категорий',
    type: [CategoryResponseDto]
  })
  data: CategoryResponseDto[];

  @ApiProperty({
    description: 'Информация о пагинации',
    type: CategoriesPaginationDto
  })
  pagination: CategoriesPaginationDto;
}
