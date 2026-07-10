'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Calculator, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { AccountingNav } from '@/components/accounting/AccountingNav';

// Accounting is a staff finance tool (Arabic/RTL), gated to ACCOUNTANT or ADMIN.
// Unlike the admin pages (which each inline their own guard), this area centralizes
// the guard + nav here so the views only render content.

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // The login route is how you get in — render it bare (no guard, no shell).
  const isLoginRoute = pathname === '/accounting/login';

  const allowed = isAuthenticated && (user?.userType === 'ACCOUNTANT' || user?.userType === 'ADMIN');

  useEffect(() => {
    if (!mounted || isLoginRoute) return;
    if (!allowed) router.replace('/accounting/login');
  }, [mounted, isLoginRoute, allowed, router]);

  if (isLoginRoute) return <>{children}</>;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }
  if (!allowed) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Staff top bar */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <Calculator className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-bold text-gray-900 truncate">المحاسبة</p>
              <p className="text-[11px] text-gray-400 truncate">{user?.profile?.firstName ?? user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.replace('/accounting/login'); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 py-8">
        <AccountingNav />
        {children}
      </div>
    </div>
  );
}
