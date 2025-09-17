// path: apps/frontend/components/platform/tariffs/TariffEdit.client.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { PlatformGuard } from '@/components/platform/PlatformGuard'
import { NavigationHeader } from '@/components/platform/NavigationHeader'
import { TariffForm } from '@/components/platform/tariffs/TariffForm'
import { tariffsAPI } from '@/lib/api/tariffs'
import type { Tariff } from '@/lib/types/tariffs'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Eye, Trash2 } from 'lucide-react'
import Link from 'next/link'

export function TariffEditClient({ id }: { id: string }) {
  const [item, setItem] = useState<Tariff | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const t = await tariffsAPI.get(id)
      setItem(t)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setErr(msg || 'Тариф не найден')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async () => {
    if (!item || deleting) return
    
    if (!confirm(`Удалить тариф "${item.name}"?\n\nЭто действие необратимо. Тариф будет удалён только если нет активных подписок.`)) {
      return
    }
    
    setDeleting(true)
    try {
      await tariffsAPI.remove(item.id)
      router.push('/platform/tariffs')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      alert(`Не удалось удалить тариф: ${msg}`)
    } finally {
      setDeleting(false)
    }
  }

  const actions = item ? (
    <div className="flex items-center gap-2">
      <Link href={`/tariffs/${item.id}`} target="_blank">
        <Button size="sm" variant="outline" className="rounded-xl btn-outline-fixed">
          <Eye className="w-4 h-4" />
          Предпросмотр
        </Button>
      </Link>
      <Button 
        size="sm" 
        variant="destructive" 
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-xl"
      >
        <Trash2 className="w-4 h-4" />
        {deleting ? 'Удаление...' : 'Удалить'}
      </Button>
    </div>
  ) : undefined

  return (
    <main className="container py-8">
      <NavigationHeader 
        title="Редактирование тарифа"
        subtitle={item ? `Тариф: ${item.name}` : undefined}
        backHref="/platform/tariffs"
        backLabel="К списку тарифов"
        showDashboard={false}
        actions={actions}
      />

      <PlatformGuard>
        {loading ? (
          <div className="glass border border-border/30 rounded-3xl p-12 text-center">
            <div className="space-y-4">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Загрузка тарифа...</p>
            </div>
          </div>
        ) : err ? (
          <div className="glass border border-destructive/30 rounded-3xl p-12 text-center">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-destructive mb-2">Ошибка загрузки</h3>
                <p className="text-sm text-muted-foreground">{err}</p>
              </div>
              <Button onClick={() => void load()} variant="outline" className="rounded-xl">
                Попробовать снова
              </Button>
            </div>
          </div>
        ) : item ? (
          <TariffForm initial={item} onSaved={(t) => setItem(t)} />
        ) : null}
      </PlatformGuard>
    </main>
  )
}
