// src/modules/inventory/inventory-alerts/services/alerts-validation.service.ts
import { Injectable } from '@nestjs/common';
import { AlertsDataService } from './alerts-data.service';
import { InventoryAlert } from '../../../../database/entities';
import { 
  CreateAlertData,
  UpdateAlertData,
  AlertSettings,
  NotificationRequest,
  AlertTriggerContext
} from '../types/alerts.types';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { AuthRole } from '../../../auth/types/auth.types';
import { 
  ValidationDataException,
  ResourceOwnershipException,
  ResourceNotFoundException
} from '../../../../common/exceptions/domain.exceptions';
import { INVENTORY_CONSTANTS } from '../../constants/inventory.constants';
import { ALERTS_CONSTRAINTS } from '../types/alerts.types';

@Injectable()
export class AlertsValidationService {
  constructor(
    private readonly alertsDataService: AlertsDataService,
  ) {}

  /**
   * 🔒 Валидация существования алерта
   */
  async validateAlertExists(id: string): Promise<InventoryAlert> {
    const alert = await this.alertsDataService.findById(id);
    
    if (!alert) {
      throw new ResourceNotFoundException('alert', id);
    }

    return alert;
  }

  /**
   * 🔒 Валидация принадлежности алерта компании
   */
  async validateAlertOwnership(alertId: string, userCompanyId: string): Promise<InventoryAlert> {
    const alert = await this.alertsDataService.findByIdForCompany(alertId, userCompanyId);
    
    if (!alert) {
      throw new ResourceOwnershipException('alert', alertId);
    }

    return alert;
  }

  /**
   * ✅ Валидация создания алерта
   */
  async validateCreateAlert(data: CreateAlertData): Promise<void> {
    // 🔒 Проверяем существование компании
    const companyExists = await this.alertsDataService.validateCompanyExists(data.companyId);
    if (!companyExists) {
      throw new ValidationDataException(
        'companyId',
        `Компания ${data.companyId} не найдена`
      );
    }

    // 🔒 Проверяем существование и принадлежность запчасти
    const part = await this.alertsDataService.validatePartExists(
      data.partId, 
      data.companyId
    );
    
    if (!part) {
      throw new ValidationDataException(
        'partId',
        `Запчасть ${data.partId} не найдена или не принадлежит компании`
      );
    }

    // ✅ Валидация заголовка
    if (data.title.length > ALERTS_CONSTRAINTS.MAX_TITLE_LENGTH) {
      throw new ValidationDataException(
        'title',
        `Заголовок не может превышать ${ALERTS_CONSTRAINTS.MAX_TITLE_LENGTH} символов`
      );
    }

    // ✅ Валидация сообщения
    if (data.message.length > ALERTS_CONSTRAINTS.MAX_MESSAGE_LENGTH) {
      throw new ValidationDataException(
        'message',
        `Сообщение не может превышать ${ALERTS_CONSTRAINTS.MAX_MESSAGE_LENGTH} символов`
      );
    }

    // ✅ Валидация количественных данных
    if (data.currentQuantity !== undefined && data.currentQuantity < 0) {
      throw new ValidationDataException(
        'currentQuantity',
        'Текущее количество не может быть отрицательным'
      );
    }

    if (data.thresholdQuantity !== undefined && data.thresholdQuantity < 0) {
      throw new ValidationDataException(
        'thresholdQuantity',
        'Пороговое количество не может быть отрицательным'
      );
    }

    // 🔒 Проверяем лимит активных алертов на запчасть
    const activeAlerts = await this.alertsDataService.findActiveAlertsForPart(
      data.partId, 
      data.companyId
    );
    
    if (activeAlerts.length >= ALERTS_CONSTRAINTS.MAX_ALERTS_PER_PART) {
      throw new ValidationDataException(
        'partId',
        `Превышен лимит активных алертов для запчасти (максимум ${ALERTS_CONSTRAINTS.MAX_ALERTS_PER_PART})`
      );
    }

    // 🔒 Проверяем дублирование алертов того же типа
    const existingSameType = await this.alertsDataService.existsActiveAlertForPart(
      data.partId,
      data.companyId,
      data.type
    );

    if (existingSameType) {
      throw new ValidationDataException(
        'type',
        `Активный алерт типа ${data.type} для этой запчасти уже существует`
      );
    }

    // ✅ Валидация пользователя (если указан)
    if (data.triggeredBy) {
      const user = await this.alertsDataService.findUserById(data.triggeredBy);
      if (!user) {
        throw new ValidationDataException(
          'triggeredBy',
          `Пользователь ${data.triggeredBy} не найден`
        );
      }
    }

    // ✅ Валидация метаданных
    this.validateAlertMetadata(data.metadata);
  }

  /**
   * ✅ Валидация обновления алерта
   */
  async validateUpdateAlert(
    id: string, 
    data: UpdateAlertData, 
    user: RequestWithUser['user']
  ): Promise<{ alert: InventoryAlert; updateData: UpdateAlertData }> {
    // 🔒 Проверяем принадлежность алерта
    const alert = await this.validateAlertOwnership(id, user.companyId);

    // ✅ Валидация заголовка (если обновляется)
    if (data.title && data.title.length > ALERTS_CONSTRAINTS.MAX_TITLE_LENGTH) {
      throw new ValidationDataException(
        'title',
        `Заголовок не может превышать ${ALERTS_CONSTRAINTS.MAX_TITLE_LENGTH} символов`
      );
    }

    // ✅ Валидация сообщения (если обновляется)
    if (data.message && data.message.length > ALERTS_CONSTRAINTS.MAX_MESSAGE_LENGTH) {
      throw new ValidationDataException(
        'message',
        `Сообщение не может превышать ${ALERTS_CONSTRAINTS.MAX_MESSAGE_LENGTH} символов`
      );
    }

    // ✅ Проверяем что алерт можно изменять
    if (alert.isDismissed && !data.isDismissed) {
      throw new ValidationDataException(
        'isDismissed',
        'Нельзя активировать отклоненный алерт'
      );
    }

    // ✅ Валидация пользователя отклонения
    if (data.dismissedBy) {
      const user = await this.alertsDataService.findUserById(data.dismissedBy);
      if (!user) {
        throw new ValidationDataException(
          'dismissedBy',
          `Пользователь ${data.dismissedBy} не найден`
        );
      }
    }

    // ✅ Валидация метаданных
    if (data.metadata) {
      this.validateAlertMetadata(data.metadata);
    }

    return { alert, updateData: data };
  }

  /**
   * 🔒 Валидация отклонения алерта
   */
  async validateDismissAlert(
    alertId: string, 
    user: RequestWithUser['user']
  ): Promise<InventoryAlert> {
    // 🔒 Проверяем принадлежность алерта
    const alert = await this.validateAlertOwnership(alertId, user.companyId);

    // ✅ Проверяем что алерт активен
    if (!alert.isActive) {
      throw new ValidationDataException(
        'alert',
        'Алерт уже неактивен'
      );
    }

    // ✅ Проверяем что алерт не отклонен
    if (alert.isDismissed) {
      throw new ValidationDataException(
        'alert',
        'Алерт уже отклонен'
      );
    }

    return alert;
  }

  /**
   * ✅ Валидация настроек алертов
   */
  async validateAlertSettings(
    settings: Partial<AlertSettings>, 
    companyId: string
  ): Promise<void> {
    // ✅ Валидация email адресов
    if (settings.emailAddresses) {
      if (settings.emailAddresses.length > ALERTS_CONSTRAINTS.MAX_EMAIL_ADDRESSES) {
        throw new ValidationDataException(
          'emailAddresses',
          `Максимум ${ALERTS_CONSTRAINTS.MAX_EMAIL_ADDRESSES} email адресов`
        );
      }

      // Проверяем формат email (дополнительная проверка)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = settings.emailAddresses.filter(email => !emailRegex.test(email));
      
      if (invalidEmails.length > 0) {
        throw new ValidationDataException(
          'emailAddresses',
          `Некорректные email адреса: ${invalidEmails.join(', ')}`
        );
      }
    }

    // ✅ Валидация порогов
    if (settings.lowStockThreshold !== undefined) {
      if (settings.lowStockThreshold < 0 || settings.lowStockThreshold > 1000) {
        throw new ValidationDataException(
          'lowStockThreshold',
          'Порог низкого остатка должен быть от 0 до 1000'
        );
      }
    }

    if (settings.criticalStockThreshold !== undefined) {
      if (settings.criticalStockThreshold < 0 || settings.criticalStockThreshold > 100) {
        throw new ValidationDataException(
          'criticalStockThreshold',
          'Порог критического остатка должен быть от 0 до 100'
        );
      }
    }

    if (settings.overstockMultiplier !== undefined) {
      if (settings.overstockMultiplier < 2 || settings.overstockMultiplier > 20) {
        throw new ValidationDataException(
          'overstockMultiplier',
          'Множитель избытка должен быть от 2 до 20'
        );
      }
    }

    // ✅ Валидация времени автоотклонения
    if (settings.autoDismissAfterHours !== undefined) {
      if (settings.autoDismissAfterHours < 1 || settings.autoDismissAfterHours > 168) {
        throw new ValidationDataException(
          'autoDismissAfterHours',
          'Время автоотклонения должно быть от 1 до 168 часов'
        );
      }
    }

    // ✅ Валидация рабочего времени
    if (settings.workingHoursStart || settings.workingHoursEnd) {
      this.validateWorkingHours(settings.workingHoursStart, settings.workingHoursEnd);
    }

    // ✅ Валидация рабочих дней
    if (settings.workingDays) {
      const invalidDays = settings.workingDays.filter(day => day < 1 || day > 7);
      if (invalidDays.length > 0) {
        throw new ValidationDataException(
          'workingDays',
          'Рабочие дни должны быть от 1 (ПН) до 7 (ВС)'
        );
      }
    }
  }

  /**
   * ✅ Валидация уведомления
   */
  validateNotificationRequest(request: NotificationRequest): void {
    // ✅ Валидация получателей
    if (request.recipients.length === 0) {
      throw new ValidationDataException(
        'recipients',
        'Список получателей не может быть пустым'
      );
    }

    if (request.recipients.length > ALERTS_CONSTRAINTS.MAX_EMAIL_ADDRESSES) {
      throw new ValidationDataException(
        'recipients',
        `Максимум ${ALERTS_CONSTRAINTS.MAX_EMAIL_ADDRESSES} получателей`
      );
    }

    // ✅ Валидация темы и сообщения
    if (request.subject.length > ALERTS_CONSTRAINTS.MAX_TITLE_LENGTH) {
      throw new ValidationDataException(
        'subject',
        `Тема не может превышать ${ALERTS_CONSTRAINTS.MAX_TITLE_LENGTH} символов`
      );
    }

    if (request.message.length > ALERTS_CONSTRAINTS.MAX_MESSAGE_LENGTH) {
      throw new ValidationDataException(
        'message',
        `Сообщение не может превышать ${ALERTS_CONSTRAINTS.MAX_MESSAGE_LENGTH} символов`
      );
    }
  }

  /**
   * ✅ Валидация контекста триггера алерта
   */
  validateAlertTriggerContext(context: AlertTriggerContext): void {
    // ✅ Проверяем обязательные поля
    if (!context.partId || !context.companyId || !context.triggeredBy) {
      throw new ValidationDataException(
        'context',
        'Контекст триггера должен содержать partId, companyId и triggeredBy'
      );
    }

    // ✅ Валидация данных триггера
    if (context.triggerData) {
      const { previousQuantity, newQuantity } = context.triggerData;
      
      if (previousQuantity !== undefined && previousQuantity < 0) {
        throw new ValidationDataException(
          'triggerData.previousQuantity',
          'Предыдущее количество не может быть отрицательным'
        );
      }

      if (newQuantity !== undefined && newQuantity < 0) {
        throw new ValidationDataException(
          'triggerData.newQuantity',
          'Новое количество не может быть отрицательным'
        );
      }
    }
  }

  /**
   * 🔒 Валидация прав доступа к операции
   */
  validateOperationPermissions(operation: string, userRole: AuthRole): void {
    const permissions = INVENTORY_CONSTANTS.ROLES;

    switch (operation) {
      case 'view':
        if (!permissions.CAN_VIEW.includes(userRole as any)) {
          throw new ValidationDataException(
            'permissions',
            'Недостаточно прав для просмотра алертов'
          );
        }
        break;

      case 'dismiss':
        if (!permissions.CAN_UPDATE_QUANTITIES.includes(userRole as any)) {
          throw new ValidationDataException(
            'permissions',
            'Недостаточно прав для отклонения алертов'
          );
        }
        break;

      case 'settings':
        if (!permissions.CAN_UPDATE_SETTINGS.includes(userRole as any)) {
          throw new ValidationDataException(
            'permissions',
            'Недостаточно прав для изменения настроек'
          );
        }
        break;

      case 'delete':
        if (!permissions.CAN_DELETE.includes(userRole as any)) {
          throw new ValidationDataException(
            'permissions',
            'Недостаточно прав для удаления алертов'
          );
        }
        break;

      default:
        throw new ValidationDataException(
          'operation',
          `Неизвестная операция: ${operation}`
        );
    }
  }

  /**
   * 📊 Валидация метаданных алерта
   */
  private validateAlertMetadata(metadata?: any): void {
    if (!metadata) return;

    // ✅ Валидация shortage
    if (metadata.shortage !== undefined && metadata.shortage < 0) {
      throw new ValidationDataException(
        'metadata.shortage',
        'Нехватка не может быть отрицательной'
      );
    }

    // ✅ Валидация estimatedRunOutDays
    if (metadata.estimatedRunOutDays !== undefined) {
      if (metadata.estimatedRunOutDays < 0 || metadata.estimatedRunOutDays > 365) {
        throw new ValidationDataException(
          'metadata.estimatedRunOutDays',
          'Прогноз исчерпания должен быть от 0 до 365 дней'
        );
      }
    }

    // ✅ Валидация excessQuantity
    if (metadata.excessQuantity !== undefined && metadata.excessQuantity < 0) {
      throw new ValidationDataException(
        'metadata.excessQuantity',
        'Избыток не может быть отрицательным'
      );
    }

    // ✅ Валидация averageUsage
    if (metadata.averageUsage !== undefined && metadata.averageUsage < 0) {
      throw new ValidationDataException(
        'metadata.averageUsage',
        'Средний расход не может быть отрицательным'
      );
    }
  }

  /**
   * ⏰ Валидация рабочего времени
   */
  private validateWorkingHours(start?: string, end?: string): void {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (start && !timeRegex.test(start)) {
      throw new ValidationDataException(
        'workingHoursStart',
        'Время начала работы должно быть в формате HH:mm'
      );
    }

    if (end && !timeRegex.test(end)) {
      throw new ValidationDataException(
        'workingHoursEnd',
        'Время окончания работы должно быть в формате HH:mm'
      );
    }

    // Проверяем что время окончания больше времени начала
    if (start && end) {
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (endMinutes <= startMinutes) {
        throw new ValidationDataException(
          'workingHours',
          'Время окончания работы должно быть больше времени начала'
        );
      }
    }
  }
}
