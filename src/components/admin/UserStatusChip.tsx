import { Ban, CheckCircle2, Clock, ShieldX, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { USER_STATUS_AR } from '@/lib/staff-labels';
import { isDeleted, type UserStatus } from '@/services/admin-users.service';

// Shared by the users list and the user detail route, so it lives here rather than being
// exported out of a page.tsx.

const STATUS_META: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
  ACTIVE:               { label: USER_STATUS_AR.ACTIVE,               cls: 'bg-green-100 text-green-700', Icon: CheckCircle2 },
  SUSPENDED:            { label: USER_STATUS_AR.SUSPENDED,            cls: 'bg-amber-100 text-amber-800', Icon: Ban          },
  BANNED:               { label: USER_STATUS_AR.BANNED,               cls: 'bg-red-100 text-red-700',     Icon: ShieldX      },
  PENDING_VERIFICATION: { label: USER_STATUS_AR.PENDING_VERIFICATION, cls: 'bg-gray-100 text-gray-600',   Icon: Clock        },
  DELETED:              { label: USER_STATUS_AR.DELETED,              cls: 'bg-gray-800 text-white',      Icon: Trash2       },
};

/**
 * A soft-deleted row carries status BANNED *and* a deletedAt, so «محذوف» must win —
 * otherwise every deleted account reads as merely banned.
 */
export function UserStatusChip({
  user, size = 'sm',
}: {
  user: { status: UserStatus; deletedAt: string | null };
  size?: 'sm' | 'lg';
}) {
  const meta = STATUS_META[isDeleted(user) ? 'DELETED' : user.status] ?? STATUS_META.PENDING_VERIFICATION;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold rounded-full whitespace-nowrap',
        size === 'lg' ? 'text-xs px-3 py-1.5' : 'text-[11px] px-2.5 py-1',
        meta.cls,
      )}
    >
      <meta.Icon className={size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      {meta.label}
    </span>
  );
}
