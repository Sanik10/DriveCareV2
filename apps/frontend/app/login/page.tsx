// path: apps/frontend/app/login/page.tsx
'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { useState } from 'react';

const schema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
});

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search.get('next') || '/invoices';
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      setLoading(true);
      await api.auth.login(values);
      toast.success('Вход выполнен');
      router.push(nextPath);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Проверьте данные';
      toast.error('Не удалось войти', { description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid place-items-center py-16">
      <Card className="w-full max-w-md relative overflow-hidden hover-lift">
        <div className="absolute inset-0 opacity-10 bg-hyperdrive" />
        <div className="relative">
          <h1 className="text-2xl font-semibold mb-4">Добро пожаловать</h1>
          <p className="text-sm text-fg-secondary mb-6">Войдите, чтобы просмотреть счета и оплатить их</p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <Input type="email" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm mb-1">Пароль</label>
              <Input type="password" autoComplete="current-password" {...register('password')} />
              {errors.password && <p className="text-xs text-danger mt-1">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <LogIn className="w-4 h-4 mr-1" /> Войти
            </Button>
          </form>
          <p className="text-xs text-fg-secondary mt-4">
            Нет доступа? Посмотрите тарифы: <Link className="underline" href="/tariffs">Тарифы</Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
