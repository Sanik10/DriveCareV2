Контекст для следующей сессии (сохраните это в issue/README, чтобы не потерялось):

Текущий статус:

Next build проходит, ESLint почти чистый.
Исправлены: useSearchParams границы, styled‑jsx → CSS Modules, warning’и по deps/unused, убран any в канбане и диалогах.
Добавлен дизайн документа по онлайн‑оплате через YooKassa: docs/backend/PAYMENTS_ONLINE_INIT.md.
Что ещё добить завтра:

Проверить npm run lint — должен быть 0. Если что-то осталось — пришлите вывод, поправлю.
Начать ввод FSD-слоёв: создать каркас shared/, entities/, features/, widgets/, providers/, store/ + tsconfig paths. Я подготовлю path‑blocks.
Разрезать lib/api и lib/types для invoices/payments в entities/* с dto/types/mappers.
Реализовать features/pay-invoice (redirect) и refund-payment после добавления эндпоинта /payments/online/init на бэке.
Что прислать (backend) для онлайновых платежей:

DTO и контроллер для POST /payments/online/init (или дайте добро — сам пришлю path‑blocks под ваш стиль).
Если init живёт в другом месте — пришлите точный файл.
Подтвердите роли: CAN_RECORD_PAYMENT для init; возвраты — owner/admin (manager — нет).
Что прислать (frontend) для завершения FSD‑ввода:

Подтверждение алиасов в tsconfig.json, если готовы.
Если есть уникальные UI-паттерны/хелперы — список переноса в shared/ui и shared/lib.

Привет! Помоги пожалуйста с развитием проекта. Я могу тебе скинуть любой файл! Только попроси!

2) Edits (path‑blocks)
Миграции можно не делать! Ты можешь просто заменить код в сущности! Я могу спокойно удалить БД и создать заново!
- Если нет точного содержимого файлов → сначала верни блок “NEED FILES”.
- Если точные версии есть → присылай только path‑blocks (один блок = один файл, всегда полный валидный контент).

Шаблон запроса точных версий файлов (если они нужны)
```
NEED FILES (нужны точные текущие версии файлов для корректных правок):
- apps/backend/src/.../file-a.ts
- apps/backend/src/.../file-b.ts
Причина: правки в формате path‑blocks требуют полного, актуального содержимого, иначе велика вероятность ошибок.
```

Формат path‑blocks (обязателен)

- Один файл — один блок. Полный валидный контент файла.
- В каждом блоке обязательно:
  1) HTML‑комментарий с путём (для скрипта)
  2) Тот же путь первой строкой комментария внутри файла (если язык поддерживает комментарии)
- Пути от корня репозитория:
  - apps/backend/src/...
  - apps/frontend/src/...
  - .env.example, turbo.json и т.д.
- Действия: replace|delete|append|move (replace по умолчанию). Для move обязательно from.

Синтаксис блока
<!-- path: относительный/путь/к/файлу[, action: delete|replace|append|move, from: старый/путь] -->
```lang
// path: относительный/путь/к/файлу
<полное содержимое файла>
```

- lang: ts, js, tsx, json, yaml, md, sh и т.д.
- Если формат без комментариев (JSON/YAML/ENV) — внутренний комментарий не вставлять.

Примеры

1) Замена/создание файла
<!-- path: apps/backend/src/modules/users/users.service.ts -->
```ts
// path: apps/backend/src/modules/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { UsersRepository } from './services/users-data.service';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}
  // ...
}
```

2) Удаление файла
<!-- path: apps/backend/src/modules/old/obsolete.service.ts, action: delete -->
```ts
// path: apps/backend/src/modules/old/obsolete.service.ts
```

3) Добавление строк в конец
<!-- path: .env.example, action: append -->
```dotenv
# path: .env.example
NEW_FEATURE_FLAG=true
```

4) Перемещение
<!-- path: apps/backend/src/modules/foo/bar.service.ts, action: move, from: apps/backend/src/modules/old/bar.service.ts -->
```ts
// path: apps/backend/src/modules/foo/bar.service.ts
// обновлённый контент (если нужен)
```

Правила отправки ответа
- Только path‑blocks. Никаких diff/patch.
- В каждый изменённый файл — полный валидный контент (не фрагменты).
- Без дублей одного и того же файла; присылай финальную версию один раз.
- UTF‑8 без BOM, переводы строк LF, без невидимых символов; пустая строка в конце файла.
- JSON/YAML/ENV — строго валидный синтаксис.

Подсказка по комментариям внутри файла
- TS/JS/TSX/JSX/Go/C#: // path: apps/backend/src/...
- CSS/SCSS/Less: /* path: apps/backend/src/... */
- HTML/XML/SVG/MD: <!-- path: apps/backend/src/... -->
- Shell/YAML/ENV/INI/TOML/Python/Ruby/SQL: # или -- в SQL
- Для форматов без комментариев (JSON/YAML/ENV) — внутренний комментарий не использовать.
P.S. писть любые сообщения и комменатрии между блоками, а может и вопросы задавать после блоков кода - можно и даже нужно! Скрипт сам выберет код из сообщения

mac@MacBook-2018-Pro DriveCareV2 % ls -a   
.                       .env.example            .gitignore              .vscode                 ai.sanitized.patch      node_modules            scripts
..                      .env.production         .husky                  README.md               apps                    package-lock.json       turbo.json
.DS_Store               .env.staging            .npmrc                  ai.patch                docker-compose.yml      package.json
.env                    .git                    .turbo                  ai.rewritten.patch      docs                    packages
mac@MacBook-2018-Pro DriveCareV2 % cd apps 
mac@MacBook-2018-Pro apps % ls
backend         frontend
mac@MacBook-2018-Pro apps % cd backend 
mac@MacBook-2018-Pro backend % ls -a
.                       .DS_Store               dist                    node_modules            src                     tsconfig.build.json
..                      .turbo                  nest-cli.json           package.json            test                    tsconfig.json
mac@MacBook-2018-Pro backend % cd src 
mac@MacBook-2018-Pro src % ls -R
app.controller.ts       app.service.ts          common                  database                modules
app.module.ts           cli                     config                  main.ts

./cli:
create-superadmin.ts

./common:
audit                   decorators              filters                 index.ts                pipes
common.module.ts        exceptions              guards                  interceptors            redis

./common/audit:
audit.service.ts

./common/decorators:
cache-policy.decorator.ts       resource.decorator.ts

./common/exceptions:
custom-exceptions.ts    domain.exceptions.ts

./common/filters:
global-exception.filter.ts

./common/guards:
auth-with-ownership.guard.ts    company-ownership.guard.ts      roles.guard.ts

./common/interceptors:
audit-logging.interceptor.ts    security-headers.interceptor.ts

./common/pipes:
enhanced-validation.pipe.ts

./common/redis:
redis.constants.ts      redis.module.ts         redis.provider.ts

./config:
config.module.ts        config.service.ts       configuration.ts        validation.schema.ts

./database:
data-source.ts          database.config.ts      entities                migrations              seeds

./database/entities:
appointment.entity.ts                   order-service.entity.ts                 service-category.entity.ts              user-consent.entity.ts
audit-log.entity.ts                     order.entity.ts                         service-history.entity.ts               user-session.entity.ts
company.entity.ts                       part-category.entity.ts                 service.entity.ts                       user.entity.ts
customer.entity.ts                      part-reservation.entity.ts              stock-movement.entity.ts                vehicle-brand.entity.ts
index.ts                                part.entity.ts                          subscription-compliance-log.entity.ts   vehicle-model.entity.ts
inventory-alert-settings.entity.ts      payment-method.entity.ts                subscription-consent.entity.ts          vehicle-type.entity.ts
inventory-alert.entity.ts               payment.entity.ts                       subscription-payment-log.entity.ts      vehicle.entity.ts
inventory.entity.ts                     permission.entity.ts                    subscription.entity.ts                  work-schedule.entity.ts
invoice.entity.ts                       role.entity.ts                          supplier.entity.ts
order-part.entity.ts                    schedule-exception.entity.ts            tariff.entity.ts

./database/migrations:
1756575611312-InitSchema.ts

./database/seeds:
index.ts                run-seeds.ts            seeds.module.ts         seeds.service.ts

./modules:
appointments            customers               orders                  service-history         tariffs                 vehicles-catalogue
auth                    inventory               payment-methods         services                users                   work-schedules
companies               invoices                payments                subscriptions           vehicles

./modules/appointments:
appointments.controller.ts      appointments.service.ts         dto                             services
appointments.module.ts          constants                       interfaces                      types

./modules/appointments/constants:
appointments.constants.ts

./modules/appointments/dto:
request         response

./modules/appointments/dto/request:
create-appointment.dto.ts       smart-schedule.dto.ts           update-appointment.dto.ts

./modules/appointments/dto/response:
appointment-response.dto.ts             paginated-appointments-response.dto.ts  smart-schedule-response.dto.ts

./modules/appointments/interfaces:
appointments.interface.ts

./modules/appointments/services:
appointments-business.service.ts        appointments-data.service.ts            appointments-mapper.service.ts          appointments-validation.service.ts

./modules/appointments/types:
appointments.types.ts

./modules/auth:
auth.controller.ts      auth.service.ts         constants.ts            dto                     interfaces              services                types
auth.module.ts          constants               decorators              guards                  redis.provider.ts       strategies

./modules/auth/constants:
auth.constants.ts       redis.constants.ts

./modules/auth/decorators:
roles.decorator.ts

./modules/auth/dto:
request         response

./modules/auth/dto/request:
login.dto.ts            logout-device.dto.ts    refresh-token.dto.ts    register-company.dto.ts register-invite.dto.ts

./modules/auth/dto/response:
login-response.dto.ts                   logout-response.dto.ts                  refresh-token-response.dto.ts           register-company-response.dto.ts

./modules/auth/guards:
jwt-auth.guard.ts       local-auth.guard.ts     roles.guard.ts

./modules/auth/interfaces:
device.interface.ts             request-with-user.interface.ts  session.interface.ts            token-payload.interface.ts

./modules/auth/services:
company-onboarding.service.ts   security.service.ts             token.service.ts
device.service.ts               session.service.ts              twofa.service.ts

./modules/auth/strategies:
jwt.strategy.ts         local.strategy.ts

./modules/auth/types:
auth.types.ts

./modules/companies:
companies.controller.ts companies.service.ts    dto                     services
companies.module.ts     constants               interfaces              types

./modules/companies/constants:
companies.constants.ts

./modules/companies/dto:
request         response

./modules/companies/dto/request:
create-company.dto.ts   update-company.dto.ts

./modules/companies/dto/response:
company-response.dto.ts                 paginated-companies-response.dto.ts

./modules/companies/interfaces:
companies.interface.ts

./modules/companies/services:
companies-business.service.ts   companies-data.service.ts       companies-mapper.service.ts     companies-validation.service.ts

./modules/companies/types:
companies.types.ts

./modules/customers:
constants               customers.module.ts     dto                     services
customers.controller.ts customers.service.ts    interfaces              types

./modules/customers/constants:
customers.constants.ts

./modules/customers/dto:
request         response

./modules/customers/dto/request:
create-customer.dto.ts  revoke-consent.dto.ts   update-customer.dto.ts

./modules/customers/dto/response:
customer-response.dto.ts                paginated-customers-response.dto.ts

./modules/customers/interfaces:
customers.interface.ts

./modules/customers/services:
customer-anonymization.service.ts       customer-retention.scheduler.ts         customers-data.service.ts               customers-validation.service.ts
customer-export.service.ts              customers-business.service.ts           customers-mapper.service.ts

./modules/customers/types:
customers.types.ts

./modules/inventory:
constants               interfaces              inventory.controller.ts inventory.service.ts    services                suppliers
dto                     inventory-alerts        inventory.module.ts     parts                   stock-movements         types

./modules/inventory/constants:
inventory.constants.ts

./modules/inventory/dto:
request         response

./modules/inventory/dto/request:
update-inventory.dto.ts

./modules/inventory/dto/response:
inventory-response.dto.ts               low-stock-alerts-response.dto.ts        paginated-inventory-response.dto.ts     stock-summary-response.dto.ts

./modules/inventory/interfaces:

./modules/inventory/inventory-alerts:
alerts.scheduler.ts             inventory-alerts.controller.ts  inventory-alerts.service.ts     types
dto                             inventory-alerts.module.ts      services

./modules/inventory/inventory-alerts/dto:
request         response

./modules/inventory/inventory-alerts/dto/request:
alert-settings.dto.ts           test-notification.dto.ts

./modules/inventory/inventory-alerts/dto/response:
alert-response.dto.ts                   alert-settings-response.dto.ts          paginated-alerts-response.dto.ts        test-notification-response.dto.ts

./modules/inventory/inventory-alerts/services:
alerts-business.service.ts      alerts-data.service.ts          alerts-mapper.service.ts        alerts-notification.service.ts  alerts-validation.service.ts

./modules/inventory/inventory-alerts/types:
alerts.types.ts

./modules/inventory/parts:
constants               dto                     parts.controller.ts     parts.module.ts         parts.service.ts        services                types

./modules/inventory/parts/constants:
parts.constants.ts

./modules/inventory/parts/dto:
request         response

./modules/inventory/parts/dto/request:
bulk-update-parts.dto.ts        create-part.dto.ts              update-part.dto.ts

./modules/inventory/parts/dto/response:
paginated-parts-response.dto.ts part-response.dto.ts

./modules/inventory/parts/services:
parts-business.service.ts       parts-data.service.ts           parts-mapper.service.ts         parts-validation.service.ts

./modules/inventory/parts/types:
parts.types.ts

./modules/inventory/services:
inventory-business.service.ts   inventory-data.service.ts       inventory-mapper.service.ts     inventory-validation.service.ts reservations.scheduler.ts

./modules/inventory/stock-movements:
dto                             stock-movements.controller.ts   stock-movements.service.ts
services                        stock-movements.module.ts       types

./modules/inventory/stock-movements/dto:
request         response

./modules/inventory/stock-movements/dto/request:
barcode-movement.dto.ts bulk-movements.dto.ts   create-movement.dto.ts  update-movement.dto.ts

./modules/inventory/stock-movements/dto/response:
movement-response.dto.ts                movement-summary-response.dto.ts        paginated-movements-response.dto.ts

./modules/inventory/stock-movements/services:
stock-movements-business.service.ts     stock-movements-data.service.ts         stock-movements-mapper.service.ts       stock-movements-validation.service.ts

./modules/inventory/stock-movements/types:
stock-movements.types.ts

./modules/inventory/suppliers:
dto                     services                suppliers.controller.ts suppliers.module.ts     suppliers.service.ts    types

./modules/inventory/suppliers/dto:
request         response

./modules/inventory/suppliers/dto/request:
bulk-suppliers.dto.ts   create-supplier.dto.ts  rate-supplier.dto.ts    update-supplier.dto.ts

./modules/inventory/suppliers/dto/response:
paginated-suppliers-response.dto.ts     supplier-analytics-response.dto.ts      supplier-rating-response.dto.ts         supplier-response.dto.ts

./modules/inventory/suppliers/services:
suppliers-business.service.ts   suppliers-data.service.ts       suppliers-mapper.service.ts     suppliers-validation.service.ts

./modules/inventory/suppliers/types:
suppliers.types.ts

./modules/inventory/types:
inventory.types.ts

./modules/invoices:
constants               dto                     invoices.controller.ts  invoices.module.ts      invoices.service.ts     services                types

./modules/invoices/constants:
invoices.constants.ts

./modules/invoices/dto:
request         response

./modules/invoices/dto/request:
create-invoice.dto.ts   update-invoice.dto.ts

./modules/invoices/dto/response:
invoice-response.dto.ts                 paginated-invoices-response.dto.ts

./modules/invoices/services:
invoices-business.service.ts    invoices-data.service.ts        invoices-mapper.service.ts      invoices-validation.service.ts

./modules/invoices/types:
invoices.types.ts

./modules/orders:
constants               interfaces              order-services          orders.module.ts        services
dto                     order-parts             orders.controller.ts    orders.service.ts       types

./modules/orders/constants:
orders.constants.ts

./modules/orders/dto:
request         response

./modules/orders/dto/request:
create-order.dto.ts     update-order.dto.ts

./modules/orders/dto/response:
order-part-response.dto.ts              order-response.dto.ts                   order-service-response.dto.ts           paginated-orders-response.dto.ts

./modules/orders/interfaces:
orders.interface.ts

./modules/orders/order-parts:
dto                             order-parts.module.ts           services
order-parts.controller.ts       order-parts.service.ts          types

./modules/orders/order-parts/dto:
request         response

./modules/orders/order-parts/dto/request:
add-part-to-order.dto.ts        bulk-add-parts.dto.ts           update-order-part.dto.ts

./modules/orders/order-parts/dto/response:
order-part-response.dto.ts              order-parts-list-response.dto.ts

./modules/orders/order-parts/services:
order-parts-business.service.ts         order-parts-data.service.ts             order-parts-mapper.service.ts           order-parts-validation.service.ts

./modules/orders/order-parts/types:
order-parts.types.ts

./modules/orders/order-services:
dto                             order-services.module.ts        services
order-services.controller.ts    order-services.service.ts       types

./modules/orders/order-services/dto:
request         response

./modules/orders/order-services/dto/request:
add-service-to-order.dto.ts     bulk-add-services.dto.ts        update-order-service.dto.ts

./modules/orders/order-services/dto/response:
order-service-response.dto.ts           order-services-list-response.dto.ts

./modules/orders/order-services/services:
order-services-business.service.ts      order-services-data.service.ts          order-services-mapper.service.ts        order-services-validation.service.ts

./modules/orders/order-services/types:
order-services.types.ts

./modules/orders/services:
orders-business.service.ts      orders-data.service.ts          orders-mapper.service.ts        orders-validation.service.ts    pricing-engine.ts

./modules/orders/types:
orders.types.ts

./modules/payment-methods:
constants                       interfaces                      payment-methods.module.ts       services
dto                             payment-methods.controller.ts   payment-methods.service.ts      types

./modules/payment-methods/constants:
payment-methods.constants.ts

./modules/payment-methods/dto:
request         response

./modules/payment-methods/dto/request:
create-payment-method.dto.ts    update-payment-method.dto.ts

./modules/payment-methods/dto/response:
paginated-payment-methods-response.dto.ts       payment-method-response.dto.ts

./modules/payment-methods/interfaces:
payment-methods.interface.ts

./modules/payment-methods/services:
payment-methods-business.service.ts     payment-methods-data.service.ts         payment-methods-mapper.service.ts       payment-methods-validation.service.ts

./modules/payment-methods/types:
payment-methods.types.ts

./modules/payments:
constants               guards                  payments.controller.ts  payments.service.ts     types
dto                     interfaces              payments.module.ts      services                webhooks

./modules/payments/constants:
payments.constants.ts

./modules/payments/dto:
request         response

./modules/payments/dto/request:
record-payment.dto.ts   refund-payment.dto.ts   update-payment.dto.ts

./modules/payments/dto/response:
company-balance.dto.ts                  paginated-payments-response.dto.ts      payment-response.dto.ts                 payment-statistics.dto.ts

./modules/payments/guards:
webhook-ip-acl.guard.ts

./modules/payments/interfaces:
payments.interface.ts

./modules/payments/services:
payments-business.service.ts    payments-mapper.service.ts      webhook-idempotency.service.ts
payments-data.service.ts        payments-validation.service.ts  yookassa-payments.client.ts

./modules/payments/types:
payments.types.ts

./modules/payments/webhooks:
payments-webhooks.controller.ts

./modules/service-history:
constants                       interfaces                      service-history.module.ts       services
dto                             service-history.controller.ts   service-history.service.ts      types

./modules/service-history/constants:
service-history.constants.ts

./modules/service-history/dto:
request         response

./modules/service-history/dto/request:
create-service-history.dto.ts   update-service-history.dto.ts

./modules/service-history/dto/response:
paginated-service-history-response.dto.ts       service-history-response.dto.ts

./modules/service-history/interfaces:
service-history.interface.ts

./modules/service-history/services:
service-history-business.service.ts     service-history-data.service.ts         service-history-mapper.service.ts       service-history-validation.service.ts

./modules/service-history/types:
service-history.types.ts

./modules/services:
categories              dto                     services                services.module.ts      types
constants               interfaces              services.controller.ts  services.service.ts

./modules/services/categories:
categories.controller.ts        constants                       interfaces                      types
categories.service.ts           dto                             services

./modules/services/categories/constants:
categories.constants.ts

./modules/services/categories/dto:
request         response

./modules/services/categories/dto/request:
create-category.dto.ts  update-category.dto.ts

./modules/services/categories/dto/response:
category-response.dto.ts                paginated-categories-response.dto.ts

./modules/services/categories/interfaces:
categories.interface.ts

./modules/services/categories/services:
categories-business.service.ts          categories-data.service.ts              categories-mapper.service.ts            categories-validation.service.ts

./modules/services/categories/types:
categories.types.ts

./modules/services/constants:
services.constants.ts

./modules/services/dto:
request         response

./modules/services/dto/request:
bulk-update-services.dto.ts     create-service.dto.ts           update-service.dto.ts

./modules/services/dto/response:
paginated-services-response.dto.ts      service-response.dto.ts

./modules/services/interfaces:
services.interface.ts

./modules/services/services:
services-business.service.ts    services-data.service.ts        services-mapper.service.ts      services-validation.service.ts

./modules/services/types:
services.types.ts

./modules/subscriptions:
constants                       interfaces                      subscription-billing            subscriptions.module.ts         types
dto                             services                        subscriptions.controller.ts     subscriptions.service.ts

./modules/subscriptions/constants:
subscriptions.constants.ts

./modules/subscriptions/dto:
request         response

./modules/subscriptions/dto/request:
create-subscription.dto.ts      update-subscription.dto.ts

./modules/subscriptions/dto/response:
paginated-subscriptions-response.dto.ts subscription-response.dto.ts

./modules/subscriptions/interfaces:
subscriptions.interface.ts

./modules/subscriptions/services:
subscription-limits.service.ts          subscriptions-data.service.ts           subscriptions-validation.service.ts
subscriptions-business.service.ts       subscriptions-mapper.service.ts

./modules/subscriptions/subscription-billing:
constants                               interfaces                              subscription-billing.module.ts
dto                                     services                                subscription-billing.service.ts
guards                                  subscription-billing.controller.ts      types

./modules/subscriptions/subscription-billing/constants:
billing.constants.ts

./modules/subscriptions/subscription-billing/dto:
request         response

./modules/subscriptions/subscription-billing/dto/request:
cancel-subscription.dto.ts              create-billing-subscription.dto.ts      process-payment.dto.ts

./modules/subscriptions/subscription-billing/dto/response:
billing-subscription-response.dto.ts    compliance-report-response.dto.ts       consumer-rights-response.dto.ts         payment-status-response.dto.ts

./modules/subscriptions/subscription-billing/guards:
webhook-signature.guard.ts

./modules/subscriptions/subscription-billing/interfaces:
billing.interface.ts            compliance.interface.ts         notification.interface.ts       payment-gateway.interface.ts

./modules/subscriptions/subscription-billing/services:
billing-business.service.ts     billing-compliance.service.ts   billing-notification.service.ts billing-payment.service.ts      gateways

./modules/subscriptions/subscription-billing/services/gateways:
tinkoff.gateway.ts      yookassa.gateway.ts

./modules/subscriptions/subscription-billing/types:
billing.types.ts

./modules/subscriptions/types:
subscriptions.types.ts

./modules/tariffs:
constants               interfaces              tariffs.controller.ts   tariffs.service.ts
dto                     services                tariffs.module.ts       types

./modules/tariffs/constants:
tariffs.constants.ts

./modules/tariffs/dto:
request         response

./modules/tariffs/dto/request:
create-tariff.dto.ts    update-tariff.dto.ts

./modules/tariffs/dto/response:
tariff-response.dto.ts

./modules/tariffs/interfaces:
tariffs.interface.ts

./modules/tariffs/services:
tariffs-business.service.ts     tariffs-data.service.ts         tariffs-mapper.service.ts       tariffs-validation.service.ts

./modules/tariffs/types:
tariffs.types.ts

./modules/users:
constants               interfaces              types                   users.module.ts
dto                     services                users.controller.ts     users.service.ts

./modules/users/constants:
users.constants.ts

./modules/users/dto:
request         response

./modules/users/dto/request:
change-password.dto.ts          create-user.dto.ts              update-user-profile.dto.ts      update-user-role.dto.ts         update-user-status.dto.ts

./modules/users/dto/response:
paginated-users-response.dto.ts profile-response.dto.ts         role.dto.ts                     user-response.dto.ts

./modules/users/interfaces:
users.interface.ts

./modules/users/services:
users-business.service.ts       users-consents.service.ts       users-data.service.ts           users-mapper.service.ts         users-validation.service.ts

./modules/users/types:
users.types.ts

./modules/vehicles:
constants               interfaces              types                   vehicles.module.ts
dto                     services                vehicles.controller.ts  vehicles.service.ts

./modules/vehicles/constants:
vehicles.constants.ts

./modules/vehicles/dto:
request         response

./modules/vehicles/dto/request:
create-vehicle.dto.ts   update-vehicle.dto.ts

./modules/vehicles/dto/response:
paginated-vehicles-response.dto.ts      vehicle-response.dto.ts

./modules/vehicles/interfaces:
vehicles.interface.ts

./modules/vehicles/services:
vehicles-business.service.ts    vehicles-data.service.ts        vehicles-mapper.service.ts      vehicles-validation.service.ts

./modules/vehicles/types:
vehicles.types.ts

./modules/vehicles-catalogue:
constants                               interfaces                              types                                   vehicles-catalogue.module.ts
dto                                     services                                vehicles-catalogue.controller.ts        vehicles-catalogue.service.ts

./modules/vehicles-catalogue/constants:
catalogue.constants.ts

./modules/vehicles-catalogue/dto:
brands  models  types

./modules/vehicles-catalogue/dto/brands:
brand-response.dto.ts   create-brand.dto.ts     update-brand.dto.ts

./modules/vehicles-catalogue/dto/models:
create-model.dto.ts     model-response.dto.ts   update-model.dto.ts

./modules/vehicles-catalogue/dto/types:
create-type.dto.ts      type-response.dto.ts    update-type.dto.ts

./modules/vehicles-catalogue/interfaces:
catalogue.interface.ts

./modules/vehicles-catalogue/services:
brands-data.service.ts          catalogue-mapper.service.ts     models-data.service.ts
catalogue-business.service.ts   catalogue-validation.service.ts types-data.service.ts

./modules/vehicles-catalogue/types:
catalogue.types.ts

./modules/work-schedules:
constants                       interfaces                      types                           work-schedules.module.ts
dto                             services                        work-schedules.controller.ts    work-schedules.service.ts

./modules/work-schedules/constants:
work-schedules.constants.ts

./modules/work-schedules/dto:
request         response

./modules/work-schedules/dto/request:
create-exception.dto.ts         create-schedule.dto.ts          optimize-request.dto.ts         update-exception-status.dto.ts  update-schedule.dto.ts

./modules/work-schedules/dto/response:
capacity-response.dto.ts                optimization-response.dto.ts            schedule-response.dto.ts
exception-response.dto.ts               paginated-schedules-response.dto.ts

./modules/work-schedules/interfaces:
work-schedules.interface.ts

./modules/work-schedules/services:
work-schedules-business.service.ts      work-schedules-mapper.service.ts        work-schedules-validation.service.ts
work-schedules-data.service.ts          work-schedules-retention.scheduler.ts

./modules/work-schedules/types:
work-schedules.types.ts
mac@MacBook-2018-Pro src % 

mac@MacBook-2018-Pro DriveCareV2 % ls -a
.                       .env.production         .npmrc                  ai.rewritten.patch      node_modules            turbo.json
..                      .env.staging            .turbo                  ai.sanitized.patch      package-lock.json
.DS_Store               .git                    .vscode                 apps                    package.json
.env                    .gitignore              README.md               docker-compose.yml      packages
.env.example            .husky                  ai.patch                docs                    scripts
mac@MacBook-2018-Pro DriveCareV2 % cd apps 
mac@MacBook-2018-Pro apps % ls
backend         frontend
mac@MacBook-2018-Pro apps % cd frontend 
mac@MacBook-2018-Pro frontend % ls -a
.                       .gitignore              app                     lib                     postcss.config.mjs
..                      .next                   components              next-env.d.ts           public
.env.local              .turbo                  docs                    node_modules            tailwind.config.ts
.env.local.example      README.md               eslint.config.js        package.json            tsconfig.json
mac@MacBook-2018-Pro frontend % cd app 
mac@MacBook-2018-Pro app % cd ..
mac@MacBook-2018-Pro frontend % ls -R app 
(auth)          dashboard       favicon.ico     fonts           fonts.ts        globals.css     layout.tsx      not-found.tsx   page.tsx        providers

app/(auth):
login           register

app/(auth)/login:
login.module.css        page.tsx

app/(auth)/register:
invite                  page.tsx                register.module.css     success

app/(auth)/register/invite:
invite.module.css       page.tsx

app/(auth)/register/success:
page.tsx                success.module.css

app/dashboard:
customers               invoices                page.tsx                payment-methods         services
dashboard.module.css    orders                  parts                   security                vehicles

app/dashboard/customers:
[id]            page.tsx

app/dashboard/customers/[id]:
page.tsx

app/dashboard/invoices:
[id]            _client         new             page.tsx

app/dashboard/invoices/[id]:
_client         page.tsx

app/dashboard/invoices/[id]/_client:
Details.client.tsx

app/dashboard/invoices/_client:
List.client.tsx

app/dashboard/invoices/new:
_client         page.tsx

app/dashboard/invoices/new/_client:
NewInvoice.client.tsx

app/dashboard/orders:
[id]            new             page.tsx

app/dashboard/orders/[id]:
page.tsx

app/dashboard/orders/new:
page.tsx

app/dashboard/parts:
page.tsx

app/dashboard/payment-methods:
[id]            new             page.tsx

app/dashboard/payment-methods/[id]:
page.tsx

app/dashboard/payment-methods/new:
page.tsx

app/dashboard/security:
page.tsx

app/dashboard/services:
page.tsx

app/dashboard/vehicles:
[id]            page.tsx

app/dashboard/vehicles/[id]:
page.tsx

app/fonts:
GeistMonoVF.woff        GeistVF.woff

app/providers:
theme-provider.tsx
mac@MacBook-2018-Pro frontend % ls -R components 
app             customers       orders          parts           security        services        ui              vehicles

components/app:

components/customers:
customer-create-dialog.tsx

components/orders:
order-create-dialog.tsx         order-kanban.tsx                order-part-add-dialog.tsx       order-service-add-dialog.tsx

components/parts:
part-edit-dialog.tsx

components/security:
device-session-card.tsx         logout-confirm-dialog.tsx       qr-code-dialog.tsx              two-factor-auth-card.tsx

components/services:
service-edit-dialog.tsx

components/ui:
badge.tsx               card.tsx                dialog.tsx              input.tsx               skeleton.tsx            theme-toggle.tsx
button.tsx              confirm-dialog.tsx      dropdown-menu.tsx       kbd.tsx                 status-badge.tsx

components/vehicles:
vehicle-create-dialog.tsx
mac@MacBook-2018-Pro frontend % ls -R lib 
api             api.ts          hooks           types           types.ts        utils.ts

lib/api:
auth.ts                 customers.ts            invoices.ts             parts.ts                security.ts             vehicles-catalogue.ts
core.ts                 dashboard.ts            orders.ts               payment-methods.ts      services.ts             vehicles.ts

lib/hooks:
use-auth.ts

lib/types:
auth.ts                 invoices.ts             parts.ts                security.ts             vehicles-catalogue.ts
customers.ts            orders.ts               payment-methods.ts      services.ts             vehicles.ts
mac@MacBook-2018-Pro frontend % ls -R public 
dc-logo.svg             file-text.svg           next.svg                turborepo-light.svg     window.svg
dc-wordmark.svg         globe.svg               turborepo-dark.svg      vercel.svg
mac@MacBook-2018-Pro frontend % 

# Frontend endpoints policy (UI-safe vs System-only)

Префикс всех путей: /api/v1

Назначение: фиксируем, какие API-эндпоинты можно использовать во фронтенде (UI), а какие системные и запрещены для UI (webhooks/cron/internal).

Легенда:
- ✅ Allowed (UI): можно вызывать из фронтенда (с учётом RBAC)
- ⚠️ Admin-only (tenant): только для владельца/админа компании (UI для админов)
- 🧰 Backoffice (platform): только платформенные роли (superadmin/platform_admin), не для клиентского UI
- ⛔ System-only: системные/вебхуки/cron/интеграции — нельзя вызывать из фронтенда

Примечания:
- Везде подразумевается multi-tenant защита (JwtAuthGuard + AuthWithOwnership/CompanyOwnershipGuard).
- Роли 'owner'/'admin' в некоторых контроллерах = 'company_owner'/'company_admin' (легаси-алиасы).
- Идемпотентность: отправляйте X-Idempotency-Key там, где поддержано (см. примечания).

---

## Auth

| Method | Path | Категория |
|---|---|---|
| POST | /auth/login | ✅ |
| POST | /auth/register-company | ✅ |
| POST | /auth/register-invite | ✅ |
| POST | /auth/refresh | ✅ |
| POST | /auth/logout | ✅ |
| POST | /auth/logout-device | ✅ |
| POST | /auth/logout-all-devices | ✅ |
| GET | /auth/sessions | ✅ |
| GET | /auth/me | ✅ |
| POST | /auth/2fa/setup | ✅ |
| POST | /auth/2fa/enable | ✅ |
| POST | /auth/2fa/disable | ✅ |

---

## Users

| Method | Path | Категория |
|---|---|---|
| POST | /users | ⚠️ |
| GET | /users | ⚠️ |
| GET | /users/:id | ⚠️ |
| PATCH | /users/:id/profile | ⚠️ |
| PATCH | /users/:id/role | ⚠️ |
| PATCH | /users/:id/status | ⚠️ |
| PATCH | /users/:id/password | ⚠️ |
| DELETE | /users/:id | ⚠️ |
| PATCH | /users/me/profile | ✅ |
| POST | /users/me/deactivate | ✅ |
| GET | /users/me/export | ✅ |
| POST | /users/me/consent/revoke | ✅ |

---

## Companies

| Method | Path | Категория |
|---|---|---|
| POST | /companies | ⚠️ |
| GET | /companies | ⚠️ |
| GET | /companies/:id | ⚠️ |
| PATCH | /companies/:id | ⚠️ |
| DELETE | /companies/:id | 🧰 |
| PATCH | /companies/:id/status | 🧰 |

---

## Tariffs (глобальные тарифы)

| Method | Path | Категория |
|---|---|---|
| GET | /tariffs | ✅ (read-only) |
| GET | /tariffs/active | ✅ (read-only) |
| GET | /tariffs/popular | ✅ (read-only) |
| GET | /tariffs/compare | ✅ (read-only) |
| GET | /tariffs/:id | ✅ (read-only) |
| POST | /tariffs | 🧰 |
| PATCH | /tariffs/:id | 🧰 |
| PATCH | /tariffs/:id/status | 🧰 |
| DELETE | /tariffs/:id | 🧰 |

---

## Subscriptions (подписки компаний)

| Method | Path | Роли | Категория | Примечание |
|---|---|---|---|---|
| POST | /subscriptions | superadmin, platform_admin, company_owner, company_admin | ⚠️ | Идемпотентность: X-Idempotency-Key |
| GET | /subscriptions/company/:companyId | (Auth + CompanySubscriptions) | ✅ | Листинг по компании (guard проверяет принадлежность) |
| GET | /subscriptions/company/:companyId/active | (Auth + CompanySubscriptions) | ✅ | Активная подписка (read-only) |
| GET | /subscriptions/:id | superadmin, platform_admin, company_owner, company_admin, cashier, auditor | ✅ | Детали |
| PATCH | /subscriptions/:id | superadmin, platform_admin, company_owner | ⚠️ | Обновление (строгие роли) |
| PATCH | /subscriptions/:id/cancel | superadmin, platform_admin, company_owner | ⚠️ | Отмена: только owner/platform |
| POST | /subscriptions/check-expired | superadmin, platform_admin, system_operator | ⛔ | CRON/system-only |

---

## Subscription-Billing (оплата тарифа, webhooks)

| Method | Path | Категория | Примечание |
|---|---|---|---|
| POST | /subscription-billing | ⚠️ | Создать (PENDING). X-Idempotency-Key |
| POST | /subscription-billing/payment | ⚠️ | Оплатить подписку. X-Idempotency-Key |
| DELETE | /subscription-billing/:id | ⚠️ | Отмена |
| GET | /subscription-billing/active | ✅ | Read-only |
| GET | /subscription-billing/compliance/report | ⚠️ | Отчёт владельцу |
| POST | /subscription-billing/webhooks/:provider | ⛔ | Webhooks (raw-body/signature) |

---

## Payment-Methods

| Method | Path | Категория |
|---|---|---|
| GET | /payment-methods | ✅ |
| GET | /payment-methods/stats | ✅ |
| GET | /payment-methods/search | ✅ |
| GET | /payment-methods/quick | ✅ |
| GET | /payment-methods/for-select | ✅ |
| GET | /payment-methods/type/:type | ✅ |
| GET | /payment-methods/:id | ✅ |
| GET | /payment-methods/:id/availability | ✅ |
| GET | /payment-methods/:id/limits | ✅ |
| POST | /payment-methods | ⚠️ |
| POST | /payment-methods/bulk-update | ⚠️ |
| POST | /payment-methods/:id/test-integration | ⚠️ |
| POST | /payment-methods/:id/calculate-fee | ⚠️ |
| PATCH | /payment-methods/:id | ⚠️ |
| POST | /payment-methods/:id/toggle-status | ⚠️ |
| DELETE | /payment-methods/:id | ⚠️ |

---

## Payments (платежи по инвойсам)

| Method | Path | Категория | Примечание |
|---|---|---|---|
| POST | /payments | ✅ | Создание платежа |
| GET | /payments | ✅ | Листинг с фильтрами |
| GET | /payments/:id | ✅ | Детали |
| PUT | /payments/:id | ⚠️ | Обновить статус/метаданные |
| POST | /payments/:id/refund | ⚠️ | Возврат (полный/частичный) |
| GET | /payments/analytics/statistics | ⚠️ | Фин. аналитика |
| GET | /payments/analytics/balance | ✅ | Баланс компании |
| DELETE | /payments/:id | ⚠️ | Опасная операция (предпочтителен refund) |
| POST | /payments/system/process-overdue | ⛔ | System-only |
| POST | /payments/webhooks/yookassa | ⛔ | System-only (ACL, raw-body, идемпотентность) |
| POST | /payments/webhooks/tinkoff | ⛔ | System-only (ACL, raw-body, идемпотентность) |

---

## Invoices

| Method | Path | Категория |
|---|---|---|
| POST | /invoices | ✅ |
| POST | /invoices/from-order | ✅ |
| GET | /invoices | ✅ |
| GET | /invoices/:id | ✅ |
| PATCH | /invoices/:id | ⚠️ |
| PATCH | /invoices/:id/status | ⚠️ |
| DELETE | /invoices/:id | ⚠️ |
| GET | /invoices/stats/dashboard | ⚠️ |
| GET | /invoices/overdue/report | ⚠️ |
| GET | /invoices/search/:query | ✅ |
| GET | /invoices/select/options | ✅ |

---

## Orders (общие)

| Method | Path | Категория |
|---|---|---|
| POST | /orders | ✅ |
| GET | /orders | ✅ |
| GET | /orders/:id | ✅ |
| PATCH | /orders/:id | ⚠️ |
| PATCH | /orders/:id/status | ⚠️ |
| PATCH | /orders/:id/assign | ⚠️ |
| DELETE | /orders/:id | ⚠️ |
| PATCH | /orders/:id/recalculate | ⚠️ |

### Orders: Services (по заказу)

| Method | Path | Роли | Категория |
|---|---|---|---|
| POST | /orders/:orderId/services | owner, admin, manager | ✅ |
| GET | /orders/:orderId/services | (Auth+OrderResource) | ✅ |
| PATCH | /orders/:orderId/services/:serviceId | owner, admin, manager | ⚠️ |
| DELETE | /orders/:orderId/services/:serviceId | owner, admin, manager | ⚠️ |
| PATCH | /orders/:orderId/services/:serviceId/status | owner, admin, manager, mechanic, lead_mechanic | ⚠️ |
| PATCH | /orders/:orderId/services/:serviceId/mechanic | owner, admin, manager, lead_mechanic | ⚠️ |
| PATCH | /orders/:orderId/services/:serviceId/start | owner, admin, manager, mechanic, lead_mechanic | ⚠️ |
| PATCH | /orders/:orderId/services/:serviceId/complete | owner, admin, manager, mechanic, lead_mechanic | ⚠️ |

### Orders: Parts (по заказу)

| Method | Path | Роли | Категория |
|---|---|---|---|
| POST | /orders/:orderId/parts | owner, admin, manager | ✅ |
| GET | /orders/:orderId/parts | (Auth+OrderResource) | ✅ |
| PATCH | /orders/:orderId/parts/:partId | owner, admin, manager | ⚠️ |
| DELETE | /orders/:orderId/parts/:partId | owner, admin, manager | ⚠️ |
| PATCH | /orders/:orderId/parts/:partId/customer-provided | owner, admin, manager | ⚠️ |
| GET | /orders/:orderId/parts/:partId/availability | (Auth+OrderResource) | ✅ |

---

## Customers

| Method | Path | Категория |
|---|---|---|
| POST | /customers | ✅ |
| GET | /customers | ✅ |
| GET | /customers/:id | ✅ |
| PATCH | /customers/:id | ⚠️ |
| DELETE | /customers/:id | ⚠️ |
| DELETE | /customers/:id/hard | 🧰 |
| PATCH | /customers/:id/status | ⚠️ |
| GET | /customers/stats/dashboard | ⚠️ |
| GET | /customers/:id/export | ✅ |
| POST | /customers/:id/consent/revoke | ✅ |
| DELETE | /customers/:id/anonymize | ⚠️ |

---

## Vehicles

| Method | Path | Категория |
|---|---|---|
| POST | /vehicles | ✅ |
| GET | /vehicles | ✅ |
| GET | /vehicles/customer/:customerId | ✅ |
| GET | /vehicles/stats/dashboard | ⚠️ |
| GET | /vehicles/:id | ✅ |
| PATCH | /vehicles/:id | ⚠️ |
| PATCH | /vehicles/:id/mileage | ⚠️ |
| PATCH | /vehicles/:id/status | ⚠️ |
| DELETE | /vehicles/:id | ⚠️ |
| DELETE | /vehicles/:id/hard | 🧰 |

---

## Vehicles-Catalogue (глобальный словарь)

Brands:
| Method | Path | Категория |
|---|---|---|
| GET | /vehicles-catalogue/brands | ✅ |
| GET | /vehicles-catalogue/brands/:id | ✅ |
| POST | /vehicles-catalogue/brands | ⚠️ |
| PATCH | /vehicles-catalogue/brands/:id | 🧰 |
| DELETE | /vehicles-catalogue/brands/:id | 🧰 |

Models:
| Method | Path | Категория |
|---|---|---|
| GET | /vehicles-catalogue/models | ✅ |
| GET | /vehicles-catalogue/models/:id | ✅ |
| POST | /vehicles-catalogue/models | ⚠️ |
| PATCH | /vehicles-catalogue/models/:id | 🧰 |
| DELETE | /vehicles-catalogue/models/:id | 🧰 |

Types:
| Method | Path | Категория |
|---|---|---|
| GET | /vehicles-catalogue/types | ✅ |
| GET | /vehicles-catalogue/types/:id | ✅ |
| POST | /vehicles-catalogue/types | ⚠️ |
| PATCH | /vehicles-catalogue/types/:id | 🧰 |
| DELETE | /vehicles-catalogue/types/:id | 🧰 |

---

## Services (услуги)

| Method | Path | Роли | Категория | Примечание |
|---|---|---|---|---|
| GET | /services | (Auth) | ✅ | С фильтрами |
| GET | /services/stats | (Auth) | ✅ | |
| GET | /services/search?q= | (Auth) | ✅ | |
| GET | /services/quick | (Auth) | ✅ | Быстрые услуги |
| GET | /services/for-select | (Auth) | ✅ | Для селектов |
| GET | /services/category/:categoryId | (Auth) | ✅ | По категории |
| GET | /services/price-range | (Auth) | ✅ | minPrice/maxPrice |
| GET | /services/quick-services?maxDuration= | (Auth) | ✅ | |
| GET | /services/:id | (Auth+ServiceResource) | ✅ | |
| GET | /services/:id/availability | (Auth+ServiceResource) | ✅ | |
| POST | /services | owner, admin, manager | ⚠️ | |
| POST | /services/bulk-update | owner, admin | ⚠️ | Массовое обновление |
| PATCH | /services/:id | owner, admin, manager | ⚠️ | |
| POST | /services/:id/toggle-status | owner, admin, manager | ⚠️ | |
| DELETE | /services/:id | owner, admin | ⚠️ | |

---

## Service Categories

| Method | Path | Роли | Категория |
|---|---|---|---|
| GET | /services/categories | (Auth) | ✅ |
| GET | /services/categories/stats | (Auth) | ✅ |
| GET | /services/categories/search?q= | (Auth) | ✅ |
| GET | /services/categories/for-select | (Auth) | ✅ |
| GET | /services/categories/with-services-count | (Auth) | ✅ |
| GET | /services/categories/grouped | (Auth) | ✅ |
| GET | /services/categories/:id | (Auth+ServiceCategoryResource) | ✅ |
| POST | /services/categories | owner, admin, manager | ⚠️ |
| POST | /services/categories/initialize-global | superadmin | 🧰 |
| PATCH | /services/categories/:id | owner, admin, manager | ⚠️ |
| DELETE | /services/categories/:id | owner, admin | ⚠️ |

---

## Service History

| Method | Path | Роли | Категория | Примечание |
|---|---|---|---|---|
| POST | /service-history | owner, admin, manager, mechanic | ✅ | |
| GET | /service-history | (Auth) | ✅ | Фильтры; superadmin обязан указать ?companyId |
| GET | /service-history/vehicle/:vehicleId | (Auth) | ✅ | История по авто |
| GET | /service-history/stats/dashboard | owner, admin, manager | ⚠️ | |
| GET | /service-history/:id | (Auth+ServiceHistoryResource) | ✅ | |
| PATCH | /service-history/:id | owner, admin, manager, mechanic | ⚠️ | |
| DELETE | /service-history/:id | owner, admin | ⚠️ | Soft delete |
| DELETE | /service-history/:id/hard | superadmin | 🧰 | Полное удаление (Backoffice) |

---

## Appointments (записи)

| Method | Path | Категория |
|---|---|---|
| POST | /appointments | ✅ |
| GET | /appointments | ✅ |
| GET | /appointments/:id | ✅ |
| PATCH | /appointments/:id | ⚠️ |
| DELETE | /appointments/:id | ⚠️ |
| DELETE | /appointments/:id/hard | 🧰 |
| POST | /appointments/smart-schedule | ✅ |
| POST | /appointments/check-availability | ✅ |
| POST | /appointments/:id/confirm | ⚠️ |
| POST | /appointments/:id/complete | ⚠️ |
| POST | /appointments/:id/cancel | ⚠️ |
| POST | /appointments/:id/reschedule | ⚠️ |
| GET | /appointments/:id/tracking | ✅ |
| GET | /appointments/customer/:customerId | ✅ |
| GET | /appointments/mechanic/:mechanicId | ✅ |
| GET | /appointments/stats/dashboard | ⚠️ |
| POST | /appointments/:id/rating | ✅ |

---

## Inventory (сводка/резервы)

| Method | Path | Категория | Примечание |
|---|---|---|---|
| GET | /inventory | ✅ | |
| GET | /inventory/summary/overview | ✅ | |
| GET | /inventory/alerts/low-stock | ✅ | |
| GET | /inventory/availability/:partId | ✅ | |
| GET | /inventory/reports/turnover | ⚠️ | |
| POST | /inventory/reserve | ✅ | X-Idempotency-Key |
| DELETE | /inventory/reserve/:reservationId | ✅ | |
| GET | /inventory/:id | ✅ | |
| PATCH | /inventory/:id | ⚠️ | |

---

## Inventory/Parts

| Method | Path | Категория |
|---|---|---|
| GET | /parts | ✅ |
| GET | /parts/:id | ✅ |
| POST | /parts | ⚠️ |
| PATCH | /parts/:id | ⚠️ |
| DELETE | /parts/:id | ⚠️ |
| PATCH | /parts/:id/status | ⚠️ |
| PATCH | /parts/bulk/update | ⚠️ |
| GET | /parts/search/:query | ✅ |
| GET | /parts/category/:categoryId | ✅ |
| GET | /parts/popular/list | ✅ |
| GET | /parts/stats/dashboard | ⚠️ |
| GET | /parts/analytics/profitability | ⚠️ |

---

## Inventory/Stock-Movements

| Method | Path | Категория | Примечание |
|---|---|---|---|
| GET | /stock-movements | ✅ | |
| GET | /stock-movements/:id | ✅ | |
| POST | /stock-movements | ⚠️ | X-Idempotency-Key |
| PATCH | /stock-movements/:id | ⚠️ | |
| POST | /stock-movements/bulk | ⚠️ | X-Idempotency-Key |
| POST | /stock-movements/scan | ⚠️ | X-Idempotency-Key |
| POST | /stock-movements/:id/reverse | ⚠️ | X-Idempotency-Key |
| GET | /stock-movements/analytics/summary | ⚠️ | |
| GET | /stock-movements/part/:partId/history | ✅ | |
| GET | /stock-movements/analytics/data | ⚠️ | |
| POST | /stock-movements/integrations/from-order | ⛔ | Server-to-server |
| POST | /stock-movements/integrations/from-delivery | ⛔ | Server-to-server |

---

## Inventory/Suppliers

| Method | Path | Категория |
|---|---|---|
| GET | /suppliers | ✅ |
| GET | /suppliers/:id | ✅ |
| POST | /suppliers | ⚠️ |
| PATCH | /suppliers/:id | ⚠️ |
| PATCH | /suppliers/:id/deactivate | ⚠️ |
| POST | /suppliers/bulk | ⚠️ |
| POST | /suppliers/:id/rate | ✅ |
| GET | /suppliers/:id/price-comparison/:partId | ✅ |
| GET | /suppliers/best-for-part/:partId | ✅ |
| GET | /suppliers/top/performers | ✅ |
| GET | /suppliers/:id/analytics | ⚠️ |

---

## Inventory/Alerts (уведомления)

| Method | Path | Роли | Категория | Примечание |
|---|---|---|---|---|
| GET | /inventory/alerts/analytics/stats | superadmin, company_owner, company_admin, inventory_manager | ⚠️ | |
| GET | /inventory/alerts/critical/list | superadmin, company_owner, company_admin, inventory_manager | ✅ | |
| GET | /inventory/alerts/settings/current | superadmin, company_owner, company_admin, inventory_manager | ⚠️ | |
| PATCH | /inventory/alerts/settings/update | company_owner, company_admin | ⚠️ | |
| POST | /inventory/alerts/test/notification | company_owner, company_admin | ⚠️ | X-Idempotency-Key |
| DELETE | /inventory/alerts/cleanup/expired | company_owner, company_admin | ⚠️ | Housekeeping (tenant-admin) |
| POST | /inventory/alerts/batch/dismiss | company_owner, company_admin, inventory_manager | ⚠️ | X-Idempotency-Key |
| GET | /inventory/alerts | superadmin, company_owner, company_admin, inventory_manager | ✅ | |
| GET | /inventory/alerts/:id | superadmin, company_owner, company_admin, inventory_manager | ✅ | |
| DELETE | /inventory/alerts/:id/dismiss | company_owner, company_admin, inventory_manager | ✅ | |

---

# Стоп-лист (НЕ вызывать из фронта)
- ⛔ /subscription-billing/webhooks/*
- ⛔ /payments/webhooks/*
- ⛔ /payments/system/*
- ⛔ /stock-movements/integrations/*
- ⛔ “hard”-удаления PII/первички из клиентского UI (используются только в бэкофисе платформы): например, /service-history/:id/hard, /customers/:id/hard, /vehicles/:id/hard
- ⛔ Любые специфичные CRON/внутренние ручки (если не требуется защищённый админ-UI). Пример: /subscriptions/check-expired

# Рекомендации по UI
- Идемпотентность: добавляйте X-Idempotency-Key (UUID) для subscription-billing (create/payment), inventory reserve, parts bulk, stock-movements create/bulk/scan/reverse, inventory-alerts test/notification и batch/dismiss.
- Payments: не трогать /payments/webhooks/* и /payments/system/*.
- Tariffs: только read-only страницы (каталог/сравнение); CRUD — отдельный бэкофис.
- Vehicles-Catalogue: GET безопасны для селектов; POST create — можно в админ-UI арендатора; PATCH/DELETE — только бэкофис.

мне сейчас тяжело точно сказать, какая документация по фронтенду отражает реальное состояние из-за миграций, поэтому жду от тебя вопросов и уточнений!
























































































сейчас только Юкасса!

mac@MacBook-2018-Pro frontend % npm run lint

> web@0.1.0 lint
> next lint --max-warnings 0


./app/dashboard/parts/page.tsx
34:9  Warning: 'query' is assigned a value but never used.  @typescript-eslint/no-unused-vars

info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules
npm error Lifecycle script `lint` failed with error:
npm error code 1
npm error path /Users/mac/Desktop/GitHubProj/DriveCareV2/apps/frontend
npm error workspace web@0.1.0
npm error location /Users/mac/Desktop/GitHubProj/DriveCareV2/apps/frontend
npm error command failed
npm error command sh -c next lint --max-warnings 0
mac@MacBook-2018-Pro frontend % npm run build

> web@0.1.0 build
> next build

   ▲ Next.js 15.4.2
   - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully in 7.0s

./app/dashboard/parts/page.tsx
34:9  Warning: 'query' is assigned a value but never used.  @typescript-eslint/no-unused-vars

info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules
 ✓ Linting and checking validity of types 
 ✓ Collecting page data    
[useAuth:mfmcz4oet] Рендер: {
  isLoading: false,
  isAuthenticated: false,
  hasUser: false,
  userEmail: undefined,
  isFirstMount: true,
  isInitialTokenCheckComplete: false
}
[useAuth:sqocean98] Рендер: {
  isLoading: false,
  isAuthenticated: false,
  hasUser: false,
  userEmail: undefined,
  isFirstMount: true,
  isInitialTokenCheckComplete: false
}
[useAuth:0ypwf0g15] Рендер: {
  isLoading: false,
  isAuthenticated: false,
  hasUser: false,
  userEmail: undefined,
  isFirstMount: true,
  isInitialTokenCheckComplete: false
}
[useAuth:m625exd85] Рендер: {
  isLoading: false,
  isAuthenticated: false,
  hasUser: false,
  userEmail: undefined,
  isFirstMount: true,
  isInitialTokenCheckComplete: false
}
[useAuth:uy3drb3pq] Рендер: {
  isLoading: false,
  isAuthenticated: false,
  hasUser: false,
  userEmail: undefined,
  isFirstMount: true,
  isInitialTokenCheckComplete: false
}
[useAuth:1bq7tm64w] Рендер: {
  isLoading: false,
  isAuthenticated: false,
  hasUser: false,
  userEmail: undefined,
  isFirstMount: true,
  isInitialTokenCheckComplete: false
}
[useAuth:0p2k7ld6v] Рендер: {
  isLoading: false,
  isAuthenticated: false,
  hasUser: false,
  userEmail: undefined,
  isFirstMount: true,
  isInitialTokenCheckComplete: false
}
[useAuth:fxt28x9jl] Рендер: {
  isLoading: false,
  isAuthenticated: false,
  hasUser: false,
  userEmail: undefined,
  isFirstMount: true,
  isInitialTokenCheckComplete: false
}
[useAuth:ghi7qtiqm] Рендер: {
  isLoading: false,
  isAuthenticated: false,
  hasUser: false,
  userEmail: undefined,
  isFirstMount: true,
  isInitialTokenCheckComplete: false
}
[useAuth:hyjbcve1y] Рендер: {
  isLoading: false,
  isAuthenticated: false,
  hasUser: false,
  userEmail: undefined,
  isFirstMount: true,
  isInitialTokenCheckComplete: false
}
[useAuth:cyhhxyypj] Рендер: {
  isLoading: false,
  isAuthenticated: false,
  hasUser: false,
  userEmail: undefined,
  isFirstMount: true,
  isInitialTokenCheckComplete: false
}
[useAuth:a8o3dm2ii] Рендер: {
  isLoading: false,
  isAuthenticated: false,
  hasUser: false,
  userEmail: undefined,
  isFirstMount: true,
  isInitialTokenCheckComplete: false
}
[useAuth:86rpicoex] Рендер: {
  isLoading: false,
  isAuthenticated: false,
  hasUser: false,
  userEmail: undefined,
  isFirstMount: true,
  isInitialTokenCheckComplete: false
}
 ✓ Generating static pages (21/21)
 ✓ Collecting build traces    
 ✓ Finalizing page optimization    

Route (app)                                 Size  First Load JS    
┌ ○ /                                     5.8 kB         150 kB
├ ○ /_not-found                            126 B         100 kB
├ ○ /dashboard                           6.67 kB         123 kB
├ ○ /dashboard/customers                 2.53 kB         135 kB
├ ƒ /dashboard/customers/[id]            3.98 kB         146 kB
├ ○ /dashboard/invoices                  4.67 kB         121 kB
├ ƒ /dashboard/invoices/[id]             3.68 kB         120 kB
├ ○ /dashboard/invoices/new              1.85 kB         113 kB
├ ○ /dashboard/orders                    6.58 kB         148 kB
├ ƒ /dashboard/orders/[id]               12.1 kB         142 kB
├ ○ /dashboard/orders/new                3.41 kB         141 kB
├ ○ /dashboard/parts                     7.41 kB         134 kB
├ ○ /dashboard/payment-methods           8.74 kB         134 kB
├ ƒ /dashboard/payment-methods/[id]      8.85 kB         134 kB
├ ○ /dashboard/payment-methods/new       4.48 kB         121 kB
├ ○ /dashboard/security                  8.35 kB         129 kB
├ ○ /dashboard/services                  7.42 kB         134 kB
├ ○ /dashboard/vehicles                  2.86 kB         141 kB
├ ƒ /dashboard/vehicles/[id]             3.72 kB         145 kB
├ ○ /login                               5.13 kB         143 kB
├ ○ /register                             8.3 kB         141 kB
├ ○ /register/invite                     8.58 kB         142 kB
└ ○ /register/success                    4.53 kB         116 kB
+ First Load JS shared by all             100 kB
  ├ chunks/1902-f713d09f03a61199.js      43.9 kB
  ├ chunks/87c73c54-1f4741035a95c140.js  54.1 kB
  └ other shared chunks (total)          2.02 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

mac@MacBook-2018-Pro frontend %

Давай пока допустим только полную оплату!

и сейчас буду скидывать бэкенд файлы для начала, а ты просто фиксируй информацию для будущих правок.

// apps/backend/src/modules/payments/payments.controller.ts (✅ SECURITY GUARDS ADDED)

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
  Request,
  Logger,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  DefaultValuePipe,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiSecurity,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiTooManyRequestsResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyOwnershipGuard } from '../../common/guards/company-ownership.guard';
// ✅ ДОБАВЛЕНЫ SECURITY INTERCEPTORS И PIPES
import { AuditLoggingInterceptor } from '../../common/interceptors/audit-logging.interceptor';
import { EnhancedValidationPipe } from '../../common/pipes/enhanced-validation.pipe';
import { PaymentsService } from './payments.service';
import { RecordPaymentDto } from './dto/request/record-payment.dto';
import { RefundPaymentDto } from './dto/request/refund-payment.dto';
import { UpdatePaymentDto } from './dto/request/update-payment.dto';
import { PaymentResponseDto } from './dto/response/payment-response.dto';
import { PaginatedPaymentsResponseDto } from './dto/response/paginated-payments-response.dto';
import { PaymentStatisticsDto } from './dto/response/payment-statistics.dto';
import { CompanyBalanceDto } from './dto/response/company-balance.dto';
import { PaymentFilter, PaymentStatus } from './types/payments.types';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { PAYMENTS_CONSTANTS } from './constants/payments.constants';

@ApiTags('💳 Управление платежами')
@ApiBearerAuth()
@ApiSecurity('JWT')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyOwnershipGuard)
// ✅ ДОБАВЛЕНЫ ГЛОБАЛЬНЫЕ SECURITY INTERCEPTORS И PIPES
@UseInterceptors(AuditLoggingInterceptor)
@UsePipes(EnhancedValidationPipe)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * 💰 Запись платежа
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_RECORD_PAYMENT)
  @ApiOperation({ 
    summary: 'Записать новый платеж',
    description: `
    🎯 **ОСНОВНАЯ ОПЕРАЦИЯ** - Создание нового платежа в системе с полной валидацией и аудитом.
    
    **Возможности:**
    • 💰 Запись платежей по счетам (инвойсам)
    • 💱 Поддержка мультивалютности с курсами обмена
    • 🔒 Автоматическая валидация лимитов и принадлежности
    • 📊 Интеграция с платежными системами
    • 🎭 Различные способы оплаты (наличные, карты, переводы)
    • 📋 Автоматическое обновление статуса счета
    
    **Роли:** company_admin, manager, company_owner, superadmin
    **Лимиты:** 50 платежей в час на компанию
    `
  })
  @ApiBody({
    type: RecordPaymentDto,
    description: 'Данные для записи платежа',
    examples: {
      cashPayment: {
        summary: '💵 Наличная оплата',
        description: 'Простая оплата наличными деньгами',
        value: {
          invoiceId: '123e4567-e89b-12d3-a456-426614174000',
          paymentMethodId: '789e4567-e89b-12d3-a456-426614174000',
          amount: 15000.00,
          currency: 'RUB',
          transactionId: 'CASH-2024-001',
          notes: 'Оплата за ремонт двигателя наличными'
        }
      },
      cardPayment: {
        summary: '💳 Оплата картой',
        description: 'Оплата банковской картой через эквайринг',
        value: {
          invoiceId: '123e4567-e89b-12d3-a456-426614174000',
          paymentMethodId: '789e4567-e89b-12d3-a456-426614174000',
          amount: 25000.00,
          currency: 'RUB',
          transactionId: 'CARD-2024-00123',
          gatewayTransactionId: 'sberbank_acq_tr_456789',
          gatewayFee: 375.00,
          gatewayResponse: {
            status: 'approved',
            authCode: 'ABC123',
            rrn: '123456789012'
          },
          notes: 'Оплата картой Visa **** 1234'
        }
      },
      currencyExchange: {
        summary: '💱 Валютная оплата',
        description: 'Оплата в иностранной валюте с конвертацией',
        value: {
          invoiceId: '123e4567-e89b-12d3-a456-426614174000',
          paymentMethodId: '789e4567-e89b-12d3-a456-426614174000',
          amount: 25000.00,
          currency: 'RUB',
          originalAmount: 250.00,
          originalCurrency: 'USD',
          exchangeRate: 100.00,
          transactionId: 'USD-CONV-2024-001',
          notes: 'Оплата $250 по курсу 100₽/$'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '✅ Платеж успешно записан и обработан',
    type: PaymentResponseDto,
  })
  @ApiBadRequestResponse({
    description: '❌ Некорректные данные платежа',
    example: {
      statusCode: 400,
      message: [
        'Сумма платежа должна быть больше 0.01',
        'ID счета обязателен',
        'Способ оплаты не найден'
      ],
      error: 'Bad Request'
    }
  })
  @ApiConflictResponse({
    description: '❌ Конфликт данных',
    example: {
      statusCode: 409,
      message: 'ID транзакции CASH-2024-001 уже существует',
      error: 'Conflict'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ 
    description: '❌ Недостаточно прав или превышены лимиты подписки',
    example: {
      statusCode: 403,
      message: 'Превышен лимит платежей: 1500/1500',
      error: 'Forbidden'
    }
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 50 в час)' })
  @Throttle({ default: { limit: 50, ttl: 3600000 } })
  async recordPayment(
    @Body() recordPaymentDto: RecordPaymentDto,
    @Request() req: RequestWithUser,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Recording payment for company ${req.user.companyId}`);
    
    return this.paymentsService.recordPayment(recordPaymentDto, req.user);
  }

  /**
   * 📋 Получение всех платежей компании
   */
  @Get()
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_VIEW_PAYMENT_HISTORY)
  @ApiOperation({ 
    summary: 'Получить список платежей',
    description: `
    📊 **АНАЛИЗ ПЛАТЕЖЕЙ** - Получение списка платежей компании с мощными возможностями фильтрации.
    
    **Возможности фильтрации:**
    • 🔍 Поиск по ID транзакции, примечаниям
    • 📅 Фильтрация по датам (период)
    • 💰 Фильтрация по сумме (диапазон)
    • 📊 Фильтрация по статусу платежа
    • 💳 Фильтрация по способу оплаты
    • 📋 Фильтрация по счету (invoice)
    
    **Сортировка:** по дате, сумме, статусу, создания
    **Пагинация:** до 100 элементов на страницу
    **Роли:** company_admin, manager, company_owner, superadmin
    `
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Номер страницы',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Количество элементов на странице (максимум 100)',
    example: 20
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PaymentStatus,
    description: 'Фильтр по статусу платежа',
    example: PaymentStatus.PROCESSED
  })
  @ApiQuery({
    name: 'invoiceId',
    required: false,
    type: String,
    description: 'Фильтр по ID счета',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiQuery({
    name: 'paymentMethodId',
    required: false,
    type: String,
    description: 'Фильтр по способу оплаты',
    example: '789e4567-e89b-12d3-a456-426614174000'
  })
  @ApiQuery({
    name: 'amountFrom',
    required: false,
    type: Number,
    description: 'Минимальная сумма платежа',
    example: 1000
  })
  @ApiQuery({
    name: 'amountTo',
    required: false,
    type: Number,
    description: 'Максимальная сумма платежа',
    example: 50000
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Дата начала периода (ISO 8601)',
    example: '2024-01-01'
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Дата окончания периода (ISO 8601)',
    example: '2024-12-31'
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Поиск по ID транзакции, примечаниям или gateway ID',
    example: 'CASH-2024'
  })
  @ApiQuery({
    name: 'sortField',
    required: false,
    enum: ['paymentDate', 'amount', 'status', 'createdAt'],
    description: 'Поле для сортировки',
    example: 'paymentDate'
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Порядок сортировки',
    example: 'desc'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Список платежей успешно получен',
    type: PaginatedPaymentsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 100 в минуту)' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getPayments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Request() req: RequestWithUser,
    @Query('status') status?: PaymentStatus,
    @Query('invoiceId') invoiceId?: string,
    @Query('paymentMethodId') paymentMethodId?: string,
    @Query('amountFrom') amountFrom?: number,
    @Query('amountTo') amountTo?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('sortField', new DefaultValuePipe('paymentDate')) sortField: string = 'paymentDate',
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<PaginatedPaymentsResponseDto> {
    this.logger.log(`Getting payments for company ${req.user.companyId}`);
    
    const filter: PaymentFilter = {
      page,
      limit: Math.min(limit, PAYMENTS_CONSTANTS.DEFAULTS.MAX_ITEMS),
      status,
      invoiceId,
      paymentMethodId,
      amountFrom,
      amountTo,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search,
      sortField,
      sortOrder,
      companyId: req.user.companyId,
    };

    return this.paymentsService.getPayments(filter);
  }

  /**
   * 🔍 Получение платежа по ID
   */
  @Get(':id')
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_VIEW_PAYMENT_HISTORY)
  @ApiOperation({ 
    summary: 'Получить детали платежа',
    description: `
    🔍 **ДЕТАЛЬНАЯ ИНФОРМАЦИЯ** - Получение полной информации о конкретном платеже.
    
    **Включает:**
    • 💰 Основные данные платежа (сумма, валюта, статус)
    • 📋 Связанный счет (invoice) и заказ
    • 💳 Информация о способе оплаты
    • 🌐 Данные платежного шлюза (безопасные)
    • 📊 История изменений статуса
    • 💱 Данные валютного обмена (если применимо)
    
    **Безопасность:** Автоматическая проверка принадлежности к компании
    `
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Уникальный идентификатор платежа',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Платеж найден и возвращен',
    type: PaymentResponseDto,
  })
  @ApiNotFoundResponse({
    description: '❌ Платеж не найден',
    example: {
      statusCode: 404,
      message: 'Payment with ID 123e4567-e89b-12d3-a456-426614174000 not found',
      error: 'Not Found'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Платеж не принадлежит вашей компании' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 200 в минуту)' })
  @Throttle({ default: { limit: 200, ttl: 60000 } })
  async getPaymentById(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Getting payment ${id} for company ${req.user.companyId}`);
    
    return this.paymentsService.getPaymentById(id, req.user);
  }

  /**
   * ✏️ Обновление платежа
   */
  @Put(':id')
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_PROCESS_PAYMENT)
  @ApiOperation({ 
    summary: 'Обновить платеж',
    description: `
    ✏️ **УПРАВЛЕНИЕ ПЛАТЕЖАМИ** - Обновление информации о платеже с бизнес-логикой.
    
    **Возможности обновления:**
    • 📊 Изменение статуса (с валидацией переходов)
    • 🔍 Обновление ID транзакции
    • 📝 Редактирование примечаний
    • 🌐 Обновление данных платежного шлюза
    • 📋 Изменение безопасных метаданных
    
    **Ограничения:**
    • Финальные статусы (processed, refunded) имеют ограниченные возможности изменения
    • Автоматическая валидация переходов между статусами
    • Аудит всех изменений
    
    **Роли:** company_admin, manager, company_owner, superadmin
    `
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Уникальный идентификатор платежа',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    type: UpdatePaymentDto,
    description: 'Данные для обновления платежа',
    examples: {
      statusUpdate: {
        summary: '📊 Изменение статуса',
        description: 'Обновление статуса платежа',
        value: {
          status: 'processed',
          notes: 'Платеж подтвержден банком'
        }
      },
      gatewayUpdate: {
        summary: '🌐 Обновление данных шлюза',
        description: 'Добавление информации от платежного шлюза',
        value: {
          gatewayTransactionId: 'sberbank_12345',
          gatewayFee: 150.00
        }
      },
      notesUpdate: {
        summary: '📝 Обновление примечаний',
        description: 'Добавление дополнительной информации',
        value: {
          notes: 'Платеж обработан вручную после технических проблем'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Платеж успешно обновлен',
    type: PaymentResponseDto,
  })
  @ApiNotFoundResponse({ description: '❌ Платеж не найден' })
  @ApiBadRequestResponse({
    description: '❌ Некорректные данные или невозможный переход статуса',
    example: {
      statusCode: 400,
      message: 'Cannot change payment status from processed to pending',
      error: 'Bad Request'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 30 в минуту)' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async updatePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Request() req: RequestWithUser,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Updating payment ${id} for company ${req.user.companyId}`);
    
    return this.paymentsService.updatePayment(id, updatePaymentDto, req.user);
  }

  /**
   * 🔄 Возврат платежа
   */
  @Post(':id/refund')
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_REFUND_PAYMENT)
  @ApiOperation({ 
    summary: 'Оформить возврат платежа',
    description: `
    🔄 **ВОЗВРАТ СРЕДСТВ** - Полный или частичный возврат платежа с соблюдением бизнес-правил.
    
    **Типы возвратов:**
    • 💯 Полный возврат (100% суммы)
    • ⚡ Частичный возврат (часть суммы)
    • 🔄 Возврат на другой платежный метод
    
    **Ограничения:**
    • Возврат только обработанных платежей (status: processed)
    • Максимальный срок возврата: ${PAYMENTS_CONSTANTS.DEFAULTS.MAX_REFUND_DAYS} дней
    • Крупные возвраты требуют подтверждения владельца
    
    **Роли:** company_admin, company_owner, superadmin (НЕ manager/mechanic)
    `
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Уникальный идентификатор платежа для возврата',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    type: RefundPaymentDto,
    description: 'Данные для оформления возврата',
    examples: {
      fullRefund: {
        summary: '💯 Полный возврат',
        description: 'Возврат полной суммы платежа',
        value: {
          amount: 15000.00,
          reason: 'Отказ от услуги по инициативе клиента',
          notes: 'Клиент передумал делать ремонт'
        }
      },
      partialRefund: {
        summary: '⚡ Частичный возврат',
        description: 'Возврат части суммы',
        value: {
          amount: 5000.00,
          reason: 'Некачественное выполнение работ',
          notes: 'Возврат за невыполненную покраску',
          refundMethodId: '789e4567-e89b-12d3-a456-426614174001'
        }
      },
      disputeRefund: {
        summary: '⚖️ Возврат по спору',
        description: 'Возврат в результате разрешения спора',
        value: {
          amount: 12000.00,
          reason: 'Решение по спору с клиентом',
          notes: 'Возврат согласно решению арбитража'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Возврат успешно обработан',
    type: PaymentResponseDto,
  })
  @ApiNotFoundResponse({ description: '❌ Платеж не найден' })
  @ApiBadRequestResponse({
    description: '❌ Невозможно выполнить возврат',
    example: {
      statusCode: 400,
      message: 'Cannot refund payment older than 365 days. Payment is 400 days old.',
      error: 'Bad Request'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ 
    description: '❌ Недостаточно прав или требуется подтверждение владельца',
    example: {
      statusCode: 403,
      message: 'Large refunds require owner or admin approval',
      error: 'Forbidden'
    }
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 10 в час)' })
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  async refundPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() refundPaymentDto: RefundPaymentDto,
    @Request() req: RequestWithUser,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Processing refund for payment ${id}, company ${req.user.companyId}`);
    
    return this.paymentsService.refundPayment(id, refundPaymentDto, req.user);
  }

  /**
   * 📊 Статистика платежей компании
   */
  @Get('analytics/statistics')
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_VIEW_FINANCIAL_REPORTS)
  @ApiOperation({ 
    summary: 'Аналитика платежей',
    description: `
    📊 **ФИНАНСОВАЯ АНАЛИТИКА** - Подробная статистика платежей компании для принятия решений.
    
    **Метрики включают:**
    • 💰 Общая сумма и количество платежей
    • 📊 Разбивка по статусам (успешные, неудачные, возвраты)
    • 💱 Статистика по валютам
    • 💳 Популярность способов оплаты
    • 📈 Тренды и динамика (месяц, год)
    • ⚡ Скорость обработки платежей
    • 🎯 Показатели успешности и возвратов
    
    **Роли:** company_admin, company_owner, superadmin (финансовые отчеты)
    **Кэширование:** 15 минут
    `
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Статистика успешно получена',
    type: PaymentStatisticsDto,
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав для просмотра финансовых отчетов' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 20 в час)' })
  @Throttle({ default: { limit: 20, ttl: 3600000 } })
  async getPaymentStatistics(
    @Request() req: RequestWithUser,
  ): Promise<PaymentStatisticsDto> {
    this.logger.log(`Getting payment statistics for company ${req.user.companyId}`);
    
    return this.paymentsService.getPaymentStatistics(req.user);
  }

  /**
   * 💰 Баланс компании
   */
  @Get('analytics/balance')
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_VIEW_COMPANY_BALANCE)
  @ApiOperation({ 
    summary: 'Финансовый баланс компании',
    description: `
    💰 **ФИНАНСОВЫЙ БАЛАНС** - Текущее финансовое состояние компании по платежам.
    
    **Показатели баланса:**
    • 💰 Общая сумма полученных платежей
    • 🔄 Сумма возвратов и частичных возвратов
    • 📊 Чистый баланс (получено - возвращено)
    • ⏳ Средства в обработке (pending)
    • ⚖️ Спорные платежи (disputed)
    • 💱 Разбивка по валютам
    
    **Обновление:** в реальном времени
    **Роли:** company_admin, manager, company_owner, superadmin
    `
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Баланс компании получен',
    type: CompanyBalanceDto,
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 30 в час)' })
  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  async getCompanyBalance(
    @Request() req: RequestWithUser,
  ): Promise<CompanyBalanceDto> {
    this.logger.log(`Getting company balance for ${req.user.companyId}`);
    
    return this.paymentsService.getCompanyBalance(req.user);
  }

  /**
   * 🗑️ Удаление платежа (только для админов/владельцев)
   */
  @Delete(':id')
  // ✅ ИСПРАВЛЕНО: Новые роли вместо старых
  @Roles('superadmin', 'company_owner', 'company_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: '🚨 Удалить платеж (ОПАСНО)',
    description: `
    🚨 **ОПАСНАЯ ОПЕРАЦИЯ** - Полное удаление платежа из системы.
    
    ⚠️ **ВНИМАНИЕ:**
    • Операция необратима
    • Нарушает финансовую отчетность
    • Рекомендуется использовать отмену вместо удаления
    • Доступно только администраторам
    
    **Ограничения:**
    • Нельзя удалить обработанные платежи (используйте возврат)
    • Сохраняется запись в аудит-логе
    • Требует подтверждения высокого уровня
    
    **Роли:** company_admin, company_owner, superadmin
    `
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Уникальный идентификатор платежа для удаления',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '✅ Платеж успешно удален',
  })
  @ApiNotFoundResponse({ description: '❌ Платеж не найден' })
  @ApiBadRequestResponse({
    description: '❌ Невозможно удалить платеж',
    example: {
      statusCode: 400,
      message: 'Cannot delete processed payment. Use refund instead.',
      error: 'Bad Request'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Доступно только администраторам' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 5 в час)' })
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  async deletePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    this.logger.log(`Deleting payment ${id} for company ${req.user.companyId}`);
    
    return this.paymentsService.deletePayment(id, req.user);
  }

  /**
   * 🚨 Обработка просроченных платежей (только для системных задач)
   */
  @Post('system/process-overdue')
  // ✅ ИСПРАВЛЕНО: Новые роли вместо старых
  @Roles('superadmin', 'company_owner', 'company_admin')
  @ApiOperation({ 
    summary: '🤖 Обработать просроченные платежи',
    description: `
    🤖 **СИСТЕМНАЯ ОПЕРАЦИЯ** - Автоматическая обработка просроченных платежей.
    
    **Что происходит:**
    • ⏰ Поиск платежей, просроченных более ${PAYMENTS_CONSTANTS.DEFAULTS.PAYMENT_TIMEOUT_MINUTES} минут
    • 📊 Автоматическое изменение статуса pending → expired
    • 🗑️ Отмена критично просроченных платежей
    • 📋 Обновление связанных счетов
    • 📊 Генерация отчета по обработке
    
    **Периодичность:** рекомендуется запускать каждый час
    **Роли:** company_admin, company_owner, superadmin
    `
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Просроченные платежи обработаны',
    schema: {
      type: 'object',
      properties: {
        processed: { 
          type: 'number', 
          example: 15,
          description: 'Общее количество обработанных платежей'
        },
        expired: { 
          type: 'number', 
          example: 12,
          description: 'Количество платежей, помеченных как просроченные'
        },
        cancelled: { 
          type: 'number', 
          example: 3,
          description: 'Количество отмененных платежей'
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Доступно только администраторам' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 3 в час)' })
  @ApiInternalServerErrorResponse({ description: '❌ Ошибка при обработке просроченных платежей' })
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  async processOverduePayments(
    @Request() req: RequestWithUser,
  ): Promise<{ processed: number; expired: number; cancelled: number }> {
    this.logger.log(`Processing overdue payments for company ${req.user.companyId}`);
    
    return this.paymentsService.processOverduePayments(req.user);
  }
}

// path: apps/backend/src/modules/payments/payments.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment, Invoice, PaymentMethod } from '../../database/entities';

import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AuthModule } from '../auth/auth.module'; // ✅ нужен для JwtAuthGuard/SessionService/SecurityService
import { RedisModule } from '../../common/redis/redis.module';

import { PaymentsController } from './payments.controller';
import { PaymentsWebhooksController } from './webhooks/payments-webhooks.controller';

import { PaymentsService } from './payments.service';
import { PaymentsBusinessService } from './services/payments-business.service';
import { PaymentsDataService } from './services/payments-data.service';
import { PaymentsValidationService } from './services/payments-validation.service';
import { PaymentsMapperService } from './services/payments-mapper.service';

import { WebhookIpAclGuard } from './guards/webhook-ip-acl.guard';
import { WebhookIdempotencyService } from './services/webhook-idempotency.service';
import { YooKassaPaymentsClient } from './services/yookassa-payments.client';

import { AuditService } from '../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Invoice, PaymentMethod]),
    forwardRef(() => InvoicesModule),
    forwardRef(() => PaymentMethodsModule),
    SubscriptionsModule,
    forwardRef(() => AuthModule),
    RedisModule,
  ],
  controllers: [PaymentsController, PaymentsWebhooksController],
  providers: [
    PaymentsService,
    PaymentsBusinessService,
    PaymentsDataService,
    PaymentsValidationService,
    PaymentsMapperService,
    AuditService,
    // Webhooks
    WebhookIpAclGuard,
    WebhookIdempotencyService,
    YooKassaPaymentsClient,
  ],
  exports: [
    PaymentsService,
    PaymentsDataService,
    PaymentsValidationService,
  ],
})
export class PaymentsModule {}

// path: apps/backend/src/modules/payments/payments.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PaymentsDataService } from './services/payments-data.service';
import { PaymentsBusinessService } from './services/payments-business.service';
import { PaymentsValidationService } from './services/payments-validation.service';
import { PaymentsMapperService } from './services/payments-mapper.service';
import { RecordPaymentDto } from './dto/request/record-payment.dto';
import { RefundPaymentDto } from './dto/request/refund-payment.dto';
import { UpdatePaymentDto } from './dto/request/update-payment.dto';
import { PaymentResponseDto } from './dto/response/payment-response.dto';
import { PaginatedPaymentsResponseDto } from './dto/response/paginated-payments-response.dto';
import { PaymentStatisticsDto } from './dto/response/payment-statistics.dto';
import { CompanyBalanceDto } from './dto/response/company-balance.dto';
import { PaymentFilter, CreatePaymentData, UserWithCompany, PaymentStatus } from './types/payments.types';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { PAYMENTS_CONSTANTS } from './constants/payments.constants';
import { AuthRole } from '../auth/types/auth.types'
import { PaymentProcessingException } from '../../common/exceptions/domain.exceptions';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paymentsDataService: PaymentsDataService,
    private readonly paymentsBusinessService: PaymentsBusinessService,
    private readonly paymentsValidationService: PaymentsValidationService,
    private readonly paymentsMapperService: PaymentsMapperService,
  ) {}

  /**
   * 💰 Запись платежа с полной business логикой
   */
  async recordPayment(recordPaymentDto: RecordPaymentDto, user: RequestWithUser['user']): Promise<PaymentResponseDto> {
    this.logger.log(`Recording payment for user ${user.id} in company ${user.companyId}`);

    // 🔥 Преобразуем RequestWithUser['user'] в UserWithCompany
    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // 🔥 Преобразуем DTO в CreatePaymentData
    const createPaymentData: CreatePaymentData = {
      companyId: user.companyId!,
      invoiceId: recordPaymentDto.invoiceId,
      paymentMethodId: recordPaymentDto.paymentMethodId,
      amount: recordPaymentDto.amount,
      currency: recordPaymentDto.currency,
      paymentDate: recordPaymentDto.paymentDate ? new Date(recordPaymentDto.paymentDate) : new Date(),
      transactionId: recordPaymentDto.transactionId,
      notes: recordPaymentDto.notes,
      exchangeRate: recordPaymentDto.exchangeRate,
      originalAmount: recordPaymentDto.originalAmount,
      originalCurrency: recordPaymentDto.originalCurrency,
      gatewayTransactionId: recordPaymentDto.gatewayTransactionId,
      gatewayResponse: recordPaymentDto.gatewayResponse,
      gatewayFee: recordPaymentDto.gatewayFee,
      metadata: recordPaymentDto.metadata,
    };

    // Валидация данных с проверкой принадлежности
    await this.paymentsValidationService.validateRecordPaymentForUser(createPaymentData, userWithCompany);

    // Создание через бизнес-сервис
    const payment = await this.paymentsBusinessService.recordPaymentForCompany(createPaymentData, userWithCompany);

    this.logger.log(`Payment recorded: ${payment.id} for amount ${payment.amount} ${payment.currency || 'RUB'}`);

    return this.paymentsMapperService.mapToResponseDto(payment);
  }

  /**
   * 🔒 Получение всех платежей с фильтрацией по принадлежности
   */
  async findAll(filter: PaymentFilter = {}, user: RequestWithUser['user']): Promise<PaginatedPaymentsResponseDto> {
    this.logger.log(`Finding payments with filters: ${JSON.stringify(filter)} for user ${user.id}`);

    // 🔒 КРИТИЧНО: Фильтрация по принадлежности
    const secureFilter: PaymentFilter = {
      ...filter,
      companyId: user.role === 'superadmin' ? filter.companyId : user.companyId!,
    };

    const [payments, total] = await this.paymentsDataService.findWithFilters(secureFilter);

    const page = filter.page || 1;
    const limit = Math.min(filter.limit || PAYMENTS_CONSTANTS.DEFAULTS.PAGE_SIZE, PAYMENTS_CONSTANTS.DEFAULTS.MAX_ITEMS);
    const totalPages = Math.ceil(total / limit);

    // 📊 Получение дополнительной статистики для админки
    const statistics = user.role !== 'mechanic' 
      ? await this.paymentsDataService.getPaymentsStatistics(secureFilter.companyId!)
      : null;

    return {
      items: this.paymentsMapperService.mapArrayToResponseDto(payments),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      
      // 📊 Статистика (если доступна)
      totalAmount: statistics?.totalAmount || 0,
      successfulPayments: statistics?.byStatus?.processed || 0,
      failedPayments: statistics?.byStatus?.failed || 0,
      refundAmount: (statistics?.byStatus?.refunded || 0) + (statistics?.byStatus?.partially_refunded || 0),
    };
  }

  /**
   * 🔒 Получение платежа по ID (с проверкой в Guard)
   */
  async findOne(id: string): Promise<PaymentResponseDto> {
    this.logger.log(`Finding payment: ${id}`);

    const payment = await this.paymentsValidationService.validatePaymentExists(id);

    return this.paymentsMapperService.mapToResponseDto(payment);
  }

  /**
   * 🔒 Обновление платежа
   */
  async update(id: string, updatePaymentDto: UpdatePaymentDto, user: RequestWithUser['user']): Promise<PaymentResponseDto> {
    this.logger.log(`Updating payment: ${id}`);

    // Валидация обновления
    await this.paymentsValidationService.validateUpdateData(id, updatePaymentDto);

    // 🔥 Преобразуем тип пользователя
    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // Обновление через бизнес-сервис
    const updatedPayment = await this.paymentsBusinessService.updatePayment(id, updatePaymentDto, userWithCompany);

    this.logger.log(`Payment updated: ${id}`);

    return this.paymentsMapperService.mapToResponseDto(updatedPayment);
  }

  /**
   * 🔄 Возврат платежа
   */
  async refundPayment(paymentId: string, refundPaymentDto: RefundPaymentDto, user: RequestWithUser['user']): Promise<PaymentResponseDto> {
    this.logger.log(`Processing refund for payment: ${paymentId}`);

    // Валидация возврата
    await this.paymentsValidationService.validateRefundData(paymentId, refundPaymentDto);

    // 🔥 Преобразуем тип пользователя
    const userWithCompany: UserWithCompany = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId!,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // Обработка возврата через бизнес-сервис
    const refundedPayment = await this.paymentsBusinessService.processRefund(paymentId, refundPaymentDto, userWithCompany);

    this.logger.log(`Refund processed for payment: ${paymentId}, amount: ${refundPaymentDto.amount}`);

    return this.paymentsMapperService.mapToResponseDto(refundedPayment);
  }

  /**
   * 📊 Получение статистики платежей
   */
  async getStatistics(user: RequestWithUser['user']): Promise<PaymentStatisticsDto> {
    this.logger.log(`Getting payment statistics for user ${user.id}`);

    const companyId = user.role === 'superadmin' ? undefined : user.companyId;
    if (!companyId && user.role !== 'superadmin') {
      throw new Error('Company ID is required for non-superadmin users');
    }

    const statistics = await this.paymentsDataService.getPaymentsStatistics(companyId!);

    return this.paymentsMapperService.mapToStatisticsDto(statistics, companyId!);
  }

  /**
   * 💰 Получение баланса компании
   */
  async getCompanyBalance(user: RequestWithUser['user']): Promise<CompanyBalanceDto> {
    this.logger.log(`Getting company balance for user ${user.id}`);

    const companyId = user.role === 'superadmin' ? undefined : user.companyId;
    if (!companyId && user.role !== 'superadmin') {
      throw new Error('Company ID is required for non-superadmin users');
    }

    const balance = await this.paymentsBusinessService.calculateCompanyBalance(companyId!);

    return await this.paymentsMapperService.mapToBalanceDto(balance);
  }

  /**
   * 🚨 Обработка просроченных платежей
   */
  async processOverduePayments(user: RequestWithUser['user']): Promise<{
    processed: number;
    expired: number;
    cancelled: number;
  }> {
    this.logger.log(`Processing overdue payments for user ${user.id}`);

    const companyId = user.role === 'superadmin' ? undefined : user.companyId;
    if (!companyId && user.role !== 'superadmin') {
      throw new Error('Company ID is required for non-superadmin users');
    }

    return this.paymentsBusinessService.processOverduePayments(companyId!);
  }

  // ========== МЕТОДЫ ДЛЯ ДРУГИХ МОДУЛЕЙ ==========

  /**
   * 🔗 Проверка существования платежа (для других модулей)
   */
  async exists(id: string): Promise<boolean> {
    const payment = await this.paymentsDataService.findById(id);
    return !!payment;
  }

  /**
   * 🔗 Получение базовой информации о платеже (для других модулей)
   */
  async getPaymentInfo(id: string): Promise<{ 
    id: string; 
    invoiceId: string; 
    companyId: string; 
    status: string;
    amount: number;
    currency: string;
  } | null> {
    const payment = await this.paymentsDataService.findById(id);
    return payment ? this.paymentsMapperService.mapToBasicInfo(payment) : null;
  }

  /**
   * 🔗 Проверка принадлежности платежа компании (для других модулей)
   */
  async belongsToCompany(paymentId: string, companyId: string): Promise<boolean> {
    const payment = await this.paymentsDataService.findByIdForCompany(paymentId, companyId);
    return !!payment;
  }

  /**
   * 📊 Получение количества платежей компании (для проверки лимитов)
   */
  async getPaymentsCountForCompany(companyId: string): Promise<number> {
    return this.paymentsDataService.getPaymentsCountForCompany(companyId);
  }

  /**
   * 📋 Получение платежей (алиас для findAll с фильтрацией)
   */
  async getPayments(filter: PaymentFilter): Promise<PaginatedPaymentsResponseDto> {
    // Создаем пользователя из companyId для совместимости
    const mockUser = {
      id: 'system-payment-user',
      email: 'system@payment.local',
      companyId: filter.companyId,
      role: 'company_admin' as AuthRole,
    } as RequestWithUser['user'];
    
    return this.findAll(filter, mockUser);
  }

  /**
   * 🔍 Получение платежа по ID (алиас для findOne)
   */
  async getPaymentById(id: string, _user: RequestWithUser['user']): Promise<PaymentResponseDto> {
    return this.findOne(id);
  }

  /**
   * ✏️ Обновление платежа (алиас для update)
   */
  async updatePayment(id: string, updatePaymentDto: UpdatePaymentDto, user: RequestWithUser['user']): Promise<PaymentResponseDto> {
    return this.update(id, updatePaymentDto, user);
  }

  /**
   * 📊 Получение статистики (алиас для getStatistics)
   */
  async getPaymentStatistics(user: RequestWithUser['user']): Promise<PaymentStatisticsDto> {
    return this.getStatistics(user);
  }

  /**
   * 🗑️ Удаление платежа
   */
  async deletePayment(id: string, user: RequestWithUser['user']): Promise<void> {
    this.logger.log(`Deleting payment ${id} for user ${user.id}`);

    // Валидация существования и принадлежности
    const payment = await this.paymentsValidationService.validatePaymentOwnership(id, user.companyId!);

    // Запрещаем удаление финальных/критических статусов по 402‑ФЗ
    const forbiddenStatuses: PaymentStatus[] = [
      PaymentStatus.PROCESSED,
      PaymentStatus.REFUNDED,
      PaymentStatus.PARTIALLY_REFUNDED,
      PaymentStatus.DISPUTED,
      PaymentStatus.CHARGEBACK,
    ];
    if (forbiddenStatuses.includes(payment.status as PaymentStatus)) {
      throw new PaymentProcessingException(
        'Cannot delete processed/refunded/disputed payments. Use refund or corrective documents.',
      );
    }

    // Удаление
    await this.paymentsDataService.delete(id);

    this.logger.log(`Payment ${id} deleted`);
  }
}

// apps/backend/src/modules/payments/constants/payments.constants.ts
import { PaymentStatus, PaymentCurrency, PaymentMethodType } from '../types/payments.types';
import { AuditAction } from '../../../common/audit/audit.service';
import { AuthRole } from '../../auth/types/auth.types';

export const PAYMENTS_CONSTANTS = {
  DEFAULTS: {
    PAGE_SIZE: 20,
    MAX_ITEMS: 100,
    CURRENCY: PaymentCurrency.RUB,
    STATUS: PaymentStatus.PENDING,
    PAYMENT_TIMEOUT_MINUTES: 30,
    MAX_REFUND_DAYS: 365,
    MIN_PAYMENT_AMOUNT: 0.01,
  },

  VALIDATION: {
    AMOUNT: {
      MIN: 0.01,
      MAX: 10000000,
    },
    TRANSACTION_ID: {
      MIN_LENGTH: 3,
      MAX_LENGTH: 100,
      PATTERN: /^[a-zA-Z0-9\-_]{3,100}$/,
    },
    NOTES: {
      MAX_LENGTH: 1000,
    },
    REFUND: {
      MIN_AMOUNT: 0.01,
      MAX_PERCENTAGE: 100,
    },
  },

  STATUS_TRANSITIONS: {
    [PaymentStatus.PENDING]: [
      PaymentStatus.PROCESSING,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELED,
      PaymentStatus.EXPIRED,
    ],
    [PaymentStatus.PROCESSING]: [
      PaymentStatus.PROCESSED,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELED,
    ],
    [PaymentStatus.PROCESSED]: [
      PaymentStatus.REFUNDED,
      PaymentStatus.PARTIALLY_REFUNDED,
      PaymentStatus.DISPUTED,
      PaymentStatus.CHARGEBACK,
    ],
    [PaymentStatus.FAILED]: [PaymentStatus.PENDING, PaymentStatus.CANCELED],
    [PaymentStatus.CANCELED]: [],
    [PaymentStatus.REFUNDED]: [PaymentStatus.DISPUTED],
    [PaymentStatus.PARTIALLY_REFUNDED]: [PaymentStatus.REFUNDED, PaymentStatus.DISPUTED],
    [PaymentStatus.DISPUTED]: [
      PaymentStatus.PROCESSED,
      PaymentStatus.REFUNDED,
      PaymentStatus.CHARGEBACK,
    ],
    [PaymentStatus.CHARGEBACK]: [],
    [PaymentStatus.EXPIRED]: [PaymentStatus.PENDING],
  } as Record<PaymentStatus, PaymentStatus[]>,

  STATUS_COLORS: {
    [PaymentStatus.PENDING]: '#f59e0b',
    [PaymentStatus.PROCESSING]: '#3b82f6',
    [PaymentStatus.PROCESSED]: '#10b981',
    [PaymentStatus.FAILED]: '#ef4444',
    [PaymentStatus.CANCELED]: '#6b7280',
    [PaymentStatus.REFUNDED]: '#8b5cf6',
    [PaymentStatus.PARTIALLY_REFUNDED]: '#a855f7',
    [PaymentStatus.DISPUTED]: '#f97316',
    [PaymentStatus.CHARGEBACK]: '#dc2626',
    [PaymentStatus.EXPIRED]: '#9ca3af',
  },

  STATUS_DISPLAY: {
    [PaymentStatus.PENDING]: 'Ожидает обработки',
    [PaymentStatus.PROCESSING]: 'Обрабатывается',
    [PaymentStatus.PROCESSED]: 'Успешно обработан',
    [PaymentStatus.FAILED]: 'Ошибка обработки',
    [PaymentStatus.CANCELED]: 'Отменен',
    [PaymentStatus.REFUNDED]: 'Возврат средств',
    [PaymentStatus.PARTIALLY_REFUNDED]: 'Частичный возврат',
    [PaymentStatus.DISPUTED]: 'Спорная транзакция',
    [PaymentStatus.CHARGEBACK]: 'Chargeback',
    [PaymentStatus.EXPIRED]: 'Истек срок',
  },

  CURRENCY_INFO: {
    [PaymentCurrency.RUB]: { symbol: '₽', decimals: 2, name: 'Российский рубль' },
    [PaymentCurrency.USD]: { symbol: '$', decimals: 2, name: 'Доллар США' },
    [PaymentCurrency.EUR]: { symbol: '€', decimals: 2, name: 'Евро' },
    [PaymentCurrency.GBP]: { symbol: '£', decimals: 2, name: 'Британский фунт' },
    [PaymentCurrency.CNY]: { symbol: '¥', decimals: 2, name: 'Китайский юань' },
    [PaymentCurrency.JPY]: { symbol: '¥', decimals: 0, name: 'Японская йена' },
    [PaymentCurrency.KZT]: { symbol: '₸', decimals: 2, name: 'Казахстанский тенге' },
    [PaymentCurrency.BYN]: { symbol: 'Br', decimals: 2, name: 'Белорусский рубль' },
    [PaymentCurrency.UAH]: { symbol: '₴', decimals: 2, name: 'Украинская гривна' },
  },

  PAYMENT_METHOD_INFO: {
    [PaymentMethodType.CASH]: { icon: '💵', name: 'Наличные', processingTime: 0 },
    [PaymentMethodType.CARD]: { icon: '💳', name: 'Банковская карта', processingTime: 300 },
    [PaymentMethodType.BANK_TRANSFER]: { icon: '🏦', name: 'Банковский перевод', processingTime: 3600 },
    [PaymentMethodType.INSTALLMENTS]: { icon: '📅', name: 'Рассрочка', processingTime: 1800 },
    [PaymentMethodType.CORPORATE]: { icon: '🏢', name: 'Корпоративная карта', processingTime: 600 },
    [PaymentMethodType.DIGITAL_WALLET]: { icon: '📱', name: 'Цифровой кошелек', processingTime: 180 },
    [PaymentMethodType.CRYPTO]: { icon: '₿', name: 'Криптовалюта', processingTime: 900 },
    [PaymentMethodType.CHECK]: { icon: '📝', name: 'Чек', processingTime: 86400 },
    [PaymentMethodType.WIRE_TRANSFER]: { icon: '🌐', name: 'SWIFT перевод', processingTime: 172800 },
  },

  ROLES: {
    CAN_RECORD_PAYMENT: ['superadmin', 'company_owner', 'company_admin', 'manager'] as AuthRole[],
    CAN_PROCESS_PAYMENT: ['superadmin', 'company_owner', 'company_admin', 'manager'] as AuthRole[],
    CAN_REFUND_PAYMENT: ['superadmin', 'company_owner', 'company_admin'] as AuthRole[],
    CAN_VIEW_PAYMENT_HISTORY: ['superadmin', 'company_owner', 'company_admin', 'manager'] as AuthRole[],
    CAN_VIEW_FINANCIAL_REPORTS: ['superadmin', 'company_owner', 'company_admin'] as AuthRole[],
    CAN_MANAGE_PAYMENT_METHODS: ['superadmin', 'company_owner', 'company_admin'] as AuthRole[],
    CAN_DISPUTE_PAYMENT: ['superadmin', 'company_owner', 'company_admin'] as AuthRole[],
    CAN_VIEW_COMPANY_BALANCE: ['superadmin', 'company_owner', 'company_admin', 'manager'] as AuthRole[],
  },

  // Новые флаги
  BUSINESS_RULES: {
    ENABLE_FISCALIZATION: false, // Отключает фискализацию по всему модулю
    AUTO_PROCESS_CASH_PAYMENTS: true,
    AUTO_UPDATE_INVOICE_STATUS: true,
    REQUIRE_APPROVAL_FOR_LARGE_REFUNDS: true,
    LARGE_REFUND_THRESHOLD: 100000,
    SEND_NOTIFICATIONS_ON_STATUS_CHANGE: true,
    ENABLE_CURRENCY_CONVERSION: true,
    DEFAULT_EXCHANGE_RATE_SERVICE: 'cbr_ru',
    AUTO_EXPIRE_PENDING_PAYMENTS_HOURS: 24,
    ENABLE_FRAUD_DETECTION: true,
    MAX_DAILY_PAYMENT_AMOUNT: 1000000,
    ENABLE_INSTALLMENT_PLANS: true,
  },

  SECURITY: {
    ENCRYPT_TRANSACTION_IDS: true,
    LOG_ALL_PAYMENT_ACTIONS: true,
    REQUIRE_TWO_FACTOR_FOR_REFUNDS: false,
    MASK_SENSITIVE_DATA_IN_LOGS: true,
    PAYMENT_DATA_RETENTION_DAYS: 2555,
    ANONYMIZE_EXPIRED_PAYMENTS: true,
  },

  AUDIT_ACTIONS: {
    PAYMENT_RECORDED: AuditAction.PAYMENT_CREATED,
    PAYMENT_PROCESSED: AuditAction.PAYMENT_PROCESSED,
    PAYMENT_FAILED: AuditAction.PAYMENT_FAILED,
    PAYMENT_CANCELED: AuditAction.PAYMENT_CANCELED,
    PAYMENT_REFUNDED: AuditAction.PAYMENT_REFUNDED,
    PAYMENT_PARTIALLY_REFUNDED: AuditAction.PAYMENT_PARTIALLY_REFUNDED,
    PAYMENT_DISPUTED: AuditAction.PAYMENT_DISPUTED,
    PAYMENT_STATUS_CHANGED: AuditAction.PAYMENT_STATUS_CHANGED,
    PAYMENT_VIEWED: AuditAction.PAYMENT_VIEWED,
    PAYMENT_UPDATED: AuditAction.PAYMENT_UPDATED,
    PAYMENT_DELETED: AuditAction.PAYMENT_DELETED,
    PAYMENT_EXPIRED: AuditAction.PAYMENT_EXPIRED,
    BALANCE_CALCULATED: AuditAction.PAYMENT_BALANCE_CALCULATED,
    FINANCIAL_REPORT_GENERATED: AuditAction.PAYMENT_STATISTICS_GENERATED,
    OVERDUE_PAYMENTS_PROCESSED: AuditAction.PAYMENT_OVERDUE_PROCESSED,
  },
} as const;

export type PaymentStatusKeys = keyof typeof PAYMENTS_CONSTANTS.STATUS_DISPLAY;
export type PaymentCurrencyKeys = keyof typeof PAYMENTS_CONSTANTS.CURRENCY_INFO;
export type PaymentMethodTypeKeys = keyof typeof PAYMENTS_CONSTANTS.PAYMENT_METHOD_INFO;

// apps/backend/src/modules/payments/types/payments.types.ts
import { AuthRole } from '../../auth/types/auth.types';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  DISPUTED = 'disputed',
  CHARGEBACK = 'chargeback',
  EXPIRED = 'expired',
}

export enum PaymentCurrency {
  RUB = 'RUB',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  CNY = 'CNY',
  JPY = 'JPY',
  KZT = 'KZT',
  BYN = 'BYN',
  UAH = 'UAH',
}

export enum PaymentMethodType {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  INSTALLMENTS = 'installments',
  CORPORATE = 'corporate',
  DIGITAL_WALLET = 'digital_wallet',
  CRYPTO = 'crypto',
  CHECK = 'check',
  WIRE_TRANSFER = 'wire_transfer',
}

export type UserWithCompany = {
  id: string;
  companyId: string;
  role: AuthRole;
  email?: string;
  firstName?: string;   // ← добавлено
  lastName?: string;    // ← добавлено
};

export type CreatePaymentData = {
  companyId: string;
  invoiceId: string;
  paymentMethodId: string;

  amount: number;
  currency?: PaymentCurrency;
  paymentDate?: Date;

  transactionId?: string | null;
  status?: PaymentStatus;
  notes?: string | null;

  // FX
  exchangeRate?: number | null;
  originalAmount?: number | null;
  originalCurrency?: PaymentCurrency | null;

  // Gateway
  gatewayTransactionId?: string | null;
  gatewayFee?: number | null;
  gatewayResponse?: Record<string, any> | null;

  // клиентские метаданные (вход)
  metadata?: Record<string, any> | undefined;

  // безопасные метаданные (в БД)
  safeMetadata?: Record<string, any> | null;

  // 54-ФЗ (если включено)
  vatRate?: number | null;
  vatAmount?: number | null;

  // 152-ФЗ
  pdpConsentVersion?: string | null;
  pdpConsentDate?: Date | null;
  dataRetentionUntil?: Date | null;
};

export type UpdatePaymentData = {
  status?: PaymentStatus;
  transactionId?: string | null;
  notes?: string | null;

  gatewayTransactionId?: string | null;
  gatewayFee?: number | null;

  safeMetadata?: Record<string, any> | null;

  // Фискальные поля (после чека)
  fiscalReceiptNumber?: string | null;
  fiscalReceiptDate?: Date | null;
  kktSerialNumber?: string | null;
  fiscalDocumentNumber?: string | null;
  fiscalDocumentAttribute?: string | null;

  // НДС
  vatRate?: number | null;
  vatAmount?: number | null;

  // Данные фискального возврата
  fiscalRefundReceiptNumber?: string | null;
  fiscalRefundDate?: Date | null;
};

export type RefundData = {
  amount: number;
  reason: string;
  notes?: string;
  refundMethodId?: string;
};

export type PaymentFilter = {
  companyId?: string;
  invoiceId?: string;
  paymentMethodId?: string;
  status?: PaymentStatus;

  amountFrom?: number;
  amountTo?: number;

  dateFrom?: Date;
  dateTo?: Date;

  search?: string;

  page?: number;
  limit?: number;

  sortField?: string;
  sortOrder?: 'asc' | 'desc';
};

export type PaymentStatistics = {
  total: number;
  byStatus: Record<string, number>;
  byCurrency: Record<string, number>;
  byPaymentMethod: Record<string, number>;

  totalAmount: number;
  totalAmountByCurrency: Record<string, number>;

  thisMonth: number;
  thisMonthAmount: number;
  avgPaymentAmount: number;
  avgPaymentTime: number;

  successRate: number;
  refundRate: number;
};

export type CompanyBalance = {
  companyId: string;
  totalReceived: number;
  totalRefunded: number;
  netBalance: number;
  pendingAmount: number;
  disputedAmount: number;
  balanceByCurrency: Record<PaymentCurrency, { received: number; refunded: number; net: number; pending: number }>;
  lastUpdated: Date;
};




