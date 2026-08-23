'use client';

/**
 * Grouped, searchable, RTL-first combobox.
 *
 * Built rather than pulled in because the two places that need it (governorate +
 * place) have requirements no generic <select> covers: group headers, a pinned
 * «أخرى» escape hatch, Arabic-aware matching, and a list that can run to a few
 * hundred rows without dropping them all into the DOM.
 *
 * Accessibility: implements the ARIA combobox + listbox pattern — the input owns
 * `aria-activedescendant` while focus stays put, so a screen reader announces the
 * highlighted option without the caret ever leaving the text field.
 * ArrowUp/Down/Home/End move, Enter picks, Escape closes, Tab commits and leaves.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Muted text after the label — the place kind («قرية»، «بلدة»). */
  hint?: string;
  /** Group key; must match a key in `groups`. Ungrouped options render first. */
  group?: string;
}

export interface ComboboxGroup {
  key: string;
  label: string;
}

/**
 * Arabic matching is not substring matching.
 *
 * Sellers type «المزه» for «المزة» and «حماه» for «حماة»; they type bare «مزة»
 * for a row stored as «مزة القديمة»; and half of them omit the definite article.
 * So both sides are folded before comparing:
 *   · tashkeel/tatweel stripped (invisible, but they break equality)
 *   · alef forms أ إ آ ٱ → ا, ى → ي, ة → ه, ؤ/ئ → و/ي
 *   · Arabic-Indic digits ٠-٩ → 0-9 (place names like «مزة ٨٦» carry them)
 * Latin input is lowercased so `nameEn` still matches.
 */
const TASHKEEL = /[ً-ْٰـ]/g;

function fold(s: string): string {
  return s
    .replace(TASHKEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .toLowerCase()
    .trim();
}

/** Strips a leading «ال» so «المزة» and «مزة» match each other. */
function stripAl(s: string): string {
  return s.startsWith('ال') ? s.slice(2) : s;
}

function matches(haystack: string, needle: string): boolean {
  const h = fold(haystack);
  const n = fold(needle);
  if (!n) return true;
  return h.includes(n) || stripAl(h).includes(stripAl(n));
}

/**
 * Rendering every option is fine at 11 rows and ruinous at 184 (مركز حلب).
 * Rather than pull in a virtualiser for one list, cap the DOM and tell the
 * seller to keep typing — which is the behaviour that actually helps at that
 * size.
 *
 * THE CAP IS PER GROUP, NOT PER LIST, and that is load-bearing. حلب's grouped
 * view is 128 «أحياء المدينة» followed by 8 «المناطق»; a single flat cap spends
 * its whole budget on the first group and drops the second entirely, so منبج —
 * the only way into the rural half of the governorate — would be invisible until
 * the seller happened to type its name. Every group now keeps its own budget and
 * its own "و N أخرى" footer, so a group can be truncated but never erased.
 */
const MAX_PER_GROUP = 60;

export function SearchableCombobox({
  value,
  onChange,
  options,
  groups = [],
  placeholder = 'اختر…',
  searchPlaceholder = 'ابحث…',
  emptyText = 'لا توجد نتائج',
  disabled,
  searchable = true,
  loading = false,
  /** Called on every keystroke — lets the parent run a server-side search. */
  onSearchChange,
  /** Rendered under the list while `loading`, e.g. «جارٍ البحث…». */
  loadingText = 'جارٍ التحميل…',
  id,
  invalid,
  className,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  options: ComboboxOption[];
  groups?: ComboboxGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  searchable?: boolean;
  loading?: boolean;
  onSearchChange?: (q: string) => void;
  loadingText?: string;
  id?: string;
  invalid?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const reactId = useId();
  const listId = `${id ?? reactId}-listbox`;

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  // Filtering is client-side even when `onSearchChange` is wired: the parent
  // swaps `options` for server hits, and re-filtering an already-matching set is
  // a no-op. That keeps one code path for both sources.
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    return options.filter((o) => matches(o.label, query) || matches(o.hint ?? '', query));
  }, [options, query]);

  /**
   * Sections in render order: ungrouped first (the pinned «أخرى»), then each
   * declared group in its declared order — which is what pins «أحياء المدينة»
   * above «المناطق» — then any group the caller forgot to declare, which would
   * otherwise vanish silently.
   */
  const sections = useMemo(() => {
    const known = new Set(groups.map((g) => g.key));
    const undeclared = [...new Set(
      filtered.map((o) => o.group).filter((k): k is string => !!k && !known.has(k)),
    )];

    return [
      { key: '__ungrouped', label: null as string | null, rows: filtered.filter((o) => !o.group) },
      ...groups.map((g) => ({
        key: g.key,
        label: g.label as string | null,
        rows: filtered.filter((o) => o.group === g.key),
      })),
      ...undeclared.map((k) => ({
        key: k,
        label: null as string | null,
        rows: filtered.filter((o) => o.group === k),
      })),
    ]
      .filter((s) => s.rows.length > 0)
      .map((s) => ({
        ...s,
        shown: s.rows.slice(0, MAX_PER_GROUP),
        hidden: Math.max(0, s.rows.length - MAX_PER_GROUP),
      }));
  }, [filtered, groups]);

  // The flat list the arrow keys walk — exactly what is rendered, in render
  // order, so `data-idx` and `aria-activedescendant` stay aligned.
  const visible = useMemo(() => sections.flatMap((s) => s.shown), [sections]);

  // Reset the highlight whenever the visible set changes out from under it.
  useEffect(() => {
    setActive(0);
  }, [query, options]);

  // Close on outside pointer-down (not click: a click that starts inside and
  // ends outside shouldn't close, and vice-versa).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  useEffect(() => {
    if (open && searchable) inputRef.current?.focus();
  }, [open, searchable]);

  // Keep the highlighted row in view during keyboard walking.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function commit(opt: ComboboxOption | undefined) {
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
    setQuery('');
    onSearchChange?.('');
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => Math.min(i + 1, visible.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(visible.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        commit(visible[active]);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setQuery('');
        break;
      case 'Tab':
        // Commit what's highlighted, then let focus move on normally.
        if (visible[active]) commit(visible[active]);
        break;
    }
  }

  const triggerCls = cn(
    'w-full flex items-center gap-2 px-3 py-2.5 border rounded-lg text-sm text-start transition-colors',
    'focus:outline-none focus:ring-1',
    invalid
      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100',
    disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
    className,
  );

  let cursor = -1; // walks `visible` so data-idx lines up across group headers

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={triggerCls}
      >
        <span className={cn('flex-1 truncate', !selected && 'text-gray-400')}>
          {selected ? selected.label : placeholder}
        </span>
        {selected && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="مسح الاختيار"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {searchable && (
            <div className="relative border-b border-gray-100">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                role="searchbox"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onSearchChange?.(e.target.value);
                }}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                aria-controls={listId}
                aria-activedescendant={visible[active] ? `${listId}-${active}` : undefined}
                className="w-full bg-transparent py-2.5 ps-9 pe-3 text-[16px] focus:outline-none"
              />
            </div>
          )}

          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="max-h-64 overflow-y-auto overscroll-contain py-1"
          >
            {visible.length === 0 && !loading && (
              <li className="px-3 py-6 text-center text-xs text-gray-400">{emptyText}</li>
            )}

            {/* Ungrouped first (the pinned «أخرى»), then each group under its header. */}
            {sections.map((section) => {
              const header = section.label;

              return (
                <li key={section.key} role="presentation">
                  {header && (
                    <div
                      role="presentation"
                      className="sticky top-0 bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 backdrop-blur-sm"
                    >
                      {header}
                    </div>
                  )}
                  <ul role="group" aria-label={header ?? undefined}>
                    {section.shown.map((o) => {
                      cursor += 1;
                      const idx = cursor;
                      const isActive = idx === active;
                      const isSelected = o.value === value;
                      return (
                        <li
                          key={o.value}
                          id={`${listId}-${idx}`}
                          data-idx={idx}
                          role="option"
                          aria-selected={isSelected}
                          onPointerEnter={() => setActive(idx)}
                          onClick={() => commit(o)}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                            isActive && 'bg-blue-50',
                            isSelected && 'font-semibold text-blue-700',
                          )}
                        >
                          <span className="flex-1 truncate">{o.label}</span>
                          {o.hint && (
                            <span className="shrink-0 text-[10px] text-gray-400">{o.hint}</span>
                          )}
                          {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
                        </li>
                      );
                    })}
                  </ul>
                  {section.hidden > 0 && (
                    <div className="px-3 py-2 text-center text-[11px] text-gray-400">
                      و{section.hidden} نتيجة أخرى — تابع الكتابة لتضييق البحث
                    </div>
                  )}
                </li>
              );
            })}

            {loading && (
              <li className="px-3 py-2 text-center text-[11px] text-gray-400">{loadingText}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
