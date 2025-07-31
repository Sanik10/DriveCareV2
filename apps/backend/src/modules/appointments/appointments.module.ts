import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// 🔥 КРИТИЧНО: Импорт всех необходимых entities
import {
  Appointment,      // 🎯 Основная entity
  Customer,         // 🔗 Для проверки ownership клиентов
  Vehicle,          // 🔗 Для проверки ownership автомобилей
  User,             // 🔗 Для связи с мастерами (механиками)
  Service,          // 🔗 Для валидации serviceIds
  WorkSchedule,     // 🔗 Для проверки расписания мастеров
  Company,          // 🔗 Для проверки принадлежности к компании
  Subscription,     // 🔗 Для проверки лимитов подписки
} from '../../database/entities';

// 🎯 Main Appointments Services
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentsDataService } from './services/appointments-data.service';
import { AppointmentsBusinessService } from './services/appointments-business.service';
import { AppointmentsValidationService } from './services/appointments-validation.service';
import { AppointmentsMapperService } from './services/appointments-mapper.service';

// 🔒 Security & Common Services
import { AuditService } from '../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,        // 🎯 Основная entity модуля
      Customer,           // 🔗 Для проверки принадлежности клиентов
      Vehicle,            // 🔗 Для проверки принадлежности автомобилей
      User,               // 🔗 Для связи с мастерами (mechanicId)
      Service,            // 🔗 Для валидации serviceIds в записях
      WorkSchedule,       // 🔗 Для проверки расписания мастеров
      Company,            // 🔗 Для проверки принадлежности к компании
      Subscription,       // 🔗 Для проверки лимитов подписки
    ]),
  ],
  controllers: [
    AppointmentsController,
  ],
  providers: [
    // 🎯 Main Service (оркестратор)
    AppointmentsService,
    
    // 🔧 Микросервисы (4 обязательных сервиса)
    AppointmentsDataService,        // 🗄️ Работа с базой данных
    AppointmentsBusinessService,    // 🧠 Бизнес-логика
    AppointmentsValidationService,  // 🔒 Валидация и проверки безопасности
    AppointmentsMapperService,      // 🔄 Маппинг Entity<->DTO
    
    // 🔒 Security & Audit
    AuditService,                   // 📝 Аудит операций
  ],
  exports: [
    // 🔗 Экспортируем основные сервисы для других модулей
    AppointmentsService,            // Основной сервис для других модулей
    AppointmentsDataService,        // Для прямого доступа к данным
    AppointmentsMapperService,      // Для маппинга в других модулях
    AppointmentsValidationService,  // 🔒 Для CompanyOwnershipGuard
  ],
})
export class AppointmentsModule {}
