// path: apps/frontend/app/page.tsx
"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  Check,
  DollarSign,
  Keyboard,
  Layers,
  LogOut,
  Shield,
  Users,
  Wrench,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useAuth } from "@/lib/hooks/use-auth"

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, user, logout, isLoading } = useAuth()

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const primaryCtaHref = isAuthenticated ? "/dashboard" : "/register"
  const primaryCtaLabel = isAuthenticated ? "Перейти в кабинет" : "Начать бесплатно"

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Лёгкий фон-акцент (без стекла/орбов) */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px circle at 20% 0%, hsl(var(--primary) / 0.10), transparent 60%), radial-gradient(700px circle at 90% 30%, hsl(199 89% 48% / 0.10), transparent 55%)",
        }}
      />

      <header className="sticky top-0 z-20 border-b border-border/60 bg-background">
        <div className="mx-auto w-full max-w-6xl px-xl py-xl">
          <div className="flex items-center justify-between gap-lg">
            <div className="flex items-center gap-md min-w-0">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold leading-none">DriveCare</div>
                <div className="text-xs text-muted-foreground">CRM для автосервисов</div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-lg text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">
                Возможности
              </a>
              <a href="#how" className="hover:text-foreground transition-colors">
                Как работает
              </a>
              <a href="#faq" className="hover:text-foreground transition-colors">
                FAQ
              </a>
            </div>

            <div className="flex items-center gap-sm">
              <ThemeToggle />

              {isAuthenticated && user ? (
                <>
                  <Button asChild variant="secondary" disabled={isLoading}>
                    <Link href="/dashboard">В кабинет</Link>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    disabled={isLoading}
                    title="Выйти"
                  >
                    <LogOut className="h-4 w-4" />
                    Выйти
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" disabled={isLoading}>
                    <Link href="/login">Войти</Link>
                  </Button>

                  <Button asChild variant="secondary" disabled={isLoading}>
                    <Link href="/register">Попробовать бесплатно</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-xl py-section">
        {/* HERO */}
        <section className="grid gap-xxl lg:grid-cols-2 lg:items-center">
          <div className="grid gap-lg">
            <div className="inline-flex items-center gap-sm rounded-md border border-border/60 bg-card px-md py-sm text-sm text-muted-foreground w-fit">
              <Zap className="h-4 w-4 text-primary" />
              Открытая регистрация • CRM для автосервисов
            </div>

            <div className="grid gap-md">
              <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight">
                Порядок в заказах.
                <span className="block text-primary">Контроль над бизнесом.</span>
              </h1>

              <p className="max-w-2xl text-base md:text-lg text-muted-foreground">
                DriveCare помогает вести заказы, клиентов, склад и финансы без перегруза.
                Быстро. Чётко. Современно.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-sm pt-md">
              <Button asChild size="lg" disabled={isLoading}>
                <Link href={primaryCtaHref}>
                  {primaryCtaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              {!isAuthenticated ? (
                <Button asChild size="lg" variant="secondary" disabled={isLoading}>
                  <Link href="/login">Войти в аккаунт</Link>
                </Button>
              ) : (
                <Button asChild size="lg" variant="secondary" disabled={isLoading}>
                  <Link href="/dashboard/orders">Открыть заказы</Link>
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Компания регистрируется свободно. Приглашения нужны только для подключения сотрудников к
              уже созданной компании.
            </p>

            <div className="grid gap-sm pt-md text-sm text-muted-foreground">
              <div className="flex items-center gap-sm">
                <Check className="h-4 w-4 text-primary" />
                Импорт из Excel и быстрый старт
              </div>
              <div className="flex items-center gap-sm">
                <Check className="h-4 w-4 text-primary" />
                Роли и права доступа, контроль сессий
              </div>
              <div className="flex items-center gap-sm">
                <Check className="h-4 w-4 text-primary" />
                Современный интерфейс без лишних элементов
              </div>
            </div>
          </div>

          {/* PREVIEW (реальные скриншоты) */}
          <ProductPreview />
        </section>

        {/* FEATURES (3) */}
        <section id="features" className="mt-section">
          <div className="grid gap-lg md:grid-cols-3">
            <Card className="transition-shadow hover:shadow-card-hover">
              <CardHeader>
                <div className="grid h-10 w-10 place-items-center rounded-md border border-border/60 bg-surface-2">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">Быстрый старт</CardTitle>
                <CardDescription>
                  Настройка за 5 минут, импорт из Excel и понятный интерфейс без перегруза.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="transition-shadow hover:shadow-card-hover">
              <CardHeader>
                <div className="grid h-10 w-10 place-items-center rounded-md border border-border/60 bg-surface-2">
                  <Shield className="h-5 w-5 text-status-progress" />
                </div>
                <CardTitle className="text-base">Безопасность</CardTitle>
                <CardDescription>
                  Роли и права, шифрование, контроль сессий и понятная модель доступа.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="transition-shadow hover:shadow-card-hover">
              <CardHeader>
                <div className="grid h-10 w-10 place-items-center rounded-md border border-border/60 bg-surface-2">
                  <BarChart3 className="h-5 w-5 text-status-active" />
                </div>
                <CardTitle className="text-base">Аналитика</CardTitle>
                <CardDescription>
                  Метрики бизнеса и отчёты — без “магии”, только данные и контроль.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="mt-section grid gap-xl">
          <div className="grid gap-sm text-center">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Как это работает</h2>
            <p className="text-muted-foreground">
              3 шага, чтобы навести порядок и начать управлять процессом.
            </p>
          </div>

          <div className="grid gap-lg md:grid-cols-3">
            <StepCard
              icon={<Layers className="h-5 w-5 text-primary" />}
              title="Создайте заказ"
              text="Клиент, автомобиль, работы и запчасти — всё в одной структуре."
            />
            <StepCard
              icon={<Wrench className="h-5 w-5 text-status-progress" />}
              title="Ведите выполнение"
              text="Статусы, планирование, контроль мастеров и сроков без хаоса."
            />
            <StepCard
              icon={<DollarSign className="h-5 w-5 text-status-pending" />}
              title="Закройте и посчитайте"
              text="Финальный чек, оплаты, отчётность — прозрачно и быстро."
            />
          </div>
        </section>

        {/* BENEFITS */}
        <section className="mt-section grid gap-xl">
          <div className="grid gap-sm text-center">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Что получает ваш автосервис
            </h2>
            <p className="text-muted-foreground">
              Инструменты, которые помогают работать с данными — без декоративного шума.
            </p>
          </div>

          <div className="grid gap-lg md:grid-cols-2 lg:grid-cols-4">
            <BenefitCard
              icon={<Users className="h-5 w-5 text-primary" />}
              title="Клиенты"
              items={["История обслуживания", "Напоминания о ТО", "База автомобилей"]}
            />
            <BenefitCard
              icon={<Calendar className="h-5 w-5 text-status-progress" />}
              title="Планирование"
              items={["Календарь записи", "Загрузка мастеров", "План работ"]}
            />
            <BenefitCard
              icon={<BarChart3 className="h-5 w-5 text-status-active" />}
              title="Склад"
              items={["Контроль остатков", "Движение запчастей", "Быстрый поиск"]}
            />
            <BenefitCard
              icon={<DollarSign className="h-5 w-5 text-status-pending" />}
              title="Финансы"
              items={["Счета и платежи", "Отчётность", "Прозрачная прибыль"]}
            />
          </div>
        </section>

        {/* SPEED / HOTKEYS */}
        <section className="mt-section">
          <Card className="transition-shadow hover:shadow-card-hover">
            <CardHeader>
              <div className="flex items-center gap-sm">
                <Keyboard className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Скорость — часть продукта</CardTitle>
              </div>
              <CardDescription>
                Быстрые действия вместо лишних экранов. Горячие клавиши — чтобы не “тыкать мышкой”.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-sm">
              <HotkeyRow label="Поиск" keys={["Ctrl/⌘", "K"]} />
              <HotkeyRow label="Создать" keys={["Ctrl/⌘", "N"]} />
              <HotkeyRow label="Подтвердить в форме" keys={["Ctrl/⌘", "Enter"]} />
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section id="faq" className="mt-section grid gap-lg">
          <div className="grid gap-sm text-center">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">FAQ</h2>
            <p className="text-muted-foreground">Коротко о самом важном.</p>
          </div>

          <div className="grid gap-lg md:grid-cols-2">
            <FaqCard
              q="Можно импортировать данные из Excel?"
              a="Да. Базовые сценарии импорта поддерживаем. Если структура сложная — поможем настроить."
            />
            <FaqCard
              q="Это безопасно?"
              a="Да: роли и права, контроль сессий, строгая модель доступа. Без “магических” прав у всех."
            />
            <FaqCard
              q="Можно ли начать без обучения?"
              a="Да. Интерфейс проектируется как инструмент управления — без перегруза и скрытых действий."
            />
            <FaqCard
              q="Зачем нужно приглашение?"
              a="Приглашение нужно только сотрудникам, чтобы войти в уже созданную компанию. Владелец регистрирует компанию обычной регистрацией."
            />
          </div>
        </section>

        {/* CTA (внизу делаем secondary, чтобы не было 2 Primary на странице) */}
        <section className="mt-section">
          <Card className="transition-shadow hover:shadow-card-hover">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl md:text-3xl">
                Готовы модернизировать <span className="text-primary">ваш автосервис</span>?
              </CardTitle>
              <CardDescription className="mx-auto max-w-2xl">
                Начните с первого заказа — и дальше система сама поддержит порядок в данных.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-sm">
                <Button asChild size="lg" variant="secondary" disabled={isLoading}>
                  <Link href={primaryCtaHref}>
                    {primaryCtaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>

                {!isAuthenticated && (
                  <Button asChild size="lg" variant="ghost" disabled={isLoading}>
                    <Link href="/login">У меня есть аккаунт</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto w-full max-w-6xl px-xl py-xxl">
          <div className="flex flex-col items-center gap-sm text-center">
            <div className="flex items-center gap-sm">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
                <Building2 className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold">DriveCare</span>
            </div>

            <div className="text-xs text-muted-foreground">
              © 2026 DriveCare. Все права защищены.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ProductPreview() {
  const [tab, setTab] = React.useState<"dashboard" | "orders">("dashboard")

  const src = tab === "dashboard" ? "/demo-dashboard-page.png" : "/demo-roders-page.png"
  const alt = tab === "dashboard" ? "DriveCare — Дашборд" : "DriveCare — Заказы"

  return (
    <Card className="transition-shadow hover:shadow-card-hover">
      <CardHeader className="gap-md">
        <div className="flex items-start justify-between gap-lg">
          <div className="min-w-0">
            <CardTitle className="text-base">Интерфейс DriveCare</CardTitle>
            <CardDescription>
              Реальные экраны продукта — чтобы сразу было понятно, как всё выглядит.
            </CardDescription>
          </div>

          <div className="shrink-0 inline-flex rounded-md border border-border/60 bg-card p-xs">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setTab("dashboard")}
              aria-pressed={tab === "dashboard"}
              className={tab === "dashboard" ? "bg-surface-2 text-foreground" : undefined}
            >
              Дашборд
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setTab("orders")}
              aria-pressed={tab === "orders"}
              className={tab === "orders" ? "bg-surface-2 text-foreground" : undefined}
            >
              Заказы
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-hidden rounded-md border border-border/60 bg-surface-2">
          <Image
            src={src}
            alt={alt}
            width={1600}
            height={900}
            priority={tab === "dashboard"}
            sizes="(min-width: 1024px) 560px, (min-width: 768px) 720px, 100vw"
            className="h-auto w-full"
          />
        </div>

        <div className="mt-md text-xs text-muted-foreground">
          Владелец регистрирует компанию сам. Сотрудников можно пригласить позже по ссылке из кабинета.
        </div>
      </CardContent>
    </Card>
  )
}

function BenefitCard({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode
  title: string
  items: string[]
}) {
  return (
    <Card className="transition-shadow hover:shadow-card-hover">
      <CardHeader>
        <div className="grid h-10 w-10 place-items-center rounded-md border border-border/60 bg-surface-2">
          {icon}
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-sm">
        {items.map((t) => (
          <div key={t} className="flex items-center gap-sm text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-primary" />
            <span>{t}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function StepCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <Card className="transition-shadow hover:shadow-card-hover">
      <CardHeader>
        <div className="grid h-10 w-10 place-items-center rounded-md border border-border/60 bg-surface-2">
          {icon}
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{text}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function FaqCard({ q, a }: { q: string; a: string }) {
  return (
    <Card className="transition-shadow hover:shadow-card-hover">
      <CardHeader>
        <CardTitle className="text-base">{q}</CardTitle>
        <CardDescription>{a}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function HotkeyRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex items-center justify-between gap-lg rounded-md border border-border/60 bg-card px-md py-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex items-center gap-xs">
        {keys.map((k) => (
          <kbd
            key={k}
            className="inline-flex h-7 items-center rounded-md border border-border/60 bg-surface-2 px-sm text-xs text-foreground"
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  )
}
