// apps/backend/src/modules/work-schedules/dto/request/create-exception.dto.ts
import { IsString, IsUUID, IsOptional, IsBoolean, IsEnum, IsDateString, MaxLength, ValidateIf, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExceptionType } from '../../../../database/entities/schedule-exception.entity';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

export class CreateExceptionDto {
  @ApiProperty({
    description: 'ID пользователя',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'Некорректный ID пользователя' })
  userId: string;

  @ApiProperty({
    description: 'Тип исключения',
    enum: ExceptionType,
    example: ExceptionType.VACATION,
  })
  @IsEnum(ExceptionType, { message: 'Некорректный тип исключения' })
  type: ExceptionType;

  @ApiProperty({
    description: 'Дата начала (ISO 8601, YYYY-MM-DD)',
    example: '2025-09-01',
  })
  @IsDateString({}, { message: 'Некорректная дата начала' })
  startDate: string;

  @ApiProperty({
    description: 'Дата окончания (ISO 8601, YYYY-MM-DD)',
    example: '2025-09-07',
  })
  @IsDateString({}, { message: 'Некорректная дата окончания' })
  endDate: string;

  @ApiPropertyOptional({
    description: 'Весь день или частично',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isFullDay?: boolean;

  @ApiPropertyOptional({
    description: 'Время начала (если не весь день, HH:MM)',
    example: '14:00',
  })
  @ValidateIf((o) => o.isFullDay === false)
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Время окончания (если не весь день, HH:MM)',
    example: '16:00',
  })
  @ValidateIf((o) => o.isFullDay === false)
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Причина исключения (свободный текст; будет санитизирован)',
    example: 'Семейные обстоятельства',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) =>
    typeof value === 'string'
      ? sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim()
      : value,
  )
  reason?: string;
}
