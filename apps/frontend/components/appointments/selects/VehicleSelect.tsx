// path: apps/frontend/components/appointments/selects/VehicleSelect.tsx
'use client';

import { AsyncCombobox, type AsyncOption } from '@/components/ui/async-combobox';
import { vehiclesAPI } from '@/lib/api/vehicles';
import type { VehicleResponse } from '@/lib/types/vehicles';

export type VehicleOption = AsyncOption<VehicleResponse>;

type Props = {
  customerId?: string;
  value: VehicleOption | null;
  onChange: (opt: VehicleOption | null) => void;
  placeholder?: string;
};

export function VehicleSelect({ customerId, value, onChange, placeholder = 'Автомобиль клиента' }: Props) {
  const fetchOptions = async (query: string): Promise<VehicleOption[]> => {
    if (!customerId) return [];
    const res = await vehiclesAPI.getCustomerVehicles(customerId);
    const norm = (s?: string | null) => (s || '').toLowerCase();
    const q = norm(query);
    return res
      .filter((v) => {
        if (!q) return true;
        return (
          norm(v.licensePlate).includes(q) ||
          norm(v.vin).includes(q) ||
          norm(v?.model?.name).includes(q) ||
          norm(v?.customer?.lastName).includes(q) ||
          norm(v?.customer?.firstName).includes(q)
        );
      })
      .slice(0, 20)
      .map((v) => ({
        id: v.id,
        label: v?.licensePlate || v?.vin || v?.model?.name || v.id,
        meta: v,
      }));
  };

  return (
    <AsyncCombobox
      value={value}
      onChange={onChange}
      fetchOptions={fetchOptions}
      placeholder={placeholder}
      disabled={!customerId}
    />
  );
}
