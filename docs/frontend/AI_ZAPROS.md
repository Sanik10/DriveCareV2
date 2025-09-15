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
