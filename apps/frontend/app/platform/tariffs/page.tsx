// path: apps/frontend/app/platform/tariffs/page.tsx
'use client'

import Link from 'next/link'
import { PlatformGuard } from '@/components/platform/PlatformGuard'
import { NavigationHeader } from '@/components/platform/NavigationHeader'
import { TariffListClient } from '@/components/platform/tariffs/TariffList.client'
import { Button } from '@/components/ui/button'
import { Plus, Settings } from 'lucide-react'

export default function PlatformTariffsPage() {
  const actions = (
    <div className="flex items-center gap-2">
      <Link href="/tariffs">
        <Button size="sm" variant="outline" className="rounded-xl btn-outline-fixed">
          <Settings className="w-4 h-4" />
          Публичный каталог
        </Button>
      </Link>
      <Link href="/platform/tariffs/new">
        <Button size="sm" className="rounded-xl bg-gradient-primary hover:opacity-90">
          <Plus className="w-4 h-4" />
          Создать тариф
        </Button>
      </Link>
    </div>
  )

  return (
    <main className="container py-8">
      <NavigationHeader 
        title="Управление тарифами"
        subtitle="Создание, редактирование и настройка тарифных планов"
        showDashboard={false}
        actions={actions}
      />

      <PlatformGuard>
        <TariffListClient />
      </PlatformGuard>
    </main>
  )
}
