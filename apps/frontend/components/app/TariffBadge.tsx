// path: apps/frontend/components/app/TariffBadge.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { subscriptionBillingAPI } from '@/lib/api/subscription-billing';
import type { BillingSubscriptionResponse } from '@/lib/types/subscriptions';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';

export function TariffBadge() {
  const [sub, setSub] = useState<BillingSubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await subscriptionBillingAPI.getActive();
        if (mounted) setSub(s);
      } catch {
        // ignore UI errors
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading || !sub) return null;

  const plan = sub.tariff?.name || 'Тариф';
  const period = sub.billingPeriod === 'yearly' ? 'год' : 'мес';
  const label = `${plan} • ${period}`;

  return (
    <Link href="/dashboard/billing">
      <Button variant="outline" className="rounded-2xl btn-outline-fixed flex items-center gap-2">
        <Star className="w-4 h-4 text-primary" />
        <span className="truncate max-w-[160px]">{label}</span>
      </Button>
    </Link>
  );
}
