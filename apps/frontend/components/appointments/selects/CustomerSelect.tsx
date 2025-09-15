// path: apps/frontend/components/appointments/selects/CustomerSelect.tsx
'use client';

import { AsyncCombobox, type AsyncOption } from '@/components/ui/async-combobox';
import { customersAPI } from '@/lib/api/customers';
import type { CustomersQuery, CustomerResponse } from '@/lib/types/customers';

export type CustomerOption = AsyncOption<CustomerResponse>;

type Props = {
  value: CustomerOption | null;
  onChange: (opt: CustomerOption | null) => void;
  placeholder?: string;
};

export function CustomerSelect({ value, onChange, placeholder = 'Клиент (поиск по имени/компании/телефону)' }: Props) {
  const fetchOptions = async (query: string): Promise<CustomerOption[]> => {
    const q: CustomersQuery = { search: query || undefined, limit: 10, page: 1 };
    const res = await customersAPI.getCustomers(q);
    return (res.items || []).map((c) => ({
      id: c.id,
      label:
        c.companyName ||
        [c.lastName, c.firstName].filter(Boolean).join(' ') ||
        c.email ||
        c.phone ||
        c.id,
      meta: c,
    }));
  };

  return <AsyncCombobox value={value} onChange={onChange} fetchOptions={fetchOptions} placeholder={placeholder} />;
}
