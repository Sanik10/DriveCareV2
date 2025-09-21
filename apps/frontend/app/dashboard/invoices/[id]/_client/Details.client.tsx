// path: apps/frontend/app/dashboard/invoices/[id]/_client/Details.client.tsx
'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowLeft,
  Download,
  CreditCard,
  Clock,
  BarChart3,
  TrendingUp
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/app/AppLayout';

import { invoicesAPI } from '@/lib/api/invoices';
import type { Invoice, InvoiceStatus } from '@/lib/types/invoices';
import { INVOICE_STATUS_TRANSITIONS } from '@/lib/types/invoices';
import { useAuth } from '@/lib/hooks/use-auth';
import { PayInvoiceButton } from '@features/pay-invoice';
import { apiRequest } from '@/lib/api/core';
import type { Payment } from '@/lib/types/payments';
import { cn } from '@/lib/utils';

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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState<InvoiceStatus | null>(null);
  const [canceling, setCanceling] = useState(false);

  const paymentsAbortRef = useRef<AbortController | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  useEffect(() => setIsMounted(true), []);

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
    if (!isMounted) return;
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    if (!id) return;

    let active = true;
    const run = async () => {
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
  }, [isMounted, authLoading, isAuthenticated, user, router, id]);

  // Загрузка последних платежей по счёту (abortable)
  useEffect(() => {
    if (!invoice?.id) return;
    if (paymentsAbortRef.current) paymentsAbortRef.current.abort();
    const controller = new AbortController();
    paymentsAbortRef.current = controller;

    let cancelled = false;
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

  // Progressive fallback: если paidAmount не пришел — считаем из платежей (processed)
  const paidFromPayments = useMemo(() => {
    if (!payments || payments.length === 0) return 0;
    // @ts-ignore — минимальная совместимость, поле статуса может называться иначе на ранних версиях
    return payments.filter((p) => (p.status === 'processed' || p.status === 'succeeded')).reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const effectivePaid = invoice?.paidAmount ?? paidFromPayments;
  const progressPercentage = invoice ? Math.round(((effectivePaid || 0) / (invoice.totalAmount || 1)) * 100) : 0;

  if (!isMounted) return null;

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated || !user) return null;

  const invoiceNumber = invoice?.invoiceNumber || '...';

  const headerActions = (
    <div className="flex items-center gap-2">
      <Link href="/dashboard/invoices">
        <Button variant="outline" className="rounded-2xl btn-outline-fixed">
          <ArrowLeft className="w-4 h-4 mr-2" />
          К списку
        </Button>
      </Link>
    </div>
  );

  return (
    <AppLayout
      title={`Счёт ${invoiceNumber}`}
      description="Детали счёта и история платежей"
      icon={FileText}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Payment Progress Feature Badge */}
        <Card className="p-4 glass border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-600 dark:text-emerald-400">Прогресс оплаты счёта</h3>
              <p className="text-sm text-muted-foreground">
                Интерактивный прогресс-бар, статистика платежей и возможность онлайн оплаты. Все изменения в реальном времени.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30">
                <TrendingUp className="w-3 h-3 mr-1" />
                {progressPercentage}% оплачен
              </Badge>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
          </div>
        ) : error ? (
          <Card className="p-8 text-center text-destructive glass border-border/30 rounded-3xl">
            <div className="flex items-center justify-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <p className="text-lg font-medium">{error}</p>
            </div>
            <Button onClick={() => window.location.reload()} className="rounded-2xl">
              Повторить
            </Button>
          </Card>
        ) : !invoice ? (
          <Card className="p-8 text-center text-muted-foreground glass border-border/30 rounded-3xl">
            Счёт не найден
          </Card>
        ) : (
          <>
            {/* Header Card */}
            <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-indigo-500/20 to-primary/20 border border-indigo-500/30 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-indigo-500" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold mb-1">Счёт {invoice.invoiceNumber}</h1>
                    <p className="text-sm text-muted-foreground mb-2">
                      Заказ: {invoice.order?.orderNumber || invoice.orderId.slice(0, 8)}
                    </p>
                    <StatusPill status={invoice.status as InvoiceStatus} />
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-bold mb-1">{amountFmt(invoice.totalAmount)}</div>
                  <div className="text-sm text-muted-foreground">
                    Оплачено: {amountFmt(invoice.paidAmount ?? paidFromPayments)}
                  </div>
                  {(invoice.remainingAmount || 0) > 0 && (
                    <div className="text-sm text-amber-600 dark:text-amber-400">
                      Остаток: {amountFmt(invoice.remainingAmount)}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Payment Progress */}
            {invoice.status === 'ISSUED' && (
              <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Прогресс оплаты</h3>
                    <div className="text-2xl font-bold text-primary">{progressPercentage}%</div>
                  </div>
                  
                  <div className="w-full bg-surface-1/60 rounded-full h-4 overflow-hidden">
                    <div 
                      className={cn(
                        "h-4 transition-all duration-700 ease-out rounded-full",
                        progressPercentage === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-primary to-secondary"
                      )}
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{amountFmt(invoice.paidAmount ?? paidFromPayments)}</span>
                    <span>{amountFmt(invoice.totalAmount)}</span>
                  </div>
                  
                  {invoice.dueDate && (
                    <div className={cn(
                      "text-center text-sm",
                      invoice.isOverdue ? "text-red-500" : 
                      invoice.daysUntilDue && invoice.daysUntilDue <= 3 ? "text-amber-500" : "text-muted-foreground"
                    )}>
                      Срок оплаты: {new Date(invoice.dueDate).toLocaleDateString('ru-RU')}
                      {invoice.daysUntilDue !== undefined && (
                        <span className="ml-2">
                          {invoice.daysUntilDue < 0 
                            ? `(просрочен на ${Math.abs(invoice.daysUntilDue)} дн.)`
                            : invoice.daysUntilDue === 0 
                              ? "(сегодня)"
                              : `(через ${invoice.daysUntilDue} дн.)`
                          }
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Invoice Details */}
            <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
              <h3 className="text-lg font-semibold mb-4">Детали счёта</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <InfoBlock title="Статус">
                  <StatusPill status={invoice.status as InvoiceStatus} />
                </InfoBlock>
                <InfoBlock title="Выставлен">{new Date(invoice.issueDate).toLocaleDateString('ru-RU')}</InfoBlock>
                <InfoBlock title="Срок оплаты">{new Date(invoice.dueDate).toLocaleDateString('ru-RU')}</InfoBlock>
                <InfoBlock title="Сумма (без НДС)">{amountFmt(invoice.amount)}</InfoBlock>
                <InfoBlock title="НДС">{amountFmt(invoice.taxAmount)}</InfoBlock>
                <InfoBlock title="Итого к оплате">{amountFmt(invoice.totalAmount)}</InfoBlock>
                <InfoBlock title="Оплачено">{amountFmt(invoice.paidAmount ?? paidFromPayments)}</InfoBlock>
                <InfoBlock title="Остаток">{amountFmt(invoice.remainingAmount)}</InfoBlock>
                <InfoBlock title="Налог, %">{invoice.taxPercentage ?? 20}%</InfoBlock>
              </div>
            </Card>

            {/* Actions */}
            <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  className="rounded-2xl bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-[1.02]"
                  onClick={() => changeStatus('PAID')}
                  disabled={!canMarkPaid || Boolean(changing)}
                  title={invoice.status !== 'ISSUED' ? 'Статус "Оплачен" недоступен' : undefined}
                >
                  {changing === 'PAID' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Отметить оплаченным
                </Button>

                {canPayOnline ? (
                  <PayInvoiceButton
                    invoiceId={invoice.id}
                    amount={invoice.remainingAmount || undefined}
                    className="rounded-2xl"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Оплатить онлайн
                  </PayInvoiceButton>
                ) : (
                  <Button className="rounded-2xl" disabled title="Оплата доступна только для статуса 'Выставлен'">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Оплатить онлайн
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="rounded-2xl btn-outline-fixed"
                  onClick={async () => {
                    try {
                      const url = `/api/invoices/${invoice.id}/pdf`;
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `invoice-${invoice.invoiceNumber}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                    } catch (e) {
                      alert('Не удалось скачать PDF');
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Скачать PDF
                </Button>

                <Button
                  variant="destructive"
                  className="rounded-2xl"
                  onClick={cancel}
                  disabled={!canCancelAction || canceling}
                  title={invoice.status !== 'ISSUED' ? 'Отмена недоступна для текущего статуса' : undefined}
                >
                  {canceling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Отменить счёт
                </Button>
              </div>
            </Card>

            {/* Payments */}
            <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20">
                    <CreditCard className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Платежи по счёту</h3>
                    <p className="text-sm text-muted-foreground">История операций и статусы платежей</p>
                  </div>
                </div>
                <Link href="/dashboard/payments">
                  <Button variant="outline" className="rounded-2xl btn-outline-fixed">
                    Все платежи
                  </Button>
                </Link>
              </div>

              {paymentsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 rounded-2xl" />
                  <Skeleton className="h-16 rounded-2xl" />
                </div>
              ) : paymentsError ? (
                <div className="text-center py-8 text-destructive">{paymentsError}</div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>По этому счёту пока нет платежей</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div key={p.id} className="p-4 rounded-2xl border border-border/30 hover:border-border/50 transition-colors group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <CreditCard className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <div className="font-medium">{amountFmt(p.amount)}</div>
                            <div className="text-sm text-muted-foreground">
                              {dateFmt((p as any).paymentDate || (p as any).createdAt)} • {(p as any).paymentMethod?.name || (p as any).paymentMethod?.type || '—'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn(
                            (p as any).status === 'processed' ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30" :
                            (p as any).status === 'pending' ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/30" :
                            "bg-surface-1/40 text-muted-foreground border-border/30"
                          )}>
                            {(p as any).statusDisplay || (p as any).status}
                          </Badge>
                          <Link href={`/dashboard/payments/${p.id}`}>
                            <Button variant="outline" className="rounded-xl btn-outline-fixed">
                              Открыть
                            </Button>
                          </Link>
                          {hasRefundRole && (p as any).status === 'processed' && (
                            <Link href={`/dashboard/payments/${p.id}`}>
                              <Button variant="destructive" className="rounded-xl" title="Оформить возврат">
                                Возврат
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Customer/Vehicle/Company Info */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
                <h3 className="font-semibold mb-4">Клиент</h3>
                {invoice.customer ? (
                  <div className="space-y-2">
                    <div className="font-medium">
                      {invoice.customer.companyName ||
                        [invoice.customer.lastName, invoice.customer.firstName].filter(Boolean).join(' ') ||
                        'Без имени'}
                    </div>
                    {invoice.customer.email && (
                      <div className="text-sm text-muted-foreground">{invoice.customer.email}</div>
                    )}
                    {invoice.customer.phone && (
                      <div className="text-sm text-muted-foreground">{invoice.customer.phone}</div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Нет данных о клиенте</p>
                )}
              </Card>

              <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
                <h3 className="font-semibold mb-4">Автомобиль</h3>
                {invoice.vehicle ? (
                  <div className="space-y-2">
                    <div className="font-medium">
                      {invoice.vehicle.displayName || invoice.vehicle.licensePlate || 'Неизвестно'}
                    </div>
                    {invoice.vehicle.vin && (
                      <div className="text-sm text-muted-foreground">VIN: {invoice.vehicle.vin}</div>
                    )}
                    {invoice.vehicle.year && (
                      <div className="text-sm text-muted-foreground">Год: {invoice.vehicle.year}</div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Нет данных об автомобиле</p>
                )}
              </Card>

              <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
                <h3 className="font-semibold mb-4">Компания</h3>
                {invoice.company ? (
                  <div className="space-y-2">
                    <div className="font-medium">{invoice.company.name}</div>
                    {invoice.company.email && (
                      <div className="text-sm text-muted-foreground">{invoice.company.email}</div>
                    )}
                    {invoice.company.address && (
                      <div className="text-sm text-muted-foreground">{invoice.company.address}</div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Нет данных о компании</p>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function InfoBlock({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <div className="font-medium">{children ?? '—'}</div>
    </div>
  );
}

function StatusPill({ status }: { status: InvoiceStatus }) {
  const map: Record<InvoiceStatus, { text: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
    ISSUED: { 
      text: 'Выставлен', 
      cls: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/30',
      icon: Clock
    },
    PAID: { 
      text: 'Оплачен', 
      cls: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30',
      icon: CheckCircle2
    },
    CANCELED: { 
      text: 'Отменён', 
      cls: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/30',
      icon: XCircle
    },
  };
  const { text, cls, icon: Icon } = map[status] || map.ISSUED;
  return (
    <Badge className={cn('text-xs font-medium border rounded-xl', cls)}>
      <Icon className="w-3 h-3 mr-1" />
      {text}
    </Badge>
  );
}
