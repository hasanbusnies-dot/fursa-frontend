import Link from 'next/link';
import {
  Building2, Car, Wrench, ShoppingBag, Factory,
  Hammer, GraduationCap, Briefcase, PawPrint, UserPlus,
  LayoutGrid,
} from 'lucide-react';

const CATEGORIES = [
  { title: 'عقارات',                   Icon: Building2,     iconColor: 'text-red-600',     iconBg: 'bg-red-50',     href: '/m/categories/real-estate' },
  { title: 'مركبات',                   Icon: Car,           iconColor: 'text-blue-600',    iconBg: 'bg-blue-50',    href: '/m/categories/vehicles'    },
  { title: 'قطع غيار وإكسسوارات',      Icon: Wrench,        iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50', href: '/m/categories/parts'       },
  { title: 'سوق المستعمل والجديد',     Icon: ShoppingBag,   iconColor: 'text-orange-600',  iconBg: 'bg-orange-50',  href: '/m/categories/shopping'    },
  { title: 'آلات صناعية ومعدات',       Icon: Factory,       iconColor: 'text-purple-600',  iconBg: 'bg-purple-50',  href: '/m/categories/industrial'  },
  { title: 'حرفيون وخدمات',            Icon: Hammer,        iconColor: 'text-cyan-600',    iconBg: 'bg-cyan-50',    href: '/m/categories/services'    },
  { title: 'مدرسون خصوصيون',           Icon: GraduationCap, iconColor: 'text-yellow-600',  iconBg: 'bg-yellow-50',  href: '/m/categories/tutors'      },
  { title: 'وظائف',                    Icon: Briefcase,     iconColor: 'text-pink-600',    iconBg: 'bg-pink-50',    href: '/m/categories/jobs'        },
  { title: 'عالم الحيوان',              Icon: PawPrint,      iconColor: 'text-teal-600',    iconBg: 'bg-teal-50',    href: '/m/categories/pets'        },
  { title: 'باحثون عن مساعدين',         Icon: UserPlus,      iconColor: 'text-indigo-600',  iconBg: 'bg-indigo-50',  href: '/m/categories/helpers'     },
];

export function MobileCategoryList() {
  return (
    <div className="md:hidden mb-4">
      <div className="bg-white rounded-card shadow-pebble overflow-hidden">

        {/* Quick links row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 overflow-x-auto scrollbar-none">
          <Link
            href="/listings?showcase=urgent_showcase"
            className="flex items-center gap-1.5 shrink-0 text-sm font-medium text-red-600 hover:text-red-700"
          >
            <span>🚨</span>
            <span>عاجل</span>
          </Link>
          <span className="text-gray-200">|</span>
          <Link href="/listings?showcase=last_48h" className="shrink-0 text-sm text-blue-600 hover:underline whitespace-nowrap">
            آخر 48 ساعة
          </Link>
          <Link href="/listings?showcase=one_week" className="shrink-0 text-sm text-blue-600 hover:underline whitespace-nowrap">
            آخر أسبوع
          </Link>
          <Link href="/listings" className="flex items-center gap-1 shrink-0 text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap">
            <LayoutGrid className="w-3.5 h-3.5" />
            كل الإعلانات
          </Link>
        </div>

        {/* Category list */}
        {CATEGORIES.map(({ title, Icon, iconColor, iconBg, href }, i) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-4 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors${
              i < CATEGORIES.length - 1 ? ' border-b border-gray-100' : ''
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-7 h-7 ${iconColor}`} />
            </div>
            {/* text-xl + TRUE Medium 500: Tajawal has no 600, so font-semibold silently
                renders faux-resolved Bold 700 — whose 20px width breaks the one-line
                budget (220px vs 224px available). Medium's worst case is 211px.
                No chevron: the whole row is the tap target; it bought nothing at 36px
                of width the label needs. */}
            <span className="flex-1 text-xl font-medium text-gray-800">{title}</span>
          </Link>
        ))}

      </div>
    </div>
  );
}
