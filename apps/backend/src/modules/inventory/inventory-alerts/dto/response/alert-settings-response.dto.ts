// src/modules/inventory/inventory-alerts/dto/response/alert-settings-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { AlertType } from '../../../constants/inventory.constants';

export class AlertSettingsResponseDto {
  @ApiProperty({ description: 'ID компании' })
  companyId: string;

  @ApiProperty({ description: 'ID пользователя (для персональных настроек)' })
  userId?: string;

  @ApiProperty({ description: 'Email уведомления включены' })
  enableEmailNotifications: boolean;

  @ApiProperty({ description: 'Push уведомления включены' })
  enablePushNotifications: boolean;

  @ApiProperty({ description: 'Email адреса для уведомлений', type: [String] })
  emailAddresses: string[];

  @ApiProperty({ description: 'Порог низкого остатка' })
  lowStockThreshold: number;

  @ApiProperty({ description: 'Порог критического остатка' })
  criticalStockThreshold: number;

  @ApiProperty({ description: 'Множитель для избытка' })
  overstockMultiplier: number;

  @ApiProperty({ 
    description: 'Включенные типы алертов',
    enum: ['low_stock', 'out_of_stock', 'overstock', 'expired_reservation'],
    isArray: true 
  })
  enabledAlertTypes: AlertType[];

  @ApiProperty({ 
    description: 'Частота уведомлений',
    enum: ['immediate', 'hourly', 'daily'] 
  })
  alertFrequency: 'immediate' | 'hourly' | 'daily';

  @ApiProperty({ description: 'Автоотклонение после пополнения' })
  autoDismissAfterRestock: boolean;

  @ApiProperty({ description: 'Автоотклонение через часов' })
  autoDismissAfterHours: number;

  @ApiProperty({ description: 'Начало рабочего дня' })
  workingHoursStart?: string;

  @ApiProperty({ description: 'Конец рабочего дня' })
  workingHoursEnd?: string;

  @ApiProperty({ description: 'Рабочие дни недели', type: [Number] })
  workingDays?: number[];

  @ApiProperty({ description: 'Часовой пояс' })
  timezone?: string;

  @ApiProperty({ description: 'Дата создания настроек' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата последнего обновления' })
  updatedAt: Date;

  @ApiProperty({ description: 'Количество активных уведомлений' })
  currentActiveAlerts: number;

  @ApiProperty({ description: 'Количество уведомлений за сегодня' })
  todayAlertsCount: number;

  @ApiProperty({ description: 'Последнее отправленное уведомление' })
  lastNotificationSent?: Date;
}
