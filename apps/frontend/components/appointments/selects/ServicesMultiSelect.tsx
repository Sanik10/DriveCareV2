// path: apps/frontend/components/appointments/selects/ServicesMultiSelect.tsx
'use client';

import { AsyncMultiSelect, type MultiOption } from '@/components/ui/async-multiselect';
import { servicesAPI } from '@/lib/api/services';
import type { ServiceCatalogueItem, ServicesQuery } from '@/lib/types/services';

export type ServiceOption = MultiOption<ServiceCatalogueItem>;

type Props = {
  values: ServiceOption[];
  onChange: (values: ServiceOption[]) => void;
  placeholder?: string;
};

function fmtMoney(n: number | undefined, currency: string = 'RUB') {
  if (typeof n !== 'number' || Number.isNaN(n)) return '';
  try {
    return n.toLocaleString('ru-RU', { style: 'currency', currency });
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

export function ServicesMultiSelect({ values, onChange, placeholder = 'Услуги' }: Props) {
  const fetchOptions = async (query: string): Promise<ServiceOption[]> => {
    const q: ServicesQuery = { search: query || undefined, limit: 10, page: 1 };
    const res = await servicesAPI.search(q);
    return (res.items || []).map((s) => {
      const legacy = (s as unknown as { duration?: number }).duration;
      const duration = s.durationMinutes ?? legacy ?? 0;
      return {
        id: s.id,
        label: `${s.name} • ${fmtMoney(s.price)} • ${duration} мин`,
        meta: s,
      };
    });
  };

  return (
    <AsyncMultiSelect
      values={values}
      onChange={onChange}
      fetchOptions={fetchOptions}
      placeholder={placeholder}
      maxSelected={50}
    />
  );
}
