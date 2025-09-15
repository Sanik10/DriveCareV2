// path: apps/frontend/components/ui/async-combobox.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showList = open && (loading || options.length > 0 || (!!query && !loading));

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
         if (res.length === 0) setActiveIdx(-1);
         else setActiveIdx(0);
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

  const selectedLabel = useMemo(() => value?.label ?? '', [value]);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex gap-2">
        <Input
          value={open ? query : selectedLabel}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          placeholder={placeholder}
          disabled={disabled}
        />
        {value ? (
          <Button
            variant="ghost"
            onClick={() => {
              onChange(null);
              setQuery('');
              setOpen(false);
            }}
            disabled={disabled}
          >
            Очистить
          </Button>
        ) : null}
      </div>

      {showList && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="max-h-64 overflow-auto">
            {loading ? (
              <div className="p-3 text-sm text-muted-foreground">Загрузка…</div>
            ) : err ? (
              <div className="p-3 text-sm text-destructive">{err}</div>
            ) : options.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">
                {query.trim() ? notFoundText : emptyText}
              </div>
            ) : (
              options.map((opt, idx) => {
                const active = idx === activeIdx;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${active ? 'bg-muted' : ''}`}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                      setQuery('');
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
