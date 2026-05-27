'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HelpCircle, CheckCircle2, Clock, ImageOff, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { qaService, questionText, askerName, type Question } from '@/services/qa.service';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ar-SY', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
      <div className="h-4 bg-gray-200 rounded w-5/6" />
      <div className="h-3 bg-gray-100 rounded w-full" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-18 h-18 w-[72px] h-[72px] rounded-2xl bg-orange-50 flex items-center justify-center mb-5">
        <HelpCircle className="w-9 h-9 text-orange-300" />
      </div>
      <p className="text-base font-bold text-gray-800 mb-1.5">{text}</p>
      <p className="text-sm text-gray-400 max-w-xs">
        عندما تتراكم الأسئلة، ستُعرض هنا جميع الأسئلة والأجوبة.
      </p>
    </div>
  );
}

// ── Question card (received — with answer form) ───────────────────────────────

function ReceivedCard({ question, onAnswered }: { question: Question; onAnswered: (q: Question) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [draft,    setDraft]    = useState('');
  const [saving,   setSaving]   = useState(false);

  const thumb = question.listing?.images?.find((i) => i.isPrimary)?.url
    ?? question.listing?.images?.[0]?.url;
  const displayName = askerName(question);

  async function handleAnswer() {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    try {
      const updated = await qaService.answer(question.id, text);
      // Ensure `answer` is always populated even if the backend response is sparse
      onAnswered({ ...question, ...updated, answer: updated.answer ?? text });
      setDraft('');
      setExpanded(false);
      toast.success('تم حفظ إجابتك.');
    } catch {
      toast.error('تعذّر إرسال الإجابة.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
      {/* Listing + meta row */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
          {thumb
            ? <img src={thumb} alt="" className="w-full h-full object-cover" />
            : <ImageOff className="w-4 h-4 text-gray-300" />}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/listings/${question.listingId}`}
            className="text-sm font-semibold text-gray-800 hover:text-orange-600 transition-colors truncate block"
          >
            {question.listing?.title ?? 'الإعلان'}
          </Link>
          <p className="text-xs text-gray-400">
            {displayName} · {formatDate(question.createdAt)}
          </p>
        </div>
        <span className={cn(
          'inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0',
          question.answer
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-orange-50 text-orange-600 border-orange-200',
        )}>
          {question.answer
            ? <><CheckCircle2 className="w-3 h-3" />تمت الإجابة</>
            : <><Clock className="w-3 h-3" />في الانتظار</>}
        </span>
      </div>

      {/* Question text */}
      <p className="text-sm text-gray-800 font-medium leading-relaxed bg-gray-50 rounded-xl px-4 py-3">
        {questionText(question)}
      </p>

      {/* Existing answer */}
      {question.answer && (
        <div className="ms-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 space-y-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
            ردّك
          </span>
          <p className="text-sm text-gray-700 leading-relaxed">{question.answer}</p>
        </div>
      )}

      {/* Answer form */}
      {!question.answer && (
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'إلغاء' : 'أجب'}
          </button>
          {expanded && (
            <div className="mt-3 space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                placeholder="اكتب إجابتك…"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
              <button
                onClick={handleAnswer}
                disabled={saving || !draft.trim()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50"
              >
                {saving ? 'جارٍ الإرسال…' : 'إرسال الرد'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Question card (asked — read-only) ────────────────────────────────────────

function AskedCard({ question }: { question: Question }) {
  const thumb = question.listing?.images?.find((i) => i.isPrimary)?.url
    ?? question.listing?.images?.[0]?.url;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
      {/* Listing + meta */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
          {thumb
            ? <img src={thumb} alt="" className="w-full h-full object-cover" />
            : <ImageOff className="w-4 h-4 text-gray-300" />}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/listings/${question.listingId}`}
            className="text-sm font-semibold text-gray-800 hover:text-orange-600 transition-colors truncate block"
          >
            {question.listing?.title ?? 'الإعلان'}
          </Link>
          <p className="text-xs text-gray-400">{formatDate(question.createdAt)}</p>
        </div>
        <span className={cn(
          'inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0',
          question.answer
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-gray-50 text-gray-500 border-gray-200',
        )}>
          {question.answer
            ? <><CheckCircle2 className="w-3 h-3" />تمت الإجابة</>
            : <><Clock className="w-3 h-3" />في انتظار الإجابة</>}
        </span>
      </div>

      {/* Question */}
      <p className="text-sm text-gray-800 font-medium leading-relaxed bg-gray-50 rounded-xl px-4 py-3">
        {questionText(question)}
      </p>

      {/* Answer if present */}
      {question.answer && (
        <div className="ms-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 space-y-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
            رد البائع
          </span>
          <p className="text-sm text-gray-700 leading-relaxed">{question.answer}</p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'received' | 'asked';

export default function QuestionsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [mounted,    setMounted]    = useState(false);
  const [activeTab,  setActiveTab]  = useState<Tab>('received');
  const [received,   setReceived]   = useState<Question[]>([]);
  const [asked,      setAsked]      = useState<Question[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
  }, [mounted, isAuthenticated, router]);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    qaService.getMyQuestions()
      .then(({ incoming, outgoing }) => {
        if (cancelled) return;
        setReceived(incoming);
        setAsked(outgoing);
      })
      .catch(() => {
        if (cancelled) return;
        setError('حدث خطأ أثناء تحميل الأسئلة.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mounted, isAuthenticated]);

  function handleAnswered(updated: Question) {
    setReceived((prev) =>
      prev.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)),
    );
  }

  if (!mounted || !isAuthenticated) {
    return (
      <div>
        <div className="h-8 w-44 bg-gray-200 rounded mb-6 animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'received', label: 'الأسئلة الواردة',  count: received.length },
    { key: 'asked',    label: 'الأسئلة المطروحة', count: asked.length    },
  ];

  const activeList = activeTab === 'received' ? received : asked;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">أسئلة وأجوبة</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          الأسئلة الواردة على إعلاناتك والأسئلة التي طرحتها
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 py-3.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2',
                activeTab === tab.key
                  ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/40'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  'text-[11px] font-extrabold px-2 py-0.5 rounded-full',
                  activeTab === tab.key
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-gray-100 text-gray-500',
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <HelpCircle className="w-10 h-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-700">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-orange-500 hover:text-orange-700 font-medium"
              >
                حاول مرة أخرى
              </button>
            </div>
          ) : activeList.length === 0 ? (
            <EmptyState
              text={
                activeTab === 'received'
                  ? 'لم تصل إلى إعلاناتك أي أسئلة بعد.'
                  : 'لم تطرح أي أسئلة بعد.'
              }
            />
          ) : (
            <div className="space-y-4">
              {activeTab === 'received'
                ? received.map((q) => (
                    <ReceivedCard key={q.id} question={q} onAnswered={handleAnswered} />
                  ))
                : asked.map((q) => (
                    <AskedCard key={q.id} question={q} />
                  ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
