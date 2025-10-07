Привет! Помоги пожалуйста с развитием проекта. Я бы хотел проверить логику модуля "Пользователи" и допилить этот модуль на фронтенде - ссылка создаётся, но при попытке присоединиться - некорректный код приглашения. На суперадминке нельзя приглашать админов/следящих и др. системные роли. Можешь пожалуйста перепроверить логику, сильно её усилить: чтобы нереально было подменить роль на какую-либо и др. А самое главное - разрешить суперадмину приглашения в системные роли, но под жесточайшим контролем! Только суперадмин может приглашать системные роли и тонну других проверок. Короче сделать всё так, чтобы был жесточайший контроль на системки и просто перепроверить логику (и может усилить её для обычных ролей) - просто сделать роли и любые их движения максимально защищёнными и корректными: никаких багов!

Я постараюсь дать тебе максимум инфы сейчас, чтобы ты просто понимал состояние и что делать далее. 

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
create-superadmin.ts    seed-roles.ts

./common:
audit                   decorators              filters                 index.ts                pipes                   utils
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

./common/utils:
sanitize.util.ts

./config:
config.module.ts        config.service.ts       configuration.ts        validation.schema.ts

./database:
data-source.ts          database.config.ts      entities                migrations              seeds

./database/entities:
appointment.entity.ts                   order-service.entity.ts                 service-category.entity.ts              user-consent.entity.ts
audit-log.entity.ts                     order.entity.ts                         service-history.entity.ts               user-invite.entity.ts
company.entity.ts                       part-category.entity.ts                 service.entity.ts                       user-session.entity.ts
customer.entity.ts                      part-reservation.entity.ts              stock-movement.entity.ts                user.entity.ts
index.ts                                part.entity.ts                          subscription-compliance-log.entity.ts   vehicle-brand.entity.ts
inventory-alert-settings.entity.ts      payment-method.entity.ts                subscription-consent.entity.ts          vehicle-model.entity.ts
inventory-alert.entity.ts               payment.entity.ts                       subscription-payment-log.entity.ts      vehicle-type.entity.ts
inventory.entity.ts                     permission.entity.ts                    subscription.entity.ts                  vehicle.entity.ts
invoice.entity.ts                       role.entity.ts                          supplier.entity.ts                      work-schedule.entity.ts
order-part.entity.ts                    schedule-exception.entity.ts            tariff.entity.ts

./database/migrations:
1759030200000-RolesDedupAndUnique.ts    1759195646132-InitSchema.ts

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
online-init.dto.ts      record-payment.dto.ts   refund-payment.dto.ts   update-payment.dto.ts

./modules/payments/dto/response:
company-balance.dto.ts                  paginated-payments-response.dto.ts      payment-statistics.dto.ts
online-init-response.dto.ts             payment-response.dto.ts

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
change-password.dto.ts          create-user.dto.ts              update-user-role.dto.ts
create-invite.dto.ts            update-user-profile.dto.ts      update-user-status.dto.ts

./modules/users/dto/response:
invite-response.dto.ts          paginated-users-response.dto.ts profile-response.dto.ts         role.dto.ts                     user-response.dto.ts

./modules/users/interfaces:
users.interface.ts

./modules/users/services:
users-business.service.ts       users-data.service.ts           users-mapper.service.ts
users-consents.service.ts       users-invitations.service.ts    users-validation.service.ts

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
paginated-vehicles-public-response.dto.ts       vehicle-public-response.dto.ts
paginated-vehicles-response.dto.ts              vehicle-response.dto.ts

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
brands          external        models          suggest         types

./modules/vehicles-catalogue/dto/brands:
brand-response.dto.ts   create-brand.dto.ts     merge-brand.dto.ts      update-brand.dto.ts

./modules/vehicles-catalogue/dto/external:
external-brand-response.dto.ts  external-model-response.dto.ts  import-external-response.dto.ts import-external.dto.ts

./modules/vehicles-catalogue/dto/models:
create-model.dto.ts     merge-model.dto.ts      model-response.dto.ts   update-model.dto.ts

./modules/vehicles-catalogue/dto/suggest:
suggest-response.dto.ts

./modules/vehicles-catalogue/dto/types:
create-type.dto.ts      type-response.dto.ts    update-type.dto.ts

./modules/vehicles-catalogue/interfaces:
catalogue.interface.ts

./modules/vehicles-catalogue/services:
brands-data.service.ts          catalogue-mapper.service.ts     external-catalogue.service.ts   types-data.service.ts
catalogue-business.service.ts   catalogue-validation.service.ts models-data.service.ts

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
mac@MacBook-2018-Pro frontend % ls -R app 
(auth)          favicon.ico     fonts.ts        layout.tsx      page.tsx        providers
dashboard       fonts           globals.css     not-found.tsx   platform        tariffs

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
appointments            dashboard.module.css    page.tsx                payments                users
billing                 invoices                parts                   security                vehicles
customers               orders                  payment-methods         services

app/dashboard/appointments:
[id]            page.tsx

app/dashboard/appointments/[id]:
page.tsx

app/dashboard/billing:
page.tsx

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

app/dashboard/payments:
[id]            page.tsx        result

app/dashboard/payments/[id]:
page.tsx

app/dashboard/payments/result:
page.tsx

app/dashboard/security:
page.tsx

app/dashboard/services:
page.tsx

app/dashboard/users:
[id]            page.tsx

app/dashboard/users/[id]:
page.tsx

app/dashboard/vehicles:
[id]            page.tsx

app/dashboard/vehicles/[id]:
page.tsx

app/fonts:
GeistMonoVF.woff        GeistVF.woff

app/platform:
catalogue       tariffs

app/platform/catalogue:
brands          import          models          page.tsx        types

app/platform/catalogue/brands:
page.tsx

app/platform/catalogue/import:
page.tsx

app/platform/catalogue/models:
page.tsx

app/platform/catalogue/types:
page.tsx

app/platform/tariffs:
[id]            new             page.tsx

app/platform/tariffs/[id]:
page.tsx

app/platform/tariffs/new:
page.tsx

app/providers:
AuthBootstrap.tsx       theme-provider.tsx

app/tariffs:
[id]                    compare                 page.tsx                tariffs.module.css

app/tariffs/[id]:
page.tsx

app/tariffs/compare:
page.tsx
mac@MacBook-2018-Pro frontend % ls -R components 
app             customers       parts           security        tariffs         users
appointments    orders          platform        services        ui              vehicles

components/app:
AppLayout.tsx   TariffBadge.tsx

components/appointments:
appointment-cancel-dialog.tsx           appointment-create-dialog.tsx           appointment-reschedule-dialog.tsx       selects
appointment-complete-dialog.tsx         appointment-rating-dialog.tsx           appointment-smart-schedule-dialog.tsx

components/appointments/selects:
CustomerSelect.tsx      MechanicSelect.tsx      ServicesMultiSelect.tsx VehicleSelect.tsx

components/customers:
CustomerTimeline.tsx            customer-create-dialog.tsx

components/orders:
order-create-dialog.tsx         order-kanban.tsx                order-part-add-dialog.tsx       order-service-add-dialog.tsx

components/parts:
part-edit-dialog.tsx

components/platform:
NavigationHeader.tsx    PlatformGuard.tsx       tariffs

components/platform/tariffs:
FeatureSelector.tsx     MarketingControls.tsx   TariffEdit.client.tsx   TariffForm.tsx          TariffList.client.tsx

components/security:
device-session-card.tsx         logout-confirm-dialog.tsx       qr-code-dialog.tsx              two-factor-auth-card.tsx

components/services:
service-edit-dialog.tsx

components/tariffs:
TariffCTA.tsx                   TariffCompareView.tsx           TariffFeatures.tsx              TariffShowcase.tsx
TariffCard.tsx                  TariffDetailView.tsx            TariffHero.tsx                  TariffsNav.tsx
TariffCompareTable.tsx          TariffFAQ.tsx                   TariffPurchaseDialog.tsx

components/ui:
async-combobox.tsx      button.tsx              dialog.tsx              kbd.tsx                 switch.tsx              theme-toggle.tsx
async-multiselect.tsx   card.tsx                dropdown-menu.tsx       skeleton.tsx            tag-input.tsx
badge.tsx               confirm-dialog.tsx      input.tsx               status-badge.tsx        tariff-preview.tsx

components/users:
InvitesList.client.tsx  UsersList.client.tsx    invite-user-dialog.tsx

components/vehicles:
vehicle-create-dialog.tsx
mac@MacBook-2018-Pro frontend % ls -R docs 
frontend

docs/frontend:
FSD_MIGRATION_TRACKER.md
mac@MacBook-2018-Pro frontend % ls -R features 
pay-invoice

features/pay-invoice:
PayInvoiceButton.tsx    index.ts
mac@MacBook-2018-Pro frontend % ls -R features 
pay-invoice

features/pay-invoice:
PayInvoiceButton.tsx    index.ts
mac@MacBook-2018-Pro frontend % ls -R lib 
api             api.ts          format.ts       hooks           site.ts         types           types.ts        utils.ts

lib/api:
appointments.ts         customers.ts            orders.ts               payments.ts             subscription-billing.ts vehicles-catalogue.ts
auth.ts                 dashboard.ts            parts.ts                security.ts             tariffs.ts              vehicles.ts
core.ts                 invoices.ts             payment-methods.ts      services.ts             users.ts                work-schedules.ts

lib/hooks:
use-auth.ts

lib/types:
appointments.ts         invoices.ts             payment-methods.ts      services.ts             user-invites.ts         vehicles.ts
auth.ts                 orders.ts               payments.ts             subscriptions.ts        users.ts                work-schedules.ts
customers.ts            parts.ts                security.ts             tariffs.ts              vehicles-catalogue.ts
mac@MacBook-2018-Pro frontend % ls -R public 
dc-logo.svg             file-text.svg           next.svg                turborepo-light.svg     window.svg
dc-wordmark.svg         globe.svg               turborepo-dark.svg      vercel.svg
mac@MacBook-2018-Pro frontend % 

<!-- path: docs/NEXT_SESSION_PLAN.md -->
# DriveCare — План следующей сессии (Тарифы/Подписка → Сотрудники)

Дата: 2025‑09‑25

Документ фиксирует актуальное состояние проекта и детальный план работ на следующую сессию, чтобы можно было стартовать “с нуля” без контекста текущего чата.

---

## 0) Итоги текущей сессии (сделано сегодня)

Backend
- Принят вариант B для подписок: поток через `/subscription-billing`.
- Добавлен период подписки: `billingPeriod: 'monthly' | 'yearly'` (DTO + сущность Subscription).
- Сумма платежа считается на сервере по тарифу/периоду (front не передает amount).
- YooKassa/Tinkoff gateways: return_url → `/dashboard/payments/result?context=subscription`, дедуп вебхуков в Redis.
- Подключен `SubscriptionBillingModule` в маршруты (исправлена 404).
- Документация по настройке биллинга: `docs/BILLING_SETUP.md`.
- .env.example надо дополнть ключами для YooKassa и ФЗ‑242.

Frontend
- Типы и клиент: `lib/types/subscriptions.ts`, `lib/api/subscription-billing.ts`.
- Страница результата оплаты адаптирована под подписки (`context=subscription`) — опрос `/subscription-billing/active`.
- Диалог покупки тарифа `TariffPurchaseDialog` (выбор периода/согласий/метода оплаты).
- Витрина/детальная тарифов: интеграция модалки покупки для авторизованных.
- Страница `/dashboard/billing`: текущая подписка, лимиты, отмена, CTA.
- Бейдж текущего плана в шапке (AppLayout → `TariffBadge`).
- Мелкие фиксы UX/a11y (DialogDescription), редирект незалогиненных на `/login`.

Технические замечания
- Dev‑БД: после добавления `billing_period` — либо пересоздать volume, либо выполнить SQL‑скрипт.
- Без ключей YooKassa (`YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`) оплата вернет 400 — это ожидаемо в dev до подключения провайдера.

---

## 1) Текущее состояние (по факту)

- Архитектура
  - Монорепо (Turborepo): apps/backend (NestJS + TypeORM + Redis + Scheduler), apps/frontend (Next.js App Router).
  - Бэкенд поднят, Swagger доступен (/docs). Модули: tariffs, subscriptions (+ subscription-billing), payments, invoices, orders, inventory и др.
  - В dev сидится супер‑админ. Redis активен. CRON работает (пример: Alerts scheduler “*/1 * * * *”).

- Тарифы (backend)
  - DTO подтверждены (TariffResponseDto, Create/Update).
  - Эндпоинты: GET /tariffs/active, /popular, /compare, /:id, админ‑листы /tariffs/admin.

- Подписка/биллинг (backend)
  - Модель: “разовая покупка” без автопродления. Активная подписка одна на компанию (уникальный индекс).
  - DTO/контракты актуальны:
    - CreateBillingSubscriptionDto: `tariffId`, `billingPeriod`, `pdnConsentGiven`, `consumerRightsAcknowledged`, `paymentMethod?`, `startDate?`.
    - ProcessPaymentDto: `subscriptionId`, `gatewayProvider?`, `paymentMethod?`, `metadata?` (amount считается на сервере).
    - BillingSubscriptionResponseDto: подписка + `daysUntilExpiration`.
    - PaymentStatusResponseDto: `status`, `paymentId`, `redirectUrl?`.
  - Эндпоинты:
    - POST /subscription-billing
    - POST /subscription-billing/payment
    - GET /subscription-billing/active
    - DELETE /subscription-billing/:id
    - POST /subscription-billing/webhooks/:provider
  - ФЗ РФ:
    - ФЗ‑242 (локализация): SERVER_REGION/LOCATION/DATA_PROCESSING_LOCATION должны быть RU/Russia/RU.
    - ФЗ‑152: требуются согласия.
    - ФЗ‑161: MIR — учитываем и логируем.

- Фронтенд (тарифы/подписка)
  - Публичные страницы: /tariffs, /tariffs/[id], /tariffs/compare.
  - Реализован UX‑поток покупки тарифа (модалка), `/dashboard/billing` и badge тарифа в шапке.
  - `/dashboard/payments/result` поддерживает `context=subscription`.

- Важное бизнес‑условие
  - На текущем этапе — только “разовая” покупка подписки (без автопродления) + уведомления перед окончанием срока (позже).

---

## 2) Цель следующей итерации

- Подготовить и развивать модуль “Сотрудники” (Users) на фронте (MVP).
- Завести ключи YooKassa и прогнать end‑to‑end оплату в dev/стенде.
- Мягкий гейтинг по лимитам тарифа (maxUsers — первостепенно).

---

## 3) Ключевые продуктовые флоу (MVP)

1) “Приобрести/Подключить тариф”
   - Авторизованный: выбор периода → согласия → метод оплаты → create → payment → редирект → возврат и активация.
   - Неавторизованный: “Приобрести” → /auth/register?tariffId=... → после регистрации — CTA завершить покупку.
2) Дашборд “Подписка и тариф” (/dashboard/billing)
   - Текущая подписка (тариф, период, статус, даты, метод оплаты), отмена, список тарифов для смены.
3) Мягкий UI‑гейтинг (лимиты)
   - Использование maxUsers/maxCustomers/maxVehicles/maxOrders для подсказок/дизейбла “создать”.

---

## 4) Контракты и соответствие DTO (актуальные)

- Создание подписки:
  - POST /subscription-billing
  - Body: { tariffId, billingPeriod, pdnConsentGiven, consumerRightsAcknowledged, paymentMethod?, startDate? }
- Инициация оплаты:
  - POST /subscription-billing/payment
  - Body: { subscriptionId, gatewayProvider?, paymentMethod?, metadata? } — amount рассчитывается на сервере.
- Активная подписка:
  - GET /subscription-billing/active → BillingSubscriptionResponseDto | null
- Отмена:
  - DELETE /subscription-billing/:id → { success: true }

---

## 5) Конкретный план работ (на следующую сессию)

A. Бэкенд
- Подключить ключи YooKassa (dev/стенд) и прогнать e2e оплату (при необходимости — тестовые ключи).
- (Опционально) Dev‑флаг для имитации успешного платежа в development.

B. Фронтенд — модуль “Сотрудники”
- Страницы:
  - /dashboard/users — список (пагинация, поиск, фильтры по роли/статусу).
  - /dashboard/users/[id] — карточка сотрудника.
- Диалоги:
  - Создание/редактирование сотрудника, смена роли/статуса, сброс пароля, деактивация.
- Лимиты:
  - Мягкий гейтинг “Добавить сотрудника” по maxUsers (через `/subscription-billing/active`).
- Роли:
  - Маппинг слагов на человекочитаемые: company_owner → Владелец, company_admin → Администратор и т.д.

---

## 6) Файлы/зоны, которые открыть в следующей сессии

- Backend (для e2e оплаты): .env, лог провайдера, вебхуки (при необходимости).
- Frontend (Users):
  - apps/frontend/app/dashboard/users/page.tsx, [id]/page.tsx (новые).
  - apps/frontend/components/users/* (новые диалоги).
  - apps/frontend/lib/api/users.ts (уже есть) — расширить методами, если нужно.
  - Маппинг ролей в UI (утилита/константа).

---

## 7) UX/тексты/правовые нюансы (MVP)

- Нет автопродления: явно указывать в UI (“Автопродление временно недоступно”).
- Согласия обязательны (ФЗ‑152 + права потребителя) — без них disabled “Оплатить”.
- Платёжные методы — только из белого списка и поддерживаемые провайдером.
- Возврат с провайдера — на `/dashboard/payments/result?context=subscription`.

---

## 8) Критерии готовности (acceptance)

- Публичные тарифы: кнопка “Подключить/Приобрести” работает (для гостей — редирект на регистрацию).
- /dashboard/billing: отображает текущую подписку/отсутствие, позволяет отменить и сменить.
- Бейдж текущего плана виден в шапке и ведёт в /dashboard/billing.
- Лимиты тарифа учитываются в UI (минимально — maxUsers в модуле “Сотрудники”).
- E2E оплата проходит на стенде с действующими ключами YooKassa.

---

## 9) Тест‑план (ручной)

1) Авторизованный:
   - Тариф → “Подключить” → период/метод/согласия → редирект → возврат → /dashboard/billing (ACTIVE).
2) Гость:
   - /tariffs → “Приобрести” → /auth/register?tariffId=… → завершение покупки.
3) Лимиты:
   - Достичь maxUsers → “Добавить” дизейбл + CTA обновить план.
4) Ошибки:
   - Без ключей YooKassa — 400 на payment (ожидаемо).
   - Неверный метод оплаты — 400.
   - Нет активной — /dashboard/billing предлагает подключить.

---

## 10) Риски и неизвестности

- Ключи YooKassa/настройки кабинета (return URL, вебхуки) — без них e2e не пройдет.
- 401 на /auth/me при протухших токенах — решается relogin/очисткой cookies.
- Схема БД (billing_period) — для dev уже есть SQL‑скрипт/пересоздание volume.
- Raw‑body для вебхуков за прокси — не модифицировать тело.

---

## 11) Что делаем после внедрения тарифов (следующий блок работ)

- Модуль “Сотрудники” на фронте:
  - /dashboard/users + /dashboard/users/[id].
  - Диалоги управления персоналом, роли/статусы, деактивация.
  - Связка механиков в заказах и расписаниях.
  - Учёт лимита maxUsers (UI + при желании back‑проверка).
- Дополнительно: бейджи ограничений плана в других секциях (клиенты/ТС/заказы).

---

## 12) Быстрый чек‑лист задач (старт следующей сессии)

- [ ] Backend: проставить YOOKASSA_SHOP_ID/YOOKASSA_SECRET_KEY, проверить FRONTEND_URL и ФЗ‑242 ENV.
- [ ] Backend: e2e‑проверка оплаты (тестовые ключи).
- [ ] Frontend: старт модуля “Сотрудники” — страницы список/карточка + диалоги.
- [ ] Frontend: маппинг ролей (слаги → человекочитаемые).
- [ ] Frontend: мягкий гейтинг maxUsers в UI.
- [ ] Docs: README/доку по запуску YooKassa обновить при появлении прод‑ключей.

---

mac@MacBook-2018-Pro DriveCareV2 % docker-compose down
[+] Running 3/3
 ✔ Container drivecarev2-postgres-1  Removed                                                                                                                  0.4s 
 ✔ Container drivecarev2-redis-1     Removed                                                                                                                  0.4s 
 ✔ Network drivecarev2_default       Removed                                                                                                                  0.3s 
mac@MacBook-2018-Pro DriveCareV2 % docker-compose up --build
[+] Running 3/3
 ✔ Network drivecarev2_default       Created                                                                                                                  0.1s 
 ✔ Container drivecarev2-redis-1     Created                                                                                                                  0.1s 
 ✔ Container drivecarev2-postgres-1  Created                                                                                                                  0.1s 
Attaching to postgres-1, redis-1
redis-1     | 1:C 06 Oct 2025 21:36:21.137 * oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo
redis-1     | 1:C 06 Oct 2025 21:36:21.138 * Redis version=7.4.5, bits=64, commit=00000000, modified=0, pid=1, just started
redis-1     | 1:C 06 Oct 2025 21:36:21.138 * Configuration loaded
redis-1     | 1:M 06 Oct 2025 21:36:21.138 * monotonic clock: POSIX clock_gettime
redis-1     | 1:M 06 Oct 2025 21:36:21.140 * Running mode=standalone, port=6379.
redis-1     | 1:M 06 Oct 2025 21:36:21.141 * Server initialized
redis-1     | 1:M 06 Oct 2025 21:36:21.141 * Loading RDB produced by version 7.4.5
postgres-1  | 
redis-1     | 1:M 06 Oct 2025 21:36:21.141 * RDB age 17 seconds
postgres-1  | PostgreSQL Database directory appears to contain a database; Skipping initialization
redis-1     | 1:M 06 Oct 2025 21:36:21.141 * RDB memory usage when created 0.90 Mb
postgres-1  | 
redis-1     | 1:M 06 Oct 2025 21:36:21.141 * Done loading RDB, keys loaded: 1, keys expired: 0.
redis-1     | 1:M 06 Oct 2025 21:36:21.142 * DB loaded from disk: 0.001 seconds
redis-1     | 1:M 06 Oct 2025 21:36:21.142 * Ready to accept connections tcp
postgres-1  | 2025-10-06 21:36:21.302 UTC [1] LOG:  starting PostgreSQL 16.10 on x86_64-pc-linux-musl, compiled by gcc (Alpine 14.2.0) 14.2.0, 64-bit
postgres-1  | 2025-10-06 21:36:21.302 UTC [1] LOG:  listening on IPv4 address "0.0.0.0", port 5432
postgres-1  | 2025-10-06 21:36:21.302 UTC [1] LOG:  listening on IPv6 address "::", port 5432
postgres-1  | 2025-10-06 21:36:21.308 UTC [1] LOG:  listening on Unix socket "/var/run/postgresql/.s.PGSQL.5432"
postgres-1  | 2025-10-06 21:36:21.320 UTC [29] LOG:  database system was shut down at 2025-10-06 21:36:04 UTC
postgres-1  | 2025-10-06 21:36:21.328 UTC [1] LOG:  database system is ready to accept connections


v View in Docker Desktop   o View Config   w Enable Watch

[12:37:10 AM] Starting compilation in watch mode...

[12:37:24 AM] Found 0 errors. Watching for file changes.

[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [NestFactory] Starting Nest application...
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +126ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] PassportModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] ThrottlerModule dependencies initialized +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] ConfigHostModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] DiscoveryModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] ConfigModule dependencies initialized +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RedisProvider] Connecting to Redis via URL (plain)
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] ScheduleModule dependencies initialized +2ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] AppConfigModule dependencies initialized +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] JwtModule dependencies initialized +4ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] ThrottlerModule dependencies initialized +55ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RedisProvider] Redis ready
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RedisProvider] Redis connected successfully
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] RedisModule dependencies initialized +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmCoreModule dependencies initialized +154ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] CommonModule dependencies initialized +2ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] SeedsModule dependencies initialized +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] WorkSchedulesModule dependencies initialized +21ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] AppointmentsModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] StockMovementsModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] SubscriptionBillingModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] UsersModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] TariffsModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] PaymentMethodsModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] CompaniesModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] InvoicesModule dependencies initialized +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] CustomersModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] VehiclesModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] VehiclesCatalogueModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] SuppliersModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] InventoryAlertsModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] PartsModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] SubscriptionsModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] OrdersModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] OrderServicesModule dependencies initialized +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] OrderPartsModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] AuthModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] InventoryModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] PaymentsModule dependencies initialized +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [InstanceLoader] AppModule dependencies initialized +0ms
🧱 trust proxy enabled with: "false"
🪝 Webhook raw-body enabled (limit=128kb):
   • /api/v1/subscription-billing/webhooks/yookassa
   • /api/v1/subscription-billing/webhooks/tinkoff
   • /api/v1/payments/webhooks/yookassa
   • /api/v1/payments/webhooks/tinkoff
🌐 CORS configured for origins: http://localhost:5173, http://localhost:3001, http://localhost:3000
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] AppController {/api/v1}: +153ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1, GET} route +3ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/health, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/superadmin-info, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] AuthController {/api/v1/auth}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/login, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/register-company, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/register-invite, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/refresh, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/logout, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/logout-device, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/logout-all-devices, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/sessions, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/me, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/2fa/setup, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/2fa/enable, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/2fa/disable, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/users, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] UsersController {/api/v1/users}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/users, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/users, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/users/roles, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/users/invitations, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/users/invitations, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/users/:id([0-9a-fA-F-]{36}), GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/users/invitations/:id/resend, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/users/invitations/:id, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/users/:id/profile, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/users/:id/role, PATCH} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/users/:id/status, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/users/:id/password, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/users/:id, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] CompaniesController {/api/v1/companies}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/companies, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/companies, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/companies/:id, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/companies/:id, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/companies/:id, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/companies/:id/status, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] TariffsController {/api/v1/tariffs}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/tariffs, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/tariffs, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/tariffs/admin, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/tariffs/active, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/tariffs/popular, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/tariffs/compare, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/tariffs/:id, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/tariffs/:id, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/tariffs/:id/status, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/tariffs/:id, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] SubscriptionsController {/api/v1/subscriptions}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/subscriptions, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/subscriptions/company/:companyId, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/subscriptions/company/:companyId/active, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/subscriptions/:id, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/subscriptions/:id, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/subscriptions/:id/cancel, PATCH} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/subscriptions/check-expired, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] SubscriptionBillingController {/api/v1/subscription-billing}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/subscription-billing, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/subscription-billing/payment, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/subscription-billing/:id, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/subscription-billing/active, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/subscription-billing/compliance/report, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/subscription-billing/webhooks/:provider, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] CustomersController {/api/v1/customers}: +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/customers, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/customers, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/customers/:id, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/customers/:id, PATCH} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/customers/:id, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/customers/:id/hard, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/customers/:id/status, PATCH} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/customers/stats/dashboard, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/customers/:id/export, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/customers/:id/consent/revoke, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/customers/:id/anonymize, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] VehiclesController {/api/v1/vehicles}: +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles/public, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles/customer/:customerId, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles/stats/dashboard, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles/public/:id, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles/:id, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles/:id, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles/:id/mileage, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles/:id/status, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles/:id, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles/:id/hard, DELETE} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] VehiclesCatalogueController {/api/v1/vehicles-catalogue}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/brands, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/brands, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/brands/:id, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/brands/:id/verify, PATCH} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/brands/:id, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/brands/:id/merge, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/models, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/models, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/models/:id, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/models/:id/verify, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/models/:id, DELETE} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/models/:id/merge, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/types, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/types, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/types/:id, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/types/:id/verify, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/types/:id, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/suggest, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/external/brands, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/external/models, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/vehicles-catalogue/import/external, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] WorkSchedulesController {/api/v1/work-schedules}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/work-schedules, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/work-schedules, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/work-schedules/:id, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/work-schedules/:id, PATCH} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/work-schedules/:id, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/work-schedules/exceptions, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/work-schedules/exceptions/:id/status, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/work-schedules/exceptions/:id, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] AppointmentsController {/api/v1/appointments}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/appointments, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/appointments, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/appointments/:id, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/appointments/:id, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/appointments/:id, DELETE} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/appointments/:id/hard, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/appointments/smart-schedule, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/appointments/check-availability, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/appointments/:id/confirm, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/appointments/:id/complete, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/appointments/:id/cancel, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/appointments/:id/reschedule, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/appointments/:id/tracking, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/appointments/customer/:customerId, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/appointments/mechanic/:mechanicId, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/appointments/stats/dashboard, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/appointments/:id/rating, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] InventoryController {/api/v1/inventory}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/summary/overview, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/alerts/low-stock, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/availability/:partId, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/reports/turnover, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/reserve, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/reserve/:reservationId, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/:id, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/:id, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] PartsController {/api/v1/parts}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/parts/search/:query, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/parts/category/:categoryId, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/parts/popular/list, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/parts/stats/dashboard, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/parts/analytics/profitability, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/parts, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/parts, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/parts/:id, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/parts/:id, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/parts/:id, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/parts/:id/status, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/parts/bulk/update, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] StockMovementsController {/api/v1/stock-movements}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/stock-movements/analytics/summary, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/stock-movements/part/:partId/history, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/stock-movements/analytics/data, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/stock-movements, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/stock-movements/:id, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/stock-movements, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/stock-movements/:id, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/stock-movements/bulk, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/stock-movements/scan, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/stock-movements/:id/reverse, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/stock-movements/integrations/from-order, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/stock-movements/integrations/from-delivery, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] SuppliersController {/api/v1/suppliers}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/suppliers/best-for-part/:partId, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/suppliers/top/performers, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/suppliers/bulk, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/suppliers, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/suppliers/:id, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/suppliers, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/suppliers/:id, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/suppliers/:id/deactivate, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/suppliers/:id/rate, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/suppliers/:id/price-comparison/:partId, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/suppliers/:id/analytics, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] InventoryAlertsController {/api/v1/inventory/alerts}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/alerts/analytics/stats, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/alerts/critical/list, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/alerts/settings/current, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/alerts/settings/update, PATCH} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/alerts/test/notification, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/alerts/cleanup/expired, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/alerts/batch/dismiss, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/alerts, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/alerts/:id, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/inventory/alerts/:id/dismiss, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] OrdersController {/api/v1/orders}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:id, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:id, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:id/status, PATCH} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:id/assign, PATCH} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:id, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:id/recalculate, PATCH} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] OrderServicesController {/api/v1/orders/:orderId/services}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:orderId/services, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:orderId/services, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:orderId/services/:serviceId, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:orderId/services/:serviceId, DELETE} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:orderId/services/:serviceId/status, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:orderId/services/:serviceId/mechanic, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:orderId/services/:serviceId/start, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:orderId/services/:serviceId/complete, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] OrderPartsController {/api/v1/orders/:orderId/parts}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:orderId/parts, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:orderId/parts, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:orderId/parts/:partId, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:orderId/parts/:partId, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:orderId/parts/:partId/customer-provided, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/orders/:orderId/parts/:partId/availability, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] InvoicesController {/api/v1/invoices}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/invoices, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/invoices/from-order, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/invoices, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/invoices/:id, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/invoices/:id, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/invoices/:id/status, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/invoices/:id, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/invoices/stats/dashboard, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/invoices/overdue/report, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/invoices/search/:query, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/invoices/select/options, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] PaymentsController {/api/v1/payments}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payments/online/init, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payments, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payments, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payments/:id, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payments/:id, PUT} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payments/:id/refund, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payments/analytics/statistics, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payments/analytics/balance, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payments/:id, DELETE} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payments/system/process-overdue, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] PaymentsWebhooksController {/api/v1/payments/webhooks}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payments/webhooks/yookassa, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payments/webhooks/tinkoff, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RoutesResolver] PaymentMethodsController {/api/v1/payment-methods}: +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payment-methods, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payment-methods/stats, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payment-methods/search, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payment-methods/quick, GET} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payment-methods/for-select, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payment-methods/type/:type, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payment-methods/:id, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payment-methods/:id/availability, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payment-methods/:id/limits, GET} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payment-methods, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payment-methods/bulk-update, POST} route +1ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payment-methods/:id/test-integration, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payment-methods/:id/calculate-fee, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payment-methods/:id, PATCH} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payment-methods/:id/toggle-status, POST} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [RouterExplorer] Mapped {/api/v1/payment-methods/:id, DELETE} route +0ms
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [AlertsScheduler] Alerts scheduler started with CRON "*/1 * * * *"
🌱 Running database seeds in development environment...
[Nest] 8186  - 10/07/2025, 12:37:28 AM     LOG [SeedsService] 🌱 Starting database seeding in development environment...
[Nest] 8186  - 10/07/2025, 12:37:29 AM     LOG [SeedsService] ✅ System roles ensured
[Nest] 8186  - 10/07/2025, 12:37:29 AM     LOG [SeedsService] 👑 Superadmin user already exists, skipping creation...
[Nest] 8186  - 10/07/2025, 12:37:29 AM     LOG [SeedsService] ℹ No companies found. Company-level roles will be created on-demand per company.
[Nest] 8186  - 10/07/2025, 12:37:29 AM     LOG [SeedsService] ✅ Database seeding completed successfully in 62ms
[Nest] 8186  - 10/07/2025, 12:37:29 AM     LOG [NestApplication] Nest application successfully started +10ms
🚀 DriveCare API started successfully!
🌍 Environment: development
🔗 Server: http://localhost:3001
🔍 Health: http://localhost:3001/api/v1/health
📚 API Docs: http://localhost:3001/docs
🛡️ Security: Enhanced middleware active
⚡ Performance: Compression enabled
🔄 Graceful shutdown handlers registered
