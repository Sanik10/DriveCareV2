// path: apps/frontend/app/invoices/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Invoice } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [data, setData] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    api.invoices.get(id)
      .then((d) => mounted && setData(d))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('401')) {
          router.replace(`/login?next=/invoices/${id}`);
          return;
        }
        toast.error('Не удалось загрузить счёт', { description: msg });
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [id, router]);

  async function pay() {
    try {
      setPaying(true);
      const resp = await api.payments.init(id);
      if ('redirectUrl' in resp && typeof resp.redirectUrl === 'string') {
        window.location.assign(resp.redirectUrl);
      } else {
        // Если бэк пока записывает платеж без редиректа
        toast.success('Платёж инициирован');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Попробуйте позже';
      toast.error('Не удалось инициировать оплату', { description: msg });
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="space-y-6">
      {loading && <Skeleton className="h-24" />}
      {!loading && data && (
        <>
          <h1 className="text-2xl font-semibold">Счёт № {data.number}</h1>
          <Card className="hover-lift">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-fg-secondary">Клиент</div>
                <div className="font-medium">{data.customerName ?? '—'}</div>
              </div>
              <div>
                <div className="text-sm text-fg-secondary">Сумма</div>
                <div className="font-medium">
                  {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: data.currency }).format(data.amount / 100)}
                </div>
              </div>
              <div>
                <div className="text-sm text-fg-secondary">Срок оплаты</div>
                <div className="font-medium">{new Date(data.dueDate).toLocaleDateString('ru-RU')}</div>
              </div>
              <div>
                <div className="text-sm text-fg-secondary">Статус</div>
                <div className="font-medium">{data.status}</div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button onClick={pay} disabled={paying || data.status === 'PAID'}>
                Оплатить <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Link className="text-sm underline self-center" href="/invoices">К списку счетов</Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
