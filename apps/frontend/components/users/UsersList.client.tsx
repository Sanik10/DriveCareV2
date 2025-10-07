// path: apps/frontend/components/users/UsersList.client.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Search, 
  ChevronRight, 
  TrendingUp, 
  CheckCircle2, 
  Shield, 
  UserCheck,
  Clock,
  AlertTriangle,
  Sparkles,
  Mail,
  Phone
} from 'lucide-react';

import { listUsers, listInvites } from '@/lib/api/users';
import { subscriptionBillingAPI } from '@/lib/api/subscription-billing';
import type { User } from '@/lib/types/users';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageFeatureBadge } from '@/components/app/PageFeatureBadge';
import { PageFiltersCard, PageFiltersRow } from '@/components/app/PageFiltersCard';
import { PageContentCard } from '@/components/app/PageContentCard';
import { StatsCard, StatsGrid } from '@/components/app/StatsCard';
import { InviteUserDialog } from './invite-user-dialog';
import InvitesList from './InvitesList.client';
import { getRoleLabel, getRoleCategoryIcon } from '@/lib/utils/role-labels';

function getFullName(u: User) {
  const first = (u.firstName || '').trim();
  const last = (u.lastName || '').trim();
  const full = [first, last].filter(Boolean).join(' ');
  return full || u.email || 'Без имени';
}

function getInitials(u: User) {
  const first = (u.firstName || '').trim()[0] || '';
  const last = (u.lastName || '').trim()[0] || '';
  return (first + last).toUpperCase() || '?';
}

export default function UsersList() {
  // ✅ ВСЕ useState в начале
  const [users, setUsers] = useState<User[]>([]);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [maxUsers, setMaxUsers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [openInvite, setOpenInvite] = useState(false);
  const [query, setQuery] = useState('');

  // ✅ ВСЕ useCallback/useMemo ДО условных return
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ items }, invitesList, active] = await Promise.all([
        listUsers().catch(() => ({ items: [] as User[] })),
        listInvites().catch(() => [] as any[]),
        subscriptionBillingAPI.getActive().catch(() => null),
      ]);
      setUsers(items || []);
      setPendingInvitesCount((invitesList || []).filter((i: any) => i.status === 'pending').length);
      setMaxUsers(active?.tariff?.maxUsers ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const full = getFullName(u).toLowerCase();
      const email = (u.email || '').toLowerCase();
      return full.includes(q) || email.includes(q);
    });
  }, [users, query]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => (u.status || 'active') === 'active').length;
    const used = total + pendingInvitesCount;
    const limitReached = maxUsers !== null && used >= maxUsers;
    const usagePercentage = maxUsers ? Math.min((used / maxUsers) * 100, 100) : 0;

    return {
      total,
      active,
      pendingInvites: pendingInvitesCount,
      used,
      maxUsers,
      limitReached,
      usagePercentage,
    };
  }, [users, pendingInvitesCount, maxUsers]);

  // ✅ ВСЕ useEffect
  useEffect(() => {
    load();
  }, [load]);

  // ✅ Функции
  const handleRefresh = () => {
    void load();
  };

  // ✅ Никаких условных return - сразу рендер
  return (
    <div className="space-y-6">
      {/* Feature Badge */}
      <PageFeatureBadge
        variant="slate-gray"
        icon={Shield}
        title="Управление командой"
        description="Приглашайте сотрудников, назначайте роли и отслеживайте лимиты тарифа. Поддержка ролевой модели и приглашений."
        aside={
          stats.limitReached ? (
            <Badge variant="destructive" className="gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              Лимит достигнут
            </Badge>
          ) : null
        }
      />

      {/* Filters */}
      <PageFiltersCard>
        <PageFiltersRow>
          <div className="relative">
            <Input
              className="pl-9 h-10 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
              placeholder="Поиск по имени или email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-2xl btn-outline-fixed"
              onClick={handleRefresh}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Текущий план
            </Button>
            <Button
              className="rounded-2xl bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-[1.02]"
              onClick={() => setOpenInvite(true)}
              disabled={stats.limitReached}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Пригласить сотрудника
            </Button>
          </div>
        </PageFiltersRow>
      </PageFiltersCard>

      {/* Stats */}
      <StatsGrid cols={4}>
        <StatsCard
          title="Всего сотрудников"
          value={stats.total}
          icon={UsersIcon}
          color="blue"
        />
        <StatsCard
          title="Активных"
          value={stats.active}
          icon={UserCheck}
          color="emerald"
        />
        <StatsCard
          title="Ожидают приглашения"
          value={stats.pendingInvites}
          icon={Clock}
          color="amber"
          highlight={stats.pendingInvites > 0}
        />
        
        {/* Usage Limit Card - специальная карточка с прогресс-баром */}
        <Card className={`p-4 glass border rounded-2xl transition-all duration-300 hover:scale-[1.02] ${
          stats.limitReached 
            ? 'from-red-500/10 to-red-600/5 border-red-500/20' 
            : 'from-surface-1/40 to-surface-2/40 border-border/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              stats.limitReached ? 'bg-red-500/20' : 'bg-surface-1/40'
            }`}>
              <TrendingUp className={`w-4 h-4 ${
                stats.limitReached ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
              }`} />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Использование лимита</div>
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold">
                  {stats.maxUsers !== null ? `${stats.used} / ${stats.maxUsers}` : stats.used}
                </div>
                {stats.maxUsers !== null && (
                  <Badge variant={stats.limitReached ? 'destructive' : 'secondary'} className="text-xs">
                    {stats.usagePercentage.toFixed(0)}%
                  </Badge>
                )}
              </div>
              {stats.maxUsers !== null && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-1/50">
                  <div
                    className={`h-full transition-all duration-500 ${
                      stats.usagePercentage >= 90
                        ? 'bg-gradient-to-r from-red-500 to-orange-500'
                        : stats.usagePercentage >= 70
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                        : 'bg-gradient-primary'
                    }`}
                    style={{ width: `${stats.usagePercentage}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>
      </StatsGrid>

      {/* Limit Warning */}
      {stats.limitReached && (
        <Card className="p-4 glass border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-600 dark:text-amber-400">Достигнут лимит тарифа</h3>
              <p className="text-sm text-muted-foreground">
                Обновите тарифный план для добавления новых сотрудников
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-2xl btn-outline-fixed"
              onClick={() => window.location.assign('/dashboard/billing')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Обновить план
            </Button>
          </div>
        </Card>
      )}

      {/* Users Table */}
      <PageContentCard
        loading={loading}
        empty={filteredUsers.length === 0}
        emptyState={{
          icon: UsersIcon,
          title: 'Сотрудники не найдены',
          description: query
            ? 'Попробуйте изменить параметры поиска'
            : 'Начните с приглашения первого сотрудника в команду',
          action: !query && !stats.limitReached
            ? {
                label: 'Пригласить сотрудника',
                onClick: () => setOpenInvite(true),
                icon: UserPlus,
              }
            : undefined,
        }}
        onRetry={handleRefresh}
        loadingRows={5}
      >
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs font-medium uppercase text-muted-foreground bg-muted/30 border-b border-border/30">
          <div className="col-span-4">Сотрудник</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Роль</div>
          <div className="col-span-2">Статус</div>
          <div className="col-span-1 text-right">Действия</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-border/30">
          {filteredUsers.map((user) => {
            const roleSlug = user.role?.name || 'viewer';
            const roleLabel = getRoleLabel(roleSlug);
            const roleIcon = getRoleCategoryIcon(roleSlug);
            const isActive = (user.status || 'active') === 'active';

            return (
              <div
                key={user.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 transition-colors hover:bg-muted/20 group"
              >
                {/* User */}
                <div className="col-span-4 flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 text-sm font-semibold text-primary">
                      {getInitials(user)}
                    </div>
                    {isActive && (
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{getFullName(user)}</p>
                    {user.phone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <span className="truncate">{user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="col-span-3 flex items-center">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <p className="truncate text-sm text-muted-foreground">{user.email || '—'}</p>
                  </div>
                </div>

                {/* Role */}
                <div className="col-span-2 flex items-center">
                  <Badge variant="secondary" className="gap-1.5 rounded-xl">
                    <span>{roleIcon}</span>
                    {roleLabel}
                  </Badge>
                </div>

                {/* Status */}
                <div className="col-span-2 flex items-center">
                  {isActive ? (
                    <Badge
                      variant="default"
                      className="gap-1.5 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Активен
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1.5 rounded-xl">
                      Неактивен
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                    onClick={() => window.location.assign(`/dashboard/users/${user.id}`)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </PageContentCard>

      {/* Invites List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-primary" />
          <h3 className="text-lg font-semibold flex items-center gap-2">
            Активные приглашения
          </h3>
          {stats.pendingInvites > 0 && (
            <Badge variant="secondary" className="rounded-full">
              {stats.pendingInvites}
            </Badge>
          )}
        </div>
        <InvitesList />
      </div>

      {/* Invite Dialog */}
      <InviteUserDialog open={openInvite} onOpenChange={setOpenInvite} onSuccess={load} />
    </div>
  );
}
