// path: apps/frontend/app/dashboard/parts/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Plus, 
  Search, 
  RefreshCw, 
  Pencil, 
  Trash2,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  BarChart3,
  Sparkles,
  TrendingUp,
  Filter,
  DollarSign,
  Hash,
  Tag,
  Box
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/app/AppLayout';
import { useAuth } from '@/lib/hooks/use-auth';
import { partsAPI } from '@/lib/api/parts';
import type { PaginatedPartsResponse, PartCatalogueItem } from '@/lib/types/parts';
import { PartEditDialog } from '@/components/parts/part-edit-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function PartsCataloguePage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedPartsResponse | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'available'>('all');

  const [openEdit, setOpenEdit] = useState(false);
  const [current, setCurrent] = useState<PartCatalogueItem | null>(null);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!isMounted) return;
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = search.trim()
          ? await partsAPI.search({ search: search.trim(), page, limit })
          : await partsAPI.list({ page, limit });
        if (!cancelled) setData(res);
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string };
          if (!cancelled) setError(parsed.message || 'Ошибка загрузки запчастей');
        } catch {
          if (!cancelled) setError('Ошибка загрузки запчастей');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isMounted, authLoading, isAuthenticated, user, router, search, page, limit]);

  const handleCreate = () => {
    setCurrent(null);
    setOpenEdit(true);
  };

  const handleEdit = (p: PartCatalogueItem) => {
    setCurrent(p);
    setOpenEdit(true);
  };

  const handleSaved = async () => {
    const res = search.trim()
      ? await partsAPI.search({ search: search.trim(), page: 1, limit })
      : await partsAPI.list({ page: 1, limit });
    setData(res);
    setPage(1);
  };

  const handleDelete = async (p: PartCatalogueItem) => {
    if (!confirm(`Удалить запчасть "${p.name}"?`)) return;
    try {
      await partsAPI.remove(p.id);
      toast.success('Запчасть удалена');
      const res = search.trim()
        ? await partsAPI.search({ search: search.trim(), page: 1, limit })
        : await partsAPI.list({ page: 1, limit });
      setData(res);
      setPage(1);
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        toast.error(parsed.message || 'Ошибка удаления запчасти');
      } catch {
        toast.error('Ошибка удаления запчасти');
      }
    }
  };

  const handleRefresh = async () => {
    setPage(1);
    const res = search.trim()
      ? await partsAPI.search({ search: search.trim(), page: 1, limit })
      : await partsAPI.list({ page: 1, limit });
    setData(res);
    toast.success('Каталог обновлен');
  };

  if (!isMounted) return null;

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка каталога...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated || !user) return null;

  const items = data?.items || [];

  // Mock stock calculations (in real app this would come from API)
  const stockStats = items.reduce((acc, item) => {
    const stock = Math.floor(Math.random() * 50); // Mock stock level
    if (stock === 0) acc.out++;
    else if (stock <= 5) acc.low++;
    else acc.available++;
    return acc;
  }, { available: 0, low: 0, out: 0 });

  // Filter items by stock status
  const filteredItems = items.filter(item => {
    if (stockFilter === 'all') return true;
    const stock = Math.floor(Math.random() * 50); // Mock stock level
    if (stockFilter === 'out') return stock === 0;
    if (stockFilter === 'low') return stock > 0 && stock <= 5;
    if (stockFilter === 'available') return stock > 5;
    return true;
  });

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="rounded-2xl btn-outline-fixed"
        onClick={handleRefresh}
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Обновить
      </Button>
      
      <Button 
        className="rounded-2xl bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-[1.02]"
        onClick={handleCreate}
      >
        <Plus className="w-4 h-4 mr-2" />
        Новая запчасть
      </Button>
    </div>
  );

  return (
    <AppLayout 
      title="Каталог запчастей" 
      description="Справочник запчастей с контролем остатков и поставщиками"
      icon={Building2}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Parts Inventory Feature Badge */}
        <Card className="p-4 glass border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-600 dark:text-amber-400">Складской учет запчастей</h3>
              <p className="text-sm text-muted-foreground">
                Мониторинг остатков на складе, интеграция с поставщиками и автоматические уведомления о низких остатках.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                В наличии
              </Badge>
              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Мало
              </Badge>
              <Badge variant="outline" className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/30">
                <Package className="w-3 h-3 mr-1" />
                Нет
              </Badge>
            </div>
          </div>
        </Card>

        {/* Stock Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            title="Всего позиций"
            value={items.length}
            icon={Package}
            color="blue"
          />
          <StatsCard
            title="В наличии"
            value={stockStats.available}
            icon={CheckCircle}
            color="emerald"
          />
          <StatsCard
            title="Заканчивается"
            value={stockStats.low}
            icon={AlertTriangle}
            color="amber"
          />
          <StatsCard
            title="Нет в наличии"
            value={stockStats.out}
            icon={Package}
            color="red"
            highlight={stockStats.out > 0}
          />
        </div>

        {/* Search & Filters */}
        <Card className="p-4 glass border-border/30 rounded-3xl surface-glow">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative md:col-span-2">
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Поиск по названию, артикулу, бренду"
                  className="pl-9 h-10 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                />
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              </div>
              
              <div className="flex gap-2">
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value, 10));
                    setPage(1);
                  }}
                  className="w-28 h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n} / стр
                    </option>
                  ))}
                </select>
                <Button 
                  variant="outline" 
                  className="rounded-2xl btn-outline-fixed"
                  onClick={() => setPage(1)}
                >
                  Применить
                </Button>
              </div>
            </div>

            {/* Stock Filters */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground mr-3">Остатки:</span>
              
              <StockFilterButton
                active={stockFilter === 'all'}
                onClick={() => setStockFilter('all')}
                count={items.length}
              >
                Все
              </StockFilterButton>
              
              <StockFilterButton
                active={stockFilter === 'available'}
                onClick={() => setStockFilter('available')}
                count={stockStats.available}
                variant="available"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                В наличии
              </StockFilterButton>
              
              <StockFilterButton
                active={stockFilter === 'low'}
                onClick={() => setStockFilter('low')}
                count={stockStats.low}
                variant="low"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Заканчивается
              </StockFilterButton>
              
              <StockFilterButton
                active={stockFilter === 'out'}
                onClick={() => setStockFilter('out')}
                count={stockStats.out}
                variant="out"
              >
                <Package className="w-3 h-3 mr-1" />
                Закончилось
              </StockFilterButton>
            </div>
          </div>
        </Card>

        {/* Parts List */}
        <Card className="p-0 glass border-border/30 rounded-3xl surface-glow overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-surface-1/40 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="flex items-center justify-center gap-3 text-destructive mb-4">
                <AlertTriangle className="w-6 h-6" />
                <p className="text-lg font-medium">{error}</p>
              </div>
              <Button onClick={handleRefresh} className="rounded-2xl">
                <RefreshCw className="w-4 h-4 mr-2" />
                Повторить
              </Button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">Запчасти не найдены</h3>
              <p className="text-sm mb-4">
                {stockFilter !== 'all' 
                  ? `Нет запчастей с выбранным статусом остатков`
                  : 'Попробуйте изменить параметры поиска или добавьте первую запчасть'
                }
              </p>
              <Button 
                className="rounded-2xl bg-gradient-primary hover:opacity-90"
                onClick={handleCreate}
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить запчасть
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {filteredItems.map((part) => (
                <PartRow 
                  key={part.id} 
                  part={part} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Показано: {filteredItems.length} из {data.total} запчастей
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-2xl btn-outline-fixed"
                disabled={(data.page || 1) <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Назад
              </Button>
              <span className="text-sm px-3 py-1 rounded-xl bg-surface-1/60">
                {data.page || 1} / {data.totalPages || 1}
              </span>
              <Button
                variant="outline"
                className="rounded-2xl btn-outline-fixed"
                disabled={(data.page || 1) >= (data.totalPages || 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Далее
              </Button>
            </div>
          </div>
        )}
      </div>

      <PartEditDialog 
        open={openEdit} 
        onOpenChange={setOpenEdit} 
        part={current} 
        onSaved={handleSaved} 
      />
    </AppLayout>
  );
}

// Stock Filter Button Component
function StockFilterButton({
  active,
  onClick,
  count,
  variant = 'default',
  children
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  variant?: 'default' | 'available' | 'low' | 'out';
  children: React.ReactNode;
}) {
  const variantStyles = {
    default: 'border-border/50',
    available: 'border-emerald-200 dark:border-emerald-800/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
    low: 'border-amber-200 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
    out: 'border-red-200 dark:border-red-800/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300',
  };

  return (
    <Button
      variant={active ? 'default' : 'outline'}
      className={cn(
        "rounded-xl text-xs transition-all duration-300 relative h-8",
        active && variant !== 'default' && variantStyles[variant],
        !active && variant !== 'default' && variantStyles[variant]
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-1">
        {children}
        <Badge variant="secondary" className="ml-1 text-xs px-1 py-0 h-4 min-w-4">
          {count}
        </Badge>
      </div>
    </Button>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'default',
  highlight = false
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'default' | 'blue' | 'emerald' | 'amber' | 'red';
  highlight?: boolean;
}) {
  const colorStyles = {
    default: 'from-surface-1/40 to-surface-2/40 border-border/30 text-muted-foreground',
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-600 dark:text-blue-400',
    emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-600 dark:text-amber-400',
    red: 'from-red-500/10 to-red-600/5 border-red-500/20 text-red-600 dark:text-red-400',
  };

  return (
    <Card className={cn(
      'p-4 glass border rounded-2xl bg-gradient-to-br transition-all duration-300 hover:scale-[1.02]',
      colorStyles[color],
      highlight && 'animate-pulse'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-2 rounded-xl',
          color === 'blue' && 'bg-blue-500/20',
          color === 'emerald' && 'bg-emerald-500/20',
          color === 'amber' && 'bg-amber-500/20',
          color === 'red' && 'bg-red-500/20',
          color === 'default' && 'bg-surface-1/40'
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="text-lg font-bold">{value}</div>
        </div>
      </div>
    </Card>
  );
}

// Enhanced Part Row Component
function PartRow({ 
  part, 
  onEdit, 
  onDelete 
}: { 
  part: PartCatalogueItem; 
  onEdit: (part: PartCatalogueItem) => void;
  onDelete: (part: PartCatalogueItem) => void;
}) {
  // Mock stock level for demonstration
  const stockLevel = Math.floor(Math.random() * 50);
  const stockStatus = stockLevel === 0 ? 'out' : stockLevel <= 5 ? 'low' : 'available';
  
  const statusConfig = {
    available: {
      badge: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30',
      icon: CheckCircle,
      text: 'В наличии'
    },
    low: {
      badge: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/30',
      icon: AlertTriangle,
      text: 'Заканчивается'
    },
    out: {
      badge: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/30',
      icon: Package,
      text: 'Нет в наличии'
    }
  };

  const config = statusConfig[stockStatus];
  const StatusIcon = config.icon;

  return (
    <div className="p-4 hover:bg-surface-1/30 transition-all duration-300 group">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 group-hover:scale-105 transition-transform">
            <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm mb-1 truncate group-hover:text-primary transition-colors">
              {part.name}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {part.brand && (
                <div className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span>{part.brand}</span>
                </div>
              )}
              {part.partNumber && (
                <div className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  <span className="font-mono">{part.partNumber}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                <span>{(part.sellingPrice || 0).toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Status */}
        <div className="text-center">
          <Badge variant="outline" className={cn("text-xs mb-1", config.badge)}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {config.text}
          </Badge>
          <div className="text-xs text-muted-foreground">
            На складе: {stockLevel}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onEdit(part)}
            className="rounded-xl btn-outline-fixed opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <Pencil className="w-3.5 h-3.5 mr-1" /> 
            Изменить
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => void onDelete(part)}
            className="rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> 
            Удалить
          </Button>
        </div>
      </div>
    </div>
  );
}
