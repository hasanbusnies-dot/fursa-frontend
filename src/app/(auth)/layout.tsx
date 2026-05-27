import Link from 'next/link';
import { MapPin } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // dir="rtl" reverses flex row: first child → RIGHT, second child → LEFT
    <div className="min-h-screen flex" dir="rtl">
      {/* ── RIGHT form panel (first in DOM = right in RTL flex) ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-12 bg-gray-50 overflow-y-auto">
        {/* Mobile logo */}
        <Link href="/" className="lg:hidden mb-8 text-2xl font-black text-blue-600">
          فرصة
        </Link>

        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* ── LEFT decorative panel (second in DOM = left in RTL flex, desktop only) ── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-gradient-to-br from-blue-600 to-blue-900 flex-col justify-between p-12 text-white relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/[0.03] rounded-full pointer-events-none" />

        {/* Logo */}
        <Link href="/" className="relative flex items-baseline gap-2 w-fit">
          <span className="text-2xl font-black tracking-tight">فرصة</span>
          <span className="text-blue-300 text-sm font-medium">Forsa</span>
        </Link>

        {/* Hero text */}
        <div className="relative">
          <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-5">
            المنصة الرائدة<br />للإعلانات في سوريا.
          </h2>
          <p className="text-blue-200 text-lg leading-relaxed">
            ابحث وبع واكتشف آلاف الفرص<br />بالقرب منك.
          </p>
          <div className="mt-8 flex items-center gap-2 text-blue-300 text-sm">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            نخدم المجتمعات في جميع أنحاء سوريا
          </div>
        </div>

        <p className="relative text-blue-400 text-xs">
          © {new Date().getFullYear()} فرصة. جميع الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
}
