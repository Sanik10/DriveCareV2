// path: apps/backend/src/modules/work-schedules/dto/request/update-exception-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ExceptionStatus } from '../../../../database/entities/schedule-exception.entity';

export class UpdateExceptionStatusDto {
  @ApiProperty({
    enum: ExceptionStatus,
    description: 'Новый статус исключения',
    example: 'APPROVED',
  })
  @IsEnum(ExceptionStatus)
  status!: ExceptionStatus;
}
