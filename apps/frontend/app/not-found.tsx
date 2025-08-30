// path: apps/frontend/app/not-found.tsx
"use client"

import Link from 'next/link'
import { Home, ArrowLeft, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-surface"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-primary opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl"></div>
      
      {/* Header */}
      <header className="relative z-10 container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-primary">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              DriveCare
            </h1>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[80vh] px-6">
        <div className="max-w-lg mx-auto text-center space-y-8">
          <Card className="p-8 backdrop-blur-sm bg-card/80 border-border/50 shadow-glass">
            {/* 404 Animation */}
            <div className="mb-8">
              <div className="flex items-center justify-center space-x-2 text-6xl font-bold">
                <span className="text-primary animate-pulse">4</span>
                <div className="w-16 h-16 rounded-full border-4 border-secondary/30 border-t-secondary animate-spin"></div>
                <span className="text-accent animate-pulse">4</span>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-foreground">
                Страница не найдена
              </h1>
              <p className="text-muted-foreground text-lg">
                Запрашиваемая страница не существует или была перемещена.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link href="/">
                <Button className="group bg-gradient-primary hover:opacity-90 text-white">
                  <Home className="w-4 h-4 mr-2" />
                  На главную
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="group"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Назад
              </Button>
            </div>

            {/* Quick Links */}
            <div className="mt-8 pt-6 border-t border-border/50">
              <p className="text-sm text-muted-foreground mb-4">
                Возможно, вы искали:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-sm">
                    Вход в систему
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="ghost" size="sm" className="text-sm">
                    Регистрация компании
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="ghost" size="sm" className="text-sm">
                    Главная страница
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Additional Help */}
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Нужна помощь? Свяжитесь с нашей поддержкой
            </p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <a 
                href="mailto:support@drivecare.com" 
                className="text-primary hover:text-secondary transition-colors"
              >
                support@drivecare.com
              </a>
              <span className="text-muted-foreground">•</span>
              <a 
                href="tel:+78001234567" 
                className="text-primary hover:text-secondary transition-colors"
              >
                8 (800) 123-45-67
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
