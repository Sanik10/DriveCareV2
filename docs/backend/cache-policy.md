<!-- path: docs/cache-policy.md -->
# Cache Policy для эндпоинтов API

По умолчанию SecurityHeadersInterceptor проставляет строгий запрет кеширования:
Cache-Control: no-cache, no-store, must-revalidate, private

Это снижает риск кэширования ПДн на прокси/браузерах. Для публичных словарей и тяжелых GET можно выборочно разрешать кеш.

Декораторы
- @CachePolicy(policy: string) — задать произвольную политику
- @AllowCache(maxAgeSeconds = 3600, visibility = 'public', extra = ['must-revalidate']) — упрощённый helper
- @NoStore() — явный запрет кеша

Примеры
```ts
import { Controller, Get } from '@nestjs/common';
import { AllowCache, CachePolicy, NoStore } from '../../common/decorators/cache-policy.decorator';

@Controller('vehicles-catalogue')
export class VehiclesCatalogueController {
  // Разрешить кеш на 1 час (public)
  @Get('brands')
  @AllowCache(3600)
  getBrands() { /* ... */ }

  // Кастомная политика
  @Get('models')
  @CachePolicy('public, max-age=600, stale-while-revalidate=30')
  getModels() { /* ... */ }

  // Строгий запрет кеша (явно)
  @Get('internal-report')
  @NoStore()
  getInternalReport() { /* ... */ }
}
```

Как это работает

- Интерцептор читает метаданные с метода/класса и выставляет Cache-Control.
- Если декораторы не указаны — применяется глобальный no-store.