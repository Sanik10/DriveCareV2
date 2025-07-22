import { ApiProperty } from '@nestjs/swagger';
import { CompanyResponseDto } from './company-response.dto';

export class PaginatedCompaniesResponseDto {
  @ApiProperty({ 
    description: 'Список компаний',
    type: [CompanyResponseDto]
  })
  items: CompanyResponseDto[];

  @ApiProperty({ 
    description: 'Общее количество компаний',
    example: 42
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
    example: 3
  })
  totalPages: number;
}
