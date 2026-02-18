// path: apps/frontend/app/dashboard/users/[id]/page.tsx
import UserDetailsClient from '@/components/users/UserDetails.client';

export default async function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Next 15+: params — Promise
  const { id } = await params;

  // Важно: не делаем серверных запросов к API тут (иначе потеряем куки/токен)
  // Весь фетч уходит в клиентский компонент, где браузер автоматически пришлет cookies и сработает refresh.
  return <UserDetailsClient id={id} />;
}
