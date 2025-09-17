Привет! Помоги пожалуйста разобраться с бэйджами на карточках тарифов. Сейчас всё запутано и непонятно. При каких обстоятельствах карточка попадает на витрину топ 3, при каких обстоятельствах включается кнопка Выбрать ТОП, хотя я включил витринную подсветку. А почему витринная подсветка вообще перемещает в топ 3? Ну короче, я думаю, что ты разберёшься. Единственное что попрошу - не трогать дизайн. Только с логикой разобраться. Вот тебе маленькое введение по формату ответа и сами файлы (обязвательно запроси ещё если остались вопросы)

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
.                       .gitignore              app                     features                package.json            tsconfig.json
..                      .next                   components              lib                     postcss.config.mjs
.env.local              .turbo                  docs                    next-env.d.ts           public
.env.local.example      README.md               eslint.config.js        node_modules            tailwind.config.ts
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
appointments            dashboard.module.css    orders                  parts                   payments                services
customers               invoices                page.tsx                payment-methods         security                vehicles

app/dashboard/appointments:
[id]            page.tsx

app/dashboard/appointments/[id]:
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

app/dashboard/vehicles:
[id]            page.tsx

app/dashboard/vehicles/[id]:
page.tsx

app/fonts:
GeistMonoVF.woff        GeistVF.woff

app/platform:
tariffs

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
app             customers       parts           security        tariffs         vehicles
appointments    orders          platform        services        ui

components/app:

components/appointments:
appointment-cancel-dialog.tsx           appointment-create-dialog.tsx           appointment-reschedule-dialog.tsx       selects
appointment-complete-dialog.tsx         appointment-rating-dialog.tsx           appointment-smart-schedule-dialog.tsx

components/appointments/selects:
CustomerSelect.tsx      MechanicSelect.tsx      ServicesMultiSelect.tsx VehicleSelect.tsx

components/customers:
customer-create-dialog.tsx

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
TariffCTA.tsx           TariffCompareTable.tsx  TariffDetailView.tsx    TariffFeatures.tsx      TariffShowcase.tsx
TariffCard.tsx          TariffCompareView.tsx   TariffFAQ.tsx           TariffHero.tsx          TariffsNav.tsx

components/ui:
async-combobox.tsx      button.tsx              dialog.tsx              kbd.tsx                 switch.tsx
async-multiselect.tsx   card.tsx                dropdown-menu.tsx       skeleton.tsx            tag-input.tsx
badge.tsx               confirm-dialog.tsx      input.tsx               status-badge.tsx        theme-toggle.tsx

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
mac@MacBook-2018-Pro frontend % ls -R lib 
api             api.ts          format.ts       hooks           site.ts         types           types.ts        utils.ts

lib/api:
appointments.ts         customers.ts            orders.ts               payments.ts             tariffs.ts              vehicles.ts
auth.ts                 dashboard.ts            parts.ts                security.ts             users.ts
core.ts                 invoices.ts             payment-methods.ts      services.ts             vehicles-catalogue.ts

lib/hooks:
use-auth.ts

lib/types:
appointments.ts         invoices.ts             payment-methods.ts      services.ts             vehicles-catalogue.ts
auth.ts                 orders.ts               payments.ts             tariffs.ts              vehicles.ts
customers.ts            parts.ts                security.ts             users.ts
mac@MacBook-2018-Pro frontend % ls -R public 
dc-logo.svg             file-text.svg           next.svg                turborepo-light.svg     window.svg
dc-wordmark.svg         globe.svg               turborepo-dark.svg      vercel.svg
mac@MacBook-2018-Pro frontend %  

mac@MacBook-2018-Pro DriveCareV2 % ls -a
.                       .env.production         .npmrc                  ai.rewritten.patch      node_modules            turbo.json
..                      .env.staging            .turbo                  ai.sanitized.patch      package-lock.json
.DS_Store               .git                    .vscode                 apps                    package.json
.env                    .gitignore              README.md               docker-compose.yml      packages
.env.example            .husky                  ai.patch                docs                    scripts
mac@MacBook-2018-Pro DriveCareV2 % cd apps 
mac@MacBook-2018-Pro apps % ls
backend         frontend
                                                                                                                                                                  
mac@MacBook-2018-Pro apps % 
mac@MacBook-2018-Pro apps % cd backend 
mac@MacBook-2018-Pro backend % ls -a
.                       .DS_Store               dist                    node_modules            src                     tsconfig.build.json
..                      .turbo                  nest-cli.json           package.json            test                    tsconfig.json
mac@MacBook-2018-Pro backend % 
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
1757463485909-InitSchema.ts

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
auth.controller.ts      constants               dto                     redis.provider.ts       types
auth.module.ts          constants.ts            guards                  services
auth.service.ts         decorators              interfaces              strategies

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
constants               parts.controller.ts     parts.service.ts        types
dto                     parts.module.ts         services

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
constants               invoices.controller.ts  invoices.service.ts     types
dto                     invoices.module.ts      services

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
P.S. писать любые сообщения и комменатрии между блоками, а может и вопросы задавать после блоков кода - можно и даже нужно! Скрипт сам выберет код из сообщения

как ясна задача? Сейчас я тебе скину конкретные файлы с фронтенда

[
  {
    "id": "f30c0aaf-abe9-4642-9e73-417728b9a557",
    "name": "Старт",
    "description": "Для небольших автосервисов, чтобы быстро начать",
    "priceMonthly": 990,
    "priceYearly": 9990,
    "yearlyDiscount": 15.91,
    "maxUsers": 3,
    "maxCustomers": 200,
    "maxVehicles": 400,
    "maxOrders": 1000,
    "features": {
      "badge": "new",
      "reports": true,
      "analytics": false,
      "highlight": true,
      "api_access": false,
      "recommended": false,
      "white_label": false,
      "integrations": false,
      "custom_fields": true,
      "shelf_position": 10,
      "advanced_reports": false,
      "priority_support": false
    },
    "isActive": true,
    "createdAt": "2025-09-15T20:04:41.209Z",
    "updatedAt": "2025-09-16T18:57:58.984Z",
    "isRecommended": false
  },
  {
    "id": "99df0889-20a7-49e8-af12-d05de48f651e",
    "name": "Стандарт",
    "description": "Оптимальный план",
    "priceMonthly": 1990,
    "priceYearly": 19990,
    "yearlyDiscount": 16.29,
    "maxUsers": 10,
    "maxCustomers": 1000,
    "maxVehicles": 2000,
    "maxOrders": 5000,
    "features": {
      "tags": [
        "дешёвый",
        "быстрый старт"
      ],
      "badge": "best_value",
      "reports": true,
      "analytics": true,
      "highlight": true,
      "api_access": false,
      "recommended": false,
      "white_label": false,
      "integrations": true,
      "custom_fields": true,
      "shelf_position": 50,
      "advanced_reports": false,
      "priority_support": true
    },
    "isActive": true,
    "createdAt": "2025-09-15T20:26:35.913Z",
    "updatedAt": "2025-09-16T18:47:32.297Z",
    "isRecommended": false
  },
  {
    "id": "b7e3e3e9-70f3-4e6a-aa86-5e109f3f76ad",
    "name": "Тест 3",
    "description": "Тест 3",
    "priceMonthly": 2999,
    "priceYearly": 35600,
    "yearlyDiscount": 1.08,
    "maxUsers": null,
    "maxCustomers": null,
    "maxVehicles": null,
    "maxOrders": null,
    "features": {
      "reports": true,
      "analytics": true,
      "highlight": false,
      "api_access": true,
      "recommended": false,
      "white_label": true,
      "integrations": true,
      "custom_fields": true,
      "advanced_reports": true,
      "priority_support": true
    },
    "isActive": true,
    "createdAt": "2025-09-16T18:08:46.128Z",
    "updatedAt": "2025-09-16T18:25:08.576Z",
    "isRecommended": false
  },
  {
    "id": "0702f13f-f79e-495c-aca0-5c12c2547633",
    "name": "Тест 6",
    "description": "Тест 6",
    "priceMonthly": 2999,
    "priceYearly": 35000,
    "yearlyDiscount": 2.75,
    "maxUsers": null,
    "maxCustomers": null,
    "maxVehicles": null,
    "maxOrders": null,
    "features": {
      "reports": true,
      "analytics": false,
      "highlight": false,
      "api_access": false,
      "recommended": false,
      "white_label": false,
      "integrations": false,
      "custom_fields": false,
      "advanced_reports": false,
      "priority_support": false
    },
    "isActive": true,
    "createdAt": "2025-09-16T18:10:55.519Z",
    "updatedAt": "2025-09-16T18:25:48.963Z",
    "isRecommended": false
  },
  {
    "id": "78691ff9-f096-4f78-b105-aaa0871697c7",
    "name": "Тест 2",
    "description": "Тест 2",
    "priceMonthly": 3999,
    "priceYearly": 47296,
    "yearlyDiscount": 1.44,
    "maxUsers": null,
    "maxCustomers": null,
    "maxVehicles": null,
    "maxOrders": null,
    "features": {
      "badge": "sale",
      "reports": true,
      "analytics": false,
      "highlight": false,
      "api_access": false,
      "recommended": false,
      "white_label": false,
      "integrations": false,
      "custom_fields": false,
      "advanced_reports": false,
      "priority_support": false
    },
    "isActive": true,
    "createdAt": "2025-09-16T18:07:32.684Z",
    "updatedAt": "2025-09-16T18:12:03.994Z",
    "isRecommended": false
  },
  {
    "id": "886754cd-5383-4ffd-926e-5e2f50d10bf3",
    "name": "Премиум",
    "description": "Максимум возможностей",
    "priceMonthly": 4990,
    "priceYearly": 49900,
    "yearlyDiscount": 16.67,
    "maxUsers": null,
    "maxCustomers": null,
    "maxVehicles": null,
    "maxOrders": null,
    "features": {
      "badge": "recommended",
      "reports": true,
      "analytics": true,
      "highlight": true,
      "api_access": true,
      "recommended": false,
      "white_label": true,
      "integrations": true,
      "custom_fields": true,
      "shelf_position": 100,
      "advanced_reports": false,
      "priority_support": true
    },
    "isActive": true,
    "createdAt": "2025-09-15T20:29:46.151Z",
    "updatedAt": "2025-09-16T18:58:30.493Z",
    "isRecommended": false
  },
  {
    "id": "9c66fca2-eeec-4276-a98d-7b1d3b62246f",
    "name": "Тест",
    "description": "Тест",
    "priceMonthly": 4999,
    "priceYearly": 58997,
    "yearlyDiscount": 1.65,
    "maxUsers": null,
    "maxCustomers": null,
    "maxVehicles": null,
    "maxOrders": null,
    "features": {
      "reports": true,
      "analytics": false,
      "highlight": false,
      "api_access": false,
      "recommended": false,
      "white_label": false,
      "integrations": false,
      "custom_fields": true,
      "advanced_reports": false,
      "priority_support": false
    },
    "isActive": true,
    "createdAt": "2025-09-16T18:06:56.976Z",
    "updatedAt": "2025-09-16T18:26:51.833Z",
    "isRecommended": false
  },
  {
    "id": "642bd555-4734-407c-8d30-d16bbe3bd929",
    "name": "Тест 5",
    "description": "Тест 5",
    "priceMonthly": 5999,
    "priceYearly": 59995,
    "yearlyDiscount": 16.66,
    "maxUsers": null,
    "maxCustomers": null,
    "maxVehicles": null,
    "maxOrders": null,
    "features": {
      "tags": [
        "Тег",
        "тег",
        "тег тег"
      ],
      "reports": true,
      "analytics": true,
      "highlight": false,
      "api_access": true,
      "recommended": false,
      "white_label": true,
      "integrations": true,
      "custom_fields": true,
      "advanced_reports": true,
      "priority_support": true
    },
    "isActive": true,
    "createdAt": "2025-09-16T18:09:56.679Z",
    "updatedAt": "2025-09-16T18:27:17.866Z",
    "isRecommended": false
  },
  {
    "id": "f742cbac-cfd7-4479-9365-6a86e4b1da85",
    "name": "Enterprise",
    "description": "Для больших автосервисов",
    "priceMonthly": 49990,
    "priceYearly": 489990,
    "yearlyDiscount": 18.32,
    "maxUsers": null,
    "maxCustomers": null,
    "maxVehicles": null,
    "maxOrders": null,
    "features": {
      "reports": true,
      "analytics": true,
      "highlight": false,
      "api_access": true,
      "recommended": false,
      "white_label": true,
      "integrations": true,
      "custom_fields": true,
      "shelf_position": 101,
      "advanced_reports": true,
      "priority_support": true
    },
    "isActive": true,
    "createdAt": "2025-09-16T17:34:20.726Z",
    "updatedAt": "2025-09-16T18:29:09.287Z",
    "isRecommended": false
  }
]

// path: apps/frontend/lib/api/tariffs.ts
import { apiRequest } from '@/lib/api/core';
import type { Tariff, TariffsPaginated, TariffListParams } from '@/lib/types/tariffs';

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    q.set(k, Array.isArray(v) ? (v as unknown[]).join(',') : String(v));
  });
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

interface RawTariff {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  priceMonthly?: unknown;
  priceYearly?: unknown;
  yearlyDiscount?: unknown;
  maxUsers?: unknown;
  maxCustomers?: unknown;
  maxVehicles?: unknown;
  maxOrders?: unknown;
  features?: unknown;
  isActive?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  subscriptionsCount?: unknown;
  isRecommended?: unknown;
  activeSubscribers?: unknown;
  totalSubscribers?: unknown;
}

function toNumber(v: unknown): number {
  const n = typeof v === 'string' || typeof v === 'number' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}
function toNumberOrUndefined(v: unknown): number | undefined {
  const n = typeof v === 'string' || typeof v === 'number' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}
function toNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' || typeof v === 'number' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}
function toIsoString(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  try {
    return new Date(v as string).toISOString();
  } catch {
    return String(v);
  }
}
function normalizeTariff(t: RawTariff): Tariff {
  const activeSubscribers = toNumberOrUndefined(t.activeSubscribers);
  const totalSubscribers = toNumberOrUndefined(t.totalSubscribers);
  return {
    id: String(t.id ?? ''),
    name: String(t.name ?? ''),
    description: t.description ? String(t.description) : undefined,
    priceMonthly: toNumber(t.priceMonthly),
    priceYearly: toNumber(t.priceYearly),
    yearlyDiscount: toNumberOrUndefined(t.yearlyDiscount),
    maxUsers: toNullableNumber(t.maxUsers),
    maxCustomers: toNullableNumber(t.maxCustomers),
    maxVehicles: toNullableNumber(t.maxVehicles),
    maxOrders: toNullableNumber(t.maxOrders),
    features:
      typeof t.features === 'object' && t.features !== null ? (t.features as Record<string, unknown>) : {},
    isActive: Boolean(t.isActive),
    createdAt: toIsoString(t.createdAt),
    updatedAt: toIsoString(t.updatedAt),
    subscriptionsCount: toNumberOrUndefined(t.subscriptionsCount),
    isRecommended: typeof t.isRecommended === 'boolean' ? t.isRecommended : undefined,
    activeSubscribers,
    totalSubscribers,
  };
}

function isItemsPaginated(
  data: unknown,
): data is { items: unknown[]; total?: unknown; page?: unknown; limit?: unknown; totalPages?: unknown } {
  return typeof data === 'object' && data !== null && Array.isArray((data as { items?: unknown[] }).items);
}
function isDataPaginated(
  data: unknown,
): data is { data: unknown[]; pagination?: { total?: unknown; page?: unknown; limit?: unknown; totalPages?: unknown } } {
  return typeof data === 'object' && data !== null && Array.isArray((data as { data?: unknown[] }).data);
}

export const tariffsAPI = {
  // Backoffice list — всегда без кэша; admin endpoint (скрывает метрики от публичного каталога)
  async list(params?: TariffListParams): Promise<TariffsPaginated> {
    const url = `/tariffs/admin${toQuery(params as Record<string, unknown>)}`;
    const data = await apiRequest<unknown>(url, {
      method: 'GET',
      requireAuth: 'auto',
      cache: 'no-store',
    });

    if (Array.isArray(data)) {
      const items = (data as unknown[]).map((x) => normalizeTariff(x as RawTariff));
      return { items, total: items.length, page: 1, limit: items.length, totalPages: 1 };
    }
    if (isItemsPaginated(data)) {
      const items = (data.items as unknown[]).map((x) => normalizeTariff(x as RawTariff));
      return {
        items,
        total: toNumber((data as { total?: unknown }).total),
        page: toNumber((data as { page?: unknown }).page) || 1,
        limit: toNumber((data as { limit?: unknown }).limit) || items.length,
        totalPages: toNumber((data as { totalPages?: unknown }).totalPages) || 1,
      };
    }
    if (isDataPaginated(data)) {
      const items = (data.data as unknown[]).map((x) => normalizeTariff(x as RawTariff));
      const pag = (
        data as {
          pagination?: { total?: unknown; page?: unknown; limit?: unknown; totalPages?: unknown };
        }
      ).pagination || {};
      return {
        items,
        total: toNumber(pag.total),
        page: toNumber(pag.page) || 1,
        limit: toNumber(pag.limit) || items.length,
        totalPages: toNumber(pag.totalPages) || 1,
      };
    }
    return { items: [], total: 0, page: 1, limit: 0, totalPages: 0 };
  },

  // Публичные — без метрик
  async active(): Promise<Tariff[]> {
    const data = await apiRequest<unknown[]>(`/tariffs/active`, { method: 'GET', requireAuth: 'auto' });
    return (data ?? []).map((x) => normalizeTariff(x as RawTariff));
  },

  async popular(limit = 6): Promise<Tariff[]> {
    const data = await apiRequest<unknown[]>(`/tariffs/popular${toQuery({ limit })}`, {
      method: 'GET',
      requireAuth: 'auto',
    });
    return (data ?? []).map((x) => normalizeTariff(x as RawTariff));
  },

  async get(id: string): Promise<Tariff> {
    const data = await apiRequest<unknown>(`/tariffs/${id}`, { method: 'GET', requireAuth: 'auto' });
    return normalizeTariff(data as RawTariff);
  },

  async compare(ids: string[]): Promise<Tariff[]> {
    const data = await apiRequest<unknown[]>(`/tariffs/compare${toQuery({ ids })}`, {
      method: 'GET',
      requireAuth: 'auto',
    });
    return (data ?? []).map((x) => normalizeTariff(x as RawTariff));
  },

  async create(json: {
    name: string;
    description?: string;
    priceMonthly: number;
    priceYearly: number;
    maxUsers?: number;
    maxCustomers?: number;
    maxVehicles?: number;
    maxOrders?: number;
    features?: Record<string, unknown>;
    isActive?: boolean;
  }): Promise<Tariff> {
    const data = await apiRequest<unknown>(`/tariffs`, { method: 'POST', json });
    return normalizeTariff(data as RawTariff);
  },

  async update(
    id: string,
    json: Partial<{
      name: string;
      description: string;
      priceMonthly: number;
      priceYearly: number;
      maxUsers: number;
      maxCustomers: number;
      maxVehicles: number;
      maxOrders: number;
      features: Record<string, unknown>;
      isActive: boolean;
    }>,
  ): Promise<Tariff> {
    const data = await apiRequest<unknown>(`/tariffs/${id}`, { method: 'PATCH', json });
    return normalizeTariff(data as RawTariff);
  },

  async setActive(id: string, isActive: boolean): Promise<Tariff> {
    const data = await apiRequest<unknown>(`/tariffs/${id}/status${toQuery({ isActive })}`, { method: 'PATCH' });
    return normalizeTariff(data as RawTariff);
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/tariffs/${id}`, { method: 'DELETE' });
  },
};

// path: apps/frontend/lib/types/tariffs.ts

export type TariffID = string;

export interface Tariff {
  id: TariffID;
  name: string;
  description?: string;

  priceMonthly: number;
  priceYearly: number;
  yearlyDiscount?: number;

  maxUsers?: number | null;
  maxCustomers?: number | null;
  maxVehicles?: number | null;
  maxOrders?: number | null;

  features?: Record<string, unknown>;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Совместимость
  subscriptionsCount?: number; // = activeSubscribers
  isRecommended?: boolean;

  // Новые метрики для бэкофиса
  activeSubscribers?: number;
  totalSubscribers?: number;
}

export interface TariffsPaginated {
  items: Tariff[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type TariffSortField =
  | 'name'
  | 'priceMonthly'
  | 'priceYearly'
  | 'createdAt'
  | 'activeSubscribers'
  | 'totalSubscribers';
export type SortOrder = 'asc' | 'desc';

export interface TariffListParams {
  search?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  // Расширенные фильтры
  minActiveSubscribers?: number;
  minTotalSubscribers?: number;

  page?: number;
  limit?: number;
  sortField?: TariffSortField;
  sortOrder?: SortOrder;
}
