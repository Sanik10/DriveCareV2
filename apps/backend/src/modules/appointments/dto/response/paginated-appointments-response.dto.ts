import { ApiProperty } from '@nestjs/swagger';
import { AppointmentResponseDto } from './appointment-response.dto';

export class PaginatedAppointmentsResponseDto {
  @ApiProperty({ 
    description: 'Список записей',
    type: [AppointmentResponseDto]
  })
  items: AppointmentResponseDto[];

  @ApiProperty({ 
    description: 'Общее количество записей',
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
