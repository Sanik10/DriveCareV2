// path: apps/frontend/components/ui/async-combobox.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type AsyncOption<T = unknown> = {
  id: string;
  label: string;
  meta?: T;
};

type Props<T = unknown> = {
  value?: AsyncOption<T> | null;
  onChange: (opt: AsyncOption<T> | null) => void;
  fetchOptions: (query: string, signal?: AbortSignal) => Promise<Array<AsyncOption<T>>>;
  placeholder?: string;
  disabled?: boolean;
  emptyText?: string;
  notFoundText?: string;
  initialQuery?: string;
  debounceMs?: number;
  renderOption?: (opt: AsyncOption<T>, active: boolean) => React.ReactNode;
};

export function AsyncCombobox<T = unknown>({
  value,
  onChange,
  fetchOptions,
  placeholder = 'Начните вводить для поиска…',
  disabled,
  emptyText = 'Начните вводить для поиска',
  notFoundText = 'Ничего не найдено',
  initialQuery = '',
  debounceMs = 250,
  renderOption,
}: Props<T>) {
  const [query, setQuery] = useState<string>(initialQuery);
  const [open, setOpen] = useState(false);

  const [options, setOptions] = useState<Array<AsyncOption<T>>>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState<number>(-1);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showList = open && (loading || options.length > 0 || (!!query && !loading) || !!err);

  const selectedLabel = useMemo(() => value?.label ?? '', [value]);

  const selectOption = (opt: AsyncOption<T>) => {
    onChange(opt);
    setOpen(false);
    setQuery('');
    setActiveIdx(-1);
  };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

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
        setActiveIdx(res.length > 0 ? 0 : -1);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setErr((e as Error)?.message || 'Ошибка загрузки');
        setOptions([]);
        setActiveIdx(-1);
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
    <div ref={rootRef} className="relative">
      <div className="flex gap-sm">
        <Input
          ref={inputRef}
          value={open ? query : selectedLabel}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onKeyDown={(e) => {
            if (!open) {
              if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setOpen(true);
                setQuery('');
              }
              return;
            }

            if (e.key === 'Escape') {
              e.preventDefault();
              setOpen(false);
              setActiveIdx(-1);
              return;
            }

            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIdx((i) => {
                const next = Math.min(options.length - 1, i + 1);
                return Number.isFinite(next) ? next : -1;
              });
              return;
            }

            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIdx((i) => {
                const next = Math.max(0, i - 1);
                return Number.isFinite(next) ? next : -1;
              });
              return;
            }

            if (e.key === 'Enter') {
              if (activeIdx >= 0 && activeIdx < options.length) {
                e.preventDefault();
                selectOption(options[activeIdx]);
              }
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
        />

        {value ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(null);
              setQuery('');
              setOpen(false);
              setActiveIdx(-1);
              inputRef.current?.focus();
            }}
            disabled={disabled}
          >
            Очистить
          </Button>
        ) : null}
      </div>

      {showList && !disabled && (
        <div
          className={cn(
            'absolute z-50 mt-xs w-full overflow-hidden rounded-md border border-border bg-card text-foreground',
            'shadow-card dark:shadow-dark-card'
          )}
        >
          <div className="max-h-64 overflow-auto">
            {loading ? (
              <div className="p-md text-sm text-muted-foreground">Загрузка…</div>
            ) : err ? (
              <div className="p-md text-sm text-destructive">{err}</div>
            ) : options.length === 0 ? (
              <div className="p-md text-sm text-muted-foreground">
                {query.trim() ? notFoundText : emptyText}
              </div>
            ) : (
              options.map((opt, idx) => {
                const active = idx === activeIdx;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={cn(
                      'w-full text-left px-md py-sm text-sm transition-colors',
                      'hover:bg-surface-2',
                      active && 'bg-surface-2'
                    )}
                    onMouseEnter={() => setActiveIdx(idx)}
                    // КЛЮЧЕВОЕ: выбираем на mousedown, чтобы не терять клик в модалках/оверфлоу
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectOption(opt);
                    }}
                  >
                    {renderOption ? renderOption(opt, active) : opt.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
