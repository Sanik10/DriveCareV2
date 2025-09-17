// path: apps/frontend/components/platform/PlatformGuard.tsx
'use client';

import { PropsWithChildren, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';

export function PlatformGuard({ children }: PropsWithChildren) {
  const { user, isLoading } = useAuth();

  const allowed = useMemo(() => {
    const role = user?.role?.name?.toLowerCase();
    return role === 'superadmin' || role === 'platform_admin';
  }, [user?.role?.name]);

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Загрузка…</div>;
  }

  if (!allowed) {
    return <div className="p-6 text-sm text-muted-foreground">Нет доступа (только для платформенных администраторов)</div>;
  }

  return <>{children}</>;
}
