// path: apps/frontend/app/not-found.tsx
"use client"

import Link from "next/link"
import { ArrowLeft, Building2, Home } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Лёгкий фон-акцент (единый стиль) */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px circle at 20% 0%, hsl(var(--primary) / 0.10), transparent 60%), radial-gradient(700px circle at 90% 30%, hsl(199 89% 48% / 0.10), transparent 55%)",
        }}
      />

      <header className="border-b border-border/60">
        <div className="mx-auto w-full max-w-6xl px-xl py-xl">
          <div className="flex items-center justify-between gap-lg">
            <Link href="/" className="flex items-center gap-md min-w-0">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-none">DriveCare</div>
                <div className="text-xs text-muted-foreground">CRM для автосервисов</div>
              </div>
            </Link>

            <div className="flex items-center gap-sm">
              <ThemeToggle />
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Войти</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-6xl items-center px-xl py-section">
        <div className="mx-auto w-full max-w-lg">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-sm flex items-center justify-center gap-sm text-5xl font-semibold tracking-tight">
                <span className="text-primary">4</span>

                {/* “0” можно оставить крутиться — но спокойно и строго */}
                <span className="relative inline-flex h-12 w-12 items-center justify-center">
                  <span className="absolute inset-0 rounded-full border border-border/70" />
                  <span className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                </span>

                <span className="text-primary">4</span>
              </div>

              <CardTitle>Страница не найдена</CardTitle>
              <CardDescription>
                Возможно, ссылка устарела или страница была перемещена.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-md">
              <div className="grid gap-sm">
                <div className="text-sm text-muted-foreground">Возможно, вы искали:</div>
                <div className="flex flex-wrap gap-sm">
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/dashboard">Дашборд</Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/login">Вход</Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/register">Регистрация компании</Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-border/60 bg-card px-md py-sm text-xs text-muted-foreground">
                Нужна помощь?{" "}
                <a className="text-foreground hover:underline" href="mailto:support@drivecare.com">
                  support@drivecare.com
                </a>
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-sm sm:flex-row sm:justify-between">
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>

              <Button asChild className="w-full sm:w-auto">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  На главную
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
