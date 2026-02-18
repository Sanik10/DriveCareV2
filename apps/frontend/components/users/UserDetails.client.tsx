// path: apps/frontend/components/users/UserDetails.client.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, User as UserIcon, Mail, Phone, Shield, Calendar, Activity, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { usersAPI } from '@/lib/api/users';
import type { User } from '@/lib/types/users';
import { getRoleLabel } from '@/lib/utils/role-labels';
import UserSessions from '@/components/users/UserSessions.client';

function getFullName(u: User | null) {
  if (!u) return 'Карточка сотрудника';
  const first = (u.firstName || '').trim();
  const last = (u.lastName || '').trim();
  const full = [first, last].filter(Boolean).join(' ');
  return full || u.email || 'Карточка сотрудника';
}

function getInitials(u: User | null) {
  if (!u) return '?';
  const a = (u.firstName || '').trim()[0] || '';
  const b = (u.lastName || '').trim()[0] || '';
  const c = (u.email || '').trim()[0] || '';
  return ((a + b) || c || '?').toUpperCase();
}

function statusLabel(status?: string) {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return 'Активен';
    case 'inactive':
      return 'Неактивен';
    case 'suspended':
    case 'blocked':
      return 'Заблокирован';
    default:
      return '—';
  }
}

export default function UserDetailsClient({ id }: { id: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isActive = useMemo(() => (user?.status || 'active') === 'active', [user]);
  const roleText = useMemo(() => (user?.role?.name ? getRoleLabel(user.role.name) : '—'), [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const u = await usersAPI.getUser(id);
        if (mounted) setUser(u);
      } catch {
        // если 401 — твой глобальный перехватчик в apiRequest обычно редиректит на /login
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <div className="space-y-8">
      {/* Back button */}
      <Link href="/dashboard/users">
        <Button variant="outline" className="rounded-2xl btn-outline-fixed group">
          <ChevronLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Назад к команде
        </Button>
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/30 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-8">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-6">
          {/* Avatar */}
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-3xl font-bold text-white shadow-glass">
            {loading ? '…' : getInitials(user)}
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {loading ? <Skeleton className="h-7 w-64 rounded-lg" /> : getFullName(user)}
              </h1>
              {loading ? (
                <Skeleton className="h-6 w-24 rounded-xl" />
              ) : (
                <Badge
                  variant={isActive ? 'default' : 'outline'}
                  className={`rounded-xl ${isActive ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : ''}`}
                >
                  {statusLabel(user?.status)}
                </Badge>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-4 w-80 rounded" />
            ) : (
              <p className="text-muted-foreground">ID: {user?.id}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Информация */}
        <Card className="p-6 rounded-3xl border-border/30 glass space-y-4">
          <div className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Основная информация</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-52" />
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{user?.email || '—'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{user?.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{roleText}</span>
              </div>
              {user?.specialization ? (
                <div className="flex items-center gap-3">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{user.specialization}</span>
                </div>
              ) : null}
            </div>
          )}
        </Card>

        {/* Активность */}
        <Card className="p-6 rounded-3xl border-border/30 glass space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Активность</h3>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-6 w-28 rounded-xl" />
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Дата создания: {user?.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Последний вход: {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}
                </span>
              </div>

              {/* Онлайн/сессии (админский просмотр) */}
              {user?.id ? (
                <div className="pt-2">
                  <UserSessions userId={user.id} compact />
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      {/* Future actions */}
      <Card className="p-8 rounded-3xl border-border/30 glass text-center">
        <p className="text-muted-foreground">
          🚧 Скоро добавим действия: смена роли, блокировка/разблокировка, редактирование профиля
        </p>
      </Card>
    </div>
  );
}
