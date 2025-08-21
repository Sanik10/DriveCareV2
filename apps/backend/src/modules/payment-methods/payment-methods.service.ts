// path: apps/backend/src/modules/payment-methods/payment-methods.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethodsBusinessService } from './services/payment-methods-business.service';
import { CreatePaymentMethodDto } from './dto/request/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/request/update-payment-method.dto';
import { PaymentMethodResponseDto } from './dto/response/payment-method-response.dto';
import { PaginatedPaymentMethodsResponseDto } from './dto/response/paginated-payment-methods-response.dto';
import {
  PaymentMethodsFilter,
  BulkUpdateResult,
  UserWithCompany,
  IntegrationTestResult,
  PaymentMethodStats,
} from './types/payment-methods.types';
import { IPaymentMethodsService } from './interfaces/payment-methods.interface';

@Injectable()
export class PaymentMethodsService implements IPaymentMethodsService {
  constructor(private readonly businessService: PaymentMethodsBusinessService) {}

  async findAllForUser(
    user: UserWithCompany,
    filter: PaymentMethodsFilter,
  ): Promise<PaginatedPaymentMethodsResponseDto> {
    return this.businessService.findAllForUser(user, filter);
  }

  async findOneForUser(id: string, user: UserWithCompany): Promise<PaymentMethodResponseDto> {
    return this.businessService.findOneSecurely(id, user);
  }

  async findOne(id: string): Promise<PaymentMethodResponseDto> {
    const pm = await this.businessService.dataService.findById(id);
    if (!pm) throw new NotFoundException(`Способ оплаты с ID ${id} не найден`);
    return this.businessService.mapperService.mapToResponseDto(pm);
  }

  async createForUser(dto: CreatePaymentMethodDto, user: UserWithCompany): Promise<PaymentMethodResponseDto> {
    return this.businessService.createPaymentMethod(dto, user);
  }

  async update(id: string, dto: UpdatePaymentMethodDto, user: UserWithCompany): Promise<PaymentMethodResponseDto>;
  async update(id: string, dto: UpdatePaymentMethodDto): Promise<PaymentMethodResponseDto>;
  async update(id: string, dto: UpdatePaymentMethodDto, user?: UserWithCompany): Promise<PaymentMethodResponseDto> {
    if (user) {
      return this.businessService.updatePaymentMethod(id, dto, user);
    }
    const pm = await this.businessService.dataService.findById(id);
    if (!pm) throw new NotFoundException(`Способ оплаты с ID ${id} не найден`);
    await this.businessService.validationService.validateUpdatePaymentMethodData(id, dto, pm.companyId);
    const updated = await this.businessService.dataService.update(id, dto);
    return this.businessService.mapperService.mapToResponseDto(updated);
  }

  async remove(id: string, user: UserWithCompany): Promise<void>;
  async remove(id: string): Promise<void>;
  async remove(id: string, user?: UserWithCompany): Promise<void> {
    if (user) {
      return this.businessService.removePaymentMethod(id, user);
    }
    const pm = await this.businessService.dataService.findById(id);
    if (!pm) throw new NotFoundException(`Способ оплаты с ID ${id} не найден`);
    await this.businessService.validationService.validatePaymentMethodDeletion(id, pm.companyId);
    await this.businessService.dataService.remove(id);
  }

  async toggleStatus(id: string, user: UserWithCompany): Promise<PaymentMethodResponseDto>;
  async toggleStatus(id: string): Promise<PaymentMethodResponseDto>;
  async toggleStatus(id: string, user?: UserWithCompany): Promise<PaymentMethodResponseDto> {
    if (user) {
      return this.businessService.togglePaymentMethodStatus(id, user);
    }
    const pm = await this.businessService.dataService.findById(id);
    if (!pm) throw new NotFoundException(`Способ оплаты с ID ${id} не найден`);
    await this.businessService.validationService.validatePaymentMethodOwnership(id, pm.companyId);
    const updated = await this.businessService.dataService.toggleStatus(id);
    return this.businessService.mapperService.mapToResponseDto(updated);
  }

  async bulkUpdate(
    paymentMethodIds: string[],
    updates: UpdatePaymentMethodDto,
    user: UserWithCompany,
  ): Promise<BulkUpdateResult> {
    return this.businessService.bulkUpdatePaymentMethods(paymentMethodIds, updates, user);
  }

  async getStats(user: UserWithCompany): Promise<PaymentMethodStats> {
    return this.businessService.getPaymentMethodsStatistics(user);
  }

  async testIntegration(id: string, user: UserWithCompany): Promise<IntegrationTestResult> {
    return this.businessService.testIntegration(id, user);
  }

  async search(query: string, user: UserWithCompany): Promise<PaymentMethodResponseDto[]> {
    return this.businessService.searchPaymentMethods(query, user);
  }

  async getActiveQuick(user: UserWithCompany) {
    return this.businessService.getActivePaymentMethodsQuick(user);
  }

  async getForSelect(user: UserWithCompany) {
    return this.businessService.getPaymentMethodsForSelect(user);
  }

  async findByType(type: string, user: UserWithCompany): Promise<PaymentMethodResponseDto[]> {
    return this.businessService.getPaymentMethodsByType(type, user);
  }

  async checkAvailability(paymentMethodId: string, user: UserWithCompany) {
    return this.businessService.checkPaymentMethodAvailability(paymentMethodId, user);
  }

  async getPaymentMethodForPayment(paymentMethodId: string, companyId: string): Promise<PaymentMethodResponseDto> {
    return this.businessService.getPaymentMethodForPayment(paymentMethodId, companyId);
  }

  async existsInCompany(paymentMethodId: string, companyId: string): Promise<boolean> {
    return this.businessService.existsInCompany(paymentMethodId, companyId);
  }

  async getPaymentMethodLimits(paymentMethodId: string, companyId: string): Promise<any> {
    return this.businessService.getPaymentMethodLimits(paymentMethodId, companyId);
  }

  async calculateProcessingFee(paymentMethodId: string, amount: number, companyId: string) {
    return this.businessService.calculateProcessingFee(paymentMethodId, amount, companyId);
  }
}
