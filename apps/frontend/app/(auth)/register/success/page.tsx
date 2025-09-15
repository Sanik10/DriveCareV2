// path: apps/frontend/app/(auth)/register/success/page.tsx
'use client';

import Link from 'next/link';
import { CheckCircle, ArrowRight, Building2, Mail, Sparkles, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import styles from './success.module.css';

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
          `,
        }}
      />

      {/* Elegant Celebration Orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {/* Main success aura */}
        <div
          className={`absolute rounded-full ${styles.successAura}`}
          style={{
            width: '400px',
            height: '400px',
            filter: 'blur(60px)',
            top: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            background:
              'radial-gradient(circle, rgba(0, 212, 170, 0.15) 0%, rgba(14, 165, 233, 0.08) 50%, transparent 80%)',
            willChange: 'transform, filter',
          }}
        />

        {/* Floating energy orbs */}
        <div
          className={`absolute rounded-full ${styles.energyOrb1}`}
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
          className={`absolute rounded-full ${styles.energyOrb2}`}
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
          className={`absolute rounded-full ${styles.energyOrb3}`}
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
          className={`absolute ${styles.particle1}`}
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
          className={`absolute ${styles.particle2}`}
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
          className={`absolute ${styles.particle3}`}
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
          className={`absolute ${styles.particle4}`}
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
          className={`absolute ${styles.successWave1}`}
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
          className={`absolute ${styles.successWave2}`}
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
                <div
                  className={`flex items-center gap-3 p-4 rounded-2xl bg-gradient-primary shadow-glass-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl ${styles.successLogoGlow}`}
                >
                  <Building2 className="w-7 h-7 text-white" />
                </div>
              </div>
            </Link>
          </div>

          {/* Enhanced Success Card */}
          <Card
            className={`p-8 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 rounded-3xl surface-glow text-center space-y-6 ${styles.successCardGlow}`}
          >
            {/* Success Icon with elegant celebration */}
            <div className="flex items-center justify-center relative">
              <div className="relative">
                <div
                  className={`w-24 h-24 rounded-full bg-gradient-to-r from-primary/30 to-secondary/20 flex items-center justify-center relative overflow-hidden ${styles.successIconBg}`}
                >
                  <CheckCircle className={`w-12 h-12 text-primary ${styles.successCheckIcon}`} />

                  {/* Elegant sparkle ring */}
                  <div className={`absolute inset-0 rounded-full border border-primary/20 ${styles.successRing1}`} />
                  <div className={`absolute inset-2 rounded-full border border-secondary/15 ${styles.successRing2}`} />
                </div>

                {/* Floating celebration elements with better positioning */}
                <div className={`absolute -top-3 -right-2 ${styles.successSparkle1}`}>
                  <Sparkles className="w-4 h-4 text-secondary" />
                </div>
                <div className={`absolute -bottom-2 -left-3 ${styles.successSparkle2}`}>
                  <Star className="w-4 h-4 text-accent" />
                </div>
                <div className={`absolute top-0 -left-5 ${styles.successSparkle3}`}>
                  <Zap className="w-3 h-3 text-primary" />
                </div>
                <div className={`absolute -top-4 left-1 ${styles.successSparkle4}`}>
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className={`text-3xl font-bold text-gradient-primary ${styles.successTitle}`}>Поздравляем! 🎉</h1>
              <h2 className="text-xl font-semibold text-foreground">Компания успешно зарегистрирована!</h2>
              <p className="text-muted-foreground leading-relaxed">
                Ваш автосервис добавлен в систему DriveCare. Теперь вы можете войти в систему и начать управление.
              </p>
            </div>

            {/* Enhanced Next Steps */}
            <div className={`glass-subtle rounded-2xl p-6 space-y-4 border border-border/20 ${styles.successStepsGlow}`}>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Следующие шаги:
              </h3>

              <div className="flex items-center gap-3 text-sm group">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <span className="text-muted-foreground">Проверьте email для подтверждения аккаунта</span>
              </div>

              <div className="flex items-center gap-3 text-sm group">
                <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110">
                  <CheckCircle className="w-4 h-4 text-secondary" />
                </div>
                <span className="text-muted-foreground">Настройте профиль компании в панели управления</span>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <Link href="/login">
                <Button
                  size="lg"
                  className={`w-full h-14 bg-gradient-primary hover:opacity-90 text-white font-medium group rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-glass-lg ${styles.successCtaGlow}`}
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
    </div>
  );
}
