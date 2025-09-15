// path: apps/frontend/app/(auth)/login/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowRight, Building2, AlertCircle, Clock, Lock, Mail, Shield } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { authAPI } from '@/lib/api/auth';
import { useAuth } from '@/lib/hooks/use-auth';
import { EMAIL_REGEX, PASSWORD_REGEX, TWO_FA_REGEX } from '@/lib/types/auth';
import styles from './login.module.css';

const loginSchema = z.object({
  email: z.string().min(1, 'Email обязателен').regex(EMAIL_REGEX, 'Некорректный email'),
  password: z
    .string()
    .min(8, 'Минимум 8 символов')
    .regex(PASSWORD_REGEX, 'Пароль должен содержать строчные и заглавные буквы, цифры и спецсимволы'),
  twoFactorCode: z
    .string()
    .optional()
    .refine((val) => !val || TWO_FA_REGEX.test(val), {
      message: 'Код 2FA должен состоять из 6 цифр',
    }),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isThrottled, setIsThrottled] = useState(false);
  const [throttleTimeLeft, setThrottleTimeLeft] = useState(0);
  const router = useRouter();
  const { setAuthUser } = useAuth();

  const loginAttemptRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isThrottled && throttleTimeLeft > 0) {
      interval = setInterval(() => {
        setThrottleTimeLeft((prev) => {
          if (prev <= 1) {
            setIsThrottled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isThrottled, throttleTimeLeft]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const onSubmit = async (data: LoginForm) => {
    if (isThrottled || isLoading || loginAttemptRef.current) {
      return;
    }

    loginAttemptRef.current = true;
    setIsLoading(true);
    setApiError(null);

    try {
      const response = await authAPI.login(data);

      if (!response.user || !response.user.email) {
        setApiError('Ошибка входа: получены некорректные данные пользователя');
        return;
      }

      // Access/refresh токены уже установлены в in-memory и HttpOnly cookie внутри authAPI.login
      // Здесь просто фиксируем пользователя в глобальном состоянии
      setAuthUser(response.user);
      router.push('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';

      try {
        const errorData = JSON.parse(message);

        if (errorData.statusCode === 429) {
          setIsThrottled(true);
          setThrottleTimeLeft(15 * 60);
          setApiError('Превышен лимит попыток входа. Попробуйте позже.');
        } else if (errorData.statusCode === 401) {
          setApiError('Неверный email или пароль');
        } else if (errorData.statusCode === 400) {
          setApiError('Некорректные данные для входа');
        } else {
          setApiError('Ошибка сервера. Попробуйте позже.');
        }
      } catch {
        if (message.toLowerCase().includes('2fa')) {
          setError('twoFactorCode', { message: 'Неверный код 2FA' });
        } else if (message.toLowerCase().includes('email') || message.toLowerCase().includes('парол')) {
          setApiError(message);
        } else {
          setApiError('Ошибка входа. Проверьте данные и попробуйте снова.');
        }
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        loginAttemptRef.current = false;
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 600px 400px at 80% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 500px 500px at 20% 80%, rgba(14, 165, 233, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse 700px 300px at 60% 60%, rgba(168, 85, 247, 0.08) 0%, transparent 50%)
          `,
        }}
      />

      {/* Floating Geometric Shapes */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div
          className={`absolute ${styles.shape1}`}
          style={{
            width: '60px',
            height: '60px',
            top: '15%',
            left: '10%',
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            background: 'linear-gradient(45deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.08))',
            filter: 'blur(1px)',
          }}
        />
        <div
          className={`absolute ${styles.shape2}`}
          style={{
            width: '80px',
            height: '80px',
            top: '25%',
            right: '15%',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, rgba(14, 165, 233, 0.12), rgba(99, 102, 241, 0.1))',
            filter: 'blur(2px)',
          }}
        />
        <div
          className={`absolute ${styles.shape3}`}
          style={{
            width: '50px',
            height: '50px',
            bottom: '20%',
            left: '20%',
            background: 'linear-gradient(45deg, rgba(168, 85, 247, 0.1), rgba(14, 165, 233, 0.08))',
            transform: 'rotate(45deg)',
            filter: 'blur(1px)',
          }}
        />
        <div
          className={`absolute ${styles.shape4}`}
          style={{
            width: '70px',
            height: '70px',
            bottom: '30%',
            right: '10%',
            clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
            background: 'linear-gradient(45deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.06))',
            filter: 'blur(2px)',
          }}
        />
        <div
          className={`absolute ${styles.shape5}`}
          style={{
            width: '30px',
            height: '30px',
            top: '60%',
            left: '5%',
            borderRadius: '50%',
            background: 'rgba(14, 165, 233, 0.1)',
            filter: 'blur(1px)',
          }}
        />
        <div
          className={`absolute ${styles.shape6}`}
          style={{
            width: '40px',
            height: '40px',
            top: '10%',
            right: '5%',
            background: 'rgba(168, 85, 247, 0.08)',
            transform: 'rotate(30deg)',
            filter: 'blur(1px)',
          }}
        />
      </div>

      <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
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
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-gradient-primary">Вход в систему</h1>
              <p className="text-lg text-muted-foreground">Добро пожаловать в DriveCare</p>
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Безопасно</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-secondary" />
                  <span>Защищено</span>
                </div>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <Card className="p-8 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 rounded-3xl">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {apiError && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <p className="text-sm text-destructive">{apiError}</p>
                </div>
              )}

              {isThrottled && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 animate-in slide-in-from-top-2 duration-300">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <div className="text-sm text-amber-600">
                    <p className="font-medium">Временная блокировка</p>
                    <p>Попробуйте снова через {formatTime(throttleTimeLeft)}</p>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('email')}
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    disabled={isLoading || isThrottled}
                    error={errors.email?.message}
                    className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Пароль"
                    autoComplete="current-password"
                    disabled={isLoading || isThrottled}
                    error={errors.password?.message}
                    className="pl-12 pr-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                    disabled={isLoading || isThrottled}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <Input
                  {...register('twoFactorCode')}
                  type="text"
                  placeholder="Код 2FA (если включен)"
                  autoComplete="one-time-code"
                  disabled={isLoading || isThrottled}
                  error={errors.twoFactorCode?.message}
                  maxLength={6}
                  className="h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-14 bg-gradient-primary hover:opacity-90 text-white font-medium group rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-glass-lg"
                disabled={isLoading || isThrottled || loginAttemptRef.current}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Вход в систему...
                  </div>
                ) : isThrottled ? (
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Заблокировано ({formatTime(throttleTimeLeft)})
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Войти в DriveCare
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                )}
              </Button>

              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Нет аккаунта компании?{' '}
                  <Link href="/register" className="text-primary hover:text-secondary transition-colors font-medium hover:underline">
                    Зарегистрировать автосервис
                  </Link>
                </p>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Используя DriveCare, вы соглашаетесь с</p>
                  <p>
                    <Link href="/terms" className="hover:text-foreground transition-colors hover:underline">
                      Условиями использования
                    </Link>
                    {' и '}
                    <Link href="/privacy" className="hover:text-foreground transition-colors hover:underline">
                      Политикой конфиденциальности
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </Card>

          {/* Back to Home */}
          <div className="text-center">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 hover:underline inline-flex items-center gap-2"
            >
              ← Вернуться на главную
            </Link>
          </div>

          {/* Security Notice */}
          {isThrottled && (
            <Card className="p-6 glass border-border/30 rounded-2xl animate-in slide-in-from-bottom-2 duration-500">
              <div className="text-center space-y-3">
                <Shield className="w-6 h-6 text-primary mx-auto" />
                <h4 className="text-sm font-semibold text-muted-foreground">Система защиты от атак</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Для безопасности количество попыток входа ограничено. Лимит: 5 попыток в 15 минут.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
