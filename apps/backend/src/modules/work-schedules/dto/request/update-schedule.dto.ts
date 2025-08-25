// apps/backend/src/modules/work-schedules/dto/request/update-schedule.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateScheduleDto } from './create-schedule.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}

// Расширение: управление жизненным циклом через флаг isActive (ре-активация/деактивация)
export class UpdateScheduleLifecycleDto {
  @ApiPropertyOptional({
    description: 'Активировать/деактивировать расписание',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
