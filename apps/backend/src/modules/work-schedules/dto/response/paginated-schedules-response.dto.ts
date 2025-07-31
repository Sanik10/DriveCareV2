// src/modules/work-schedules/dto/response/paginated-schedules-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ScheduleResponseDto } from './schedule-response.dto';

export class SchedulesPaginationDto {
  @ApiProperty({ description: 'Общее количество расписаний' })
  total: number;

  @ApiProperty({ description: 'Текущая страница' })
  page: number;

  @ApiProperty({ description: 'Количество элементов на странице' })
  limit: number;

  @ApiProperty({ description: 'Общее количество страниц' })
  totalPages: number;

  @ApiProperty({ description: 'Есть ли следующая страница' })
  hasNext: boolean;

  @ApiProperty({ description: 'Есть ли предыдущая страница' })
  hasPrevious: boolean;
}

export class PaginatedSchedulesResponseDto {
  @ApiProperty({ description: 'Массив расписаний', type: [ScheduleResponseDto] })
  data: ScheduleResponseDto[];

  @ApiProperty({ description: 'Информация о пагинации', type: SchedulesPaginationDto })
  pagination: SchedulesPaginationDto;
}
