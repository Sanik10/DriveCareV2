// path: apps/frontend/app/(auth)/register/success/page.tsx
import Link from 'next/link'
import { CheckCircle, ArrowRight, Building2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-surface"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-primary opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl"></div>
      
      <div className="relative flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-6">
            <Link href="/" className="inline-block">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-primary">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </Link>
          </div>

          {/* Success Card */}
          <Card className="p-8 shadow-glass border-border/50 backdrop-blur-sm bg-card/80 text-center space-y-6">
            {/* Success Icon */}
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-foreground">
                Компания успешно зарегистрирована!
              </h1>
              <p className="text-muted-foreground">
                Ваш автосервис добавлен в систему DriveCare. Теперь вы можете войти в систему и начать управление.
              </p>
            </div>

            {/* Next Steps */}
            <div className="bg-surface-1/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">
                  Проверьте email для подтверждения аккаунта
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">
                  Настройте профиль компании в панели управления
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <Link href="/login">
                <Button
                  size="lg"
                  className="w-full bg-gradient-primary hover:opacity-90 text-white group"
                >
                  Войти в систему
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <div className="text-xs text-muted-foreground">
                <p>Не получили письмо? Проверьте папку спам</p>
                <p>или обратитесь в поддержку: support@drivecare.com</p>
              </div>
            </div>
          </Card>

          {/* Footer */}
          <div className="text-center">
            <Link 
              href="/" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Вернуться на главную
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
