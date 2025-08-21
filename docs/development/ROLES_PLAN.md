# 🏗️ **DRIVECARE V2: COMPREHENSIVE ROLES CATALOG**

**Полная система ролей для автосервисной платформы с запасом на будущее**  
**✅ ОБНОВЛЕНО: Исправлена иерархия под специфику автосервиса**

---

## 🌐 **PLATFORM LEVEL ROLES** (Уровень платформы)

### **👑 Supreme Administration**
```typescript
'superadmin': 1000,              // ✅ ИСПОЛЬЗУЕТСЯ - Создатель платформы, полный контроль
'platform_owner': 950,          // Владелец платформы (инвестор/CEO)
'platform_admin': 900,          // ✅ ИСПОЛЬЗУЕТСЯ - Администратор платформы
```

### **🛠️ Platform Operations**
```typescript
'platform_manager': 850,        // Менеджер платформы
'system_operator': 800,         // ✅ ИСПОЛЬЗУЕТСЯ - Системный оператор (DevOps)
'platform_support': 750,        // Техподдержка платформы
'security_officer': 700,         // Офицер безопасности
'compliance_officer': 680,       // Офицер соответствия (GDPR, etc.)
'auditor': 650,                  // ✅ ИСПОЛЬЗУЕТСЯ - Аудитор системы
'data_analyst': 600,             // Аналитик данных платформы
'support_engineer': 580,         // ✅ ИСПОЛЬЗУЕТСЯ - Инженер поддержки
'billing_manager': 550,          // Менеджер по биллингу
'content_moderator': 500,        // Модератор контента
```

---

## 🏢 **COMPANY MANAGEMENT LEVEL** (Управление автосервисом)

### **🏆 Company Ownership**
```typescript
'company_owner': 400,            // ✅ ИСПОЛЬЗУЕТСЯ - Владелец автосервиса
'company_co_owner': 390,         // Совладелец автосервиса
'company_director': 380,         // Директор автосервиса
'company_admin': 370,            // ✅ ИСПОЛЬЗУЕТСЯ - Администратор автосервиса
```

### **📊 Management Team**
```typescript
'general_manager': 360,          // Генеральный менеджер
'manager': 350,                  // ✅ ИСПОЛЬЗУЕТСЯ - Операционный менеджер (было general_manager)
'operations_manager': 340,       // Операционный менеджер
'branch_manager': 330,           // Управляющий филиалом
'department_head': 320,          // Руководитель отдела
'shift_supervisor': 310,         // Супервайзер смены
'team_leader': 300,              // Лидер команды
```

---

## 💼 **OPERATIONS MANAGEMENT** (Операционное управление)

### **📋 Business Operations**
```typescript
'operations_director': 290,      // Директор по операциям
'service_manager': 280,          // Менеджер сервиса
'quality_manager': 270,          // Менеджер качества
'safety_manager': 260,           // Менеджер по безопасности
'training_manager': 250,         // Менеджер по обучению
'hr_manager': 240,               // HR менеджер
'marketing_manager': 230,        // Маркетинг менеджер
'sales_manager': 220,            // Менеджер продаж
```

### **💰 Financial Management** ✅ ИСПРАВЛЕНО для автосервиса
```typescript
'financial_manager': 210,        // Финансовый менеджер
'accountant': 200,               // Бухгалтер
'cashier_supervisor': 170,       // 🔧 Супервайзер кассиров (понижен)
'financial_analyst': 160,        // Финансовый аналитик
'cashier': 130,                  // ✅ ИСПОЛЬЗУЕТСЯ - 🔧 Кассир (понижен для автосервиса)
```

---

## 🎯 **CUSTOMER SERVICE** (Работа с клиентами) ✅ ИСПРАВЛЕНО

### **👥 Customer Relations**
```typescript
'customer_service_manager': 200, // Менеджер клиентского сервиса  
'senior_service_advisor': 180,   // Старший приёмщик
'service_advisor': 170,          // ✅ ИСПОЛЬЗУЕТСЯ - 🔥 ПРИЁМЩИК (ключевая роль!) ↑
'reception_manager': 155,        // Менеджер ресепшна
'customer_relations': 145,       // Специалист по клиентским отношениям
'receptionist': 135,             // Администратор ресепшна
'call_center_operator': 125,     // Оператор колл-центра
'appointment_coordinator': 115,  // Координатор записей
```

### **📞 Communication & Support**
```typescript
'customer_support': 110,         // Поддержка клиентов
'complaints_handler': 105,       // Обработчик жалоб
'warranty_specialist': 100,      // Специалист по гарантии
'insurance_coordinator': 95,     // Координатор страховых случаев
```

---

## 🔧 **TECHNICAL STAFF** (Технический персонал)

### **⚙️ Technical Leadership**
```typescript
'technical_director': 280,       // Технический директор
'chief_mechanic': 250,           // Главный механик
'lead_mechanic': 200,            // ✅ ИСПОЛЬЗУЕТСЯ - Ведущий механик
'senior_mechanic': 190,          // Старший механик
'shift_foreman': 180,            // Бригадир смены
```

### **🔧 Specialized Mechanics**
```typescript
'master_technician': 175,        // Мастер-техник
'diagnostic': 160,               // ✅ ИСПОЛЬЗУЕТСЯ - Специалист диагностики (сокращено от diagnostic_specialist)
'diagnostic_specialist': 160,    // Специалист диагностики (полное название)
'engine_specialist': 155,        // Специалист по двигателям
'transmission_specialist': 155,  // Специалист по трансмиссии
'electrical_specialist': 155,    // Автоэлектрик
'body_repair_specialist': 155,   // Кузовщик
'paint_specialist': 155,         // Маляр
'tire_specialist': 145,          // Шиномонтажник
'ac_specialist': 145,            // Специалист по кондиционерам
'brake_specialist': 145,         // Специалист по тормозным системам
'suspension_specialist': 145,    // Специалист по подвеске
'fuel_system_specialist': 145,   // Специалист по топливным системам
```

### **🔧 General Technical Staff**
```typescript
'mechanic': 120,                 // ✅ ИСПОЛЬЗУЕТСЯ - Механик
'junior_mechanic': 110,          // Младший механик
'apprentice_mechanic': 100,      // Механик-стажёр
'technical_intern': 90,          // Технический интерн
'tool_keeper': 85,               // Инструментальщик
```

---

## 📦 **INVENTORY & LOGISTICS** (Склад и логистика) ✅ ИСПРАВЛЕНО

### **📋 Inventory Management**
```typescript
'logistics_manager': 200,        // Менеджер логистики
'warehouse_manager': 190,        // Заведующий складом
'purchasing_manager': 180,       // Менеджер закупок
'supplier_relations': 165,       // Специалист по поставщикам
'inventory_manager': 150,        // ✅ ИСПОЛЬЗУЕТСЯ - 🔧 Менеджер склада (понижен)
'parts_specialist': 140,         // Специалист по запчастям
'inventory_analyst': 135,        // Аналитик склада
```

### **📦 Warehouse Operations**
```typescript
'senior_warehouse_clerk': 125,   // Старший кладовщик
'warehouse_clerk': 115,          // Кладовщик
'stock_controller': 105,         // Контролёр остатков
'receiving_clerk': 95,           // Приёмщик товара
'shipping_clerk': 95,            // Отправщик товара
'inventory_counter': 85,         // Инвентаризатор
'warehouse_assistant': 75,       // Помощник кладовщика
```

---

## 🚗 **SPECIALIZED SERVICES** (Специализированные услуги)

### **🔍 Quality & Inspection**
```typescript
'quality_director': 250,         // Директор по качеству
'quality_controller': 200,       // Контролёр качества
'technical_inspector': 190,      // Технический инспектор
'safety_inspector': 180,         // Инспектор безопасности
'final_inspector': 170,          // Финальный контролёр
'pre_delivery_inspector': 160,   // Контролёр предпродажной подготовки
```

### **🚙 Vehicle Services**
```typescript
'fleet_manager': 200,            // Менеджер автопарка
'vehicle_coordinator': 180,      // Координатор автомобилей
'test_driver': 150,              // Тест-драйвер
'detailing_specialist': 130,     // Специалист детейлинга
'delivery_driver': 120,          // Водитель доставки
'car_washer': 80,                // Мойщик автомобилей
```

### **📱 Digital & Technology**
```typescript
'it_manager': 220,               // IT менеджер
'system_admin': 200,             // Системный администратор
'it_specialist': 180,            // IT специалист
'software_trainer': 160,         // Тренер по ПО
'data_entry_clerk': 100,         // Оператор ввода данных
```

---

## 🎓 **TRAINING & DEVELOPMENT** (Обучение и развитие)

```typescript
'training_director': 230,        // Директор по обучению
'senior_trainer': 200,           // Старший тренер
'technical_trainer': 180,        // Технический тренер
'safety_trainer': 170,           // Тренер по безопасности
'mentor': 150,                   // Наставник
'instructor': 140,               // Инструктор
'training_coordinator': 130,     // Координатор обучения
```

---

## 📊 **ANALYTICS & REPORTING** (Аналитика и отчётность)

```typescript
'business_analyst': 200,         // Бизнес-аналитик
'performance_analyst': 180,      // Аналитик производительности
'cost_analyst': 170,             // Аналитик затрат
'reporting_specialist': 150,     // Специалист отчётности
'kpi_analyst': 140,              // Аналитик KPI
'data_collector': 120,           // Сборщик данных
```

---

## 🚀 **FUTURE EXPANSION ROLES** (Роли для будущего)

### **🤖 Automation & AI**
```typescript
'automation_manager': 220,       // Менеджер автоматизации
'robotics_specialist': 200,      // Специалист по робототехнике
'ai_specialist': 190,            // Специалист по ИИ
'process_optimizer': 180,        // Оптимизатор процессов
```

### **🌱 Sustainability & Environment**
```typescript
'sustainability_manager': 200,   // Менеджер устойчивого развития
'environmental_specialist': 180, // Эколог
'waste_manager': 150,            // Менеджер отходов
'energy_specialist': 140,        // Энергетик
```

### **📱 Digital Innovation**
```typescript
'digital_transformation': 220,   // Специалист цифровой трансформации
'ux_designer': 180,              // UX дизайнер
'mobile_app_coordinator': 160,   // Координатор мобильного приложения
'social_media_manager': 140,     // SMM менеджер
'content_creator': 120,          // Контент-мейкер
```

### **🔮 Emerging Technologies**
```typescript
'ev_specialist': 200,            // Специалист электромобилей
'autonomous_vehicle_tech': 220,  // Техник беспилотных авто
'telematics_specialist': 180,    // Специалист телематики
'cyber_security_specialist': 200, // Специалист кибербезопасности
```

---

## 📋 **CURRENT MVP IMPLEMENTATION** ✅ ИСПРАВЛЕНО

```typescript
// ✅ Текущая реализация в users.constants.ts
export const USERS_CONSTANTS = {
  ROLES: {
    HIERARCHY: {
      // Platform level ✅ ВСЕ ИСПОЛЬЗУЮТСЯ
      'superadmin': 1000,          // ✅ ИСПОЛЬЗУЕТСЯ
      'platform_admin': 900,      // ✅ ИСПОЛЬЗУЕТСЯ  
      'system_operator': 800,     // ✅ ИСПОЛЬЗУЕТСЯ
      'auditor': 650,             // ✅ ИСПОЛЬЗУЕТСЯ
      'support_engineer': 580,    // ✅ ИСПОЛЬЗУЕТСЯ
      
      // Company level ✅ ВСЕ ИСПОЛЬЗУЮТСЯ
      'company_owner': 400,        // ✅ ИСПОЛЬЗУЕТСЯ
      'company_admin': 370,       // ✅ ИСПОЛЬЗУЕТСЯ
      'manager': 350,             // ✅ ИСПОЛЬЗУЕТСЯ
      'lead_mechanic': 200,       // ✅ ИСПОЛЬЗУЕТСЯ
      'service_advisor': 170,     // ✅ ИСПОЛЬЗУЕТСЯ
      'diagnostic': 160,          // ✅ ИСПОЛЬЗУЕТСЯ
      'inventory_manager': 150,   // ✅ ИСПОЛЬЗУЕТСЯ
      'cashier': 130,             // ✅ ИСПОЛЬЗУЕТСЯ
      'mechanic': 120,            // ✅ ИСПОЛЬЗУЕТСЯ
    }
  }
}
```

---

## 🎯 **USAGE RECOMMENDATIONS - UPDATED**

### **✅ Твой текущий MVP (ИДЕАЛЕН!)**
```typescript
// ✅ Используемые роли - отличное покрытие для автосервиса:
'superadmin'           // 1000 - ✅ ИСПОЛЬЗУЕТСЯ
'platform_admin'       // 900  - ✅ ИСПОЛЬЗУЕТСЯ
'system_operator'       // 800  - ✅ ИСПОЛЬЗУЕТСЯ  
'auditor'              // 650  - ✅ ИСПОЛЬЗУЕТСЯ
'support_engineer'     // 580  - ✅ ИСПОЛЬЗУЕТСЯ
'company_owner'        // 400  - ✅ ИСПОЛЬЗУЕТСЯ
'company_admin'        // 370  - ✅ ИСПОЛЬЗУЕТСЯ
'manager'              // 350  - ✅ ИСПОЛЬЗУЕТСЯ
'lead_mechanic'        // 200  - ✅ ИСПОЛЬЗУЕТСЯ
'service_advisor'      // 170  - ✅ ИСПОЛЬЗУЕТСЯ (приёмщик)
'diagnostic'           // 160  - ✅ ИСПОЛЬЗУЕТСЯ
'inventory_manager'    // 150  - ✅ ИСПОЛЬЗУЕТСЯ
'cashier'              // 130  - ✅ ИСПОЛЬЗУЕТСЯ
'mechanic'             // 120  - ✅ ИСПОЛЬЗУЕТСЯ
```

### **🚀 Быстрые дополнения (по мере роста)**
```typescript
// Следующие роли для добавления:
'senior_service_advisor': 180,   // Старший приёмщик
'parts_specialist': 140,         // Специалист по запчастям  
'receptionist': 135,             // Администратор ресепшна
'quality_controller': 200,       // Контролёр качества
'apprentice_mechanic': 100,      // Стажёр
```

### **🔮 Future-Proof дополнения**
```typescript
// Роли для будущего развития:
'ev_specialist': 200,            // Электромобили
'ai_specialist': 190,            // ИИ диагностика
'sustainability_manager': 200,   // Экология
'digital_transformation': 220,   // Цифровизация
```

---

## 🏆 **ОСНОВНЫЕ ИЗМЕНЕНИЯ**

### **✅ Исправления в иерархии:**
1. **service_advisor**: 140 → **170** (повышен - ключевая роль!)
2. **cashier**: 180 → **130** (понижен - вспомогательная роль)
3. **inventory_manager**: 180 → **150** (понижен - ниже приёмщика)
4. **diagnostic**: остался **160** (правильное место)

### **🎯 Логика автосервиса теперь правильная:**
- 👑 **Управление** (400-350)
- 🔧 **Технические руководители** (200)
- 🎯 **Приёмщик** (170) - ключевая клиентская роль
- 🔍 **Диагност** (160) - технический специалист  
- 📦 **Кладовщик** (150) - важная логистика
- 💰 **Кассир** (130) - вспомогательная роль
- 🔧 **Механики** (120) - исполнители

**🚀 Теперь система ролей идеально подходит для автосервисной индустрии с правильной иерархией и возможностью масштабирования до 100+ ролей! 🏆**
