
ВАЖНО: отвечай только в формате path-blocks для моего скрипта.
Никаких пояснений, никаких лишних ```diff``` вне path-block, никаких команд, никаких маркдаун-списков.

Формат:
<!-- path: <relative/path>, action: replace|patch|append|delete|move, from: <old/path> -->
```<lang|diff>
<content>
```

Правила:
1) Если меняется часть файла — используй action: patch и присылай только hunks (@@ ... @@) в ```diff``` внутри блока.
2) Если нужно заменить файл целиком — action: replace и полный контент файла.
3) Если нужно создать новый файл — action: replace (файл будет создан).
4) Если правок несколько — выдай несколько блоков подряд.
```

## Мини-пример (для тебя, не для запуска)
Частичная правка:

```md
<!-- path: apps/backend/src/main.ts, action: patch -->
```diff
@@ -1,3 +1,3 @@
-foo
+bar
```
```

Полная замена:

```md
<!-- path: docs/NOTE.md, action: replace -->
```md
# NOTE
text...
```
