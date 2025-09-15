// path: apps/frontend/components/ui/async-multiselect.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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

export function AsyncMultiSelect<T = unknown>({
  values,
  onChange,
  fetchOptions,
  placeholder = 'Поиск услуг…',
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
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
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
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setErr((e as Error)?.message || 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  const toggle = (opt: MultiOption<T>) => {
    const exists = values.some((v) => v.id === opt.id);
    if (exists) onChange(values.filter((v) => v.id !== opt.id));
    else if (values.length < maxSelected) onChange([...values, opt]);
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((v) => (
          <span key={v.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-muted border">
            {v.label}
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
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
        />
        <Button
          variant="ghost"
          onClick={() => {
            onChange([]);
            setQuery('');
          }}
          disabled={disabled || values.length === 0}
        >
          Очистить
        </Button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="max-h-64 overflow-auto">
            {loading ? (
              <div className="p-3 text-sm text-muted-foreground">Загрузка…</div>
            ) : err ? (
              <div className="p-3 text-sm text-destructive">{err}</div>
            ) : options.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">
                {query.trim() ? 'Ничего не найдено' : 'Начните вводить для поиска'}
              </div>
            ) : (
              options.map((opt) => {
                const checked = values.some((v) => v.id === opt.id);
                return (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={checked}
                      onChange={() => toggle(opt)}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
