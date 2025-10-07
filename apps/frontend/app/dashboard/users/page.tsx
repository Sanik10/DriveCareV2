// path: apps/frontend/app/dashboard/users/page.tsx
'use client';

import { Suspense } from 'react';
import { Users } from 'lucide-react';
import { AppLayout } from '@/components/app/AppLayout';
import UsersList from '@/components/users/UsersList.client';

export default function UsersPage() {
  return (
    <AppLayout
      title="Команда"
      description="Управление сотрудниками и приглашениями"
      icon={Users}
    >
      <div className="container mx-auto px-6 py-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-muted-foreground">Загрузка команды...</span>
              </div>
            </div>
          }
        >
          <UsersList />
        </Suspense>
      </div>
    </AppLayout>
  );
}
