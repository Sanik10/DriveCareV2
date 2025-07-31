// src/modules/inventory/suppliers/suppliers.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SuppliersDataService } from './services/suppliers-data.service';
import { SuppliersBusinessService } from './services/suppliers-business.service';
import { SuppliersValidationService } from './services/suppliers-validation.service';
import { SuppliersMapperService } from './services/suppliers-mapper.service';
import { 
  Supplier,
  Company,
  Part,
  StockMovement,
  User,
  Order,
  Invoice,
  Payment
} from '../../../database/entities';
import { AuditService } from '../../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Supplier,        // 🔥 Основная entity
      Company,         // 🔒 Security validation
      Part,           // Для связи supplier → parts
      StockMovement,  // Для истории поставок
      User,           // Кто создал поставщика
      Order,          // Связь с заказами
      Invoice,        // Финансовая интеграция
      Payment,        // Платежи поставщикам
    ]),
  ],
  controllers: [SuppliersController],
  providers: [
    SuppliersService,
    SuppliersDataService,
    SuppliersBusinessService,
    SuppliersValidationService,
    SuppliersMapperService,
    AuditService, // 🔥 Обязательный audit
  ],
  exports: [
    SuppliersService,
    SuppliersDataService,
    SuppliersMapperService,
    // 🚀 Экспорт для интеграции с stock-movements и orders
  ],
})
export class SuppliersModule {}
