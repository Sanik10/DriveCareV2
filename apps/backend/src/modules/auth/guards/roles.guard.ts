// path: apps/backend/src/modules/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthRole } from '../types/auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AuthRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
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
    
    const hasRole = requiredRoles.some(role => userRole === role);
    
    if (!hasRole) {
      throw new ForbiddenException('У вас нет прав для выполнения этого действия');
    }
    
    return true;
  }
}