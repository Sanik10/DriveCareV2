// path: apps/backend/src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Используем строковый ключ 'roles', чтобы избежать зависимостей от auth модуля
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Пользователь не аутентифицирован');
    }

    const userRole = typeof user.role === 'string' ? user.role : user.role?.name;

    // Superadmin имеет доступ ко всему
    if (userRole === 'superadmin') {
      return true;
    }

    const hasRole = requiredRoles.some((role) => userRole === role);

    if (!hasRole) {
      throw new ForbiddenException('У вас нет прав для выполнения этого действия');
    }

    return true;
  }
}
