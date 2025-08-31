// path: app/(auth)/register/success/page.tsx
"use client"

import Link from 'next/link'
import { CheckCircle, ArrowRight, Building2, Mail, Sparkles, Star, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Success Background */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 600px 400px at 30% 20%, rgba(0, 212, 170, 0.25) 0%, transparent 70%),
            radial-gradient(ellipse 500px 500px at 70% 80%, rgba(99, 102, 241, 0.18) 0%, transparent 70%),
            radial-gradient(ellipse 400px 300px at 20% 90%, rgba(14, 165, 233, 0.15) 0%, transparent 70%)
          `
        }}
      />
      
      {/* Elegant Celebration Orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {/* Main success aura */}
        <div 
          className="absolute rounded-full success-aura"
          style={{
            width: '400px',
            height: '400px',
            filter: 'blur(60px)',
            top: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'radial-gradient(circle, rgba(0, 212, 170, 0.15) 0%, rgba(14, 165, 233, 0.08) 50%, transparent 80%)',
            willChange: 'transform, filter',
          }}
        />
        
        {/* Floating energy orbs */}
        <div 
          className="absolute rounded-full energy-orb-1"
          style={{
            width: '120px',
            height: '120px',
            filter: 'blur(35px)',
            top: '15%',
            left: '20%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
            willChange: 'transform',
          }}
        />
        
        <div 
          className="absolute rounded-full energy-orb-2"
          style={{
            width: '100px',
            height: '100px',
            filter: 'blur(30px)',
            top: '70%',
            right: '15%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.10) 0%, transparent 70%)',
            willChange: 'transform',
          }}
        />
        
        <div 
          className="absolute rounded-full energy-orb-3"
          style={{
            width: '80px',
            height: '80px',
            filter: 'blur(25px)',
            top: '60%',
            left: '15%',
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, transparent 70%)',
            willChange: 'transform',
          }}
        />
        
        {/* Elegant floating particles */}
        <div 
          className="absolute particle-1"
          style={{
            width: '8px',
            height: '8px',
            top: '30%',
            left: '25%',
            background: 'rgba(0, 212, 170, 0.6)',
            borderRadius: '50%',
            willChange: 'transform',
            boxShadow: '0 0 12px rgba(0, 212, 170, 0.4)',
          }}
        />
        
        <div 
          className="absolute particle-2"
          style={{
            width: '6px',
            height: '6px',
            top: '45%',
            right: '30%',
            background: 'rgba(99, 102, 241, 0.7)',
            borderRadius: '50%',
            willChange: 'transform',
            boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)',
          }}
        />
        
        <div 
          className="absolute particle-3"
          style={{
            width: '5px',
            height: '5px',
            top: '75%',
            left: '35%',
            background: 'rgba(168, 85, 247, 0.8)',
            borderRadius: '50%',
            willChange: 'transform',
            boxShadow: '0 0 8px rgba(168, 85, 247, 0.6)',
          }}
        />
        
        <div 
          className="absolute particle-4"
          style={{
            width: '4px',
            height: '4px',
            top: '20%',
            right: '20%',
            background: 'rgba(14, 165, 233, 0.9)',
            borderRadius: '50%',
            willChange: 'transform',
            boxShadow: '0 0 6px rgba(14, 165, 233, 0.7)',
          }}
        />

        {/* Success energy waves */}
        <div 
          className="absolute success-wave-1"
          style={{
            width: '300px',
            height: '300px',
            border: '2px solid rgba(0, 212, 170, 0.1)',
            borderRadius: '50%',
            top: '35%',
            left: '50%',
            transform: 'translateX(-50%)',
            willChange: 'transform, opacity',
          }}
        />
        
        <div 
          className="absolute success-wave-2"
          style={{
            width: '400px',
            height: '400px',
            border: '1px solid rgba(99, 102, 241, 0.08)',
            borderRadius: '50%',
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            willChange: 'transform, opacity',
          }}
        />
      </div>
      
      <div className="relative flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-6">
            <Link href="/" className="inline-block group">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-primary shadow-glass-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl success-logo-glow">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
              </div>
            </Link>
          </div>

          {/* Enhanced Success Card */}
          <Card className="p-8 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 rounded-3xl surface-glow text-center space-y-6 success-card-glow">
            {/* Success Icon with elegant celebration */}
            <div className="flex items-center justify-center relative">
              <div className="relative success-icon-container">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary/30 to-secondary/20 flex items-center justify-center success-icon-bg relative overflow-hidden">
                  <CheckCircle className="w-12 h-12 text-primary success-check-icon" />
                  
                  {/* Elegant sparkle ring */}
                  <div className="absolute inset-0 rounded-full border border-primary/20 success-ring-1"></div>
                  <div className="absolute inset-2 rounded-full border border-secondary/15 success-ring-2"></div>
                </div>
                
                {/* Floating celebration elements with better positioning */}
                <div className="absolute -top-3 -right-2 success-sparkle-1">
                  <Sparkles className="w-4 h-4 text-secondary" />
                </div>
                <div className="absolute -bottom-2 -left-3 success-sparkle-2">
                  <Star className="w-4 h-4 text-accent" />
                </div>
                <div className="absolute top-0 -left-5 success-sparkle-3">
                  <Zap className="w-3 h-3 text-primary" />
                </div>
                <div className="absolute -top-4 left-1 success-sparkle-4">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-gradient-primary success-title">
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
            <div className="glass-subtle rounded-2xl p-6 space-y-4 border border-border/20 success-steps-glow">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Следующие шаги:
              </h3>
              
              <div className="flex items-center gap-3 text-sm group">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <span className="text-muted-foreground">
                  Проверьте email для подтверждения аккаунта
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-sm group">
                <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110">
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
                  className="w-full h-14 bg-gradient-primary hover:opacity-90 text-white font-medium group rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-glass-lg success-cta-glow"
                >
                  <Sparkles className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
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

      {/* Optimized Elegant Celebration CSS */}
      <style jsx global>{`
        .success-aura {
          animation: success-breathe 8s ease-in-out infinite;
        }

        .energy-orb-1 {
          animation: energy-float-1 12s ease-in-out infinite;
        }

        .energy-orb-2 {
          animation: energy-float-2 15s ease-in-out infinite;
        }

        .energy-orb-3 {
          animation: energy-float-3 10s ease-in-out infinite;
        }

        .particle-1 {
          animation: elegant-rise-1 6s ease-out infinite;
        }

        .particle-2 {
          animation: elegant-rise-2 7s ease-out infinite;
        }

        .particle-3 {
          animation: elegant-rise-3 5s ease-out infinite;
        }

        .particle-4 {
          animation: elegant-rise-4 8s ease-out infinite;
        }

        .success-wave-1 {
          animation: success-ripple-1 4s ease-out infinite;
        }

        .success-wave-2 {
          animation: success-ripple-2 6s ease-out infinite;
        }

        .success-icon-bg {
          animation: success-glow 3s ease-in-out infinite;
        }

        .success-check-icon {
          animation: check-emerge 1s ease-out 0.5s both;
        }

        .success-ring-1 {
          animation: ring-expand-1 2s ease-out infinite;
        }

        .success-ring-2 {
          animation: ring-expand-2 2.5s ease-out infinite;
        }

        .success-sparkle-1 {
          animation: sparkle-dance-1 3s ease-in-out infinite;
        }

        .success-sparkle-2 {
          animation: sparkle-dance-2 2.5s ease-in-out infinite;
        }

        .success-sparkle-3 {
          animation: sparkle-dance-3 4s ease-in-out infinite;
        }

        .success-sparkle-4 {
          animation: sparkle-dance-4 3.5s ease-in-out infinite;
        }

        .success-logo-glow {
          animation: logo-celebrate 2s ease-in-out infinite;
        }

        .success-card-glow {
          animation: card-success-glow 4s ease-in-out infinite;
        }

        .success-title {
          animation: title-celebration 2s ease-out 0.8s both;
        }

        .success-steps-glow {
          animation: steps-highlight 3s ease-in-out infinite;
        }

        .success-cta-glow {
          position: relative;
          overflow: hidden;
        }

        .success-cta-glow::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: cta-shine 3s ease-in-out infinite;
        }

        /* Elegant animations */
        @keyframes success-breathe {
          0%, 100% { 
            transform: translate3d(-50%, 0, 0) scale(1);
            filter: blur(60px);
          }
          50% { 
            transform: translate3d(-50%, 0, 0) scale(1.1);
            filter: blur(65px);
          }
        }

        @keyframes energy-float-1 {
          0%, 100% { 
            transform: translate3d(0, 0, 0);
          }
          33% { 
            transform: translate3d(10px, -8px, 0);
          }
          66% { 
            transform: translate3d(-5px, 12px, 0);
          }
        }

        @keyframes energy-float-2 {
          0%, 100% { 
            transform: translate3d(0, 0, 0);
          }
          50% { 
            transform: translate3d(-12px, -10px, 0);
          }
        }

        @keyframes energy-float-3 {
          0%, 100% { 
            transform: translate3d(0, 0, 0);
          }
          50% { 
            transform: translate3d(8px, 15px, 0);
          }
        }

        @keyframes elegant-rise-1 {
          0% { 
            transform: translate3d(0, 50px, 0) scale(0.3);
            opacity: 0;
          }
          20% { 
            opacity: 1;
            transform: scale(1);
          }
          80% { 
            opacity: 1;
            transform: translate3d(20px, -30px, 0) scale(0.8);
          }
          100% { 
            transform: translate3d(40px, -80px, 0) scale(0.2);
            opacity: 0;
          }
        }

        @keyframes elegant-rise-2 {
          0% { 
            transform: translate3d(0, 40px, 0) scale(0.4);
            opacity: 0;
          }
          25% { 
            opacity: 1;
            transform: scale(1);
          }
          75% { 
            opacity: 0.8;
            transform: translate3d(-25px, -25px, 0) scale(0.6);
          }
          100% { 
            transform: translate3d(-50px, -70px, 0) scale(0.1);
            opacity: 0;
          }
        }

        @keyframes elegant-rise-3 {
          0% { 
            transform: translate3d(0, 30px, 0) scale(0.5);
            opacity: 0;
          }
          30% { 
            opacity: 1;
            transform: scale(1);
          }
          70% { 
            opacity: 0.9;
            transform: translate3d(15px, -20px, 0) scale(0.7);
          }
          100% { 
            transform: translate3d(30px, -60px, 0) scale(0.2);
            opacity: 0;
          }
        }

        @keyframes elegant-rise-4 {
          0% { 
            transform: translate3d(0, 35px, 0) scale(0.2);
            opacity: 0;
          }
          15% { 
            opacity: 1;
            transform: scale(1);
          }
          85% { 
            opacity: 0.7;
            transform: translate3d(-18px, -35px, 0) scale(0.5);
          }
          100% { 
            transform: translate3d(-35px, -90px, 0) scale(0.1);
            opacity: 0;
          }
        }

        @keyframes success-ripple-1 {
          0% { 
            transform: translateX(-50%) scale(0.8);
            opacity: 0;
          }
          50% { 
            opacity: 1;
          }
          100% { 
            transform: translateX(-50%) scale(1.3);
            opacity: 0;
          }
        }

        @keyframes success-ripple-2 {
          0% { 
            transform: translateX(-50%) scale(0.6);
            opacity: 0;
          }
          40% { 
            opacity: 0.5;
          }
          100% { 
            transform: translateX(-50%) scale(1.4);
            opacity: 0;
          }
        }

        @keyframes success-glow {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(0, 212, 170, 0.3);
          }
          50% { 
            transform: scale(1.02);
            box-shadow: 0 0 0 15px rgba(0, 212, 170, 0);
          }
        }

        @keyframes check-emerge {
          0% { 
            transform: scale(0) rotate(-180deg);
            opacity: 0;
          }
          60% { 
            transform: scale(1.1) rotate(10deg);
            opacity: 1;
          }
          100% { 
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes ring-expand-1 {
          0% { 
            transform: scale(0.8);
            opacity: 0;
          }
          50% { 
            opacity: 1;
          }
          100% { 
            transform: scale(1.4);
            opacity: 0;
          }
        }

        @keyframes ring-expand-2 {
          0% { 
            transform: scale(0.9);
            opacity: 0;
          }
          60% { 
            opacity: 0.5;
          }
          100% { 
            transform: scale(1.3);
            opacity: 0;
          }
        }

        @keyframes sparkle-dance-1 {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg) scale(1);
          }
          50% { 
            transform: translateY(-8px) rotate(180deg) scale(1.2);
          }
        }

        @keyframes sparkle-dance-2 {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg) scale(1);
          }
          50% { 
            transform: translateY(-6px) rotate(90deg) scale(1.1);
          }
        }

        @keyframes sparkle-dance-3 {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg) scale(1);
          }
          50% { 
            transform: translateY(-5px) rotate(270deg) scale(0.9);
          }
        }

        @keyframes sparkle-dance-4 {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg) scale(1);
          }
          50% { 
            transform: translateY(-7px) rotate(45deg) scale(1.3);
          }
        }

        @keyframes logo-celebrate {
          0%, 100% { 
            filter: drop-shadow(0 0 10px rgba(0, 212, 170, 0.3));
          }
          50% { 
            filter: drop-shadow(0 0 20px rgba(0, 212, 170, 0.6));
          }
        }

        @keyframes card-success-glow {
          0%, 100% { 
            box-shadow: 
              0 10px 15px -3px hsla(var(--foreground), 0.1),
              0 4px 6px -2px hsla(var(--foreground), 0.05),
              0 0 0 1px hsla(var(--primary), 0.1);
          }
          50% { 
            box-shadow: 
              0 10px 15px -3px hsla(var(--foreground), 0.1),
              0 4px 6px -2px hsla(var(--foreground), 0.05),
              0 0 0 1px hsla(var(--primary), 0.2),
              0 0 20px rgba(0, 212, 170, 0.1);
          }
        }

        @keyframes title-celebration {
          0% { 
            transform: translateY(20px);
            opacity: 0;
          }
          60% { 
            transform: translateY(-5px);
            opacity: 1;
          }
          100% { 
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes steps-highlight {
          0%, 100% { 
            border-color: hsla(var(--border), 0.2);
          }
          50% { 
            border-color: hsla(var(--primary), 0.3);
          }
        }

        @keyframes cta-shine {
          0% { 
            left: -100%;
          }
          50% { 
            left: 100%;
          }
          100% { 
            left: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .success-aura, .energy-orb-1, .energy-orb-2, .energy-orb-3,
          .particle-1, .particle-2, .particle-3, .particle-4,
          .success-wave-1, .success-wave-2, .success-icon-bg, .success-check-icon,
          .success-ring-1, .success-ring-2, .success-sparkle-1, .success-sparkle-2,
          .success-sparkle-3, .success-sparkle-4, .success-logo-glow, .success-card-glow,
          .success-title, .success-steps-glow, .success-cta-glow::before {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
