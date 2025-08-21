// path: apps/backend/src/modules/inventory/parts/parts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PartsController } from './parts.controller';
import { PartsService } from './parts.service';
import { PartsDataService } from './services/parts-data.service';
import { PartsBusinessService } from './services/parts-business.service';
import { PartsValidationService } from './services/parts-validation.service';
import { PartsMapperService } from './services/parts-mapper.service';
import { Part, PartCategory, Company, Inventory, StockMovement } from '../../../database/entities';
import { AuditService } from '../../../common/audit/audit.service';
import { RedisModule } from '../../../common/redis/redis.module';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    TypeOrmModule.forFeature([Part, PartCategory, Company, Inventory, StockMovement]),
  ],
  controllers: [PartsController],
  providers: [
    PartsService,
    PartsDataService,
    PartsBusinessService,
    PartsValidationService,
    PartsMapperService,
    AuditService,
  ],
  exports: [PartsService, PartsDataService, PartsMapperService],
})
export class PartsModule {}
