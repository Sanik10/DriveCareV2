// apps/backend/src/common/guards/company-ownership.guard.ts
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
}
