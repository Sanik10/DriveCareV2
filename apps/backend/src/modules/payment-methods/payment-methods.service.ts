// src/modules/payment-methods/payment-methods.service.ts
import { Injectable } from '@nestjs/common';
import { PaymentMethodsBusinessService } from './services/payment-methods-business.service';
import { CreatePaymentMethodDto } from './dto/request/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/request/update-payment-method.dto';
import { PaymentMethodResponseDto } from './dto/response/payment-method-response.dto';
import { PaginatedPaymentMethodsResponseDto } from './dto/response/paginated-payment-methods-response.dto';
import { PaymentMethodsFilter, BulkUpdateResult, UserWithCompany, IntegrationTestResult } from './types/payment-methods.types';
import { IPaymentMethodsService } from './interfaces/payment-methods.interface';

/**
 * 🎯 Главный сервис для работы с способами оплаты
 * Используется в контроллере и служит основным интерфейсом
 * Делегирует всю логику в PaymentMethodsBusinessService
 */
@Injectable()
export class PaymentMethodsService implements IPaymentMethodsService {
  constructor(
    private readonly businessService: PaymentMethodsBusinessService,
  ) {}

  /**
   * 🔒 Получение всех способов оплаты пользователя
   */
  async findAllForUser(user: UserWithCompany, filter: PaymentMethodsFilter): Promise<PaginatedPaymentMethodsResponseDto> {
    return this.businessService.findAllForUser(user, filter);
  }

  /**
   * 🔒 Получение способа оплаты по ID
   */
  async findOne(id: string): Promise<PaymentMethodResponseDto> {
    // Note: Право доступа проверяется через @PaymentMethodResource() decorator
    // который вызывает CompanyOwnershipGuard -> PaymentMethodsValidationService
    const paymentMethod = await this.businessService.dataService.findById(id);
    
    if (!paymentMethod) {
      throw new Error(`Способ оплаты с ID ${id} не найден`);
    }

    return this.businessService.mapperService.mapToResponseDto(paymentMethod);
  }

  /**
   * ➕ Создание нового способа оплаты
   */
  async createForUser(dto: CreatePaymentMethodDto, user: UserWithCompany): Promise<PaymentMethodResponseDto> {
    return this.businessService.createPaymentMethod(dto, user);
  }

  /**
   * ✏️ Обновление способа оплаты
   */
  async update(id: string, dto: UpdatePaymentMethodDto): Promise<PaymentMethodResponseDto> {
    // Note: Право доступа проверяется через @PaymentMethodResource() decorator
    const updatedPaymentMethod = await this.businessService.dataService.update(id, dto);
    return this.businessService.mapperService.mapToResponseDto(updatedPaymentMethod);
  }

  /**
   * 🗑️ Удаление способа оплаты
   */
  async remove(id: string): Promise<void> {
    // Note: Право доступа проверяется через @PaymentMethodResource() decorator
    await this.businessService.dataService.remove(id);
  }

  /**
   * 🔄 Переключение статуса способа оплаты
   */
  async toggleStatus(id: string): Promise<PaymentMethodResponseDto> {
    // Note: Право доступа проверяется через @PaymentMethodResource() decorator
    const updatedPaymentMethod = await this.businessService.dataService.toggleStatus(id);
    return this.businessService.mapperService.mapToResponseDto(updatedPaymentMethod);
  }

  /**
   * 🔥 Массовое обновление способов оплаты
   */
  async bulkUpdate(
    paymentMethodIds: string[], 
    updates: UpdatePaymentMethodDto, 
    user: UserWithCompany
  ): Promise<BulkUpdateResult> {
    return this.businessService.bulkUpdatePaymentMethods(paymentMethodIds, updates, user);
  }

  /**
   * 📊 Получение статистики способов оплаты
   */
  async getStats(user: UserWithCompany): Promise<any> {
    return this.businessService.getPaymentMethodsStatistics(user);
  }

  /**
   * 🧪 Тестирование интеграции
   */
  async testIntegration(id: string, user: UserWithCompany): Promise<IntegrationTestResult> {
    return this.businessService.testIntegration(id, user);
  }

  // ========== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ==========

  /**
   * 🔍 Поиск способов оплаты
   */
  async search(query: string, user: UserWithCompany): Promise<PaymentMethodResponseDto[]> {
    return this.businessService.searchPaymentMethods(query, user);
  }

  /**
   * 🔥 Получение активных способов оплаты для быстрого доступа
   */
  async getActiveQuick(user: UserWithCompany): Promise<Array<{
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    processingFee?: number;
  }>> {
    return this.businessService.getActivePaymentMethodsQuick(user);
  }

  /**
   * 📱 Получение способов оплаты для dropdown/select
   */
  async getForSelect(user: UserWithCompany): Promise<Array<{
    value: string;
    label: string;
    disabled?: boolean;
    meta?: any;
  }>> {
    return this.businessService.getPaymentMethodsForSelect(user);
  }

  /**
   * 🔥 Получение способов оплаты по типу
   */
  async findByType(type: string, user: UserWithCompany): Promise<PaymentMethodResponseDto[]> {
    return this.businessService.getPaymentMethodsByType(type, user);
  }

  /**
   * 🔥 Проверка доступности способа оплаты
   */
  async checkAvailability(paymentMethodId: string, user: UserWithCompany): Promise<{
    available: boolean;
    paymentMethod?: PaymentMethodResponseDto;
    reason?: string;
  }> {
    return this.businessService.checkPaymentMethodAvailability(paymentMethodId, user);
  }

  // ========== МЕТОДЫ ДЛЯ ДРУГИХ МОДУЛЕЙ ==========

  /**
   * 🔗 Получение способа оплаты для платежа (используется в Payments модуле)
   */
  async getPaymentMethodForPayment(paymentMethodId: string, companyId: string): Promise<PaymentMethodResponseDto> {
    return this.businessService.getPaymentMethodForPayment(paymentMethodId, companyId);
  }

  /**
   * 🔗 Проверка существования способа оплаты (для других модулей)
   */
  async existsInCompany(paymentMethodId: string, companyId: string): Promise<boolean> {
    return this.businessService.existsInCompany(paymentMethodId, companyId);
  }

  /**
   * 🔗 Получение конфигурации лимитов
   */
  async getPaymentMethodLimits(paymentMethodId: string, companyId: string): Promise<any> {
    return this.businessService.getPaymentMethodLimits(paymentMethodId, companyId);
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
    return this.businessService.calculateProcessingFee(paymentMethodId, amount, companyId);
  }
}
