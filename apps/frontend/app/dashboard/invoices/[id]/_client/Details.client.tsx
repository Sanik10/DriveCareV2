// path: apps/frontend/app/dashboard/invoices/[id]/_client/Details.client.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { invoicesAPI } from '@/lib/api/invoices';
import type { Invoice, InvoiceStatus } from '@/lib/types/invoices';
import { INVOICE_STATUS_TRANSITIONS } from '@/lib/types/invoices';
import { useAuth } from '@/lib/hooks/use-auth';
import { PayInvoiceButton } from '@features/pay-invoice';
import { apiRequest } from '@/lib/api/core';
import type { Payment } from '@/lib/types/payments';

function amountFmt(n?: number) {
  return typeof n === 'number'
    ? n.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })
    : '—';
}

function dateFmt(d?: string | Date) {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleString('ru-RU');
}

export default function Details() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState<InvoiceStatus | null>(null);
  const [canceling, setCanceling] = useState(false);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  // RBAC: роль, разрешённая на оплату (CAN_RECORD_PAYMENT): owner/admin/manager (+ легаси алиасы)
  const canUpdate = useMemo(() => {
    const role = user?.role?.name || '';
    return role === 'company_owner' || role === 'company_admin' || role === 'owner' || role === 'admin' || role === 'manager';
  }, [user?.role?.name]);
  const canCancel = canUpdate;

  // Роли для возвратов (используется для CTA в блоке платежей)
  const hasRefundRole = useMemo(() => {
    const role = user?.role?.name || '';
    return role === 'company_owner' || role === 'company_admin' || role === 'owner' || role === 'admin';
  }, [user?.role?.name]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await invoicesAPI.get(id);
        if (active) setInvoice(data);
      } catch (e: unknown) {
        if (active) setError((e as Error)?.message || 'Не удалось загрузить счёт');
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [id]);

  // Загрузка последних платежей по счёту
  useEffect(() => {
    if (!invoice?.id) return;
    let cancelled = false;
    const controller = new AbortController();
    setPaymentsLoading(true);
    setPaymentsError(null);

    (async () => {
      try {
        const res = await apiRequest<{ items?: Payment[] } | Payment[]>(
          `/payments?invoiceId=${encodeURIComponent(invoice.id)}&limit=5`,
          { method: 'GET', signal: controller.signal }
        );
        const items = Array.isArray(res) ? res : res?.items || [];
        if (!cancelled) setPayments(items);
      } catch (e) {
        if (!cancelled) setPaymentsError((e as Error)?.message || 'Не удалось загрузить платежи');
      } finally {
        if (!cancelled) setPaymentsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [invoice?.id]);

  async function changeStatus(next: InvoiceStatus) {
    if (!invoice) return;
    if (!INVOICE_STATUS_TRANSITIONS[invoice.status as InvoiceStatus]?.includes(next)) return;
    setChanging(next);
    try {
      const updated = await invoicesAPI.updateStatus(invoice.id, next);
      setInvoice(updated);
    } catch (e: unknown) {
      alert((e as Error)?.message || 'Не удалось изменить статус');
    } finally {
      setChanging(null);
    }
  }

  async function cancel() {
    if (!invoice) return;
    if (!confirm('Отменить счёт? Действие необратимо и фиксируется в аудите.')) return;
    setCanceling(true);
    try {
      await invoicesAPI.cancel(invoice.id);
      router.push('/dashboard/invoices');
    } catch (e: unknown) {
      alert((e as Error)?.message || 'Не удалось отменить счёт');
      setCanceling(false);
    }
  }

  const canMarkPaid =
    !!invoice &&
    canUpdate &&
    invoice.status === 'ISSUED' &&
    INVOICE_STATUS_TRANSITIONS.ISSUED.includes('PAID');

  const canCancelAction =
    !!invoice &&
    canCancel &&
    invoice.status === 'ISSUED' &&
    INVOICE_STATUS_TRANSITIONS.ISSUED.includes('CANCELED');

  const canPayOnline =
    !!invoice &&
    canUpdate &&
    invoice.status === 'ISSUED' &&
    (invoice.remainingAmount ?? 0) > 0;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/invoices">
          <Button variant="ghost" className="rounded-2xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center rounded-3xl glass border-border/30">
          <div className="flex items-center justify-center gap-3 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <p>{error}</p>
          </div>
          <div className="mt-4">
            <Button onClick={() => window.location.reload()} className="rounded-2xl">
              Повторить
            </Button>
          </div>
        </Card>
      ) : !invoice ? null : (
        <div className="space-y-6">
          {/* Header */}
          <Card className="p-6 rounded-3xl glass border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">Счёт {invoice.invoiceNumber}</h1>
                  <p className="text-sm text-muted-foreground">
                    Заказ: {invoice.order?.orderNumber || invoice.orderId.slice(0, 8)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <StatusPill status={invoice.status as InvoiceStatus} />
              </div>
            </div>
          </Card>

          {/* Main info */}
          <Card className="p-6 rounded-3xl glass border-border/30">
            <div className="grid md:grid-cols-3 gap-6">
              <InfoBlock title="Статус">
                <StatusPill status={invoice.status as InvoiceStatus} />
              </InfoBlock>
              <InfoBlock title="Выставлен">{new Date(invoice.issueDate).toLocaleDateString('ru-RU')}</InfoBlock>
              <InfoBlock title="Срок оплаты">{new Date(invoice.dueDate).toLocaleDateString('ru-RU')}</InfoBlock>
              <InfoBlock title="Сумма (без НДС)">{amountFmt(invoice.amount)}</InfoBlock>
              <InfoBlock title="НДС">{amountFmt(invoice.taxAmount)}</InfoBlock>
              <InfoBlock title="Итого к оплате">{amountFmt(invoice.totalAmount)}</InfoBlock>
              <InfoBlock title="Оплачено">{amountFmt(invoice.paidAmount)}</InfoBlock>
              <InfoBlock title="Остаток">{amountFmt(invoice.remainingAmount)}</InfoBlock>
              <InfoBlock title="Налог, %">{invoice.taxPercentage ?? 20}%</InfoBlock>
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-6 rounded-3xl glass border-border/30">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                className="rounded-2xl"
                onClick={() => changeStatus('PAID')}
                disabled={!canMarkPaid || Boolean(changing)}
                title={invoice.status !== 'ISSUED' ? 'Статус “Оплачен” недоступен' : undefined}
              >
                {changing === 'PAID' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Отметить оплаченным
              </Button>

              <Button
                variant="ghost"
                className="rounded-2xl text-destructive"
                onClick={cancel}
                disabled={!canCancelAction || canceling}
                title={invoice.status !== 'ISSUED' ? 'Отмена недоступна для текущего статуса' : undefined}
              >
                {canceling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                Отменить счёт
              </Button>

              {canPayOnline ? (
                <PayInvoiceButton
                  invoiceId={invoice.id}
                  amount={invoice.remainingAmount || undefined}
                  className="rounded-2xl"
                >
                  Оплатить онлайн
                </PayInvoiceButton>
              ) : (
                <Button className="rounded-2xl" disabled title="Оплата доступна только для статуса “Выставлен”">
                  Оплатить онлайн
                </Button>
              )}
            </div>
          </Card>

          {/* Payments by invoice */}
          <Card className="p-6 rounded-3xl glass border-border/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Платежи по счёту</h3>
              <Link href="/dashboard/payments">
                <Button variant="ghost" className="rounded-2xl">Все платежи</Button>
              </Link>
            </div>

            {paymentsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
              </div>
            ) : paymentsError ? (
              <div className="text-sm text-destructive">{paymentsError}</div>
            ) : payments.length === 0 ? (
              <div className="text-sm text-muted-foreground">По этому счёту пока нет платежей.</div>
            ) : (
              <div className="divide-y divide-border/40 rounded-2xl overflow-hidden border border-border/30">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-card/50">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Дата: </span>
                        <span className="font-medium">{dateFmt(p.paymentDate || p.createdAt)}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Статус: </span>
                        <span className="font-medium">{p.statusDisplay || p.status}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Сумма: </span>
                        <span className="font-medium">
                          {typeof p.amount === 'number'
                            ? p.amount.toLocaleString('ru-RU', { style: 'currency', currency: p.currency || 'RUB' })
                            : '—'}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Метод: </span>
                        <span className="font-medium">{p.paymentMethod?.name || p.paymentMethod?.type || '—'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Возврат делаем из деталки платежа; кнопка возврата там уже с роль‑гейтингом */}
                      <Link href={`/dashboard/payments/${p.id}`}>
                        <Button variant="outline" className="rounded-2xl">Открыть</Button>
                      </Link>
                      {hasRefundRole && p.status === 'processed' ? (
                        <Link href={`/dashboard/payments/${p.id}`}>
                          <Button variant="destructive" className="rounded-2xl" title="Оформить возврат из детали платежа">
                            Возврат
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Customer/Vehicle/Company */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 rounded-3xl glass border-border/30">
              <h3 className="font-semibold mb-3">Клиент</h3>
              {invoice.customer ? (
                <div className="text-sm space-y-1">
                  <p>
                    {invoice.customer.companyName ||
                      [invoice.customer.lastName, invoice.customer.firstName].filter(Boolean).join(' ')}
                  </p>
                  {invoice.customer.email && <p className="text-muted-foreground">{invoice.customer.email}</p>}
                  {invoice.customer.phone && <p className="text-muted-foreground">{invoice.customer.phone}</p>}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Нет данных</p>
              )}
            </Card>

            <Card className="p-6 rounded-3xl glass border-border/30">
              <h3 className="font-semibold mb-3">Автомобиль</h3>
              {invoice.vehicle ? (
                <div className="text-sm space-y-1">
                  <p>{invoice.vehicle.displayName || invoice.vehicle.licensePlate || '—'}</p>
                  {invoice.vehicle.vin && <p className="text-muted-foreground">VIN: {invoice.vehicle.vin}</p>}
                  {invoice.vehicle.year && <p className="text-muted-foreground">Год: {invoice.vehicle.year}</p>}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Нет данных</p>
              )}
            </Card>

            <Card className="p-6 rounded-3xl glass border-border/30">
              <h3 className="font-semibold mb-3">Компания</h3>
              {invoice.company ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium">{invoice.company.name}</p>
                  <p className="text-muted-foreground">{invoice.company.email}</p>
                  {invoice.company.address && <p className="text-muted-foreground">{invoice.company.address}</p>}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Нет данных</p>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <p className="font-medium">{children ?? '—'}</p>
    </div>
  );
}

function StatusPill({ status }: { status: InvoiceStatus }) {
  const map: Record<InvoiceStatus, { text: string; cls: string }> = {
    ISSUED: { text: 'Выставлен', cls: 'bg-amber-500/15 text-amber-500 border border-amber-500/30' },
    PAID: { text: 'Оплачен', cls: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' },
    CANCELED: { text: 'Отменён', cls: 'bg-rose-500/15 text-rose-500 border border-rose-500/30' },
  };
  const m = map[status] || map.ISSUED;
  return <span className={`px-2 py-1 rounded-xl text-xs font-medium ${m.cls}`}>{m.text}</span>;
}
