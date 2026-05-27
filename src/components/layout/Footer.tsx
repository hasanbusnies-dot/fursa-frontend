import Link from 'next/link';

const FOOTER_LINKS = {
  'الفئات': [
    { label: 'عقارات',      href: '/categories/real-estate' },
    { label: 'مركبات',      href: '/categories/vehicles' },
    { label: 'إلكترونيات',  href: '/categories/electronics' },
    { label: 'وظائف',       href: '/categories/jobs' },
    { label: 'خدمات',       href: '/categories/services' },
  ],
  'المساعدة': [
    { label: 'من نحن',           href: '/about' },
    { label: 'اتصل بنا',         href: '/contact' },
    { label: 'نصائح السلامة',    href: '/safety' },
    { label: 'سياسة الخصوصية',  href: '/privacy' },
    { label: 'شروط الخدمة',     href: '/terms' },
  ],
  'حسابي': [
    { label: 'إعلاناتي', href: '/account/listings' },
    { label: 'المفضلة',  href: '/account/favorites' },
    { label: 'الرسائل',  href: '/account/messages' },
    { label: 'الإعدادات', href: '/account/settings' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand column */}
          <div className="text-right">
            <Link href="/" className="text-2xl font-black text-white tracking-tight">
              Forsa
            </Link>
            <p className="mt-3 text-sm leading-relaxed">
              منصة الإعلانات المبوبة الرائدة في سوريا. بيع، اشترِ، واكتشف الفرص القريبة منك.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading} className="text-right">
              <h4 className="text-xs font-semibold text-white uppercase tracking-widest mb-4">
                {heading}
              </h4>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span>Forsa. جميع الحقوق محفوظة {new Date().getFullYear()} ©</span>
          <span className="text-gray-600">صُنع بحب ❤ من أجل سوريا</span>
        </div>
      </div>
    </footer>
  );
}
