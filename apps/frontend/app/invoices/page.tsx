// path: apps/frontend/app/invoices/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Invoice } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function InvoicesPage() {
  const [data, setData] = useState<Invoice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    api.invoices.list()
      .then((d) => mounted && setData(d))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('401')) {
          router.replace('/login?next=/invoices');
          return;
        }
        toast.error('Не удалось загрузить счета', { description: msg });
      })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [router]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Счета</h1>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-elev2">
            <tr className="[&>th]:px-4 [&>th]:py-3 text-left">
              <th>№</th>
              <th>Клиент</th>
              <th>Сумма</th>
              <th>Срок</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody className="[&>tr:hover]:bg-bg-elev2/60 transition-colors">
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="[&>td]:px-4 [&>td]:py-3">
                <td colSpan={5}><Skeleton className="h-6" /></td>
              </tr>
            ))}
            {!loading && data?.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-fg-secondary">Пусто. Счета не найдены.</td></tr>
            )}
            {!loading && data?.map(inv => (
              <tr key={inv.id} className="cursor-pointer" onClick={() => router.push(`/invoices/${inv.id}`)}>
                <td className="px-4 py-3 font-medium">{inv.number}</td>
                <td className="px-4 py-3">{inv.customerName ?? '—'}</td>
                <td className="px-4 py-3">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: inv.currency }).format(inv.amount / 100)}</td>
                <td className="px-4 py-3">{new Date(inv.dueDate).toLocaleDateString('ru-RU')}</td>
                <td className="px-4 py-3">{inv.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
