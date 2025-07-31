// src/modules/payment-methods/services/payment-methods-business.service.ts
import { Injectable } from '@nestjs/common';
import { PaymentMethodsDataService } from './payment-methods-data.service';
import { PaymentMethodsValidationService } from './payment-methods-validation.service';
import { PaymentMethodsMapperService } from './payment-methods-mapper.service';
import { PaymentMethod } from '../../../database/entities';
import { CreatePaymentMethodDto } from '../dto/request/create-payment-method.dto';
import { UpdatePaymentMethodDto } from '../dto/request/update-payment-method.dto';
import { PaymentMethodResponseDto } from '../dto/response/payment-method-response.dto';
import { PaginatedPaymentMethodsResponseDto } from '../dto/response/paginated-payment-methods-response.dto';
import { PaymentMethodsFilter, PaymentMethodStats, BulkUpdateResult, UserWithCompany, IntegrationTestResult, PaymentProcessingResult } from '../types/payment-methods.types';
import { PAYMENT_METHODS_CONSTANTS } from '../constants/payment-methods.constants';

@Injectable()
export class PaymentMethodsBusinessService {
  constructor(
    // 🔥 Делаем поля public для доступа из main сервиса
    public readonly dataService: PaymentMethodsDataService,
    public readonly validationService: PaymentMethodsValidationService,
    public readonly mapperService: PaymentMethodsMapperService,
  ) {}

  /**
   * 🔒 Получение всех способов оплаты пользователя с пагинацией и фильтрацией
   */
  async findAllForUser(user: UserWithCompany, filter: PaymentMethodsFilter): Promise<PaginatedPaymentMethodsResponseDto> {
    // 🔒 КРИТИЧНО: Всегда фильтруем по companyId пользователя
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Подготавливаем фильтр с безопасными значениями
    const safeFilter = this.prepareSafeFilter(filter, user.companyId);

    // Валидируем фильтр
    this.validationService.validatePaymentMethodsFilter(safeFilter);

    // Получаем данные
    const [paymentMethods, total] = await this.dataService.findWithFilters(safeFilter);

    // Возвращаем маппированный результат
    return this.mapperService.mapToPaginatedResponse(
      paymentMethods,
      total,
      safeFilter.page || 1,
      safeFilter.limit || PAYMENT_METHODS_CONSTANTS.DEFAULT_PAGE_SIZE
    );
  }

  /**
   * 🔒 Получение способа оплаты по ID с проверкой прав доступа
   */
  async findOneSecurely(paymentMethodId: string, user: UserWithCompany): Promise<PaymentMethodResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Проверяем права доступа через ValidationService
    const paymentMethod = await this.validationService.validatePaymentMethodOwnership(paymentMethodId, user.companyId);

    return this.mapperService.mapToResponseDto(paymentMethod);
  }

  /**
   * ➕ Создание нового способа оплаты
   */
  async createPaymentMethod(dto: CreatePaymentMethodDto, user: UserWithCompany): Promise<PaymentMethodResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Валидируем данные
    await this.validationService.validateCreatePaymentMethodData(dto, user.companyId);

    // Создаем способ оплаты
    const paymentMethod = await this.dataService.create(dto, user.companyId);

    // Логируем создание для audit
    console.log(`✅ PaymentMethod created: ${paymentMethod.id} by user ${user.id} in company ${user.companyId}`);

    return this.mapperService.mapToResponseDto(paymentMethod);
  }

  /**
   * ✏️ Обновление способа оплаты
   */
  async updatePaymentMethod(paymentMethodId: string, dto: UpdatePaymentMethodDto, user: UserWithCompany): Promise<PaymentMethodResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Валидируем права доступа и данные
    await this.validationService.validateUpdatePaymentMethodData(paymentMethodId, dto, user.companyId);

    // Обновляем способ оплаты
    const updatedPaymentMethod = await this.dataService.update(paymentMethodId, dto);

    // Логируем обновление для audit
    console.log(`✅ PaymentMethod updated: ${paymentMethodId} by user ${user.id} in company ${user.companyId}`);

    return this.mapperService.mapToResponseDto(updatedPaymentMethod);
  }

  /**
   * 🗑️ Удаление способа оплаты
   */
  async removePaymentMethod(paymentMethodId: string, user: UserWithCompany): Promise<void> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Проверяем возможность удаления
    await this.validationService.validatePaymentMethodDeletion(paymentMethodId, user.companyId);

    // Удаляем способ оплаты
    await this.dataService.remove(paymentMethodId);

    // Логируем удаление для audit
    console.log(`🗑️ PaymentMethod deleted: ${paymentMethodId} by user ${user.id} in company ${user.companyId}`);
  }

  /**
   * 🔄 Переключение статуса способа оплаты
   */
  async togglePaymentMethodStatus(paymentMethodId: string, user: UserWithCompany): Promise<PaymentMethodResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Проверяем права доступа
    await this.validationService.validatePaymentMethodOwnership(paymentMethodId, user.companyId);

    // Переключаем статус
    const updatedPaymentMethod = await this.dataService.toggleStatus(paymentMethodId);

    // Логируем изменение статуса для audit
    console.log(`🔄 PaymentMethod status toggled: ${paymentMethodId} -> ${updatedPaymentMethod.isActive} by user ${user.id}`);

    return this.mapperService.mapToResponseDto(updatedPaymentMethod);
  }

  /**
   * 🔥 Массовое обновление способов оплаты
   */
  async bulkUpdatePaymentMethods(
    paymentMethodIds: string[], 
    updates: UpdatePaymentMethodDto, 
    user: UserWithCompany
  ): Promise<BulkUpdateResult> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Валидируем права доступа ко всем способам оплаты
    await this.validationService.validateBulkPaymentMethodsOwnership(paymentMethodIds, user.companyId);

    // Выполняем массовое обновление
    const updatedCount = await this.dataService.bulkUpdate(paymentMethodIds, updates);

    // Логируем bulk операцию для audit
    console.log(`🔥 Bulk update: ${updatedCount}/${paymentMethodIds.length} payment methods updated by user ${user.id}`);

    return this.mapperService.mapBulkOperationResult(updatedCount, paymentMethodIds.length);
  }

  /**
   * 📊 Получение статистики способов оплаты
   */
  async getPaymentMethodsStatistics(user: UserWithCompany): Promise<any> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    const stats = await this.dataService.getPaymentMethodsStats(user.companyId);

    return this.mapperService.mapStatsToResponse(stats);
  }

  /**
   * 🔍 Поиск способов оплаты по названию
   */
  async searchPaymentMethods(query: string, user: UserWithCompany): Promise<PaymentMethodResponseDto[]> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    if (!query || query.trim().length < 2) {
      throw new Error('Поисковый запрос должен содержать минимум 2 символа');
    }

    const paymentMethods = await this.dataService.searchByName(query.trim(), user.companyId);

    return this.mapperService.mapArrayToResponseDto(paymentMethods);
  }

  /**
   * 🔥 Получение активных способов оплаты для быстрого доступа
   */
  async getActivePaymentMethodsQuick(user: UserWithCompany): Promise<Array<{
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    processingFee?: number;
  }>> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    const paymentMethods = await this.dataService.findActiveByCompany(user.companyId);

    return this.mapperService.mapToQuickListDto(paymentMethods);
  }

  /**
   * 📱 Получение способов оплаты для dropdown/select
   */
  async getPaymentMethodsForSelect(user: UserWithCompany): Promise<Array<{
    value: string;
    label: string;
    disabled?: boolean;
    meta?: any;
  }>> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    const paymentMethods = await this.dataService.findActiveByCompany(user.companyId);

    return this.mapperService.mapToSelectOptions(paymentMethods);
  }

  /**
   * 🔥 Получение способов оплаты по типу
   */
  async getPaymentMethodsByType(type: string, user: UserWithCompany): Promise<PaymentMethodResponseDto[]> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    const paymentMethods = await this.dataService.findByType(user.companyId, type);

    return this.mapperService.mapArrayToResponseDto(paymentMethods);
  }

  /**
   * 🔥 Проверка доступности способа оплаты для использования
   */
  async checkPaymentMethodAvailability(paymentMethodId: string, user: UserWithCompany): Promise<{
    available: boolean;
    paymentMethod?: PaymentMethodResponseDto;
    reason?: string;
  }> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    try {
      const paymentMethod = await this.validationService.validatePaymentMethodAvailability(paymentMethodId, user.companyId);
      
      return {
        available: true,
        paymentMethod: this.mapperService.mapToResponseDto(paymentMethod),
      };
    } catch (error) {
      return {
        available: false,
        reason: error.message,
      };
    }
  }

  /**
   * 🔥 Тестирование интеграции способа оплаты
   */
	async testIntegration(paymentMethodId: string, user: UserWithCompany): Promise<IntegrationTestResult> {
	if (!user.companyId) {
		throw new Error('Пользователь не принадлежит к компании');
	}

	// Проверяем права доступа
	const paymentMethod = await this.validationService.validatePaymentMethodOwnership(paymentMethodId, user.companyId);

	// Проверяем наличие интеграции
	if (!paymentMethod.gatewayType) {
		throw new Error('Интеграция не настроена');
	}

	// Создаем конфигурацию из полей entity
	const integrationConfig = {
		gatewayType: paymentMethod.gatewayType,
		apiKey: paymentMethod.gatewayApiKey,
		merchantId: paymentMethod.gatewayMerchantId,
		webhookUrl: paymentMethod.gatewayWebhookUrl,
		testMode: paymentMethod.gatewayTestMode,
	};

	// Выполняем тестирование в зависимости от типа шлюза
	const testResult = await this.performIntegrationTest(integrationConfig);

	// Логируем тестирование
	console.log(`🧪 Integration test: ${paymentMethodId} gateway ${paymentMethod.gatewayType} by user ${user.id}`);

	return this.mapperService.mapIntegrationTestResult(paymentMethodId, paymentMethod.gatewayType, testResult);
	}

  /**
   * 🔒 Подготовка безопасного фильтра с принудительной установкой companyId
   */
  private prepareSafeFilter(filter: PaymentMethodsFilter, companyId: string): PaymentMethodsFilter {
    const page = filter.page ? Math.max(1, parseInt(String(filter.page))) : 1;
    const limit = filter.limit ? 
      Math.min(PAYMENT_METHODS_CONSTANTS.MAX_PAGE_SIZE, Math.max(1, parseInt(String(filter.limit)))) : 
      PAYMENT_METHODS_CONSTANTS.DEFAULT_PAGE_SIZE;

    return {
      ...filter,
      companyId, // 🔒 ПРИНУДИТЕЛЬНО устанавливаем companyId
      page,
      limit,
      offset: (page - 1) * limit,
    };
  }

  /**
   * 🔥 Выполнение тестирования интеграции
   */
  private async performIntegrationTest(integrationConfig: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      switch (integrationConfig.gatewayType) {
        case 'stripe':
          return await this.testStripeIntegration(integrationConfig);
        
        case 'yookassa':
          return await this.testYooKassaIntegration(integrationConfig);
        
        case 'sberbank':
          return await this.testSberbankIntegration(integrationConfig);
        
        case 'tinkoff':
          return await this.testTinkoffIntegration(integrationConfig);
        
        default:
          return this.mockIntegrationTest(integrationConfig);
      }
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        errors: [error.message],
        features: {
          payment: false,
          refund: false,
          installments: false,
          webhooks: false,
        },
      };
    }
  }

  /**
   * 🧪 Mock тестирование интеграции (для демонстрации)
   */
  private async mockIntegrationTest(integrationConfig: any): Promise<any> {
    // Имитируем API вызов
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    const isTestMode = integrationConfig.testMode;
    const hasApiKey = !!integrationConfig.apiKey;
    
    return {
      success: hasApiKey && isTestMode,
      responseTime: 200 + Math.random() * 300,
      features: {
        payment: hasApiKey,
        refund: hasApiKey && integrationConfig.gatewayType !== 'cash',
        installments: ['stripe', 'yookassa'].includes(integrationConfig.gatewayType),
        webhooks: hasApiKey && !!integrationConfig.webhookUrl,
      },
      errors: hasApiKey ? [] : ['API ключ не настроен'],
    };
  }

  /**
   * 🧪 Тестирование Stripe интеграции
   */
  private async testStripeIntegration(config: any): Promise<any> {
    // TODO: Implement real Stripe API test
    return this.mockIntegrationTest(config);
  }

  /**
   * 🧪 Тестирование YooKassa интеграции
   */
  private async testYooKassaIntegration(config: any): Promise<any> {
    // TODO: Implement real YooKassa API test
    return this.mockIntegrationTest(config);
  }

  /**
   * 🧪 Тестирование Sberbank интеграции
   */
  private async testSberbankIntegration(config: any): Promise<any> {
    // TODO: Implement real Sberbank API test
    return this.mockIntegrationTest(config);
  }

  /**
   * 🧪 Тестирование Tinkoff интеграции
   */
  private async testTinkoffIntegration(config: any): Promise<any> {
    // TODO: Implement real Tinkoff API test
    return this.mockIntegrationTest(config);
  }

  // ========== МЕТОДЫ ДЛЯ ДРУГИХ МОДУЛЕЙ ==========

  /**
   * 🔗 Получение способа оплаты для платежа (используется в Payments модуле)
   */
  async getPaymentMethodForPayment(paymentMethodId: string, companyId: string): Promise<PaymentMethodResponseDto> {
    const paymentMethod = await this.validationService.validatePaymentMethodAvailability(paymentMethodId, companyId);
    return this.mapperService.mapToResponseDto(paymentMethod);
  }

  /**
   * 🔗 Проверка существования способа оплаты (для других модулей)
   */
  async existsInCompany(paymentMethodId: string, companyId: string): Promise<boolean> {
    try {
      await this.validationService.validatePaymentMethodOwnership(paymentMethodId, companyId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 🔗 Получение конфигурации лимитов
   */
  async getPaymentMethodLimits(paymentMethodId: string, companyId: string): Promise<any> {
    const paymentMethod = await this.validationService.validatePaymentMethodOwnership(paymentMethodId, companyId);
    return this.mapperService.mapLimitsConfig(paymentMethod);
  }

  /**
   * 🔗 Расчет комиссии за платеж
   */
  async calculateProcessingFee(paymentMethodId: string, amount: number, companyId: string): Promise<{
	amount: number;
	fee: number;
	totalAmount: number;
	feePercentage: number;
	}> {
	const paymentMethod = await this.validationService.validatePaymentMethodAvailability(paymentMethodId, companyId);
	
	const feePercentage = paymentMethod.processingFeePercent || 0;
	const fee = Math.round((amount * feePercentage / 100) * 100) / 100; // 2 decimal places
	const totalAmount = amount + fee;

	return {
		amount,
		fee,
		totalAmount,
		feePercentage,
	};
  }
}
