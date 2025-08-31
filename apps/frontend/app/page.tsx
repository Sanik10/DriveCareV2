// path: apps/frontend/app/page.tsx
"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, ArrowRight, Check, Zap, Shield, BarChart3, LogOut, Sparkles, Users, Calendar, DollarSign } from 'lucide-react'
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Flowing Background */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 700px 450px at 30% 0%, rgba(0, 212, 170, 0.22) 0%, transparent 65%),
            radial-gradient(ellipse 600px 600px at 85% 40%, rgba(14, 165, 233, 0.16) 0%, transparent 65%),
            radial-gradient(ellipse 650px 400px at 20% 100%, rgba(99, 102, 241, 0.18) 0%, transparent 65%)
          `
        }}
      />
      
      {/* Smooth Flowing Color Orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {/* Primary Green to Blue Orb */}
        <div 
          className="absolute rounded-full flowing-orb-1"
          style={{
            width: '420px',
            height: '420px',
            filter: 'blur(80px)',
            top: '8%',
            left: '18%',
          }}
        />
        
        {/* Secondary Blue to Purple Orb */}
        <div 
          className="absolute rounded-full flowing-orb-2"
          style={{
            width: '480px',
            height: '480px',
            filter: 'blur(85px)',
            top: '38%',
            right: '12%',
          }}
        />
        
        {/* Accent Purple to Green Orb */}
        <div 
          className="absolute rounded-full flowing-orb-3"
          style={{
            width: '450px',
            height: '450px',
            filter: 'blur(82px)',
            bottom: '18%',
            left: '28%',
          }}
        />
        
        {/* Supporting Blue Orb */}
        <div 
          className="absolute rounded-full flowing-orb-4"
          style={{
            width: '360px',
            height: '360px',
            filter: 'blur(75px)',
            bottom: '40%',
            right: '22%',
          }}
        />
      </div>
      
      {/* Header */}
      <header className="relative z-10 container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-primary shadow-glass-lg">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient-primary">
                DriveCare
              </h1>
              <p className="text-xs text-muted-foreground">CRM для автосервисов</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboard">
                  <Button className="rounded-2xl bg-gradient-primary hover:opacity-90 shadow-glass transition-all duration-300">
                    В кабинет
                  </Button>
                </Link>
                <Button 
                  onClick={handleLogout} 
                  className="rounded-2xl btn-ghost-fixed"
                  title="Выйти"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Выйти
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button 
                    disabled={isLoading}
                    className="rounded-2xl btn-ghost-fixed"
                  >
                    Войти
                  </Button>
                </Link>
                <Link href="/register">
                  <Button 
                    disabled={isLoading}
                    className="rounded-2xl bg-gradient-primary hover:opacity-90 shadow-glass transition-all duration-300"
                  >
                    Попробовать бесплатно
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-6 py-20">
        <div className="max-w-5xl mx-auto text-center space-y-12">
          {/* Hero Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-subtle border text-sm transition-all duration-300 hover:shadow-glass">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Новое поколение CRM систем</span>
            </div>
            
            <div className="space-y-6">
              <h2 className="text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
                CRM для автосервисов
                <span className="block text-gradient-primary mt-2">
                  будущего
                </span>
              </h2>
              <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Управляйте заказами, клиентами, складом и финансами в одной системе. 
                Современный интерфейс, мощная аналитика, полная автоматизация.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/register">
                <Button size="lg" className="group rounded-2xl bg-gradient-primary hover:opacity-90 shadow-glass-lg px-8 py-6 text-lg transition-all duration-300">
                  Начать бесплатно
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>
              {!isAuthenticated && (
                <Link href="/login">
                  <Button size="lg" className="rounded-2xl btn-outline-fixed px-8 py-6 text-lg">
                    Войти в аккаунт
                  </Button>
                </Link>
              )}
              {isAuthenticated && (
                <Link href="/dashboard">
                  <Button size="lg" className="rounded-2xl btn-outline-fixed px-8 py-6 text-lg">
                    Перейти в кабинет
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
            <Card className="group p-8 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 hover:-translate-y-2 surface-glow rounded-3xl">
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glass transition-transform duration-300 group-hover:scale-110">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">Быстрый старт</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Настройка за 5 минут. Импорт данных из Excel. Интуитивный интерфейс.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="group p-8 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 hover:-translate-y-2 surface-glow rounded-3xl">
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-secondary/20 border border-secondary/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <Shield className="w-8 h-8 text-secondary" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">Безопасность</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Шифрование данных. Роли и права доступа. Резервное копирование.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="group p-8 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 hover:-translate-y-2 surface-glow rounded-3xl">
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <BarChart3 className="w-8 h-8 text-accent" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">Аналитика</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Отчеты в реальном времени. Прогнозы продаж. Умная аналитика.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Benefits Section */}
          <div className="mt-28 space-y-16">
            <div className="text-center space-y-4">
              <h3 className="text-4xl lg:text-5xl font-bold">
                Что получает ваш 
                <span className="text-gradient-primary"> автосервис</span>
              </h3>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Все необходимые инструменты для успешного ведения бизнеса
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Customer Management */}
              <Card className="p-6 glass border-border/30 hover:shadow-glass transition-all duration-400 rounded-3xl group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold">Клиенты</h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        <span>История обслуживания</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Напоминания о ТО</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        <span>База автомобилей</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Scheduling */}
              <Card className="p-6 glass border-border/30 hover:shadow-glass transition-all duration-400 rounded-3xl group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/20 border border-secondary/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    <Calendar className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold">Планирование</h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Календарь записи</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Загрузка мастеров</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Планирование работ</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Inventory */}
              <Card className="p-6 glass border-border/30 hover:shadow-glass transition-all duration-400 rounded-3xl group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    <BarChart3 className="w-6 h-6 text-accent" />
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold">Склад</h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Контроль остатков</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Автозаказ запчастей</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Учет движения</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Finance */}
              <Card className="p-6 glass border-border/30 hover:shadow-glass transition-all duration-400 rounded-3xl group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    <DollarSign className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold">Финансы</h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Счета и платежи</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Отчетность</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Интеграция с 1С</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Final CTA */}
          <div className="mt-28 text-center space-y-8">
            <Card className="p-12 glass border-border/30 rounded-3xl surface-glow max-w-4xl mx-auto transition-all duration-500 hover:shadow-glass-lg">
              <div className="space-y-6">
                <h3 className="text-3xl lg:text-4xl font-bold">
                  Готовы модернизировать 
                  <span className="text-gradient-primary"> ваш автосервис?</span>
                </h3>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Присоединяйтесь к сотням автосервисов, которые уже используют DriveCare для роста своего бизнеса
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <Link href="/register">
                    <Button size="lg" className="group rounded-2xl bg-gradient-primary hover:opacity-90 shadow-glass-lg px-8 py-6 text-lg transition-all duration-300">
                      Начать бесплатно
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                    </Button>
                  </Link>
                  {!isAuthenticated && (
                    <Link href="/login">
                      <Button size="lg" className="rounded-2xl btn-outline-fixed px-8 py-6 text-lg">
                        У меня есть аккаунт
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 container mx-auto px-6 py-12 mt-20 border-t border-border/30">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-gradient-primary">DriveCare</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 DriveCare. Все права защищены.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <a href="mailto:support@drivecare.com" className="text-muted-foreground hover:text-primary transition-colors duration-300">
              Поддержка
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300">
              Политика конфиденциальности
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300">
              Условия использования
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
