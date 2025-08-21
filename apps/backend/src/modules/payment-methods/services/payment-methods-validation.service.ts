// path: apps/backend/src/modules/payment-methods/services/payment-methods-validation.service.ts
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentMethod } from '../../../database/entities';
import {
  PaymentMethodNotFoundException,
  ResourceOwnershipException,
  ValidationDataException,
} from '../../../common/exceptions/domain.exceptions';
import { CreatePaymentMethodDto } from '../dto/request/create-payment-method.dto';
import { UpdatePaymentMethodDto } from '../dto/request/update-payment-method.dto';
import {
  PAYMENT_METHODS_CONSTANTS,
  PAYMENT_METHOD_VALIDATION_MESSAGES,
} from '../constants/payment-methods.constants';
import { Payment } from '../../../database/entities/payment.entity';

@Injectable()
export class PaymentMethodsValidationService {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async validatePaymentMethodOwnership(paymentMethodId: string, companyId: string): Promise<PaymentMethod> {
    const paymentMethod = await this.paymentMethodRepository.findOne({ where: { id: paymentMethodId } });
    if (!paymentMethod) throw new PaymentMethodNotFoundException(paymentMethodId);
    if (paymentMethod.companyId !== companyId) {
      throw new ResourceOwnershipException('payment-method', paymentMethodId);
    }
    return paymentMethod;
  }

  async validateCreatePaymentMethodData(dto: CreatePaymentMethodDto, companyId: string): Promise<void> {
    await this.validatePaymentMethodNameUniqueness(dto.name, companyId);
    this.validatePaymentMethodBusinessRules(dto);
    await this.validateIntegrationConfig(dto);
    this.validateInstallmentConfig(dto);
    this.validatePaymentLimits(dto);
  }

  async validateUpdatePaymentMethodData(
    paymentMethodId: string,
    dto: UpdatePaymentMethodDto,
    companyId: string,
  ): Promise<PaymentMethod> {
    const paymentMethod = await this.validatePaymentMethodOwnership(paymentMethodId, companyId);

    if (dto.name && dto.name !== paymentMethod.name) {
      await this.validatePaymentMethodNameUniqueness(dto.name, companyId, paymentMethodId);
    }
    if (dto.processingFeePercent !== undefined || dto.type !== undefined) {
      this.validatePaymentMethodBusinessRules(dto as CreatePaymentMethodDto);
    }
    if (dto.integrationConfig !== undefined) {
      await this.validateIntegrationConfig(dto);
    }
    if (dto.installmentConfig !== undefined) {
      this.validateInstallmentConfig(dto);
    }
    if (dto.limits !== undefined) {
      this.validatePaymentLimits(dto);
    }
    return paymentMethod;
  }

  async validatePaymentMethodAvailability(paymentMethodId: string, companyId: string): Promise<PaymentMethod> {
    const paymentMethod = await this.validatePaymentMethodOwnership(paymentMethodId, companyId);
    if (!paymentMethod.isActive) {
      throw new ValidationDataException('isActive', `Способ оплаты ${paymentMethodId} неактивен и не может быть использован`);
    }
    return paymentMethod;
  }

  async validateBulkPaymentMethodsOwnership(paymentMethodIds: string[], companyId: string): Promise<PaymentMethod[]> {
    if (!paymentMethodIds || paymentMethodIds.length === 0) {
      throw new ValidationDataException('paymentMethodIds', 'Список ID способов оплаты не может быть пустым');
    }
    if (paymentMethodIds.length > 50) {
      throw new ValidationDataException(
        'paymentMethodIds',
        'Максимальное количество способов оплаты для массовой операции: 50',
      );
    }

    const paymentMethods = await this.paymentMethodRepository.find({
      where: paymentMethodIds.map((id) => ({ id, companyId })),
    });

    if (paymentMethods.length !== paymentMethodIds.length) {
      const foundIds = paymentMethods.map((pm) => pm.id);
      const missingIds = paymentMethodIds.filter((id) => !foundIds.includes(id));
      throw new ValidationDataException('paymentMethodIds', `Способы оплаты не найдены или нет доступа: ${missingIds.join(', ')}`);
    }

    return paymentMethods;
  }

  private async validatePaymentMethodNameUniqueness(
    name: string,
    companyId: string,
    excludePaymentMethodId?: string,
  ): Promise<void> {
    const query = this.paymentMethodRepository
      .createQueryBuilder('paymentMethod')
      .where('paymentMethod.name = :name', { name })
      .andWhere('paymentMethod.companyId = :companyId', { companyId });

    if (excludePaymentMethodId) {
      query.andWhere('paymentMethod.id != :excludePaymentMethodId', { excludePaymentMethodId });
    }

    const existingPaymentMethod = await query.getOne();
    if (existingPaymentMethod) {
      throw new ValidationDataException('name', `Способ оплаты с названием "${name}" уже существует в вашей компании`);
    }
  }

  private validatePaymentMethodBusinessRules(dto: CreatePaymentMethodDto | UpdatePaymentMethodDto): void {
    if (dto.processingFeePercent !== undefined) {
      if (
        dto.processingFeePercent < PAYMENT_METHODS_CONSTANTS.MIN_PROCESSING_FEE ||
        dto.processingFeePercent > PAYMENT_METHODS_CONSTANTS.MAX_PROCESSING_FEE
      ) {
        throw new ValidationDataException('processingFeePercent', PAYMENT_METHOD_VALIDATION_MESSAGES.PROCESSING_FEE_INVALID);
      }
    }
    if (dto.name !== undefined) {
      if (!dto.name || dto.name.trim().length === 0) {
        throw new ValidationDataException('name', PAYMENT_METHOD_VALIDATION_MESSAGES.NAME_REQUIRED);
      }
      if (dto.name.length > PAYMENT_METHODS_CONSTANTS.MAX_NAME_LENGTH) {
        throw new ValidationDataException('name', PAYMENT_METHOD_VALIDATION_MESSAGES.NAME_TOO_LONG);
      }
    }
    if (dto.description !== undefined && dto.description.length > PAYMENT_METHODS_CONSTANTS.MAX_DESCRIPTION_LENGTH) {
      throw new ValidationDataException('description', PAYMENT_METHOD_VALIDATION_MESSAGES.DESCRIPTION_TOO_LONG);
    }
    if (dto.type !== undefined) {
      const validTypes = [
        'cash',
        'card',
        'bank_transfer',
        'installments',
        'corporate',
        'digital_wallet',
        'cryptocurrency',
      ];
      if (!validTypes.includes(dto.type)) {
        throw new ValidationDataException('type', 'Некорректный тип способа оплаты');
      }
    }
  }

  async validateIntegrationConfig(dto: CreatePaymentMethodDto | UpdatePaymentMethodDto): Promise<void> {
    if (!dto.integrationConfig) return;

    const config = dto.integrationConfig;

    if (!PAYMENT_METHODS_CONSTANTS.SUPPORTED_GATEWAYS.includes(config.gatewayType as any)) {
      throw new ValidationDataException(
        'integrationConfig.gatewayType',
        PAYMENT_METHOD_VALIDATION_MESSAGES.GATEWAY_NOT_SUPPORTED,
      );
    }

    const onlineGateways = ['stripe', 'yookassa', 'sberbank', 'tinkoff'];
    if (onlineGateways.includes(config.gatewayType) && !config.apiKey) {
      throw new ValidationDataException('integrationConfig.apiKey', 'API ключ обязателен для данного типа интеграции');
    }

    if (config.webhookUrl && !this.isValidUrl(config.webhookUrl)) {
      throw new ValidationDataException('integrationConfig.webhookUrl', 'Некорректный URL для webhook');
    }
  }

  private validateInstallmentConfig(dto: CreatePaymentMethodDto | UpdatePaymentMethodDto): void {
    if (!dto.installmentConfig) return;

    const config = dto.installmentConfig;

    if (config.maxPeriodMonths < 1 || config.maxPeriodMonths > PAYMENT_METHODS_CONSTANTS.MAX_INSTALLMENT_MONTHS) {
      throw new ValidationDataException(
        'installmentConfig.maxPeriodMonths',
        `Период рассрочки должен быть от 1 до ${PAYMENT_METHODS_CONSTANTS.MAX_INSTALLMENT_MONTHS} месяцев`,
      );
    }

    if (config.interestRate < 0 || config.interestRate > 100) {
      throw new ValidationDataException('installmentConfig.interestRate', 'Процентная ставка должна быть от 0 до 100%');
    }

    if (
      config.minDownPaymentPercent < PAYMENT_METHODS_CONSTANTS.MIN_DOWN_PAYMENT_PERCENT ||
      config.minDownPaymentPercent > 100
    ) {
      throw new ValidationDataException(
        'installmentConfig.minDownPaymentPercent',
        `Первоначальный взнос должен быть от ${PAYMENT_METHODS_CONSTANTS.MIN_DOWN_PAYMENT_PERCENT} до 100%`,
      );
    }
  }

  private validatePaymentLimits(dto: CreatePaymentMethodDto | UpdatePaymentMethodDto): void {
    if (!dto.limits) return;

    const limits = dto.limits;

    if (limits.minAmount !== undefined && limits.minAmount < PAYMENT_METHODS_CONSTANTS.MIN_AMOUNT_LIMIT) {
      throw new ValidationDataException('limits.minAmount', 'Минимальная сумма слишком мала');
    }

    if (limits.maxAmount !== undefined && limits.maxAmount > PAYMENT_METHODS_CONSTANTS.MAX_AMOUNT_LIMIT) {
      throw new ValidationDataException('limits.maxAmount', 'Максимальная сумма слишком велика');
    }

    if (limits.minAmount !== undefined && limits.maxAmount !== undefined && limits.minAmount > limits.maxAmount) {
      throw new ValidationDataException('limits', 'Минимальная сумма не может быть больше максимальной');
    }

    if (
      limits.dailyTransactionLimit !== undefined &&
      (limits.dailyTransactionLimit < 1 || limits.dailyTransactionLimit > PAYMENT_METHODS_CONSTANTS.MAX_DAILY_TRANSACTIONS)
    ) {
      throw new ValidationDataException(
        'limits.dailyTransactionLimit',
        `Дневной лимит транзакций должен быть от 1 до ${PAYMENT_METHODS_CONSTANTS.MAX_DAILY_TRANSACTIONS}`,
      );
    }
  }

  async validatePaymentMethodDeletion(paymentMethodId: string, companyId: string): Promise<void> {
    const paymentMethod = await this.validatePaymentMethodOwnership(paymentMethodId, companyId);

    if (paymentMethod.isActive) {
      throw new ValidationDataException('isActive', 'Нельзя удалить активный способ оплаты. Сначала деактивируйте его.');
    }

    const existsPayment = await this.paymentRepository.exist({
      where: { paymentMethodId: paymentMethodId, companyId },
    });
    if (existsPayment) {
      throw new ValidationDataException(
        'inUse',
        'Нельзя удалить способ оплаты: он используется в платежах. Историю расчетов необходимо сохранить.',
      );
    }
  }

  validatePaymentMethodsFilter(filter: any): void {
    if (filter.page !== undefined) {
      const page = parseInt(filter.page);
      if (isNaN(page) || page < 1) {
        throw new ValidationDataException('page', 'Номер страницы должен быть положительным числом');
      }
    }

    if (filter.limit !== undefined) {
      const limit = parseInt(filter.limit);
      if (isNaN(limit) || limit < 1 || limit > PAYMENT_METHODS_CONSTANTS.MAX_PAGE_SIZE) {
        throw new ValidationDataException('limit', `Размер страницы должен быть от 1 до ${PAYMENT_METHODS_CONSTANTS.MAX_PAGE_SIZE}`);
      }
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
