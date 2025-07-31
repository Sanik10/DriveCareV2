import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';
import { RequestWithUser } from '../../modules/auth/interfaces/request-with-user.interface';

@Injectable()
export class CompanyOwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private moduleRef: ModuleRef, // 🔥 ДОБАВЛЕНО: для динамического получения сервисов
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Пользователь не аутентифицирован');
    }

    if (user.role === 'superadmin') {
      return true;
    }

    const resourceType = this.reflector.get<string>('resourceType', context.getHandler());
    const resourceParam = this.reflector.get<string>('resourceParam', context.getHandler()) || 'id';
    
    if (!resourceType) {
      return true;
    }

    return this.checkResourceOwnership(user, resourceType, request.params[resourceParam], request);
  }

  private async checkResourceOwnership(
    user: RequestWithUser['user'], 
    resourceType: string, 
    resourceId: string, 
    request: any
  ): Promise<boolean> {
    switch (resourceType) {
      case 'company':
        return this.checkCompanyOwnership(user, resourceId);
      
      case 'company-subscriptions':
        return this.checkCompanySubscriptionsAccess(user, request);
      
      case 'subscription':
        return this.checkSubscriptionOwnership(user, resourceId, request);

      case 'customer':
        return this.checkCustomerOwnership(user, resourceId);

      case 'vehicle':
        return this.checkVehicleOwnership(user, resourceId);

      case 'service-history':
        return this.checkServiceHistoryOwnership(user, resourceId);

      case 'vehicle-brand':
      case 'vehicle-model':
      case 'vehicle-type':
        return this.checkVehicleCatalogAccess(user);

      case 'service':
        return this.checkServiceOwnership(user, resourceId);

      case 'service-category':
        return this.checkServiceCategoryOwnership(user, resourceId);

      // 🔥 Временные заглушки для несуществующих модулей
      case 'payment-method':
        return this.checkPaymentMethodOwnership(user, resourceId);

      case 'work-schedule':
        return this.checkWorkScheduleOwnership(user, resourceId);

      case 'appointment':
        return this.checkAppointmentOwnership(user, resourceId);

      case 'order':
        return this.checkOrderOwnership(user, resourceId);

      case 'invoice':
        return this.checkInvoiceOwnership(user, resourceId);

      case 'payment':
        return this.checkPaymentOwnership(user, resourceId);
        
      default:
        console.warn(`⚠️ Unknown resource type: ${resourceType} - access granted by default`);
        return true;
    }
  }

  private checkCompanyOwnership(user: RequestWithUser['user'], companyId: string): boolean {
    if (user.companyId !== companyId) {
      throw new ForbiddenException(
        `Доступ запрещен. Вы принадлежите к компании ${user.companyId}, ` +
        `но пытаетесь получить доступ к компании ${companyId}`
      );
    }
    return true;
  }

  private checkCompanySubscriptionsAccess(user: RequestWithUser['user'], request: any): boolean {
    const companyId = request.params.companyId;
    
    if (user.companyId !== companyId) {
      throw new ForbiddenException(
        `Доступ к подпискам запрещен. Вы принадлежите к компании ${user.companyId}, ` +
        `но пытаетесь получить доступ к подпискам компании ${companyId}`
      );
    }
    return true;
  }

  private async checkSubscriptionOwnership(
    user: RequestWithUser['user'], 
    subscriptionId: string, 
    request: any
  ): Promise<boolean> {
    if (!user.companyId) {
      throw new ForbiddenException(
        'Пользователь не принадлежит ни к одной компании и не может работать с подписками'
      );
    }

    console.log(`🔍 Subscription ownership check for ${subscriptionId} - detailed validation in service layer`);
    return true;
  }

  // 🔥 ИСПРАВЛЕНО: Реальная проверка customer ownership
  private async checkCustomerOwnership(user: RequestWithUser['user'], customerId: string): Promise<boolean> {
    if (!user.companyId) {
      throw new ForbiddenException('Пользователь не принадлежит к компании для доступа к клиентам');
    }

    try {
      // 🔒 КРИТИЧНО: Получаем ValidationService динамически и проверяем ownership
      const { CustomersValidationService } = await import('../../modules/customers/services/customers-validation.service');
      const validationService = this.moduleRef.get(CustomersValidationService, { strict: false });
      
      if (validationService) {
        await validationService.validateCustomerOwnership(customerId, user.companyId);
        console.log(`✅ Customer ownership validated: ${customerId} belongs to company ${user.companyId}`);
        return true;
      } else {
        console.warn(`⚠️ CustomersValidationService not found - allowing access for ${customerId}`);
        return true;
      }
    } catch (error) {
      throw new ForbiddenException(
        `Доступ к клиенту ${customerId} запрещен для компании ${user.companyId}`
      );
    }
  }

  private checkVehicleOwnership(user: RequestWithUser['user'], vehicleId: string): boolean {
    if (!user.companyId) {
      throw new ForbiddenException('Пользователь не принадлежит к компании для доступа к автомобилям');
    }
    console.log(`✅ Vehicle access granted for ${vehicleId} to user from company ${user.companyId}`);
    return true;
  }

  private checkServiceHistoryOwnership(user: RequestWithUser['user'], historyId: string): boolean {
    if (!user.companyId) {
      throw new ForbiddenException('Пользователь не принадлежит к компании для доступа к истории обслуживания');
    }
    console.log(`✅ Service history access granted for ${historyId} to user from company ${user.companyId}`);
    return true;
  }

  private checkVehicleCatalogAccess(user: RequestWithUser['user']): boolean {
    return true;
  }

  private async checkServiceOwnership(user: RequestWithUser['user'], serviceId: string): Promise<boolean> {
    if (!user.companyId) {
      throw new ForbiddenException('Пользователь не принадлежит к компании');
    }

    try {
      const { ServicesValidationService } = await import('../../modules/services/services/services-validation.service');
      const validationService = this.moduleRef.get(ServicesValidationService, { strict: false });
      
      if (validationService) {
        await validationService.validateServiceOwnership(serviceId, user.companyId);
        return true;
      }
    } catch (error) {
      throw new ForbiddenException(`Нет доступа к услуге ${serviceId}`);
    }
    
    return true;
  }

  private async checkServiceCategoryOwnership(user: RequestWithUser['user'], categoryId: string): Promise<boolean> {
    if (!user.companyId) {
      throw new ForbiddenException('Пользователь не принадлежит к компании');
    }

    try {
      const { ServicesValidationService } = await import('../../modules/services/services/services-validation.service');
      const validationService = this.moduleRef.get(ServicesValidationService, { strict: false });
      
      if (validationService) {
        await validationService.validateServiceCategoryOwnership(categoryId, user.companyId);
        return true;
      }
    } catch (error) {
      throw new ForbiddenException(`Нет доступа к категории услуг ${categoryId}`);
    }
    
    return true;
  }

  // 🔥 ВРЕМЕННЫЕ заглушки для несуществующих модулей (будут заменены при создании модулей)

  private async checkPaymentMethodOwnership(user: RequestWithUser['user'], paymentMethodId: string): Promise<boolean> {
    if (!user.companyId) {
      throw new ForbiddenException('Пользователь не принадлежит к компании');
    }

    // TODO: Implement when payment-methods module is created
    console.log(`✅ Payment method access granted for ${paymentMethodId} to user from company ${user.companyId}`);
    return true;
  }

  private async checkWorkScheduleOwnership(user: RequestWithUser['user'], scheduleId: string): Promise<boolean> {
    if (!user.companyId) {
      throw new ForbiddenException('Пользователь не принадлежит к компании');
    }

    // TODO: Implement when work-schedules module is created
    console.log(`✅ Work schedule access granted for ${scheduleId} to user from company ${user.companyId}`);
    return true;
  }

  private async checkAppointmentOwnership(user: RequestWithUser['user'], appointmentId: string): Promise<boolean> {
    if (!user.companyId) {
      throw new ForbiddenException('Пользователь не принадлежит к компании');
    }

    // TODO: Implement when appointments module is created
    console.log(`✅ Appointment access granted for ${appointmentId} to user from company ${user.companyId}`);
    return true;
  }

  private async checkOrderOwnership(user: RequestWithUser['user'], orderId: string): Promise<boolean> {
    if (!user.companyId) {
      throw new ForbiddenException('Пользователь не принадлежит к компании');
    }

    try {
      // 🔒 КРИТИЧНО: Получаем OrdersValidationService и проверяем ownership
      const { OrdersValidationService } = await import('../../modules/orders/services/orders-validation.service');
      const validationService = this.moduleRef.get(OrdersValidationService, { strict: false });
      
      if (validationService) {
        await validationService.validateOrderOwnership(orderId, user.companyId);
        console.log(`✅ Order ownership validated: ${orderId} belongs to company ${user.companyId}`);
        return true;
      } else {
        console.warn(`⚠️ OrdersValidationService not found - allowing access for ${orderId}`);
        return true;
      }
    } catch (error) {
      throw new ForbiddenException(
        `Доступ к заказу ${orderId} запрещен для компании ${user.companyId}`
      );
    }
  }

  private async checkInvoiceOwnership(user: RequestWithUser['user'], invoiceId: string): Promise<boolean> {
    if (!user.companyId) {
      throw new ForbiddenException('Пользователь не принадлежит к компании');
    }

    // TODO: Implement when invoices module is created
    console.log(`✅ Invoice access granted for ${invoiceId} to user from company ${user.companyId}`);
    return true;
  }

  private async checkPaymentOwnership(user: RequestWithUser['user'], paymentId: string): Promise<boolean> {
    if (!user.companyId) {
      throw new ForbiddenException('Пользователь не принадлежит к компании');
    }

    // TODO: Implement when payments module is created
    console.log(`✅ Payment access granted for ${paymentId} to user from company ${user.companyId}`);
    return true;
  }
}