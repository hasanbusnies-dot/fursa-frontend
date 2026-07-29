'use client';

import { RefreshCw, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * In-page "the data didn't load" state, for when the APP is running but a fetch
 * failed on the network (see lib/net-error.ts for the classification).
 *
 * Distinct from the service worker's /offline screen by design: that one is a
 * standalone document served when the NAVIGATION itself fails and no app exists
 * to render anything. This one renders inside the live app, keeps the chrome,
 * and offers a retry that re-runs just the failed request.
 */
export function ConnectionError({
  onRetry,
  title = 'تعذّر الاتصال',
  description = 'تحقّق من اتصالك بالإنترنت ثم حاول مرة أخرى.',
  className,
}: {
  onRetry: () => void;
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-4 py-20', className)}>
      <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-5">
        <WifiOff className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500 text-sm mb-7 max-w-xs leading-relaxed">{description}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
      >
        <RefreshCw className="w-4 h-4" />
        إعادة المحاولة
      </button>
    </div>
  );
}
