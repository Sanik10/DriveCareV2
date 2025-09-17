// path: apps/frontend/components/tariffs/TariffCompareTable.tsx
'use client';

import type { ReactNode } from 'react';
import { Tariff } from '@/lib/types/tariffs';
import { formatCurrencyRu, formatLimit } from '@/lib/format';

export function TariffCompareTable({ tariffs }: { tariffs: Tariff[] }) {
  const allFeatureKeys = Array.from(
    new Set(tariffs.flatMap((t) => Object.keys(t.features ?? {})))
  );

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto glass border border-border/30 rounded-3xl">
        <table className="min-w-[800px] w-full">
          <thead>
            <tr className="bg-muted/30">
              <th className="p-3 text-left">Параметр</th>
              {tariffs.map((t) => (
                <th key={t.id} className="p-3 text-left">{t.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Цена/мес" values={tariffs.map((t) => formatCurrencyRu(t.priceMonthly))} />
            <Row label="Цена/год" values={tariffs.map((t) => formatCurrencyRu(t.priceYearly))} />
            <Row label="Пользователи" values={tariffs.map((t) => formatLimit(t.maxUsers))} />
            <Row label="Клиенты" values={tariffs.map((t) => formatLimit(t.maxCustomers))} />
            <Row label="ТС" values={tariffs.map((t) => formatLimit(t.maxVehicles))} />
            <Row label="Заказы" values={tariffs.map((t) => formatLimit(t.maxOrders))} />

            {allFeatureKeys.length > 0 && (
              <tr className="border-t bg-muted/30">
                <td className="p-3 font-medium" colSpan={1 + tariffs.length}>Возможности</td>
              </tr>
            )}

            {allFeatureKeys.map((k) => (
              <tr key={k} className="border-t">
                <td className="p-3">{humanizeFeatureKey(k)}</td>
                {tariffs.map((t) => {
                  const val = (t.features ?? {})[k];
                  return (
                    <td key={t.id} className="p-3">
                      {renderFeatureValue(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, values }: { label: string; values: (string | number)[] }) {
  return (
    <tr className="border-t">
      <td className="p-3 font-medium">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="p-3">{v}</td>
      ))}
    </tr>
  );
}

function humanizeFeatureKey(k: string): string {
  return k
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function renderFeatureValue(v: unknown): ReactNode {
  if (typeof v === 'boolean') {
    return v ? <span className="text-emerald-600">✅</span> : '—';
  }
  if (v == null) return '—';
  return String(v);
}
