import Link from 'next/link';
import { PencilLine } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// Shared shell for the static info pages (/about, /contact, /safety, /privacy,
// /terms). Server components — no interactivity, so nothing here is 'use client'.
//
// Content lives in the PAGE files as plain JSX, not in a data blob: these are
// documents the founder will rewrite, and prose is easier to edit in place than
// inside an array of strings.
// ═══════════════════════════════════════════════════════════════════════════════

export function StaticPage({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  /** Human-readable revision date, e.g. «تموز 2026». */
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
          {intro && <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed">{intro}</p>}
          {updated && <p className="mt-2 text-xs text-gray-400">آخر تحديث: {updated}</p>}
        </header>

        <div className="bg-white rounded-card shadow-pebble p-5 sm:p-8 space-y-7">
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          <Link href="/" className="text-blue-600 hover:underline font-medium">العودة إلى الرئيسية</Link>
        </p>
      </div>
    </div>
  );
}

/** A numbered/titled block within a document. */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2">{title}</h2>
      <div className="text-sm text-gray-700 leading-[1.9] space-y-2">{children}</div>
    </section>
  );
}

/** Bulleted list with RTL-correct markers. */
export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-[0.6rem] w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
          <span className="flex-1">{item}</span>
        </li>
      ))}
    </ul>
  );
}

// DraftNotice («مسوّدة قيد المراجعة») was removed once /privacy and /terms passed legal
// review. Deliberately not kept "just in case": a dead banner component that stamps a
// live legal document as an unreviewed draft is the kind of thing that gets re-added by
// accident. Both documents are published commitments now — if either ever needs a
// provisional state again, write it for that occasion.

/**
 * Inline marker for content only the founder can supply (real contact details,
 * founding story). Deliberately conspicuous — an un-filled placeholder should be
 * impossible to miss on the page, not blend into the prose.
 */
export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-50 border border-dashed border-orange-300 px-2 py-0.5 text-orange-700 text-xs font-semibold">
      <PencilLine className="w-3 h-3 shrink-0" />
      {children}
    </span>
  );
}
