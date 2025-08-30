// path: apps/frontend/app/page.tsx
"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, ArrowRight, Check, Zap, Shield, BarChart3, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useAuth } from '@/lib/hooks/use-auth'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, user, logout, isLoading } = useAuth()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen relative">
      {/* Fixed Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-surface-1 -z-10"></div>
      <div className="fixed inset-0 bg-gradient-surface -z-10"></div>
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-primary opacity-20 rounded-full blur-3xl -z-10"></div>
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -z-10"></div>
      
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-primary">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              DriveCare
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <Link href="/dashboard">
                  <Button>
                    В кабинет
                  </Button>
                </Link>
                <Button variant="ghost" onClick={handleLogout} title="Выйти">
                  <LogOut className="w-4 h-4 mr-2" />
                  Выйти
                </Button>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" disabled={isLoading}>
                    Войти
                  </Button>
                </Link>
                <Link href="/register">
                  <Button disabled={isLoading}>
                    Попробовать
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl lg:text-6xl font-bold tracking-tight">
              CRM для автосервисов
              <span className="block bg-gradient-primary bg-clip-text text-transparent">
                нового поколения
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Управляйте заказами, клиентами, складом и финансами в одной системе. 
              Современный интерфейс, мощная аналитика, полная автоматизация.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="group">
                Начать бесплатно
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            {!isAuthenticated && (
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Войти в аккаунт
                </Button>
              </Link>
            )}
            {isAuthenticated && (
              <Link href="/dashboard">
                <Button variant="outline" size="lg">
                  Перейти в кабинет
                </Button>
              </Link>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50 hover:shadow-glass transition-shadow">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Быстрый старт</h3>
                  <p className="text-sm text-muted-foreground">
                    Настройка за 5 минут. Импорт данных из Excel.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50 hover:shadow-glass transition-shadow">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold">Безопасность</h3>
                  <p className="text-sm text-muted-foreground">
                    Шифрование данных. Роли и права доступа.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50 hover:shadow-glass transition-shadow">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold">Аналитика</h3>
                  <p className="text-sm text-muted-foreground">
                    Отчеты в реальном времени. Прогнозы продаж.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Benefits */}
          <div className="mt-16 space-y-8">
            <h3 className="text-3xl font-bold">Что получает ваш автосервис</h3>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Учет заказов и клиентов</h4>
                    <p className="text-sm text-muted-foreground">
                      Полная история обслуживания, напоминания о ТО
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Управление складом</h4>
                    <p className="text-sm text-muted-foreground">
                      Контроль остатков, автозаказ запчастей
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Финансовый учет</h4>
                    <p className="text-sm text-muted-foreground">
                      Счета, платежи, отчетность для налоговой
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Планирование работ</h4>
                    <p className="text-sm text-muted-foreground">
                      Календарь записи, загрузка мастеров
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Мобильное приложение</h4>
                    <p className="text-sm text-muted-foreground">
                      Работа с планшета, уведомления клиентам
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Интеграции</h4>
                    <p className="text-sm text-muted-foreground">
                      1С, банки, доставка запчастей
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-border/50">
        <div className="text-center text-sm text-muted-foreground">
          © 2025 DriveCare. Все права защищены.
        </div>
      </footer>
    </div>
  )
}
