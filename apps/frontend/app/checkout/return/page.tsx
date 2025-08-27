// path: apps/frontend/app/checkout/return/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function ReturnPage() {
  const params = useSearchParams();
  const router = useRouter();
  const invoiceId = useMemo(() => params.get('invoiceId') ?? '', [params]);
  const [status, setStatus] = useState<'PROCESSING' | 'PAID' | 'FAILED' | 'TIMEOUT'>('PROCESSING');

  useEffect(() => {
    if (!invoiceId) return;

    let cancelled = false;
    const delays = [1000, 2000, 4000, 8000, 15000]; // ~45s
    (async () => {
      for (const d of delays) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, d));
        try {
          const inv = await api.invoices.get(invoiceId);
          if (inv.status === 'PAID') { setStatus('PAID'); return; }
          if (inv.status === 'FAILED' || inv.status === 'CANCELED') { setStatus('FAILED'); return; }
        } catch {
          // продолжаем ретраи
        }
      }
      setStatus('TIMEOUT');
    })();

    return () => { cancelled = true; };
  }, [invoiceId]);

  if (!invoiceId) {
    return <div className="text-sm text-fg-secondary">Отсутствует invoiceId</div>;
  }

  return (
    <div className="grid place-items-center py-16">
      <Card className="w-full max-w-lg text-center">
        {status === 'PROCESSING' && (
          <>
            <div className="animate-pulse text-lg font-medium">Обрабатываем платёж…</div>
            <div className="mt-2 text-sm text-fg-secondary">Это может занять до 30–45 секунд</div>
          </>
        )}
        {status === 'PAID' && (
          <>
            <div className="flex items-center justify-center gap-2 text-success text-xl font-semibold">
              <CheckCircle2 className="w-6 h-6" /> Оплачено
            </div>
            <Button className="mt-6" onClick={() => router.push(`/invoices/${invoiceId}`)}>Вернуться к счёту</Button>
          </>
        )}
        {status !== 'PROCESSING' && status !== 'PAID' && (
          <>
            <div className="flex items-center justify-center gap-2 text-danger text-xl font-semibold">
              <XCircle className="w-6 h-6" /> Не удалось подтвердить
            </div>
            <div className="mt-2 text-sm text-fg-secondary">
              Попробуйте обновить статус позже или вернитесь к счёту.
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="secondary" onClick={() => location.reload()}>Обновить</Button>
              <Button onClick={() => router.push(`/invoices/${invoiceId}`)}>К счёту</Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
