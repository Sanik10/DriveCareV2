// path: apps/frontend/app/(auth)/register/invite/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UserPlus,
  ArrowRight,
  Building2,
  AlertCircle,
  User as UserIcon,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Users,
  Network,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PASSWORD_REGEX, PHONE_REGEX } from '@/lib/types/auth';
import styles from './invite.module.css';
import { buildApiUrl } from '@/lib/api/core';

// Допускаем два формата токена: 64 hex (наш backend) или UUID v4 (на будущее)
const TOKEN_HEX64 = /^[0-9a-f]{64}$/i;
const TOKEN_UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const inviteSchema = z
  .object({
    inviteCode: z
      .string()
      .min(1, 'Код приглашения обязателен')
      .refine((v) => TOKEN_HEX64.test(v) || TOKEN_UUID_V4.test(v), 'Некорректный токен приглашения'),
    // email теперь на бэке не обязателен для /auth/register-invite — оставим поле как справочное, но не шлём в запрос
    email: z
      .string()
      .email('Некорректный email')
      .optional()
      .or(z.literal(''))
      .default(''),
    password: z.string().min(8, 'Минимум 8 символов').regex(PASSWORD_REGEX, 'Пароль должен содержать строчные и заглавные буквы, цифры и спецсимволы'),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'Имя обязательно').max(100),
    lastName: z.string().min(1, 'Фамилия обязательна').max(100),
    phone: z
      .string()
      .regex(PHONE_REGEX, 'Некорректный формат номера телефона')
      .optional()
      .or(z.literal('')),
    specialization: z
      .string()
      .max(255)
      .optional()
      .or(z.literal('')),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

type InviteForm = z.infer<typeof inviteSchema>;

function RegisterInviteForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  });

  // Префилл из URL: сперва ?token=..., fallback на ?code=...
  useEffect(() => {
    const token = searchParams.get('token') || searchParams.get('code');
    if (token) setValue('inviteCode', token);
    const email = searchParams.get('email');
    if (email) setValue('email', email);
  }, [searchParams, setValue]);

  const onSubmit = async (data: InviteForm) => {
    setIsLoading(true);
    setApiError(null);

    try {
      // Формируем контракт бэка: { token, password, firstName, lastName, phone? }
      const payload = {
        token: data.inviteCode,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
      };

      const res = await fetch(buildApiUrl('/auth/register-invite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // важно для RT-cookie
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Ошибка регистрации (${res.status})`);
      }

      // Успех: бэкенд ставит RT-cookie и возвращает токены/пользователя.
      // Можно редиректить в дэшборд.
      router.replace('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Network Background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 600px 400px at 50% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 70%),
            radial-gradient(ellipse 500px 500px at 20% 70%, rgba(14, 165, 233, 0.12) 0%, transparent 70%),
            radial-gradient(ellipse 400px 300px at 80% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 70%)
          `,
        }}
      />

      {/* Advanced Network Topology */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {/* Central Hub */}
        <div
          className={`absolute rounded-full ${styles.centralHub}`}
          style={{
            width: '200px',
            height: '200px',
            filter: 'blur(45px)',
            top: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            background:
              'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(14, 165, 233, 0.15) 60%, transparent 100%)',
            willChange: 'transform',
          }}
        />

        {/* Department Nodes */}
        <div
          className={`absolute rounded-full ${styles.deptNode1}`}
          style={{
            width: '120px',
            height: '120px',
            filter: 'blur(35px)',
            top: '8%',
            left: '35%',
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.18) 0%, rgba(0, 212, 170, 0.12) 60%, transparent 100%)',
            willChange: 'transform',
          }}
        />
        <div
          className={`absolute rounded-full ${styles.deptNode2}`}
          style={{
            width: '110px',
            height: '110px',
            filter: 'blur(33px)',
            top: '15%',
            right: '25%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, rgba(99, 102, 241, 0.10) 60%, transparent 100%)',
            willChange: 'transform',
          }}
        />
        <div
          className={`absolute rounded-full ${styles.deptNode3}`}
          style={{
            width: '130px',
            height: '130px',
            filter: 'blur(38px)',
            bottom: '25%',
            left: '20%',
            background: 'radial-gradient(circle, rgba(0, 212, 170, 0.16) 0%, rgba(14, 165, 233, 0.08) 60%, transparent 100%)',
            willChange: 'transform',
          }}
        />
        <div
          className={`absolute rounded-full ${styles.deptNode4}`}
          style={{
            width: '100px',
            height: '100px',
            filter: 'blur(30px)',
            bottom: '20%',
            right: '30%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 60%, transparent 100%)',
            willChange: 'transform',
          }}
        />

        {/* Employee Nodes */}
        <div
          className={`absolute rounded-full ${styles.empNode1}`}
          style={{
            width: '60px',
            height: '60px',
            filter: 'blur(20px)',
            top: '45%',
            left: '15%',
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.10) 0%, transparent 70%)',
            willChange: 'transform',
          }}
        />
        <div
          className={`absolute rounded-full ${styles.empNode2}`}
          style={{
            width: '70px',
            height: '70px',
            filter: 'blur(23px)',
            top: '60%',
            right: '15%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%)',
            willChange: 'transform',
          }}
        />

        {/* Connections */}
        <div
          className={`absolute ${styles.backboneConnection1}`}
          style={{
            width: '160px',
            height: '3px',
            top: '20%',
            left: '42%',
            background: 'linear-gradient(45deg, rgba(99, 102, 241, 0.4) 0%, rgba(14, 165, 233, 0.25) 100%)',
            transform: 'rotate(-25deg)',
            willChange: 'opacity, transform',
            boxShadow: '0 0 8px rgba(99, 102, 241, 0.3)',
          }}
        />
        <div
          className={`absolute ${styles.backboneConnection2}`}
          style={{
            width: '140px',
            height: '3px',
            top: '25%',
            right: '32%',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.35) 0%, rgba(99, 102, 241, 0.20) 100%)',
            transform: 'rotate(35deg)',
            willChange: 'opacity, transform',
            boxShadow: '0 0 6px rgba(168, 85, 247, 0.25)',
          }}
        />
        <div
          className={`absolute ${styles.backboneConnection3}`}
          style={{
            width: '150px',
            height: '3px',
            bottom: '35%',
            left: '30%',
            background: 'linear-gradient(45deg, rgba(0, 212, 170, 0.3) 0%, rgba(14, 165, 233, 0.18) 100%)',
            transform: 'rotate(25deg)',
            willChange: 'opacity, transform',
            boxShadow: '0 0 7px rgba(0, 212, 170, 0.2)',
          }}
        />
        <div
          className={`absolute ${styles.backboneConnection4}`}
          style={{
            width: '120px',
            height: '3px',
            bottom: '30%',
            right: '35%',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.15) 100%)',
            transform: 'rotate(-40deg)',
            willChange: 'opacity, transform',
            boxShadow: '0 0 5px rgba(99, 102, 241, 0.2)',
          }}
        />

        {/* Secondary */}
        <div
          className={`absolute ${styles.secondaryConnection1}`}
          style={{
            width: '80px',
            height: '2px',
            top: '35%',
            left: '22%',
            background: 'linear-gradient(60deg, rgba(14, 165, 233, 0.2) 0%, rgba(0, 212, 170, 0.1) 100%)',
            transform: 'rotate(55deg)',
            willChange: 'opacity',
            boxShadow: '0 0 4px rgba(14, 165, 233, 0.15)',
          }}
        />
        <div
          className={`absolute ${styles.secondaryConnection2}`}
          style={{
            width: '90px',
            height: '2px',
            bottom: '35%',
            right: '20%',
            background: 'linear-gradient(120deg, rgba(168, 85, 247, 0.18) 0%, rgba(99, 102, 241, 0.08) 100%)',
            transform: 'rotate(-30deg)',
            willChange: 'opacity',
            boxShadow: '0 0 3px rgba(168, 85, 247, 0.12)',
          }}
        />

        {/* Data Pulses */}
        <div
          className={`absolute ${styles.dataPulse1}`}
          style={{
            width: '5px',
            height: '5px',
            top: '21%',
            left: '43%',
            background: 'rgba(99, 102, 241, 0.9)',
            borderRadius: '50%',
            willChange: 'transform',
            boxShadow: '0 0 10px rgba(99, 102, 241, 0.7)',
          }}
        />
        <div
          className={`absolute ${styles.dataPulse2}`}
          style={{
            width: '4px',
            height: '4px',
            top: '26%',
            right: '33%',
            background: 'rgba(168, 85, 247, 0.8)',
            borderRadius: '50%',
            willChange: 'transform',
            boxShadow: '0 0 8px rgba(168, 85, 247, 0.6)',
          }}
        />
        <div
          className={`absolute ${styles.dataPulse3}`}
          style={{
            width: '4px',
            height: '4px',
            bottom: '36%',
            left: '31%',
            background: 'rgba(0, 212, 170, 0.9)',
            borderRadius: '50%',
            willChange: 'transform',
            boxShadow: '0 0 9px rgba(0, 212, 170, 0.7)',
          }}
        />

        {/* Rings */}
        <div
          className={`absolute ${styles.activityRing1}`}
          style={{
            width: '80px',
            height: '80px',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            borderRadius: '50%',
            top: '31%',
            left: '46%',
            willChange: 'transform, opacity',
          }}
        />
        <div
          className={`absolute ${styles.activityRing2}`}
          style={{
            width: '120px',
            height: '120px',
            border: '1px solid rgba(14, 165, 233, 0.10)',
            borderRadius: '50%',
            top: '27%',
            left: '44%',
            willChange: 'transform, opacity',
          }}
        />
      </div>

      <div className="relative flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Enhanced Header */}
          <div className="text-center space-y-6">
            <Link href="/" className="inline-block group">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-primary shadow-glass-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
              </div>
            </Link>
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-4">
                <div className="relative">
                  <Users className={`w-7 h-7 text-primary ${styles.networkIconPulse}`} />
                  <div className={`absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full ${styles.networkStatusIndicator}`} />
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-3 h-0.5 bg-gradient-to-r from-primary to-secondary ${styles.networkLineSegment1}`} />
                  <div className={`w-2 h-2 rounded-full bg-secondary ${styles.networkNodeIndicator}`} />
                  <div className={`w-3 h-0.5 bg-gradient-to-r from-secondary to-accent ${styles.networkLineSegment2}`} />
                </div>
                <Network className={`w-6 h-6 text-secondary ${styles.networkIconFloat}`} />
              </div>
              <h1 className="text-4xl font-bold text-gradient-primary">Присоединиться к команде</h1>
              <p className="text-lg text-muted-foreground">Создайте аккаунт по приглашению компании</p>
            </div>
          </div>

          {/* Register Form */}
          <Card className="p-8 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 rounded-3xl surface-glow">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* API Error */}
              {apiError && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <p className="text-sm text-destructive">{apiError}</p>
                </div>
              )}

              <div className="space-y-5">
                <div className="relative group">
                  <Network className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('inviteCode')}
                    placeholder="Токен приглашения"
                    disabled={isLoading}
                    error={errors.inviteCode?.message}
                    className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                  />
                </div>

                <div className="relative group">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('email')}
                    type="email"
                    placeholder="Email (необязательно)"
                    autoComplete="email"
                    disabled={isLoading}
                    error={errors.email?.message}
                    className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <UserIcon className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                    <Input
                      {...register('firstName')}
                      placeholder="Имя"
                      disabled={isLoading}
                      error={errors.firstName?.message}
                      className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                    />
                  </div>

                  <div className="relative group">
                    <UserIcon className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                    <Input
                      {...register('lastName')}
                      placeholder="Фамилия"
                      disabled={isLoading}
                      error={errors.lastName?.message}
                      className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="relative group">
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('phone')}
                    placeholder="Телефон (необязательно)"
                    disabled={isLoading}
                    error={errors.phone?.message}
                    className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                  />
                </div>

                <div className="relative group">
                  <Users className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('specialization')}
                    placeholder="Специализация (необязательно)"
                    disabled={isLoading}
                    error={errors.specialization?.message}
                    className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Пароль"
                    autoComplete="new-password"
                    disabled={isLoading}
                    error={errors.password?.message}
                    className="pl-12 pr-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="relative group">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Подтвердите пароль"
                    autoComplete="new-password"
                    disabled={isLoading}
                    error={errors.confirmPassword?.message}
                    className="pl-12 pr-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-14 bg-gradient-primary hover:opacity-90 text-white font-medium group rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-glass-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Подключение к сети...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Присоединиться к команде
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                )}
              </Button>

              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Уже есть аккаунт?{' '}
                  <Link href="/login" className="text-primary hover:text-secondary transition-colors font-medium hover:underline">
                    Войти в систему
                  </Link>
                </p>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Регистрируясь, вы соглашаетесь с</p>
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

export default function RegisterInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen relative flex items-center justify-center">
          <div
            className="fixed inset-0 -z-10"
            style={{
              background: `radial-gradient(ellipse 700px 450px at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 65%)`,
            }}
          />
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterInviteForm />
    </Suspense>
  );
}
