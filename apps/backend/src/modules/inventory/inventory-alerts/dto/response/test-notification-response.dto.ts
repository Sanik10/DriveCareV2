// src/modules/inventory/inventory-alerts/dto/response/test-notification-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class TestNotificationResponseDto {
  @ApiProperty({ description: 'Успешность отправки' })
  success: boolean;

  @ApiProperty({ description: 'Количество успешно отправленных' })
  sentCount: number;

  @ApiProperty({ description: 'Количество неудачных отправок' })
  failedCount: number;

  @ApiProperty({ description: 'Список получателей' })
  recipients: string[];

  @ApiProperty({ description: 'Сообщения об ошибках' })
  errors: Array<{
    recipient: string;
    error: string;
  }>;

  @ApiProperty({ description: 'Время отправки' })
  sentAt: Date;

  @ApiProperty({ description: 'Тип уведомления' })
  testType: string;

  @ApiProperty({ description: 'Приоритет уведомления' })
  priority: string;

  @ApiProperty({ description: 'Отправленное сообщение' })
  message: string;
}
