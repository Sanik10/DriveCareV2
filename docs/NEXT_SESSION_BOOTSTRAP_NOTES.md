# 🤖 AI Unified Diff Prompt (Backend/Frontend)

Цель: получать от ИИ валидные unified diff патчи, которые применяются `git apply` без ручных правок. Если актуальный контент файлов неизвестен — сначала запросить файлы.

## Режимы

1) Audit (без кода)
- Патчи не присылать.
- Покрыть: РФ‑ФЗ (152, 242, 402, 54, 161, PCI), безопасность (auth/RBAC/XSS/SQLi/CSRF/headers/cookies/PII/аудит/ретеншн), качество кода (архитектура/типизация/DTO/валидация/транзакции/перфоманс).
- Выдать список изменений с приоритетами и мотивацией.

2) Patches (unified diff)
- Нет точных файлов → не присылай diff. Сначала верни блок “NEED FILES”.
- Есть точные файлы → верни один или несколько патчей в блоках ```diff/```patch. Комментарии до/между/после блоков допускаются (внутри блоков — нет).

Пример запроса файлов:
```
NEED FILES (точные текущие версии):
- apps/backend/src/.../file-a.ts
- apps/backend/src/.../file-b.ts
Причина: нужен точный контекст, иначе unified diff может быть невалидным.
```

3) Fallback — path‑blocks
Если корректный diff рискован, пришли полные файлы:
```
<!-- path: apps/backend/src/.../file.ts, action: replace -->
```ts
<полный контент файла>
```
Удаление:
<!-- path: apps/backend/src/.../old.ts, action: delete -->
```txt
```
Перенос:
<!-- path: apps/backend/src/.../new.ts, action: move, from: apps/backend/src/.../old.ts -->
```ts
<опционально новый контент>
```

## Правила unified diff (сжатая версия)

- Формат патча (внутри блока ```diff```):
  ```diff
  diff --git a/apps/backend/src/path/file.ts b/apps/backend/src/path/file.ts
  index <old>..<new> 100644
  --- a/apps/backend/src/path/file.ts
  +++ b/apps/backend/src/path/file.ts
  @@ -L1,N +L2,M @@
   <≥3 строки контекста, каждая с одним пробелом в начале>
  -<удалённые строки с минусом>
  +<добавленные строки с плюсом>
  ```
- Пути строго:
  - Backend: a/apps/backend/... и b/apps/backend/...
  - Frontend: a/apps/frontend/... и b/apps/frontend/...
- Хунки:
  - Все неизменённые строки начинаются с пробела.
  - Счётчики в @@ корректные (N = ' ' + '-', M = ' ' + '+').
  - Контекст ≥ 3 строки. Без «...».
- Новый файл: `--- /dev/null` и `+++ b/<path>` (можно `new file mode 100644`).
- Удаление файла: `--- a/<path>` и `+++ /dev/null` (можно `deleted file mode`).
- Переименование: как удаление+добавление или валидный rename diff.
- Можно несколько патч‑блоков в одном ответе.

## Комментарии и пояснения

- Блоки ```diff/```patch:
  - Разрешены комментарии ДО/МЕЖДУ/ПОСЛЕ блоков — скрипт применит только содержимое блоков.
  - Внутри самого блока любые комментарии запрещены (сломают патч).
- Raw diff (без код‑блоков):
  - Допустим, но не рекомендуется. Скрипт вырежет комментарии между патчами и «хвосты».
  - Строго запрещён текст внутри хунков (между строками с `+/-/ `).

## Мини‑памятка для ИИ

- Не гадай контент — сначала “NEED FILES”, если исходники не известны.
- В режиме patch: возвращай только патчи в ```diff/```patch или path‑blocks. Пояснения — только вне блоков.
- Следи за путями (Backend/Frontend), счётчиками в @@ и контекстом ≥ 3 строки.
- Если сомневаешься — используй path‑blocks.

## Почему это важно

- Валидный diff требует точного исходника; иначе высок риск “corrupt patch”.
- Apply‑скрипт:
  - выдёргивает только diff/patch блоки и path‑blocks,
  - режет «хвосты» у raw diff,
  - нормализует EOL/невидимые символы,
  - пробует стратегии git apply: default, -p1, -p2, --3way.

## Репо‑специфика

- Роли/модули унифицированы (company_owner/company_admin/mechanic/superadmin).
- Multi‑tenant: в data‑слое обязательна фильтрация по companyId.
- XSS/SQLi: sanitize в DTO и whitelist сортировок.
- Audit: события через AuditService с маскированием ПДн.

## Пример минимального патча

```diff
diff --git a/apps/backend/src/example/hello.ts b/apps/backend/src/example/hello.ts
index 1111111..2222222 100644
--- a/apps/backend/src/example/hello.ts
+++ b/apps/backend/src/example/hello.ts
@@ -1,5 +1,6 @@
 import { Controller, Get } from '@nestjs/common';
 
 @Controller('hello')
 export class HelloController {
   @Get()
-  hi(): string { return 'hi'; }
+  hi(): string {
+    return 'hi';
+  }
 }
```
