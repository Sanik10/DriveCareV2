import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestWithUser } from '../../modules/auth/interfaces/request-with-user.interface';

@Injectable()
export class CompanyOwnershipGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Пользователь не аутентифицирован');
    }

    // Superadmin всегда имеет доступ ко всем ресурсам
    if (user.role === 'superadmin') {
      return true;
    }

    // Получаем метаданные о типе ресурса и параметре из декораторов
    const resourceType = this.reflector.get<string>('resourceType', context.getHandler());
    const resourceParam = this.reflector.get<string>('resourceParam', context.getHandler()) || 'id';
    
    // Если тип ресурса не указан, пропускаем проверку
    if (!resourceType) {
      return true;
    }

    // Проверяем принадлежность ресурса пользователю
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
        
      default:
        // Неизвестный тип ресурса - логируем предупреждение и разрешаем
        console.warn(`⚠️ Unknown resource type: ${resourceType} - access granted by default`);
        return true;
    }
  }

  /**
   * Проверка доступа к компании
   */
  private checkCompanyOwnership(user: RequestWithUser['user'], companyId: string): boolean {
    if (user.companyId !== companyId) {
      throw new ForbiddenException(
        `Доступ запрещен. Вы принадлежите к компании ${user.companyId}, ` +
        `но пытаетесь получить доступ к компании ${companyId}`
      );
    }
    return true;
  }

  /**
   * Проверка доступа к подпискам компании (/subscriptions/company/:companyId)
   */
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

  /**
   * 🔥 УЛУЧШЕНО: Проверка принадлежности конкретной подписки
   * Для полной проверки нужен доступ к SubscriptionsService, но это создаст циклическую зависимость.
   * Поэтому проверяем на уровне данных в самом сервисе, а здесь делаем базовую проверку.
   */
  private async checkSubscriptionOwnership(
    user: RequestWithUser['user'], 
    subscriptionId: string, 
    request: any
  ): Promise<boolean> {
    // 🔄 Стратегия: Guard проверяет базовую авторизацию, 
    // а детальная проверка принадлежности подписки происходит в ValidationService
    
    // Проверяем, что пользователь принадлежит к какой-то компании
    if (!user.companyId) {
      throw new ForbiddenException(
        'Пользователь не принадлежит ни к одной компании и не может работать с подписками'
      );
    }

    // Для полной проверки subscription ownership используем ValidationService в бизнес-логике
    console.log(`🔍 Subscription ownership check for ${subscriptionId} - detailed validation in service layer`);
    return true;
  }

  /**
   * 🔥 НОВОЕ: Проверка доступа к тарифам (публичные данные)
   */
  private checkTariffAccess(): boolean {
    // Тарифы - публичные данные, доступны всем аутентифицированным пользователям
    return true;
  }

  /**
   * 🔥 НОВОЕ: Универсальная проверка для будущих ресурсов
   */
  private checkGenericResourceOwnership(
    user: RequestWithUser['user'], 
    resourceType: string, 
    resourceId: string
  ): boolean {
    // Для остальных ресурсов применяем стандартную логику:
    // Пользователь должен принадлежать к компании
    if (!user.companyId) {
      throw new ForbiddenException(`Пользователь не принадлежит к компании для доступа к ${resourceType}`);
    }

    console.log(`✅ Generic resource access granted for ${resourceType}:${resourceId} to user from company ${user.companyId}`);
    return true;
  }
}
