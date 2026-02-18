// path: apps/frontend/components/users/UserSessions.client.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Wifi, WifiOff, MonitorSmartphone, Clock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { listUserSessions, type AdminUserSession } from '@/lib/api/user-sessions';

function isOnline(sessions: AdminUserSession[], windowMs = 2 * 60 * 1000) {
  const now = Date.now();
  return sessions.some((s) => {
    if (!s.isActive) return false;
    const ts = s.lastUsedAt ? new Date(s.lastUsedAt).getTime() : new Date(s.createdAt).getTime();
    return now - ts <= windowMs;
  });
}

export default function UserSessions({
  userId,
  compact = false,
  pollIntervalMs = 60_000,
}: {
  userId: string;
  compact?: boolean;
  pollIntervalMs?: number;
}) {
  const [sessions, setSessions] = useState<AdminUserSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const list = await listUserSessions(userId);
        if (mounted) setSessions(list);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    const t = setInterval(() => void load(), pollIntervalMs);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [userId, pollIntervalMs]);

  const online = useMemo(() => isOnline(sessions), [sessions]);

  if (compact) {
    return online ? (
      <Badge className="rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
        <Wifi className="w-3.5 h-3.5 mr-1" />
        Онлайн
      </Badge>
    ) : (
      <Badge variant="outline" className="rounded-xl">
        <WifiOff className="w-3.5 h-3.5 mr-1" />
        Оффлайн
      </Badge>
    );
  }

  return (
    <Card className="p-4 rounded-2xl border-border/30 glass space-y-3">
      <div className="flex items-center gap-2">
        {online ? (
          <Badge className="rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
            <Wifi className="w-3.5 h-3.5 mr-1" />
            Онлайн
          </Badge>
        ) : (
          <Badge variant="outline" className="rounded-xl">
            <WifiOff className="w-3.5 h-3.5 mr-1" />
            Оффлайн
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {loading && <div className="text-sm text-muted-foreground">Загрузка сессий…</div>}
        {!loading && sessions.length === 0 && (
          <div className="text-sm text-muted-foreground">Сессий нет</div>
        )}
        {sessions.slice(0, 5).map((s) => (
          <div key={s.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <MonitorSmartphone className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{s.deviceName || s.deviceId}</span>
              <span className="text-muted-foreground truncate">({s.ipAddress})</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span title={s.lastUsedAt || s.createdAt}>
                {new Date(s.lastUsedAt || s.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
