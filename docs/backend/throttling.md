<!-- path: docs/throttling.md -->
# Throttling (Rate Limiting) — Profiles

Пакет: @nestjs/throttler ^6.4.0 (совместим с NestJS 10). Поддерживает именованные профили (лимитеры).

В AppModule настроены профили:
- global — применяется по умолчанию (через глобальный ThrottlerGuard)
- auth — строгие лимиты для логина/регистрации/refresh
- read — для чтения (листинги/детали)
- write — для модифицирующих операций (create/update/delete)

Пример использования в контроллерах
```ts
import { Throttle } from '@nestjs/throttler';

@Controller('services')
export class ServicesController {
  // Листинг — профиль чтения
  @Get()
  @Throttle('read')
  findAll() { /* ... */ }

  // Создание — профиль записи
  @Post()
  @Throttle('write')
  create(@Body() dto: CreateServiceDto) { /* ... */ }
}

@Controller('auth')
export class AuthController {
  // Логин — профиль auth
  @Post('login')
  @Throttle('auth')
  login(@Body() dto: LoginDto) { /* ... */ }
}
```

Рекомендации

- Не добавляйте @Throttle там, где нужны «глобальные» значения — глобальный guard уже активен.
- Для вебхуков вешайте отдельные лимиты и дополнительно проверяйте подпись/ACL IP.
- Значения профилей настраиваются в AppModule (см. ThrottlerModule.forRootAsync()).