// path: apps/frontend/app/dashboard/users/[id]/page.tsx
import { Suspense } from 'react';
import { User, Mail, Phone, Shield, Calendar, Activity, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-8">
      {/* Back button */}
      <Link href="/dashboard/users">
        <Button variant="outline" className="rounded-2xl btn-outline-fixed group">
          <ChevronLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Назад к команде
        </Button>
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/30 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-8">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-6">
          {/* Avatar */}
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-3xl font-bold text-white shadow-glass">
            ?
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Карточка сотрудника</h1>
              <Badge variant="default" className="rounded-xl">Активен</Badge>
            </div>
            <p className="text-muted-foreground">ID: {id}</p>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Информация */}
        <Card className="p-6 rounded-3xl border-border/30 glass space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Основная информация</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">—</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">—</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">—</span>
            </div>
          </div>
        </Card>

        {/* Активность */}
        <Card className="p-6 rounded-3xl border-border/30 glass space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Активность</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Дата создания: —</span>
            </div>
          </div>
        </Card>
      </div>

      {/* TODO: Placeholder */}
      <Card className="p-8 rounded-3xl border-border/30 glass text-center">
        <p className="text-muted-foreground">
          🚧 Детальная информация в разработке
        </p>
      </Card>
    </div>
  );
}
