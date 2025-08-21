// path: apps/backend/src/modules/work-schedules/dto/response/exception-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExceptionStatus, ExceptionType } from '../../../../database/entities/schedule-exception.entity';

export class ExceptionResponseDto {
  @ApiProperty({ description: 'ID исключения' })
  id: string;

  @ApiProperty({ description: 'ID компании' })
  companyId: string;

  @ApiProperty({ description: 'ID пользователя' })
  userId: string;

  @ApiProperty({ description: 'Тип исключения', enum: ExceptionType })
  type: ExceptionType;

  @ApiProperty({ description: 'Дата начала' })
  startDate: Date;

  @ApiProperty({ description: 'Дата окончания' })
  endDate: Date;

  @ApiProperty({ description: 'Весь день?' })
  isFullDay: boolean;

  @ApiPropertyOptional({ description: 'Время начала (если частично)' })
  startTime?: string;

  @ApiPropertyOptional({ description: 'Время окончания (если частично)' })
  endTime?: string;

  @ApiPropertyOptional({ description: 'Причина' })
  reason?: string;

  @ApiProperty({ description: 'Статус', enum: ExceptionStatus })
  status: ExceptionStatus;

  @ApiPropertyOptional({ description: 'Кем одобрено' })
  approvedBy?: string;

  @ApiPropertyOptional({ description: 'Когда одобрено' })
  approvedAt?: Date;

  @ApiPropertyOptional({ description: 'Причина отклонения' })
  rejectionReason?: string;

  @ApiProperty({ description: 'ID затронутых записей', type: [String] })
  affectedAppointments: string[];

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt: Date;
}
