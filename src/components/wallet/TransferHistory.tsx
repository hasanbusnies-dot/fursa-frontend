'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, RefreshCw, Loader2 } from 'lucide-react';
import {
  walletTransfersService,
  type TransferHistoryRow,
  type TransferStatus,
  type TransferMethod,
} from '@/services/wallet-transfers.service';
import { ContractDoc } from '@/components/stores/ContractDoc';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

const STATUS_META: Record<TransferStatus, { label: string; cls: string }> = {
  INITIATED:            { label: 'لم يكتمل',       cls: 'bg-gray-100 text-gray-500'    },
  PENDING_VERIFICATION: { label: 'بانتظار التأكيد', cls: 'bg-amber-100 text-amber-700'  },
  CONFIRMED:            { label: 'مؤكد',           cls: 'bg-green-100 text-green-700'  },
  REJECTED:             { label: 'مرفوض',          cls: 'bg-red-100 text-red-700'      },
};

const METHOD_LABEL: Record<TransferMethod, string> = {
  SHAM_CASH: 'Sham Cash', MTN_CASH: 'MTN Cash', SYRIATEL_CASH: 'Syriatel Cash',
};

function formatDateTime(s: string): string {
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return '';
  return t.toLocaleString('ar-SY', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** "طلبات الشحن" — the user's manual-transfer top-up requests with their status.
 *  Separate from the wallet ledger: only CONFIRMED transfers become wallet credits. */
export function TransferHistory() {
  const [rows, setRows]       = useState<TransferHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError(false);
    walletTransfersService.getHistory()
      .then(setRows)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Hide the section entirely when there's nothing to show (and no error).
  if (!loading && !error && rows.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-6">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <ArrowLeftRight className="w-4 h-4 text-orange-500" />
        <h2 className="text-sm font-bold text-gray-800">طلبات الشحن</h2>
      </div>

      {loading ? (
        <div className="p-4 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-600 mb-2">تعذّر تحميل طلبات الشحن.</p>
          <button onClick={load} className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700">
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {rows.map((r) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.INITIATED;
            return (
              <div key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">
                      {formatMoney(r.amount, r.currency ?? 'SYP')}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {METHOD_LABEL[r.method] ?? r.method} · {formatDateTime(r.createdAt)}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5" dir="ltr">
                      الرمز: {r.referenceCode}
                    </p>
                  </div>
                  <span className={cn('shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full', meta.cls)}>
                    {meta.label}
                  </span>
                </div>
                {r.proofUrl && (
                  <div className="mt-2">
                    <ContractDoc
                      url={r.proofUrl}
                      label="عرض الإيصال"
                      emptyLabel="لا يوجد إيصال"
                      expiredLabel="انتهت صلاحية الرابط، أعد تحميل الصفحة."
                      alt={`إيصال تحويل ${r.referenceCode}`}
                      dir="rtl"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
