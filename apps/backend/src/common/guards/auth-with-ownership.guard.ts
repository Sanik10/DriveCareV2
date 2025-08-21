// path: apps/backend/src/common/guards/auth-with-ownership.guard.ts
import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { CompanyOwnershipGuard } from './company-ownership.guard';

/**
 * Композитный декоратор, объединяющий все необходимые Guards для безопасности:
 * 1. JwtAuthGuard - проверка JWT токена
 * 2. RolesGuard - проверка ролей пользователя
 * 3. CompanyOwnershipGuard - проверка принадлежности ресурсов
 * 
 * Использование:
 * @AuthWithOwnership()
 * @CompanyResource()
 * @Roles('owner', 'admin')
 * async updateCompany() { ... }
 */
export const AuthWithOwnership = () => 
  applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard, CompanyOwnershipGuard),
    ApiBearerAuth('JWT-auth')
  );