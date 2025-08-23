// path: apps/backend/src/common/common.module.ts
import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit/audit.service';
import { CompanyOwnershipGuard } from './guards/company-ownership.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  providers: [AuditService, CompanyOwnershipGuard, RolesGuard],
  exports: [AuditService, CompanyOwnershipGuard, RolesGuard],
})
export class CommonModule {}
