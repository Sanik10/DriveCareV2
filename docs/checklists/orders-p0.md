# Orders module · P0 Checklist (to unblock stable Orders 1.0)

Goal
- Зафиксировать минимально необходимый функционал, чтобы заказы стабильно создавались/вели workflow/пересчитывались, без «ручного вмешательства».
- После выполнения P0 Канбан/деталь заказа работают предсказуемо.

## 0) Предусловия (среда/флаги)
- [ ] ENV: ORDERS_ENFORCE_LIMITS=false в dev/stage, true только в prod (валидации подключены).
- [ ] Роли заведены: mechanic, lead_mechanic, service_advisor, company_admin, company_owner, superadmin.
- [ ] Users в компании имеют корректные роли (назначение исполнителя не падает).

## 1) Services (каталог услуг) — P0
Backend:
- [ ] Service entity/CRUD: поля name, price (decimal), durationMinutes (int), taxable (bool), categoryId (optional).
- [ ] /services endpoints: POST/GET/PATCH/DELETE + поиск/категории.
- [ ] ServicesMapper: валидации name/price/duration.
- [ ] Бизнес-логика добавления в заказ: подтягивать цену/длительность из справочника, позволять override price/qty/discountPercent.

Frontend:
- [ ] API: getServices(), searchServices(), create/update/delete.
- [ ] Диалог добавления услуги в заказ: поиск, qty, discount%, выбор механика (optional).

## 2) Parts/Inventory (каталог запчастей + склад) — P0
Backend:
- [ ] Part entity/CRUD: name, partNumber, brand, price, categoryId (optional).
- [ ] Inventory: остатки (минимально — общий остаток).
- [ ] Резерв при добавлении строки; дерезерв при удалении/изменении.
- [ ] Customer-provided флаг: без резерва, цена может быть 0.
- [ ] Endpoints /parts, /inventory/availability/:partId, /orders/:orderId/parts add/update/delete + toggle customer-provided.

Frontend:
- [ ] API: getParts(), searchParts(), checkAvailability(), addPartToOrder(), updateOrderPart(), deleteOrderPart(), toggleCustomerProvided().
- [ ] Диалог добавления запчасти: qty/price/discount%, наличие, индикатор резерва.

## 3) Pricing & Tax Engine — P0
Backend:
- [ ] Единая функция пересчёта: servicesTotal + partsTotal => subtotal => discountAmount => taxAmount => finalAmount.
- [ ] НДС: taxable по строке/общий флаг (минимально — фикс % из конфига).
- [ ] Пересчёт при изменениях строк и /orders/:id/recalculate.
- [ ] Округления (2 знака), валюта RU.

Frontend:
- [ ] Кнопка «Пересчитать финансы» (есть), корректное отображение totals.

## 4) Order-lines API устойчивость — P0
Backend:
- [ ] /orders/:orderId/services: POST, GET, PATCH, DELETE, /status, /mechanic, /start, /complete.
- [ ] /orders/:orderId/parts: POST, GET, PATCH, DELETE, /customer-provided, /availability.
- [ ] Транзакции: добавление/пересчёт/резерв — атомарно.
- [ ] Идемпотентность: X-Idempotency-Key (минимум на POST add).

Frontend:
- [ ] API-хелперы для всех методов.
- [ ] Обновление списков услуг/запчастей без перезагрузки страницы.

## 5) Статусы и валидации — P0
Backend:
- [ ] Переход в in_progress: требуется assignedTo И хотя бы одна строка (услуга или запчасть).
- [ ] completed: все услуги completed (или мягче по правилу), финансы пересчитаны.
- [ ] canceled: дерезерв запчастей, запрет изменений строк.

Frontend:
- [ ] Канбан: при DnD → если нет assignedTo — «Назначить меня» (или понятная ошибка).
- [ ] Понятные сообщения в тостах при отказе.

## 6) Users/Roles — P0
Backend:
- [ ] Guards: назначение механика доступно admin/owner/lead_mechanic.
- [ ] Маскирование ПДн для низких ролей (при необходимости).

Frontend:
- [ ] Быстрые действия: «Назначить меня», «В работу», «Готово» (после P0).
- [ ] Скрытие чувствительных данных для механиков (optional).

## 7) Интеграции (минимум) — P1
- [ ] Invoices: POST /invoices/from-order → кнопка «Выставить счёт».
- [ ] Payments (минимум чтение): оплачено/к оплате.

## 8) Канбан/деталь — стабилизация — P1
Frontend:
- [ ] DnD только за «ручку» (сделано).
- [ ] Горизонтальная прокрутка, фикс-ширина колонок (сделано).
- [ ] Быстрые действия на карточке (после P0).
- [ ] Карточка: ETA/просрочка, сумма, клиент, авто (есть).

## 9) Тесты/диагностика — P1
- [ ] E2E: create → add service → add part → recalc → assign → in_progress → complete.
- [ ] В ошибках показывать correlationId в UI (частично готово).
