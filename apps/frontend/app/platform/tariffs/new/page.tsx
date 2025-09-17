// path: apps/frontend/app/platform/tariffs/new/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { PlatformGuard } from '@/components/platform/PlatformGuard'
import { NavigationHeader } from '@/components/platform/NavigationHeader'
import { TariffForm } from '@/components/platform/tariffs/TariffForm'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import Link from 'next/link'

export default function PlatformTariffNewPage() {
  const router = useRouter()

  const actions = (
    <Link href="/platform/tariffs">
      <Button size="sm" variant="outline" className="rounded-xl btn-outline-fixed">
        <FileText className="w-4 h-4" />
        Все тарифы
      </Button>
    </Link>
  )

  return (
    <main className="container py-8">
      <NavigationHeader 
        title="Создание тарифа"
        subtitle="Новый тарифный план с настройкой функций и маркетинга"
        backHref="/platform/tariffs"
        backLabel="К списку тарифов"
        showDashboard={false}
        actions={actions}
      />

      <PlatformGuard>
        <TariffForm
          initial={null}
          onSaved={(tariff) => {
            router.push(`/platform/tariffs/${tariff.id}`)
          }}
        />
      </PlatformGuard>
    </main>
  )
}
