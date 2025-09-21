// path: apps/frontend/app/platform/catalogue/page.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Factory, Car, Layers, AlertTriangle, CloudDownload } from 'lucide-react';

export default function CatalogueBackofficePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const isPlatformAdmin =
    (user?.role?.name || '').toLowerCase() === 'superadmin' ||
    (user?.role?.name || '').toLowerCase() === 'platform_admin';

  if (isLoading) return null;
  if (!isAuthenticated || !isPlatformAdmin) {
    return (
      <div className="container mx-auto px-6 py-10">
        <Card className="p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Недостаточно прав</h2>
          <p className="text-muted-foreground">Раздел доступен только ролям Superadmin / Platform Admin.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Каталог (Backoffice)
        </h1>
        <p className="text-muted-foreground">Модерация брендов, моделей и типов ТС</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/platform/catalogue/brands">
          <Card className="p-6 hover:shadow-glass transition-all duration-300 rounded-2xl glass cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
              <Factory className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold">Бренды</h3>
            <p className="text-sm text-muted-foreground">Список брендов, верификация и слияние</p>
            <Button size="sm" className="mt-4 rounded-2xl">Открыть</Button>
          </Card>
        </Link>

        <Link href="/platform/catalogue/models">
          <Card className="p-6 hover:shadow-glass transition-all duration-300 rounded-2xl glass cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
              <Car className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="font-semibold">Модели</h3>
            <p className="text-sm text-muted-foreground">Модели, фильтр по бренду, слияние</p>
            <Button size="sm" className="mt-4 rounded-2xl">Открыть</Button>
          </Card>
        </Link>

        <Link href="/platform/catalogue/types">
          <Card className="p-6 hover:shadow-glass transition-all duration-300 rounded-2xl glass cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-3">
              <Layers className="w-6 h-6 text-sky-500" />
            </div>
            <h3 className="font-semibold">Типы ТС</h3>
            <p className="text-sm text-muted-foreground">Список типов, верификация</p>
            <Button size="sm" className="mt-4 rounded-2xl">Открыть</Button>
          </Card>
        </Link>

        <Link href="/platform/catalogue/import">
          <Card className="p-6 hover:shadow-glass transition-all duration-300 rounded-2xl glass cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-3">
              <CloudDownload className="w-6 h-6 text-violet-500" />
            </div>
            <h3 className="font-semibold">Импорт каталога</h3>
            <p className="text-sm text-muted-foreground">Предпросмотр и импорт из NHTSA vPIC</p>
            <Button size="sm" className="mt-4 rounded-2xl">Открыть</Button>
          </Card>
        </Link>
      </div>
    </div>
  );
}
