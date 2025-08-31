// path: apps/frontend/app/(auth)/register/success/page.tsx
"use client"

import Link from 'next/link'
import { CheckCircle, ArrowRight, Building2, Mail, Sparkles, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Flowing Background */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 700px 450px at 30% 20%, rgba(0, 212, 170, 0.20) 0%, transparent 65%),
            radial-gradient(ellipse 600px 600px at 70% 80%, rgba(99, 102, 241, 0.15) 0%, transparent 65%),
            radial-gradient(ellipse 500px 400px at 20% 90%, rgba(14, 165, 233, 0.12) 0%, transparent 65%)
          `
        }}
      />
      
      {/* Celebration orbs with success theme */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div 
          className="absolute rounded-full success-orb-1"
          style={{
            width: '250px',
            height: '250px',
            filter: 'blur(50px)',
            top: '15%',
            left: '15%',
            background: 'radial-gradient(circle, rgba(0, 212, 170, 0.12) 0%, transparent 70%)',
            willChange: 'transform',
          }}
        />
        
        <div 
          className="absolute rounded-full success-orb-2"
          style={{
            width: '200px',
            height: '200px',
            filter: 'blur(45px)',
            top: '60%',
            right: '20%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.10) 0%, transparent 70%)',
            willChange: 'transform',
          }}
        />
        
        {/* Celebration sparkles */}
        <div 
          className="absolute celebration-sparkle-1"
          style={{
            width: '6px',
            height: '6px',
            top: '25%',
            left: '20%',
            background: 'rgba(0, 212, 170, 0.8)',
            borderRadius: '50%',
            willChange: 'transform',
          }}
        />
        
        <div 
          className="absolute celebration-sparkle-2"
          style={{
            width: '4px',
            height: '4px',
            top: '70%',
            right: '25%',
            background: 'rgba(99, 102, 241, 0.9)',
            borderRadius: '50%',
            willChange: 'transform',
          }}
        />
        
        <div 
          className="absolute celebration-sparkle-3"
          style={{
            width: '5px',
            height: '5px',
            top: '40%',
            right: '15%',
            background: 'rgba(14, 165, 233, 0.7)',
            borderRadius: '50%',
            willChange: 'transform',
          }}
        />
        
        <div 
          className="absolute celebration-sparkle-4"
          style={{
            width: '3px',
            height: '3px',
            top: '80%',
            left: '30%',
            background: 'rgba(168, 85, 247, 0.8)',
            borderRadius: '50%',
            willChange: 'transform',
          }}
        />
      </div>
      
      <div className="relative flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-6">
            <Link href="/" className="inline-block group">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-primary shadow-glass-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
              </div>
            </Link>
          </div>

          {/* Success Card */}
          <Card className="p-8 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 rounded-3xl surface-glow text-center space-y-6">
            {/* Success Icon with celebration effect */}
            <div className="flex items-center justify-center relative">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-center success-icon-bg">
                  <CheckCircle className="w-10 h-10 text-primary" />
                </div>
                
                {/* Floating celebration elements around icon */}
                <Sparkles className="absolute -top-2 -right-2 w-4 h-4 text-secondary celebration-icon-1" />
                <Star className="absolute -bottom-1 -left-3 w-3 h-3 text-accent celebration-icon-2" />
                <Sparkles className="absolute top-1 -left-4 w-3 h-3 text-primary celebration-icon-3" />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-gradient-primary">
                Поздравляем! 🎉
              </h1>
              <h2 className="text-xl font-semibold text-foreground">
                Компания успешно зарегистрирована!
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Ваш автосервис добавлен в систему DriveCare. Теперь вы можете войти в систему и начать управление.
              </p>
            </div>

            {/* Enhanced Next Steps */}
            <div className="glass-subtle rounded-2xl p-5 space-y-4 border border-border/20">
              <h3 className="text-sm font-semibold text-foreground mb-3">Следующие шаги:</h3>
              
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <span className="text-muted-foreground">
                  Проверьте email для подтверждения аккаунта
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-secondary" />
                </div>
                <span className="text-muted-foreground">
                  Настройте профиль компании в панели управления
                </span>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <Link href="/login">
                <Button
                  size="lg"
                  className="w-full h-14 bg-gradient-primary hover:opacity-90 text-white font-medium group rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-glass-lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Войти в систему
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>

              <div className="text-xs text-muted-foreground space-y-1 leading-relaxed">
                <p>Не получили письмо? Проверьте папку спам</p>
                <p>или обратитесь в поддержку: support@drivecare.com</p>
              </div>
            </div>
          </Card>

          {/* Footer */}
          <div className="text-center">
            <Link 
              href="/" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 hover:underline inline-flex items-center gap-2"
            >
              ← Вернуться на главную
            </Link>
          </div>
        </div>
      </div>

      {/* Celebration CSS animations */}
      <style jsx global>{`
        .success-orb-1 {
          animation: celebration-float-1 15s ease-in-out infinite;
        }

        .success-orb-2 {
          animation: celebration-float-2 18s ease-in-out infinite;
        }

        .celebration-sparkle-1 {
          animation: sparkle-twinkle-1 3s ease-in-out infinite;
        }

        .celebration-sparkle-2 {
          animation: sparkle-twinkle-2 2.5s ease-in-out infinite;
        }

        .celebration-sparkle-3 {
          animation: sparkle-twinkle-3 4s ease-in-out infinite;
        }

        .celebration-sparkle-4 {
          animation: sparkle-twinkle-4 3.5s ease-in-out infinite;
        }

        .success-icon-bg {
          animation: success-pulse 2s ease-in-out infinite;
        }

        .celebration-icon-1 {
          animation: float-sparkle-1 2s ease-in-out infinite;
        }

        .celebration-icon-2 {
          animation: float-sparkle-2 2.5s ease-in-out infinite;
        }

        .celebration-icon-3 {
          animation: float-sparkle-3 3s ease-in-out infinite;
        }

        @keyframes celebration-float-1 {
          0%, 100% { 
            transform: translate3d(0, 0, 0) scale(1); 
          }
          50% { 
            transform: translate3d(15px, -10px, 0) scale(1.1); 
          }
        }

        @keyframes celebration-float-2 {
          0%, 100% { 
            transform: translate3d(0, 0, 0) scale(1); 
          }
          50% { 
            transform: translate3d(-12px, 8px, 0) scale(0.9); 
          }
        }

        @keyframes sparkle-twinkle-1 {
          0%, 100% { 
            opacity: 0.3; 
            transform: scale(1); 
          }
          50% { 
            opacity: 1; 
            transform: scale(1.5); 
          }
        }

        @keyframes sparkle-twinkle-2 {
          0%, 100% { 
            opacity: 0.4; 
            transform: scale(1) rotate(0deg); 
          }
          50% { 
            opacity: 0.9; 
            transform: scale(1.3) rotate(180deg); 
          }
        }

        @keyframes sparkle-twinkle-3 {
          0%, 100% { 
            opacity: 0.2; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.8; 
            transform: scale(1.4); 
          }
        }

        @keyframes sparkle-twinkle-4 {
          0%, 100% { 
            opacity: 0.5; 
            transform: scale(1) rotate(0deg); 
          }
          50% { 
            opacity: 1; 
            transform: scale(1.2) rotate(90deg); 
          }
        }

        @keyframes success-pulse {
          0%, 100% { 
            transform: scale(1); 
            box-shadow: 0 0 0 0 rgba(0, 212, 170, 0.2);
          }
          50% { 
            transform: scale(1.05); 
            box-shadow: 0 0 0 10px rgba(0, 212, 170, 0);
          }
        }

        @keyframes float-sparkle-1 {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg); 
          }
          50% { 
            transform: translateY(-5px) rotate(180deg); 
          }
        }

        @keyframes float-sparkle-2 {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg); 
          }
          50% { 
            transform: translateY(-3px) rotate(90deg); 
          }
        }

        @keyframes float-sparkle-3 {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg); 
          }
          50% { 
            transform: translateY(-4px) rotate(270deg); 
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .success-orb-1, .success-orb-2, .celebration-sparkle-1, 
          .celebration-sparkle-2, .celebration-sparkle-3, .celebration-sparkle-4,
          .success-icon-bg, .celebration-icon-1, .celebration-icon-2, .celebration-icon-3 {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
