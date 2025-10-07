// path: apps/frontend/components/users/InvitesList.client.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, RefreshCw, Trash2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

import { listInvites, resendInvite, revokeInvite, listAssignableRoles } from '@/lib/api/users';
import type { UserInvite } from '@/lib/types/user-invites';
import type { Role } from '@/lib/types/users';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const statusConfig: Record<
  UserInvite['status'],
  { label: string; variant: 'default' | 'secondary' | 'outline'; icon: any; color: string }
> = {
  pending: { label: 'Ожидает', variant: 'secondary', icon: Clock, color: 'text-amber-500' },
  accepted: { label: 'Принято', variant: 'default', icon: CheckCircle, color: 'text-green-500' },
  revoked: { label: 'Отозвано', variant: 'outline', icon: XCircle, color: 'text-gray-500' },
  expired: { label: 'Истекло', variant: 'outline', icon: AlertCircle, color: 'text-red-500' },
};

export default function InvitesList() {
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const roleById = useMemo(() => {
    const map = new Map<string, string>();
    roles.forEach((r) => map.set(r.id, r.name));
    return map;
  }, [roles]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, rolesList] = await Promise.all([
        listInvites().catch(() => []),
        listAssignableRoles().catch(() => []),
      ]);
      setInvites(data || []);
      setRoles(rolesList || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleResend(id: string) {
    setActionLoading(id);
    try {
      const res = await resendInvite(id);
      if (res?.inviteUrl) {
        await navigator.clipboard?.writeText(res.inviteUrl).catch(() => {});
        toast.success('Ссылка скопирована в буфер обмена');
      }
      toast.success('Приглашение отправлено повторно');
      await load();
    } catch {
      toast.error('Не удалось отправить приглашение');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRevoke(id: string) {
    setActionLoading(id);
    try {
      await revokeInvite(id);
      toast.success('Приглашение отозвано');
      await load();
    } catch {
      toast.error('Не удалось отозвать приглашение');
    } finally {
      setActionLoading(null);
    }
  }

  const pendingInvites = invites.filter((i) => i.status === 'pending');
  const otherInvites = invites.filter((i) => i.status !== 'pending');

  if (loading) {
    return (
      <Card className="p-6 rounded-3xl border-border/30 glass">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            <span className="text-sm text-muted-foreground">Загрузка приглашений...</span>
          </div>
        </div>
      </Card>
    );
  }

  if (invites.length === 0) {
    return (
      <Card className="p-8 rounded-3xl border-border/30 glass text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50">
            <Mail className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h4 className="font-semibold">Нет активных приглашений</h4>
            <p className="text-sm text-muted-foreground">Отправленные приглашения появятся здесь</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ожидающие приглашения */}
      {pendingInvites.length > 0 && (
        <Card className="overflow-hidden rounded-3xl border-border/30 glass surface-glow">
          <div className="border-b border-border/30 bg-muted/30 px-6 py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <h4 className="text-sm font-medium">Ожидают принятия ({pendingInvites.length})</h4>
            </div>
          </div>
          <div className="divide-y divide-border/30">
            {pendingInvites.map((inv) => {
              const statusInfo = statusConfig[inv.status];
              const StatusIcon = statusInfo.icon;
              const isLoading = actionLoading === inv.id;

              return (
                <div key={inv.id} className="px-6 py-4 transition-colors hover:bg-muted/20 group">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                          <Mail className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{inv.email}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            Роль: {roleById.get(inv.roleId) || '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Истекает: {new Date(inv.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-2xl"
                        onClick={() => handleResend(inv.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-2xl text-destructive hover:bg-destructive/10"
                        onClick={() => handleRevoke(inv.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* История приглашений */}
      {otherInvites.length > 0 && (
        <Card className="overflow-hidden rounded-3xl border-border/30 glass">
          <div className="border-b border-border/30 bg-muted/30 px-6 py-3">
            <h4 className="text-sm font-medium text-muted-foreground">История ({otherInvites.length})</h4>
          </div>
          <div className="divide-y divide-border/30">
            {otherInvites.map((inv) => {
              const statusInfo = statusConfig[inv.status];
              const StatusIcon = statusInfo.icon;

              return (
                <div key={inv.id} className="px-6 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <StatusIcon className={`h-4 w-4 flex-shrink-0 ${statusInfo.color}`} />
                    <p className="truncate text-sm">{inv.email}</p>
                  </div>
                  <Badge variant={statusInfo.variant} className="rounded-xl flex-shrink-0">
                    {statusInfo.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
