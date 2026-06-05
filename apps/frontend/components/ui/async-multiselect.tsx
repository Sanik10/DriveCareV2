// path: apps/frontend/components/ui/async-multiselect.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type MultiOption<T = unknown> = {
  id: string;
  label: string;
  meta?: T;
};

type Props<T = unknown> = {
  values: MultiOption<T>[];
  onChange: (values: MultiOption<T>[]) => void;
  fetchOptions: (query: string, signal?: AbortSignal) => Promise<Array<MultiOption<T>>>;
  placeholder?: string;
  disabled?: boolean;
  debounceMs?: number;
  maxSelected?: number;
};

type MenuRect = { top: number; left: number; width: number };

export function AsyncMultiSelect<T = unknown>({
  values,
  onChange,
  fetchOptions,
  placeholder = 'Поиск…',
  disabled,
  debounceMs = 250,
  maxSelected = 50,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<MultiOption<T>[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [menuRect, setMenuRect] = useState<MenuRect | null>(null);

  const updateMenuRect = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuRect({
      top: r.bottom + 4,
      left: r.left,
      width: r.width,
    });
  }, []);

  const toggle = useCallback(
    (opt: MultiOption<T>) => {
      const exists = values.some((v) => v.id === opt.id);
      if (exists) onChange(values.filter((v) => v.id !== opt.id));
      else if (values.length < maxSelected) onChange([...values, opt]);
    },
    [maxSelected, onChange, values]
  );

  /**
   * КЛЮЧЕВОЕ ИЗМЕНЕНИЕ:
   * - слушаем document в bubble-фазе (без capture)
   * - внутри root/menu гасим всплытие клика
   * Тогда клик по опции НЕ воспринимается как "outside click".
   */
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;

      const t = e.target as Node | null;
      if (!t) return;

      // Если клик был внутри инпута/чипов
      if (rootRef.current?.contains(t)) return;

      // Если клик был внутри меню (portal в body)
      if (menuRef.current?.contains(t)) return;

      setOpen(false);
    }

    document.addEventListener('click', onDocClick); // bubble (важно!)
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    updateMenuRect();

    const onAnyScroll = () => updateMenuRect();
    window.addEventListener('resize', updateMenuRect);
    window.addEventListener('scroll', onAnyScroll, true);

    return () => {
      window.removeEventListener('resize', updateMenuRect);
      window.removeEventListener('scroll', onAnyScroll, true);
    };
  }, [open, updateMenuRect]);

  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setErr(null);

      try {
        const res = await fetchOptions(query.trim(), abortRef.current.signal);
        setOptions(res);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setErr((e as Error)?.message || 'Ошибка загрузки');
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onClick={(e) => {
        // чтобы document click не закрывал при клике по чипам/кнопкам внутри
        e.stopPropagation();
      }}
    >
      {/* Selected chips (DS: rounded-md) */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-sm mb-sm">
          {values.map((v) => (
            <span
              key={v.id}
              className={cn(
                'inline-flex items-center gap-xs rounded-md border border-border bg-surface-2',
                'h-6 px-sm text-xs text-foreground'
              )}
              title={v.label}
            >
              <span className="truncate max-w-[320px]">{v.label}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => onChange(values.filter((x) => x.id !== v.id))}
                aria-label="Удалить"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div ref={anchorRef} className="flex gap-sm">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder={placeholder}
          disabled={disabled}
        />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange([]);
            setQuery('');
          }}
          disabled={disabled || values.length === 0}
        >
          Очистить
        </Button>
      </div>

      {open && !disabled && menuRect && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: 'fixed',
                top: menuRect.top,
                left: menuRect.left,
                width: menuRect.width,
                pointerEvents: 'auto', // 🔥 ИСПРАВЛЕНИЕ: возвращаем кликабельность порталу
              }}
              className={cn(
                'z-[60] overflow-hidden rounded-md border border-border bg-card text-foreground',
                'shadow-card dark:shadow-dark-card'
              )}
              onPointerDown={(e) => {
                // 🔥 ИСПРАВЛЕНИЕ: чтобы Radix Dialog не подумал, что мы кликнули на overlay
                e.stopPropagation();
              }}
              onClick={(e) => {
                // критично: клик внутри dropdown не должен доходить до document
                e.stopPropagation();
              }}
            >
              <div className="max-h-64 overflow-auto">
                {loading ? (
                  <div className="p-md text-sm text-muted-foreground">Загрузка…</div>
                ) : err ? (
                  <div className="p-md text-sm text-destructive">{err}</div>
                ) : options.length === 0 ? (
                  <div className="p-md text-sm text-muted-foreground">
                    {query.trim() ? 'Ничего не найдено' : 'Начните вводить для поиска'}
                  </div>
                ) : (
                  options.map((opt) => {
                    const checked = values.some((v) => v.id === opt.id);
                    const disabledByLimit = !checked && values.length >= maxSelected;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={cn(
                          'w-full text-left px-md py-sm text-sm transition-colors cursor-pointer', // 🔥 ИСПРАВЛЕНИЕ: добавлен cursor-pointer
                          'hover:bg-surface-2',
                          disabledByLimit && 'opacity-60 cursor-not-allowed'
                        )}
                        onPointerDown={(e) => {
                          // 🔥 ИСПРАВЛЕНИЕ: только предотвращаем потерю фокуса инпутом
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          // 🔥 ИСПРАВЛЕНИЕ: переключение логики происходит только по onClick
                          e.preventDefault();
                          e.stopPropagation();
                          if (!disabledByLimit) toggle(opt);
                        }}
                      >
                        <div className="flex items-center gap-sm min-w-0">
                          <span
                            className={cn(
                              'inline-flex h-4 w-4 items-center justify-center rounded-sm border',
                              checked ? 'bg-primary border-primary' : 'border-border'
                            )}
                          >
                            {checked ? <span className="block h-2 w-2 bg-primary-foreground" /> : null}
                          </span>
                          <span className="truncate">{opt.label}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
