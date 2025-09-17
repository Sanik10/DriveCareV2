# path: docs/BACKEND_TODO.md

# 🚀 **BACKEND TODO - Накопившиеся задачи для полноценной работы UI**

## **📋 КРИТИЧЕСКИ ВАЖНЫЕ API ENDPOINTS**

### **1. 🎯 Customer Timeline API**
**Приоритет:** HIGH
**Описание:** Создать объединенный endpoint для истории взаимодействий с клиентом

**Endpoint:** `GET /customers/:id/timeline`

**Ответ:**
```typescript
interface TimelineEvent {
  id: string;
  type: 'order' | 'payment' | 'appointment' | 'call' | 'email' | 'note' | 'vehicle' | 'profile';
  title: string;
  description: string;
  date: string; // ISO
  status: 'success' | 'info' | 'warning' | 'error';
  amount?: number;
  relatedId?: string; // ID связанной сущности
  relatedType?: string; // тип связанной сущности
  metadata?: Record<string, any>;
}

interface CustomerTimelineResponse {
  events: TimelineEvent[];
  totalEvents: number;
  nextCursor?: string; // для пагинации
}
```

**Источники данных:**
- Orders (заказы клиента)
- Payments (платежи)
- Appointments (записи на сервис)
- Service History (история ремонтов)
- Vehicles (добавление/изменение ТС)
- Audit Log (системные события)
- Custom Notes (заметки менеджеров)

---

### **2. 🚗 Vehicle Service Status API**
**Приоритет:** HIGH
**Описание:** API для расчета статуса ТО автомобилей

**Endpoint:** `GET /vehicles/:id/service-status`

**Ответ:**
```typescript
interface VehicleServiceStatus {
  vehicleId: string;
  needsService: boolean;
  daysUntilService?: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
  serviceType: 'scheduled' | 'mileage' | 'overdue';
  mileageSinceLastService?: number;
  recommendedServices: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}
```

**Логика расчета:**
- По пробегу (каждые 10-15k км)
- По времени (каждые 6-12 месяцев)
- По типу ТС (легковая/грузовая/мото)
- Настраиваемые интервалы по бренду/модели

---

### **3. 📅 Appointment Tracking API**
**Приоритет:** MEDIUM
**Описание:** Real-time трекинг прогресса выполнения записи

**Endpoint:** `GET /appointments/:id/tracking`

**Ответ:**
```typescript
interface AppointmentTracking {
  appointmentId: string;
  status: string;
  currentStep: string;
  progress: number; // 0-100
  estimatedCompletion: string; // ISO
  actualDuration?: number;
  delayReason?: string;
  nextActions: string[];
  lastUpdated: string; // ISO
}
```

**Этапы трекинга:**
- Ожидание клиента (0-10%)
- Диагностика (10-30%)
- Ожидание запчастей (30-40%)
- Выполнение работ (40-80%)
- Контроль качества (80-90%)
- Оформление документов (90-100%)

---

### **4. 💰 Invoice Payment Progress API**
**Приоритет:** HIGH
**Описание:** API для прогресс-баров частичных оплат

**Endpoint:** `GET /invoices/:id/payment-progress`

**Ответ:**
```typescript
interface InvoicePaymentProgress {
  invoiceId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  progressPercentage: number; // 0-100
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'overpaid';
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    date: string;
    status: string;
  }>;
  nextPaymentDue?: string;
  overdueAmount?: number;
}
```

---

### **5. 💳 Payment Methods Management API**
**Приоритет:** MEDIUM
**Описание:** API для управления способами оплаты компании

**Endpoints:**
- `GET /companies/:id/payment-methods` - список методов
- `PUT /companies/:id/payment-methods/:methodId` - настройка метода
- `POST /companies/:id/payment-methods/:methodId/test` - тестовый платеж

**Ответ:**
```typescript
interface PaymentMethod {
  id: string;
  type: 'cash' | 'card' | 'bank_transfer' | 'crypto' | 'qr' | 'installments';
  name: string;
  enabled: boolean;
  configuration: {
    commission?: number;
    minAmount?: number;
    maxAmount?: number;
    processingTime?: string;
    credentials?: Record<string, any>;
  };
  statistics: {
    totalTransactions: number;
    totalAmount: number;
    successRate: number;
    averageProcessingTime: number;
  };
  lastTested?: string;
  testStatus?: 'success' | 'failed' | 'pending';
}
```

---

## **📊 ДАННЫЕ И МИГРАЦИИ**

### **6. 🗄️ Seed Data для Demo**
**Приоритет:** MEDIUM
**Описание:** Создать реалистичные тестовые данные

**Что нужно:**
- 50-100 клиентов с realistic именами/компаниями
- 150-200 автомобилей разных марок/моделей
- 200-300 заказов в разных статусах
- 100-150 записей на разные даты
- 50-80 счетов с разными статусами оплаты
- Timeline события для каждого клиента (10-20 событий)

---

### **7. 🚗 Vehicle Catalogue Data**
**Приоритет:** HIGH
**Описание:** Импорт реальной базы автомобилей

**Источники:**
- Российский автопром (Lada, UAZ, Газель)
- Популярные бренды (Toyota, Volkswagen, Hyundai, Kia, Ford)
- Премиум (BMW, Mercedes, Audi, Lexus)
- Китайские (Geely, Chery, Haval)

**Структура:**
- Бренды (150+ записей)
- Модели (1500+ записей)
- Типы ТС (седан, хэтчбек, кроссовер, грузовик, мото)
- Технические характеристики (объем двигателя, тип топлива)

---

## **🔧 BACKEND УЛУЧШЕНИЯ**

### **8. 📈 Analytics & Reporting**
**Приоритет:** LOW
**Описание:** Аналитика для dashboard'а

**Endpoints:**
- `GET /analytics/dashboard` - основные метрики
- `GET /analytics/orders/stats` - статистика заказов
- `GET /analytics/revenue/monthly` - помесячная выручка
- `GET /analytics/mechanics/performance` - производительность механиков

---

### **9. 🔔 Notifications System**
**Приоритет:** MEDIUM
**Описание:** Система уведомлений

**Типы уведомлений:**
- Напоминания о ТО (email/sms за 7/3/1 день)
- Готовность заказа (sms клиенту)
- Просроченные платежи (email accountant)
- Критические ошибки системы (telegram admin)

---

### **10. 📱 Mobile App API**
**Приоритет:** LOW
**Описание:** Подготовка к мобильному приложению

**Особенности:**
- JWT refresh tokens
- Push notifications
- Offline-first архитектура
- Оптимизированные payloads (меньше данных)
- Image upload для фото ТС

---

## **🚀 PRODUCTION ГОТОВНОСТЬ**

### **11. 🛡️ Security Hardening**
**Приоритет:** HIGH
**Описание:** Усиление безопасности

**TODO:**
- Rate limiting для всех endpoints
- Input validation с whitelist подходом  
- SQL injection защита (параметризованные запросы)
- XSS защита в API responses
- CORS настройки для production
- Headers security (helmet.js)

---

### **12. 📊 Monitoring & Logging**
**Приоритет:** HIGH
**Описание:** Мониторинг в production

**Интеграции:**
- Winston/Pino для structured logging
- Prometheus metrics
- Health check endpoints
- Performance monitoring (APM)
- Error tracking (Sentry)

---

### **13. 🗄️ Database Optimization**
**Приоритет:** MEDIUM
**Описание:** Оптимизация производительности БД

**TODO:**
- Индексы для часто используемых запросов
- Connection pooling
- Read replicas для аналитики  
- Партицирование больших таблиц (audit_logs, timeline)
- Database backup strategy

---

## **🎯 СЛЕДУЮЩИЕ СПРИНТЫ**

### **Sprint 1 (Критичные API)**
1. Customer Timeline API
2. Vehicle Service Status API
3. Invoice Payment Progress API

### **Sprint 2 (Данные)**
1. Seed data для demo
2. Vehicle Catalogue import
3. Timeline events generation

### **Sprint 3 (Production)**
1. Security hardening
2. Monitoring setup
3. Performance optimization

---

## **💡 ИДЕИ ДЛЯ БУДУЩЕГО**

### **14. 🤖 AI-Powered Features**
- Автоматическое определение неисправностей по описанию
- Умное планирование записей (ML-алгоритм)
- Прогнозирование потребности в запчастях
- Анализ фото повреждений ТС

### **15. 🔗 Integrations**
- 1С интеграция для бухгалтерии
- Госуслуги для проверки ТС
- Банковские API для эквайринга
- Telegram/WhatsApp боты для клиентов

### **16. 📊 Advanced Analytics**
- Прогнозирование выручки
- Сегментация клиентов (RFM анализ)
- A/B тестирование UI изменений
- Predictive maintenance для ТС

---

**Общий статус:** 
- ✅ Core CRUD операции готовы
- 🟡 Нужны дополнительные endpoints для UI фишек
- 🔴 Требуются production оптимизации
- 💙 Множество возможностей для развития

**ETA для критичных задач:** 2-3 недели разработки
