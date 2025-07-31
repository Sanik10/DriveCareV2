// src/modules/work-schedules/dto/request/create-exception.dto.ts
import { IsString, IsUUID, IsOptional, IsBoolean, IsEnum, IsDateString, MinDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExceptionType } from '../../../../database/entities/schedule-exception.entity';

export class CreateExceptionDto {
  @ApiProperty({
    description: 'ID пользователя',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID('4', { message: 'Некорректный ID пользователя' })
  userId: string;

  @ApiProperty({
    description: 'Тип исключения',
    enum: ExceptionType,
    example: ExceptionType.VACATION
  })
  @IsEnum(ExceptionType, { message: 'Некорректный тип исключения' })
  type: ExceptionType;

  @ApiProperty({
    description: 'Дата начала (YYYY-MM-DD)',
    example: '2024-08-01'
  })
  @IsDateString({}, { message: 'Некорректная дата начала' })
  @MinDate(new Date(), { message: 'Дата начала не может быть в прошлом' })
  startDate: string;

  @ApiProperty({
    description: 'Дата окончания (YYYY-MM-DD)',
    example: '2024-08-07'
  })
  @IsDateString({}, { message: 'Некорректная дата окончания' })
  endDate: string;

  @ApiPropertyOptional({
    description: 'Весь день или частично',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isFullDay?: boolean;

  @ApiPropertyOptional({
    description: 'Время начала (если не весь день)',
    example: '14:00'
  })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Время окончания (если не весь день)',
    example: '16:00'
  })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Причина исключения',
    example: 'Семейные обстоятельства'
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
