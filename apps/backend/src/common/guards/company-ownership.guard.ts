import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector, ModuleRef } from '@nestjs/core';
import { RequestWithUser } from '../../modules/auth/interfaces/request-with-user.interface';
import { AuditService, AuditAction, AuditLevel } from '../audit/audit.service';

@Injectable()
export class CompanyOwnershipGuard implements CanActivate {
  private readonly logger = new Logger(CompanyOwnershipGuard.name);

  constructor(
    private reflector: Reflector,
    private moduleRef: ModuleRef,
    private auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      await this.auditService.log(AuditAction.ACCESS_DENIED, {
        level: AuditLevel.WARNING,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        details: { reason: 'User not authenticated' },
        status: 'denied',
      });
      throw new ForbiddenException('Пользователь не аутентифицирован');
    }

    if (user.role === 'superadmin') {
      await this.auditService.log(AuditAction.PERMISSION_GRANTED, {
        userId: user.id,
        level: AuditLevel.INFO,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        details: { reason: 'Superadmin access granted (resource-level)' },
        status: 'granted',
      });
      return true;
    }

    const resourceType = this.reflector.get<string>('resourceType', context.getHandler());
    const resourceParam = this.reflector.get<string>('resourceParam', context.getHandler()) || 'id';

    if (!resourceType) return true;

    return this.checkResourceOwnership(user, resourceType, request.params[resourceParam], request);
  }

  private async checkResourceOwnership(
    user: RequestWithUser['user'],
    resourceType: string,
    resourceId: string,
    request: any,
  ): Promise<boolean> {
    try {
      switch (resourceType) {
        case 'company':
          return await this.checkCompanyOwnership(user, resourceId, request);
        case 'company-subscriptions':
          return await this.checkCompanySubscriptionsAccess(user, request);
        case 'subscription':
          return await this.checkSubscriptionOwnership(user, resourceId, request);
        case 'customer':
          return await this.checkCustomerOwnership(user, resourceId, request);
        case 'inventory':
          return await this.checkInventoryOwnership(user, resourceId, request);
        case 'part':
          return await this.checkPartOwnership(user, resourceId, request);
        case 'stock-movement':
          return await this.checkStockMovementOwnership(user, resourceId, request);
        case 'inventory-alert':
          return await this.checkInventoryAlertOwnership(user, resourceId, request);
        case 'vehicle':
          return await this.checkVehicleOwnership(user, resourceId, request);
        case 'service-history':
          return await this.checkServiceHistoryOwnership(user, resourceId, request);
        case 'vehicle-brand':
        case 'vehicle-model':
        case 'vehicle-type':
          return await this.checkVehicleCatalogAccess(user, request);
        case 'service':
          return await this.checkServiceOwnership(user, resourceId, request);
        case 'service-category':
          return await this.checkServiceCategoryOwnership(user, resourceId, request);
        case 'payment-method':
          return await this.checkPaymentMethodOwnership(user, resourceId, request);
        case 'payment':
          return await this.checkPaymentOwnership(user, resourceId, request);
        case 'order':
          return await this.checkOrderOwnership(user, resourceId, request);
        case 'invoice':
          return await this.checkInvoiceOwnership(user, resourceId, request);
        case 'work-schedule':
          return await this.checkWorkScheduleOwnership(user, resourceId, request);
        case 'appointment':
          return await this.checkAppointmentOwnership(user, resourceId, request);
        default:
          await this.auditService.log(AuditAction.ACCESS_DENIED, {
            userId: user.id,
            companyId: user.companyId,
            level: AuditLevel.ERROR,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            details: { reason: 'Unknown resource type', resourceType, resourceId },
            status: 'denied',
          });
          this.logger.error(`Unknown resource type: ${resourceType}`);
          throw new ForbiddenException(`Доступ к ресурсу типа "${resourceType}" запрещен`);
      }
    } catch (error: any) {
      await this.auditService.log(AuditAction.ACCESS_DENIED, {
        userId: user.id,
        companyId: user.companyId,
        level: AuditLevel.WARNING,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        details: { reason: 'Access check failed', resourceType, resourceId, error: error.message },
        status: 'denied',
      });
      throw error;
    }
  }

  private async checkCompanyOwnership(user: RequestWithUser['user'], companyId: string, request: any): Promise<boolean> {
    if (user.companyId !== companyId) {
      await this.auditService.log(AuditAction.ACCESS_DENIED, {
        userId: user.id,
        companyId: user.companyId,
        level: AuditLevel.WARNING,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        details: { reason: 'Company ownership mismatch', requestedCompanyId: companyId, userCompanyId: user.companyId },
        status: 'denied',
      });
      throw new ForbiddenException(`Доступ запрещен. Вы принадлежите к компании ${user.companyId}, но пытаетесь получить доступ к компании ${companyId}`);
    }
    return true;
  }

  private async checkCompanySubscriptionsAccess(user: RequestWithUser['user'], request: any): Promise<boolean> {
    const companyId = request.params.companyId;
    if (user.companyId !== companyId) {
      await this.auditService.log(AuditAction.ACCESS_DENIED, {
        userId: user.id,
        companyId: user.companyId,
        level: AuditLevel.WARNING,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        details: { reason: 'Subscription access denied', requestedCompanyId: companyId, userCompanyId: user.companyId },
        status: 'denied',
      });
      throw new ForbiddenException(`Доступ к подпискам запрещен. Вы принадлежите к компании ${user.companyId}, но пытаетесь получить доступ к подпискам компании ${companyId}`);
    }
    return true;
  }

  private async checkSubscriptionOwnership(user: RequestWithUser['user'], subscriptionId: string, request: any): Promise<boolean> {
    if (!user.companyId) {
      await this.auditService.log(AuditAction.ACCESS_DENIED, {
        userId: user.id, level: AuditLevel.WARNING, ipAddress: request.ip, userAgent: request.headers['user-agent'],
        details: { reason: 'User has no company for subscription access', subscriptionId }, status: 'denied',
      });
      throw new ForbiddenException('Пользователь не принадлежит ни к одной компании и не может работать с подписками');
    }
    const { SubscriptionsValidationService } = await import('../../modules/subscriptions/services/subscriptions-validation.service');
    const validationService = this.moduleRef.get(SubscriptionsValidationService, { strict: false });
    if (!validationService) throw new ForbiddenException('Доступ к подписке временно недоступен');
    const subscription = await validationService.validateSubscriptionExists(subscriptionId);
    if (subscription.companyId !== user.companyId) {
      await this.auditService.log(AuditAction.ACCESS_DENIED, {
        userId: user.id, companyId: user.companyId, level: AuditLevel.WARNING, ipAddress: request.ip, userAgent: request.headers['user-agent'],
        details: { reason: 'Subscription ownership mismatch', subscriptionId, userCompanyId: user.companyId, resourceCompanyId: subscription.companyId }, status: 'denied',
      });
      throw new ForbiddenException(`Подписка ${subscriptionId} не принадлежит компании ${user.companyId}`);
    }
    await this.auditService.log(AuditAction.PERMISSION_GRANTED, {
      userId: user.id, companyId: user.companyId, level: AuditLevel.INFO, ipAddress: request.ip, userAgent: request.headers['user-agent'],
      details: { reason: 'Subscription ownership validated', subscriptionId }, status: 'granted',
    });
    return true;
  }

  private async checkCustomerOwnership(user: RequestWithUser['user'], customerId: string, request: any): Promise<boolean> {
    if (!user.companyId) {
      await this.auditService.log(AuditAction.ACCESS_DENIED, {
        userId: user.id, level: AuditLevel.WARNING, ipAddress: request.ip, userAgent: request.headers['user-agent'],
        details: { reason: 'User has no company for customer access', customerId }, status: 'denied',
      });
      throw new ForbiddenException('Пользователь не принадлежит к компании для доступа к клиентам');
    }
    const { CustomersValidationService } = await import('../../modules/customers/services/customers-validation.service');
    const validationService = this.moduleRef.get(CustomersValidationService, { strict: false });
    if (!validationService) throw new ForbiddenException('Доступ к клиенту временно недоступен');
    await validationService.validateCustomerOwnership(customerId, user.companyId);
    await this.auditService.log(AuditAction.PERMISSION_GRANTED, {
      userId: user.id, companyId: user.companyId, level: AuditLevel.INFO, ipAddress: request.ip, userAgent: request.headers['user-agent'],
      details: { reason: 'Customer ownership validated', customerId }, status: 'granted',
    });
    return true;
  }

  private async checkInventoryOwnership(user: RequestWithUser['user'], inventoryId: string, request: any): Promise<boolean> {
    if (!user.companyId) {
      await this.auditService.log(AuditAction.ACCESS_DENIED, {
        userId: user.id, level: AuditLevel.WARNING, ipAddress: request.ip, userAgent: request.headers['user-agent'],
        details: { reason: 'User has no company for inventory access', inventoryId }, status: 'denied',
      });
      throw new ForbiddenException('Пользователь не принадлежит к компании для доступа к складу');
    }
    const { InventoryValidationService } = await import('../../modules/inventory/services/inventory-validation.service');
    const validationService = this.moduleRef.get(InventoryValidationService, { strict: false });
    if (!validationService) throw new ForbiddenException('Доступ к складу временно недоступен');

    await validationService.validateInventoryOwnership(inventoryId, user.companyId);

    await this.auditService.log(AuditAction.PERMISSION_GRANTED, {
      userId: user.id, companyId: user.companyId, level: AuditLevel.INFO, ipAddress: request.ip, userAgent: request.headers['user-agent'],
      details: { reason: 'Inventory ownership validated', inventoryId }, status: 'granted',
    });
    return true;
  }

  private async checkPartOwnership(user: RequestWithUser['user'], partId: string, request: any): Promise<boolean> {
    if (!user.companyId) {
      await this.auditService.log(AuditAction.ACCESS_DENIED, {
        userId: user.id, level: AuditLevel.WARNING, ipAddress: request.ip, userAgent: request.headers['user-agent'],
        details: { reason: 'User has no company for part access', partId }, status: 'denied',
      });
      throw new ForbiddenException('Пользователь не принадлежит к компании для доступа к запчастям');
    }
    const { PartsValidationService } = await import('../../modules/inventory/parts/services/parts-validation.service');
    const validationService = this.moduleRef.get(PartsValidationService, { strict: false });
    if (!validationService) throw new ForbiddenException('Доступ к запчасти временно недоступен');
    await validationService.validatePartOwnership(partId, user.companyId);
    await this.auditService.log(AuditAction.PERMISSION_GRANTED, {
      userId: user.id, companyId: user.companyId, level: AuditLevel.INFO, ipAddress: request.ip, userAgent: request.headers['user-agent'],
      details: { reason: 'Part ownership validated', partId }, status: 'granted',
    });
    return true;
  }

  private async checkStockMovementOwnership(user: RequestWithUser['user'], movementId: string, request: any): Promise<boolean> {
    if (!user.companyId) {
      await this.auditService.log(AuditAction.ACCESS_DENIED, {
        userId: user.id,
        level: AuditLevel.WARNING,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        details: { reason: 'User has no company for stock movement access', movementId },
        status: 'denied',
      });
      throw new ForbiddenException('Пользователь не принадлежит к компании для доступа к движениям склада');
    }
    const { StockMovementsValidationService } = await import('../../modules/inventory/stock-movements/services/stock-movements-validation.service');
    const validationService = this.moduleRef.get(StockMovementsValidationService, { strict: false });
    if (!validationService) throw new ForbiddenException('Доступ к движению склада временно недоступен');

    await validationService.validateMovementOwnership(movementId, user.companyId);

    await this.auditService.log(AuditAction.PERMISSION_GRANTED, {
      userId: user.id,
      companyId: user.companyId,
      level: AuditLevel.INFO,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      details: { reason: 'Stock movement ownership validated', movementId },
      status: 'granted',
    });
    return true;
  }

  private async checkInventoryAlertOwnership(user: RequestWithUser['user'], alertId: string, request: any): Promise<boolean> {
    if (!user.companyId) {
      await this.auditService.log(AuditAction.ACCESS_DENIED, {
        userId: user.id,
        level: AuditLevel.WARNING,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        details: { reason: 'User has no company for inventory alert access', alertId },
        status: 'denied',
      });
      throw new ForbiddenException('Пользователь не принадлежит к компании для доступа к уведомлениям склада');
    }
    const { AlertsValidationService } = await import('../../modules/inventory/inventory-alerts/services/alerts-validation.service');
    const validationService = this.moduleRef.get(AlertsValidationService, { strict: false });
    if (!validationService) throw new ForbiddenException('Доступ к уведомлению склада временно недоступен');

    await validationService.validateAlertOwnership(alertId, user.companyId);

    await this.auditService.log(AuditAction.PERMISSION_GRANTED, {
      userId: user.id,
      companyId: user.companyId,
      level: AuditLevel.INFO,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      details: { reason: 'Inventory alert ownership validated', alertId },
      status: 'granted',
    });
    return true;
  }

  private async checkPaymentMethodOwnership(user: RequestWithUser['user'], paymentMethodId: string, request: any): Promise<boolean> {
    if (!user.companyId) {
      await this.auditService.log(AuditAction.ACCESS_DENIED, {
        userId: user.id, level: AuditLevel.WARNING, ipAddress: request.ip, userAgent: request.headers['user-agent'],
        details: { reason: 'User has no company for payment method access', paymentMethodId }, status: 'denied',
      });
      throw new ForbiddenException('Пользователь не принадлежит к компании');
    }
    const { PaymentMethodsValidationService } = await import('../../modules/payment-methods/services/payment-methods-validation.service');
    const validationService = this.moduleRef.get(PaymentMethodsValidationService, { strict: false });
    if (!validationService) throw new ForbiddenException('Доступ к способу оплаты временно недоступен');
    await validationService.validatePaymentMethodOwnership(paymentMethodId, user.companyId);
    return true;
  }

  private async checkPaymentOwnership(user: RequestWithUser['user'], paymentId: string, request: any): Promise<boolean> {
    if (!user.companyId) {
      await this.auditService.log(AuditAction.ACCESS_DENIED, {
        userId: user.id, level: AuditLevel.WARNING, ipAddress: request.ip, userAgent: request.headers['user-agent'],
        details: { reason: 'User has no company for payment access', paymentId }, status: 'denied',
      });
      throw new ForbiddenException('Пользователь не принадлежит к компании');
    }
    try {
      const { PaymentsValidationService } = await import('../../modules/payments/services/payments-validation.service');
      const validationService = this.moduleRef.get(PaymentsValidationService, { strict: false });
      if (validationService) {
        await validationService.validatePaymentOwnership(paymentId, user.companyId);
        return true;
      } else {
        this.logger.warn(`PaymentsValidationService not found - denying access to payment ${paymentId}`);
        throw new ForbiddenException('Доступ к платежу временно недоступен');
      }
    } catch {
      throw new ForbiddenException(`Нет доступа к платежу ${paymentId}`);
    }
  }

  private async checkWorkScheduleOwnership(user: RequestWithUser['user'], scheduleId: string, request: any): Promise<boolean> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    const { WorkSchedulesValidationService } = await import('../../modules/work-schedules/services/work-schedules-validation.service');
    const validationService = this.moduleRef.get(WorkSchedulesValidationService, { strict: false });
    if (!validationService) throw new ForbiddenException('Доступ к расписанию временно недоступен');
    await validationService.validateWorkScheduleOwnership(scheduleId, user.companyId);
    await this.auditService.log(AuditAction.PERMISSION_GRANTED, {
      userId: user.id,
      companyId: user.companyId,
      level: AuditLevel.INFO,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      details: { reason: 'Work schedule ownership validated', scheduleId },
      status: 'granted',
    });
    return true;
  }

  private async checkAppointmentOwnership(user: RequestWithUser['user'], appointmentId: string, request: any): Promise<boolean> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    const { AppointmentsValidationService } = await import('../../modules/appointments/services/appointments-validation.service');
    const validationService = this.moduleRef.get(AppointmentsValidationService, { strict: false });
    if (!validationService) throw new ForbiddenException('Доступ к записи временно недоступен');
    await validationService.validateAppointmentOwnership(appointmentId, user.companyId);
    await this.auditService.log(AuditAction.PERMISSION_GRANTED, {
      userId: user.id,
      companyId: user.companyId,
      level: AuditLevel.INFO,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      details: { reason: 'Appointment ownership validated', appointmentId },
      status: 'granted',
    });
    return true;
  }

  private async checkOrderOwnership(user: RequestWithUser['user'], orderId: string, request: any): Promise<boolean> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    const { OrdersValidationService } = await import('../../modules/orders/services/orders-validation.service');
    const validationService = this.moduleRef.get(OrdersValidationService, { strict: false });
    if (!validationService) throw new ForbiddenException('Доступ к заказу временно недоступен');
    await validationService.validateOrderOwnership(orderId, user.companyId);
    await this.auditService.log(AuditAction.PERMISSION_GRANTED, {
      userId: user.id, companyId: user.companyId, level: AuditLevel.INFO, ipAddress: request.ip, userAgent: request.headers['user-agent'],
      details: { reason: 'Order ownership validated', orderId }, status: 'granted',
    });
    return true;
  }

  private async checkInvoiceOwnership(user: RequestWithUser['user'], invoiceId: string, _request: any): Promise<boolean> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    const { InvoicesValidationService } = await import('../../modules/invoices/services/invoices-validation.service');
    const validationService = this.moduleRef.get(InvoicesValidationService, { strict: false });
    if (!validationService) throw new ForbiddenException('Доступ к счету временно недоступен');
    await validationService.validateInvoiceOwnership(invoiceId, user.companyId);
    return true;
  }

  private async checkVehicleOwnership(user: RequestWithUser['user'], vehicleId: string, request: any): Promise<boolean> {
    if (!user.companyId) {
      await this.auditService.log(AuditAction.ACCESS_DENIED, {
        userId: user.id,
        level: AuditLevel.WARNING,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        details: { reason: 'User has no company for vehicle access', vehicleId },
        status: 'denied',
      });
      throw new ForbiddenException('Пользователь не принадлежит к компании для доступа к автомобилям');
    }
    const { VehiclesValidationService } = await import('../../modules/vehicles/services/vehicles-validation.service');
    const validationService = this.moduleRef.get(VehiclesValidationService, { strict: false });
    if (!validationService) throw new ForbiddenException('Доступ к автомобилю временно недоступен');
    await validationService.validateVehicleOwnership(vehicleId, user.companyId);
    await this.auditService.log(AuditAction.PERMISSION_GRANTED, {
      userId: user.id,
      companyId: user.companyId,
      level: AuditLevel.INFO,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      details: { reason: 'Vehicle ownership validated', vehicleId },
      status: 'granted',
    });
    return true;
  }

  private async checkServiceHistoryOwnership(user: RequestWithUser['user'], _historyId: string, _request: any): Promise<boolean> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании для доступа к истории обслуживания');
    return true;
  }
  private async checkVehicleCatalogAccess(_user: RequestWithUser['user'], _request: any): Promise<boolean> {
    return true;
  }
  private async checkServiceOwnership(user: RequestWithUser['user'], serviceId: string, _request: any): Promise<boolean> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    const { ServicesValidationService } = await import('../../modules/services/services/services-validation.service');
    const validationService = this.moduleRef.get(ServicesValidationService, { strict: false });
    if (validationService) await validationService.validateServiceOwnership(serviceId, user.companyId);
    return true;
  }
  private async checkServiceCategoryOwnership(user: RequestWithUser['user'], categoryId: string, _request: any): Promise<boolean> {
    if (!user.companyId) throw new ForbiddenException('Пользователь не принадлежит к компании');
    const { ServicesValidationService } = await import('../../modules/services/services/services-validation.service');
    const validationService = this.moduleRef.get(ServicesValidationService, { strict: false });
    if (validationService) await validationService.validateServiceCategoryOwnership(categoryId, user.companyId);
    return true;
  }
}
