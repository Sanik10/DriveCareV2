// path: apps/backend/src/common/guards/auth-with-ownership.guard.ts
import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './roles.guard';
import { CompanyOwnershipGuard } from './company-ownership.guard';

/**
 * Композитный декоратор, объединяющий все необходимые Guards для безопасности:
 * 1. Passport Jwt AuthGuard - проверка JWT токена
 * 2. RolesGuard (common) - проверка ролей пользователя
 * 3. CompanyOwnershipGuard (common) - проверка принадлежности ресурсов
 *
 * Использование:
 * @AuthWithOwnership()
 * @CompanyResource()
 * @Roles('company_owner', 'company_admin')
 * async updateCompany() { ... }
 */
export const AuthWithOwnership = () =>
  applyDecorators(
    UseGuards(AuthGuard('jwt'), RolesGuard, CompanyOwnershipGuard),
    ApiBearerAuth('JWT-auth'),
  );
