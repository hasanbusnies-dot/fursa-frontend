'use client';

import { useState } from 'react';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import type { Category } from '@/types';

export interface CategorySelectorProps {
  categories: Category[];
  onSelect: (category: Category | null) => void;
  allLabel?: string;
  className?: string;
}

// ── Recursive inline tree node ────────────────────────────────────────────────
// Children render DIRECTLY under their parent <li> — NOT appended at the bottom
// of the list. This is the critical structural fix for the column-layout bug.

function SidebarCategoryNode({
  cat,
  depth,
  activePath,
  onActivePath,
  onSelect,
}: {
  cat: Category;
  depth: number;
  activePath: string[];
  onActivePath: (updater: (prev: string[]) => string[]) => void;
  onSelect: (cat: Category) => void;
}) {
  const hasChildren = !!(cat.children?.length);
  const isExpanded  = activePath[depth] === cat.id;
  const isSelected  = activePath[depth] === cat.id;

  // Strict parent filter — only children whose parentId matches this node.
  const trueChildren = (cat.children ?? []).filter(
    (child) => !child.parentId || child.parentId === cat.id,
  );

  function toggle() {
    onActivePath((prev) => {
      const base = prev.slice(0, depth);
      return prev[depth] === cat.id ? base : [...base, cat.id];
    });
  }

  return (
    <li>
      <div
        className={`flex items-center text-sm rounded-lg transition-colors ${
          isSelected
            ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        {/* Name button: parents → toggle expand only; leaves → navigate */}
        <button
          type="button"
          className="flex-1 text-left py-2 truncate"
          style={{ paddingLeft: `${12 + depth * 14}px` }}
          onClick={() => {
            if (hasChildren) {
              toggle();
            } else {
              onActivePath((prev) => [...prev.slice(0, depth), cat.id]);
              onSelect(cat);
            }
          }}
        >
          {cat.name}
        </button>

        {/* Chevron: expand/collapse only, never navigate */}
        {hasChildren && (
          <button
            type="button"
            aria-label={isExpanded ? 'Daralt' : 'Genişlet'}
            className="px-2.5 py-2 shrink-0 text-gray-400 hover:text-blue-500 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
          >
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform ${
                isExpanded ? 'text-blue-500 rotate-90' : ''
              }`}
            />
          </button>
        )}
      </div>

      {/* Children render inline, directly under their parent — not at the list bottom */}
      {hasChildren && isExpanded && trueChildren.length > 0 && (
        <ul className="mt-0.5 space-y-0.5">
          {trueChildren.map((child) => (
            <SidebarCategoryNode
              key={child.id}
              cat={child}
              depth={depth + 1}
              activePath={activePath}
              onActivePath={onActivePath}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ── CategorySelector ──────────────────────────────────────────────────────────

export function CategorySelector({
  categories,
  onSelect,
  allLabel = 'All Categories',
  className = '',
}: CategorySelectorProps) {
  const [activePath, setActivePath] = useState<string[]>([]);

  function handleReset() {
    setActivePath([]);
    onSelect(null);
  }

  return (
    <div className={`select-none ${className}`}>
      {/* "All" reset button */}
      <button
        type="button"
        onClick={handleReset}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
          activePath.length === 0
            ? 'bg-blue-600 text-white font-semibold'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
        {allLabel}
      </button>

      <div className="border-t border-gray-100 mt-2 mb-1" />

      {/* Root categories — children expand inline, never appended at the bottom */}
      <ul className="space-y-0.5">
        {categories.map((cat) => (
          <SidebarCategoryNode
            key={cat.id}
            cat={cat}
            depth={0}
            activePath={activePath}
            onActivePath={setActivePath}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </div>
  );
}
