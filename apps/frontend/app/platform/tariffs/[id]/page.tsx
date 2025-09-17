// path: apps/frontend/app/platform/tariffs/[id]/page.tsx
import { TariffEditClient } from '@/components/platform/tariffs/TariffEdit.client';

export default async function PlatformTariffEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // Next 15: params — это Promise
  return <TariffEditClient id={id} />;
}
