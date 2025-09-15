// path: apps/frontend/components/appointments/selects/MechanicSelect.tsx
'use client';

import { AsyncCombobox, type AsyncOption } from '@/components/ui/async-combobox';
import { usersAPI } from '@/lib/api/users';
import type { UserResponse, UsersQuery } from '@/lib/types/users';

export type MechanicOption = AsyncOption<UserResponse>;

type Props = {
  value: MechanicOption | null;
  onChange: (opt: MechanicOption | null) => void;
  placeholder?: string;
};

export function MechanicSelect({ value, onChange, placeholder = 'Мастер (mechanic)' }: Props) {
  const fetchOptions = async (query: string): Promise<MechanicOption[]> => {
    const q: UsersQuery = { role: 'mechanic', search: query || undefined, page: 1, limit: 10 };
    const res = await usersAPI.search(q);
    return (res.items || []).map((u) => ({
      id: u.id,
      label: [u.lastName, u.firstName].filter(Boolean).join(' ') || u.email || u.phone || u.id,
      meta: u,
    }));
  };

  return <AsyncCombobox value={value} onChange={onChange} fetchOptions={fetchOptions} placeholder={placeholder} />;
}
