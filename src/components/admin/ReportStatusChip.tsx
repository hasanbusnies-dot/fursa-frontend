import { CheckCircle2, Clock, Eye, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QueueStatus, ReportStatus } from '@/services/reports.service';

// Shared by the reports queue and the report detail route.

/** RESOLVED is deprecated backend-side (never written again) but may exist on old rows,
 *  so it still gets a label rather than falling through to a raw enum string. */
export const REPORT_STATUS_AR: Record<string, string> = {
  PENDING:   'قيد الانتظار',
  REVIEWED:  'تمت المراجعة',
  DISMISSED: 'مُهمَل',
  ACTIONED:  'تم اتخاذ إجراء',
  RESOLVED:  'مُغلق (قديم)',
};

const META: Record<string, { cls: string; Icon: React.ElementType }> = {
  PENDING:   { cls: 'bg-amber-100 text-amber-800', Icon: Clock        },
  REVIEWED:  { cls: 'bg-blue-100 text-blue-700',   Icon: Eye          },
  DISMISSED: { cls: 'bg-gray-200 text-gray-600',   Icon: ShieldX      },
  ACTIONED:  { cls: 'bg-green-100 text-green-700', Icon: CheckCircle2 },
  RESOLVED:  { cls: 'bg-gray-200 text-gray-600',   Icon: CheckCircle2 },
};

export function ReportStatusChip({
  status, size = 'sm',
}: {
  status: QueueStatus | ReportStatus | string;
  size?: 'sm' | 'lg';
}) {
  const meta = META[status] ?? META.PENDING;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold rounded-full whitespace-nowrap',
        size === 'lg' ? 'text-xs px-3 py-1.5' : 'text-[11px] px-2.5 py-1',
        meta.cls,
      )}
    >
      <meta.Icon className={size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      {REPORT_STATUS_AR[status] ?? status}
    </span>
  );
}
