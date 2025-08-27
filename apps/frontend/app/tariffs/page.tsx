// path: apps/frontend/app/tariffs/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { Tariff } from '@/lib/types';

export default function TariffsPage() {
  const [data, setData] = useState<Tariff[] | null>(null);

  useEffect(() => {
    api.tariffs.list().then(setData).catch(() => setData([]));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Тарифы</h1>
      {!data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      )}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.map((t) => (
            <Card key={t.id} className="hover-lift">
              <div className="text-lg font-semibold">{t.name ?? 'Тариф'}</div>
              <div className="mt-2 text-2xl font-bold">
                {t.price ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: t.currency ?? 'RUB' }).format(t.price / 100) : '—'}
                <span className="text-sm font-medium text-fg-secondary">{t.period ? ` / ${t.period}` : ''}</span>
              </div>
              <ul className="mt-4 space-y-1 text-sm text-fg-secondary">
                {(t.features ?? []).slice(0, 6).map((f, idx) => <li key={idx}>• {f}</li>)}
              </ul>
              <Button className="mt-6" variant="accent">Выбрать</Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
