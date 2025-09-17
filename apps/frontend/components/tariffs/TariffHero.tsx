// path: apps/frontend/components/tariffs/TariffHero.tsx
'use client';

import { ShieldCheck, CreditCard, CheckCircle2 } from 'lucide-react';
import styles from '@/app/tariffs/tariffs.module.css';

export function TariffHero() {
  return (
    <section className="relative overflow-hidden rounded-3xl glass border border-border/30 p-8 md:p-10">
      <div className={`absolute -z-10 inset-0 ${styles.heroGlow}`} />
      <div className="space-y-3 relative">
        <h1 className="text-3xl md:text-4xl font-bold">
          Прозрачные тарифы для роста вашего автосервиса
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Оплачивайте по месяцу или экономьте при годовой оплате. Без скрытых платежей. Быстрый старт и приоритетная поддержка на старших планах.
        </p>
      </div>

      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        <TrustItem icon={<ShieldCheck className="w-4 h-4" />} text="Безопасность: 161‑ФЗ, PCI (карточные данные не храним)" />
        <TrustItem icon={<CreditCard className="w-4 h-4" />} text="54‑ФЗ: чек у ОФД через YooKassa" />
        <TrustItem icon={<CheckCircle2 className="w-4 h-4" />} text="Простая отмена и перенос подписки" />
      </div>
    </section>
  );
}

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground glass-subtle rounded-2xl px-3 py-2 border border-border/30">
      <span className="text-primary">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
