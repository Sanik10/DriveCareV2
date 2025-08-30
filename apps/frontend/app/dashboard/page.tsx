// path: apps/frontend/app/dashboard/page.tsx
"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, Users, Wrench, Calendar, FileText, 
  Package, Settings, Car, Truck, Shield
} from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/hooks/use-auth'

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated, error, logout, checkAuth, clearError } = useAuth()
  const router = useRouter()
  const redirectAttempted = useRef(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    if (!isLoading && !isAuthenticated && !user && !error && !redirectAttempted.current) {
      redirectAttempted.current = true
      router.push('/login')
    }
  }, [isMounted, isLoading, isAuthenticated, user, error, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      redirectAttempted.current = false
    }
  }, [isAuthenticated, user])

  const handleRetry = () => {
    clearError()
    checkAuth(true)
  }

  if (!isMounted) return null

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1 flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Ошибка подключения</h3>
            <p className="text-muted-foreground text-sm mt-2">{error}</p>
          </div>
          <div className="flex items-center justify-center gap-4">
            <Button onClick={handleRetry}>
              Попробовать снова
            </Button>
            <Link href="/login">
              <Button variant="outline">
                Войти заново
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-surface -z-10"></div>
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-primary opacity-5 rounded-full blur-3xl -z-10"></div>
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10"></div>

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-gradient-primary">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  DriveCare
                </h1>
                <p className="text-xs text-muted-foreground">
                  Панель управления
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.role?.name || 'Пользователь'}
                </p>
              </div>
              <Button variant="outline" onClick={logout}>
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">
              Добро пожаловать, {user.firstName}!
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Ваша система управления автосервисом готова к работе. 
              Начните с настройки основных разделов.
            </p>
          </div>

          {/* Main Modules Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Security */}
            <Link href="/dashboard/security">
              <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50 hover:shadow-glass transition-shadow group cursor-pointer">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Безопасность</h3>
                    <p className="text-sm text-muted-foreground">
                      Управление устройствами и двухфакторной аутентификацией
                    </p>
                  </div>
                </div>
              </Card>
            </Link>

            {/* Orders */}
            <Link href="/dashboard/orders">
              <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50 hover:shadow-glass transition-shadow group cursor-pointer">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Wrench className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Заказы</h3>
                    <p className="text-sm text-muted-foreground">
                      Управление заказами на ремонт и обслуживание
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Открыть
                  </Button>
                </div>
              </Card>
            </Link>

            {/* Customers */}
            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50 hover:shadow-glass transition-shadow group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Клиенты</h3>
                  <p className="text-sm text-muted-foreground">
                    База клиентов и история обслуживания
                  </p>
                </div>
                <Button variant="outline" size="sm" className="w-full" disabled>
                  Скоро
                </Button>
              </div>
            </Card>

            {/* Vehicles */}
            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50 hover:shadow-glass transition-shadow group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Car className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Автомобили</h3>
                  <p className="text-sm text-muted-foreground">
                    Учет автомобилей и техническая информация
                  </p>
                </div>
                <Button variant="outline" size="sm" className="w-full" disabled>
                  Скоро
                </Button>
              </div>
            </Card>

            {/* Appointments */}
            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50 hover:shadow-glass transition-shadow group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Записи</h3>
                  <p className="text-sm text-muted-foreground">
                    Планирование и управление записями
                  </p>
                </div>
                <Button variant="outline" size="sm" className="w-full" disabled>
                  Скоро
                </Button>
              </div>
            </Card>

            {/* Inventory */}
            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50 hover:shadow-glass transition-shadow group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Склад</h3>
                  <p className="text-sm text-muted-foreground">
                    Управление запасами и остатками
                  </p>
                </div>
                <Button variant="outline" size="sm" className="w-full" disabled>
                  Скоро
                </Button>
              </div>
            </Card>

            {/* Financial */}
            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50 hover:shadow-glass transition-shadow group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Счета и платежи</h3>
                  <p className="text-sm text-muted-foreground">
                    Выставление счетов и учет платежей
                  </p>
                </div>
                <Button variant="outline" size="sm" className="w-full" disabled>
                  Скоро
                </Button>
              </div>
            </Card>

            {/* Suppliers */}
            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50 hover:shadow-glass transition-shadow group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-slate-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Truck className="w-6 h-6 text-slate-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Поставщики</h3>
                  <p className="text-sm text-muted-foreground">
                    Управление поставщиками запчастей
                  </p>
                </div>
                <Button variant="outline" size="sm" className="w-full" disabled>
                  Скоро
                </Button>
              </div>
            </Card>

            {/* Settings */}
            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50 hover:shadow-glass transition-shadow group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Settings className="w-6 h-6 text-teal-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Настройки</h3>
                  <p className="text-sm text-muted-foreground">
                    Настройка компании и пользователей
                  </p>
                </div>
                <Button variant="outline" size="sm" className="w-full" disabled>
                  Скоро
                </Button>
              </div>
            </Card>
          </div>

          {/* Development Notice */}
          <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-primary/20 flex items-center justify-center mx-auto">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">DriveCare в разработке</h3>
                <p className="text-muted-foreground">
                  Мы работаем над системой. Функции добавляются поэтапно.
                </p>
              </div>
              <div className="flex items-center justify-center gap-4">
                <Link href="/dashboard">
                  <Button variant="outline">
                    Обновить
                  </Button>
                </Link>
                <Button onClick={logout}>
                  Выйти из системы
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
