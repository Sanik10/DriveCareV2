// path: apps/frontend/app/providers/AuthBootstrap.tsx
'use client';

import { useEffect } from 'react';
import { initAuthBootstrap } from '@/lib/api/core';

/**
 * Провайдер-инициализатор аутентификации:
 * - запускает boot refresh до массовых запросов
 * - настраивает триггеры преэмптивного refresh и синхронизацию вкладок
 */
export function AuthBootstrap() {
  useEffect(() => {
    initAuthBootstrap();
  }, []);

  return null;
}
