Да, сделаем набор “живых” тестов на новом скрипте. Ниже 8 тестов, каждый проверяет свой сценарий. Формат:
- Setup: создаём/заливаем исходники через path‑blocks (запускать с --prefer-blocks).
- Patch: применяем diff (запускать без флагов или с --verbose, по желанию).

Команды для запуска:
- Setup: node scripts/apply-from-clipboard.mjs --root . --prefer-blocks --verbose
- Dry-run патча: node scripts/apply-from-clipboard.mjs --root . --dry-run --verbose
- Применение патча: node scripts/apply-from-clipboard.mjs --root . --verbose

Важно
- Копируй “Setup” отдельно от “Patch” (по одному блоку за прогон).
- Путь файлов — внутри apps/backend/src/ai-tests (чтобы не мешать проекту).
- В diff-хунках контент должен точно совпадать с исходником: соблюдай пробелы и строки (скрипт теперь многое прощает, но лучше без сюрпризов).

Тест 1 — Single-file diff (базовый кейс)
Setup (создаём файл):
<!-- path: apps/backend/src/ai-tests/test1.ts, action: replace -->
```ts
export function hello(name: string): string {
  return `Hello, ${name}`;
}
```

Patch (меняем одну строку):
```diff
diff --git a/apps/backend/src/ai-tests/test1.ts b/apps/backend/src/ai-tests/test1.ts
index 1111111..2222222 100644
--- a/apps/backend/src/ai-tests/test1.ts
+++ b/apps/backend/src/ai-tests/test1.ts
@@ -1,3 +1,3 @@
 export function hello(name: string): string {
-  return `Hello, ${name}`;
+  return `Hello, ${name}!`.toUpperCase();
 }
```

Тест 2 — Multi-file diff в одном блоке
Setup:
<!-- path: apps/backend/src/ai-tests/test2.ts, action: replace -->
```ts
export function sum(a: number, b: number): number {
  return a + b;
}
```
<!-- path: apps/backend/src/ai-tests/test3.ts, action: replace -->
```ts
export interface GreetingOptions {
  shout?: boolean;
}
export function greetV2(name: string, opts: GreetingOptions = {}): string {
  const base = `Hello, ${name}`;
  return opts.shout ? base.toUpperCase() : base;
}
```

Patch:
```diff
diff --git a/apps/backend/src/ai-tests/test2.ts b/apps/backend/src/ai-tests/test2.ts
index 1111111..2222222 100644
--- a/apps/backend/src/ai-tests/test2.ts
+++ b/apps/backend/src/ai-tests/test2.ts
@@ -1,3 +1,7 @@
-export function sum(a: number, b: number): number {
-  return a + b;
-}
+export const PI = 3.14159;
+export function sum(a: number, b: number, factor = 1): number {
+  return (a + b) * factor;
+}
diff --git a/apps/backend/src/ai-tests/test3.ts b/apps/backend/src/ai-tests/test3.ts
index 1111111..2222222 100644
--- a/apps/backend/src/ai-tests/test3.ts
+++ b/apps/backend/src/ai-tests/test3.ts
@@ -1,6 +1,8 @@
 export interface GreetingOptions {
-  shout?: boolean;
+  shout?: boolean;
+  prefix?: string;
 }
 export function greetV2(name: string, opts: GreetingOptions = {}): string {
-  const base = `Hello, ${name}`;
+  const base = `${opts.prefix ?? 'Hello'}, ${name}`;
   return opts.shout ? base.toUpperCase() : base;
 }
```

Тест 3 — Несколько diff‑блоков в одном сообщении
(скрипт их склеит и применит все)
Patch (два отдельных блока подряд):
```diff
diff --git a/apps/backend/src/ai-tests/test2.ts b/apps/backend/src/ai-tests/test2.ts
index 2222222..3333333 100644
--- a/apps/backend/src/ai-tests/test2.ts
+++ b/apps/backend/src/ai-tests/test2.ts
@@ -1,4 +1,8 @@
 export const PI = 3.14159;
 export function sum(a: number, b: number, factor = 1): number {
   return (a + b) * factor;
 }
+export function avg(values: number[]): number {
+  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
+}
diff --git a/apps/backend/src/ai-tests/test3.ts b/apps/backend/src/ai-tests/test3.ts
index 2222222..3333333 100644
--- a/apps/backend/src/ai-tests/test3.ts
+++ b/apps/backend/src/ai-tests/test3.ts
@@ -1,8 +1,10 @@
 export interface GreetingOptions {
   shout?: boolean;
   prefix?: string;
 }
+export type Punctuation = '!' | '.' | '?';
 export function greetV2(name: string, opts: GreetingOptions = {}): string {
-  const base = `${opts.prefix ?? 'Hello'}, ${name}`;
-  return opts.shout ? base.toUpperCase() : base;
+  const base = `${(opts.prefix ?? 'Hello')}, ${name}`;
+  return opts.shout ? `${base}!`.toUpperCase() : base;
 }
```

Тест 4 — Path rewrite (diff указывает src/, скрипт мапит в apps/backend/src)
Setup:
<!-- path: apps/backend/src/ai-tests/rewrite.ts, action: replace -->
```ts
export const tag = 'v1';
export function tagify(s: string) { return `[${tag}] ${s}`; }
```

Patch (обрати внимание на пути a/src/...):
```diff
diff --git a/src/ai-tests/rewrite.ts b/src/ai-tests/rewrite.ts
index 1111111..2222222 100644
--- a/src/ai-tests/rewrite.ts
+++ b/src/ai-tests/rewrite.ts
@@ -1,2 +1,2 @@
-export const tag = 'v1';
+export const tag = 'v2';
 export function tagify(s: string) { return `[${tag}] ${s}`; }
```

Тест 5 — Игнорирование пробелов (whitespace-insensitive)
Setup:
<!-- path: apps/backend/src/ai-tests/whitespace.ts, action: replace -->
```ts
export function indentA(): string {
  return 'A';
}
```

Patch ( меняем отступы, содержимое то же ):
```diff
diff --git a/apps/backend/src/ai-tests/whitespace.ts b/apps/backend/src/ai-tests/whitespace.ts
index 1111111..2222222 100644
--- a/apps/backend/src/ai-tests/whitespace.ts
+++ b/apps/backend/src/ai-tests/whitespace.ts
@@ -1,3 +1,3 @@
 export function indentA(): string {
-  return 'A';
+    return 'A';
 }
```

Тест 6 — 3‑way merge (патч поверх изменённого файла)
Setup:
<!-- path: apps/backend/src/ai-tests/merge.ts, action: replace -->
```ts
const a = 1;
const b = 2;
export function calc() {
  return a + b;
}
```

Patch 6a (первое изменение):
```diff
diff --git a/apps/backend/src/ai-tests/merge.ts b/apps/backend/src/ai-tests/merge.ts
index 1111111..2222222 100644
--- a/apps/backend/src/ai-tests/merge.ts
+++ b/apps/backend/src/ai-tests/merge.ts
@@ -1,4 +1,4 @@
 const a = 1;
-const b = 2;
+const b = 3;
 export function calc() {
   return a + b;
 }
```

Patch 6b (патч на основе старой версии — меняем return):
```diff
diff --git a/apps/backend/src/ai-tests/merge.ts b/apps/backend/src/ai-tests/merge.ts
index 1111111..3333333 100644
--- a/apps/backend/src/ai-tests/merge.ts
+++ b/apps/backend/src/ai-tests/merge.ts
@@ -1,4 +1,4 @@
 const a = 1;
 const b = 2;
 export function calc() {
-  return a + b;
+  return a + b + 1;
 }
```

Ожидаемое: 6a применится; 6b пройдёт через 3‑way и сольёт изменения (итог будет учитывать и b=3 и +1 в сумме).

Тест 7 — Создание нового файла через diff
Patch:
```diff
diff --git a/apps/backend/src/ai-tests/created-by-diff.ts b/apps/backend/src/ai-tests/created-by-diff.ts
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/apps/backend/src/ai-tests/created-by-diff.ts
@@ -0,0 +1,5 @@
+export function created(): string {
+  return 'I was created by a diff';
+}
+
+export default created;
```

Тест 8 — Удаление файла через diff
Setup (создаём файл, который потом удалим):
<!-- path: apps/backend/src/ai-tests/delete-me.ts, action: replace -->
```ts
export const toBeRemoved = true;
export function bye() { return 'bye'; }
```

Patch (удаление):
```diff
diff --git a/apps/backend/src/ai-tests/delete-me.ts b/apps/backend/src/ai-tests/delete-me.ts
deleted file mode 100644
index 1111111..0000000
--- a/apps/backend/src/ai-tests/delete-me.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-export const toBeRemoved = true;
-export function bye() { return 'bye'; }
```

Подсказки по сценариям
- Если нужно проверить fallback на path‑blocks: пришли заведомо “битый” diff (например, с неправильным путём), и следом path‑block с корректным файлом. Скрипт попробует diff → упадёт → применит path‑blocks.
- Проверить reverse‑check: примените любой patch второй раз — скрипт должен сказать, что патч уже применён (и не падать).

Если хочешь, могу подготовить ещё тесты:
- “only-diff” против “only-blocks” режим;
- “intent to add” (git add -N) как экспериментальная опция для новых файлов без new file mode;
- батч тесты с множеством файлов и смешанными блоками.
