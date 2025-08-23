// path: apps/backend/src/common/common.module.ts
import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit/audit.service';

@Global() // 🔥 Делаем модуль глобальным
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class CommonModule {}
