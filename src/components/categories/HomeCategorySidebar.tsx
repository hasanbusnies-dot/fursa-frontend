'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Clock, ChevronDown, LayoutGrid,
  Building2, Car, Wrench, ShoppingBag, Factory,
  Hammer, GraduationCap, Briefcase, PawPrint, UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Static category data ──────────────────────────────────────────────────────

type SubCategory  = { title: string; path: string; children?: SubCategory[] };
type RootCategory = {
  title:     string;
  icon:      React.ElementType;
  iconColor: string;
  iconBg:    string;
  children:  SubCategory[];
};

const SIDEBAR_CATEGORIES: RootCategory[] = [
  {
    title: 'عقارات',
    icon: Building2, iconColor: 'text-red-600', iconBg: 'bg-red-50',
    children: [
      {
        title: 'عقارات سكنية', path: '/category/real-estate/residential',
        children: [
          { title: 'للبيع',                        path: '/category/real-estate/residential/for-sale'     },
          { title: 'للإيجار',                      path: '/category/real-estate/residential/for-rent'     },
          { title: 'إيجار سياحي يومي',             path: '/category/real-estate/residential/daily-rental' },
          { title: 'عقار سكني للفرغ / التنازل',   path: '/category/real-estate/residential/transfer'     },
        ],
      },
      {
        title: 'عقارات تجارية', path: '/category/real-estate/commercial',
        children: [
          { title: 'للبيع',                          path: '/category/real-estate/commercial/for-sale'      },
          { title: 'للإيجار',                        path: '/category/real-estate/commercial/for-rent'      },
          { title: 'عقار تجاري للفرغ / التنازل',    path: '/category/real-estate/commercial/transfer-sale' },
          { title: 'عقار تجاري للاستثمار',           path: '/category/real-estate/commercial/transfer-rent' },
        ],
      },
      {
        title: 'أراضي', path: '/category/real-estate/land',
        children: [
          { title: 'أرض للمشاركة (مقابل حصة طابقية)', path: '/category/real-estate/land/share'    },
          { title: 'للبيع',                             path: '/category/real-estate/land/for-sale' },
          { title: 'للإيجار',                           path: '/category/real-estate/land/for-rent' },
        ],
      },
      { title: 'مشاريع سكنية',              path: '/category/real-estate/projects'    },
      {
        title: 'أبنية / عمارات', path: '/category/real-estate/building',
        children: [
          { title: 'للبيع',    path: '/category/real-estate/building/for-sale' },
          { title: 'للإيجار', path: '/category/real-estate/building/for-rent'  },
        ],
      },
      {
        title: 'ملكية مشتركة (تايم شير)', path: '/category/real-estate/timeshare',
        children: [
          { title: 'للبيع',    path: '/category/real-estate/timeshare/for-sale' },
          { title: 'للإيجار', path: '/category/real-estate/timeshare/for-rent'  },
        ],
      },
      {
        title: 'منشآت سياحية', path: '/category/real-estate/tourist-facility',
        children: [
          { title: 'للبيع',    path: '/category/real-estate/tourist-facility/for-sale' },
          { title: 'للإيجار', path: '/category/real-estate/tourist-facility/for-rent'  },
        ],
      },
      { title: 'مسابح للإيجار', path: '/category/real-estate/pools-for-rent' },
    ],
  },
  {
    title: 'مركبات',
    icon: Car, iconColor: 'text-blue-600', iconBg: 'bg-blue-50',
    children: [
      { title: 'سيارات',                        path: '/category/vehicles/cars'        },
      { title: 'مركبات الطرق الوعرة، سيارات رياضية,بيكاب', path: '/category/vehicles/suv-pickup'  },
      { title: 'سيارات كهربائية',               path: '/category/vehicles/electric'    },
      { title: 'دراجات نارية',                  path: '/category/vehicles/motorcycles'  },
      { title: 'ميني فان وفان',                 path: '/category/vehicles/minivan'      },
      {
        title: 'مركبات تجارية',
        path: '/category/vehicles/commercial',
        children: [
          { title: 'ميكروباص وحافلة متوسطة',      path: '/category/vehicles/commercial/minibus'            },
          { title: 'حافلة (باص)',                  path: '/category/vehicles/commercial/bus'                },
          { title: 'شاحنة وشاحنة خفيفة',          path: '/category/vehicles/commercial/truck'              },
          { title: 'رأس تريلا (قاطرة)',            path: '/category/vehicles/commercial/tractor-truck'      },
          { title: 'مقطورة (دورسيه)',              path: '/category/vehicles/commercial/trailer'            },
          { title: 'عربة مقطورة',                 path: '/category/vehicles/commercial/small-trailer'      },
          { title: 'هياكل وتجهيزات خارجية',       path: '/category/vehicles/commercial/bodywork'           },
          { title: 'سيارة إنقاذ وسحب',            path: '/category/vehicles/commercial/tow-truck'          },
          { title: 'خطوط ولوحات تجارية',           path: '/category/vehicles/commercial/commercial-plates'  },
        ],
      },
      {
        title: 'مركبات للإيجار', path: '/category/vehicles/rentals',
        children: [
          { title: 'سيارات سياحية',                         path: '/category/vehicles/rentals/cars'        },
          { title: 'دفع رباعي، جيب وبيكاب',               path: '/category/vehicles/rentals/suv-pickup'  },
          { title: 'ميني فان وفانات تجارية',                path: '/category/vehicles/rentals/minivan'     },
          { title: 'دراجات نارية و ATV',                    path: '/category/vehicles/rentals/motorcycles' },
          { title: 'سيارات كلاسيكية',                       path: '/category/vehicles/rentals/classic'     },
          { title: 'باصات وميكروباص',                       path: '/category/vehicles/rentals/bus-minibus' },
          { title: 'شاحنات، شاحنات خفيفة وقاطرات',         path: '/category/vehicles/rentals/trucks'      },
          { title: 'رافعات وسيارات إنقاذ',                  path: '/category/vehicles/rentals/tow-trucks'  },
          { title: 'مركبات جوية',                           path: '/category/vehicles/rentals/aircraft'    },
          { title: 'كرفانات',                               path: '/category/vehicles/rentals/caravans'    },
          { title: 'سيارات كهربائية',                       path: '/category/vehicles/rentals/electric'    },
        ],
      },
      {
        title: 'مركبات بحرية', path: '/category/vehicles/marine',
        children: [
          { title: 'للبيع',   path: '/category/vehicles/marine/for-sale' },
          { title: 'للإيجار', path: '/category/vehicles/marine/for-rent' },
        ],
      },
      {
        title: 'مركبات متضررة', path: '/category/vehicles/damaged',
        children: [
          { title: 'سيارات',                               path: '/category/vehicles/damaged/cars'        },
          { title: 'سيارات الدفع الرباعي، SUV وبيك أب',   path: '/category/vehicles/damaged/suv'         },
          { title: 'دراجات نارية',                         path: '/category/vehicles/damaged/motorcycles' },
          { title: 'ميني فان وفان مغلق',                   path: '/category/vehicles/damaged/minivans'    },
          { title: 'مركبات تجارية',                        path: '/category/vehicles/damaged/commercial'  },
        ],
      },
      {
        title: 'كرفانات', path: '/category/vehicles/caravans',
        children: [
          { title: 'كرفان سحب (مقطورة)',          path: '/category/vehicles/caravans/towable'   },
          { title: 'عربة سكن بمحرك (موتورهوم)',   path: '/category/vehicles/caravans/motorhome' },
        ],
      },
      {
        title: 'مركبات كلاسيكية', path: '/category/vehicles/classic',
        children: [
          { title: 'سيارات كلاسيكية',                    path: '/category/vehicles/classic/cars'        },
          { title: 'سيارات الدفع الرباعي كلاسيكية',      path: '/category/vehicles/classic/suv'         },
          { title: 'دراجات نارية كلاسيكية',              path: '/category/vehicles/classic/motorcycles' },
          { title: 'مركبات تجارية كلاسيكية',             path: '/category/vehicles/classic/commercial'  },
        ],
      },
      {
        title: 'مركبات جوية', path: '/category/vehicles/air',
        children: [
          { title: 'مروحية (هليكوبتر)',              path: '/category/vehicles/air/helicopter' },
          { title: 'باراموتور',                      path: '/category/vehicles/air/paramotor'  },
          { title: 'طائرة',                          path: '/category/vehicles/air/airplane'   },
          { title: 'طائرة شراعية ومايكرولايت',       path: '/category/vehicles/air/glider'     },
        ],
      },
      { title: 'دبابات (ATV)',                   path: '/category/vehicles/atv'          },
      { title: 'دبابات (UTV)',                   path: '/category/vehicles/utv'          },
      { title: 'سيارات ذوي الاحتياجات الخاصة',  path: '/category/vehicles/disabled'     },
    ],
  },
  {
    title: 'قطع غيار وإكسسوارات وتعديل',
    icon: Wrench, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50',
    children: [
      { title: 'معدات السيارات',        path: '/category/parts/auto'       },
      { title: 'معدات الدراجات النارية', path: '/category/parts/motorcycle' },
      { title: 'معدات المركبات البحرية', path: '/category/parts/marine'     },
    ],
  },
  {
    title: 'سوق المستعمل والجديد',
    icon: ShoppingBag, iconColor: 'text-orange-600', iconBg: 'bg-orange-50',
    children: [
      { title: 'حواسيب',                       path: '/category/shopping/computers'           },
      { title: 'هواتف محمولة وإكسسوارات',      path: '/category/shopping/phones'              },
      { title: 'كاميرات وتصوير',               path: '/category/shopping/cameras'             },
      { title: 'ديكور المنزل',                 path: '/category/shopping/home-decor'          },
      { title: 'إلكترونيات منزلية',            path: '/category/shopping/home-electronics'    },
      { title: 'أجهزة منزلية كهربائية',        path: '/category/shopping/appliances'          },
      { title: 'أزياء وإكسسوارات',             path: '/category/shopping/clothing'            },
      { title: 'ساعات',                        path: '/category/shopping/watches'             },
      { title: 'أم وطفل',                      path: '/category/shopping/mother-baby'         },
      { title: 'عناية شخصية ومستحضرات تجميل', path: '/category/shopping/personal-care'       },
      { title: 'هوايات وألعاب',                path: '/category/shopping/hobbies-toys'        },
      { title: 'مستلزمات اللاعبين (Gaming)',   path: '/category/shopping/gaming'              },
      { title: 'كتب، مجلات وأفلام',            path: '/category/shopping/books-media'         },
      { title: 'موسيقى',                       path: '/category/shopping/music'               },
      { title: 'رياضة',                        path: '/category/shopping/sports'              },
      { title: 'مجوهرات وحلي',                 path: '/category/shopping/jewelry'             },
      { title: 'مقتنيات',                      path: '/category/shopping/collectibles'        },
      { title: 'أنتيكات',                      path: '/category/shopping/antiques'            },
      { title: 'حدائق ومعدات بناء',            path: '/category/shopping/garden-diy'          },
      { title: 'إلكترونيات تقنية',             path: '/category/shopping/technical-electronics'},
      { title: 'مكتب وقرطاسية',               path: '/category/shopping/office'              },
      { title: 'أطعمة ومشروبات',              path: '/category/shopping/food-beverage'       },
      { title: 'كل شيء آخر',                  path: '/category/shopping/others'              },
    ],
  },
  {
    title: 'آلات صناعية ومعدات',
    icon: Factory, iconColor: 'text-purple-600', iconBg: 'bg-purple-50',
    children: [
      { title: 'آلات ثقيلة',     path: '/category/industrial/heavy-machinery' },
      { title: 'آلات زراعية',    path: '/category/industrial/agriculture'      },
      { title: 'صناعة',          path: '/category/industrial/manufacturing'    },
      { title: 'كهرباء وطاقة',   path: '/category/industrial/energy'          },
    ],
  },
  {
    title: 'حرفيون وخدمات',
    icon: Hammer, iconColor: 'text-cyan-600', iconBg: 'bg-cyan-50',
    children: [
      { title: 'تجديد وديكور المنزل',   path: '/category/services/home-renovation' },
      { title: 'نقل وشحن',              path: '/category/services/transport'        },
      { title: 'صيانة وخدمات السيارات', path: '/category/services/auto-service'     },
    ],
  },
  {
    title: 'مدرسون خصوصيون',
    icon: GraduationCap, iconColor: 'text-yellow-600', iconBg: 'bg-yellow-50',
    children: [
      { title: 'ثانوي وجامعي',            path: '/category/tutors/highschool-uni'      },
      { title: 'ابتدائي وإعدادي',          path: '/category/tutors/primary-middle'      },
      { title: 'لغات أجنبية',             path: '/category/tutors/languages'           },
      { title: 'حاسوب',                   path: '/category/tutors/computers'           },
      { title: 'قيادة',                   path: '/category/tutors/driving'             },
      { title: 'رياضة',                   path: '/category/tutors/sports'              },
      { title: 'فنون',                    path: '/category/tutors/arts'                },
      { title: 'رقص',                     path: '/category/tutors/dance'               },
      { title: 'موسيقى وآلات موسيقية',    path: '/category/tutors/music'               },
      { title: 'مسرح وتمثيل',             path: '/category/tutors/theater'             },
      { title: 'تنمية بشرية',             path: '/category/tutors/personal-development' },
      { title: 'دروس مهنية',              path: '/category/tutors/vocational'          },
      { title: 'تربية خاصة',              path: '/category/tutors/special-education'   },
      { title: 'تنمية الطفل',             path: '/category/tutors/child-development'   },
      { title: 'فن الخطابة والنطق',       path: '/category/tutors/diction'             },
      { title: 'تصوير',                   path: '/category/tutors/photography'         },
    ],
  },
  {
    title: 'وظائف',
    icon: Briefcase, iconColor: 'text-pink-600', iconBg: 'bg-pink-50',
    children: [
      { title: 'محاماة واستشارات قانونية',           path: '/category/jobs/legal'           },
      { title: 'تعليم',                               path: '/category/jobs/education'       },
      { title: 'ترفيه وأنشطة',                        path: '/category/jobs/entertainment'   },
      { title: 'تجميل وعناية',                        path: '/category/jobs/beauty'          },
      { title: 'تكنولوجيا المعلومات وتطوير البرمجيات', path: '/category/jobs/it'              },
      { title: 'موارد بشرية',                         path: '/category/jobs/hr'              },
      { title: 'بناء وإنشاءات',                       path: '/category/jobs/construction'    },
      { title: 'إدارة وأعمال',                        path: '/category/jobs/management'      },
      { title: 'حراسة وأمن',                          path: '/category/jobs/security'        },
      { title: 'لوجستيات ونقل',                       path: '/category/jobs/logistics'       },
      { title: 'مبيعات وتجزئة',                       path: '/category/jobs/retail'          },
      { title: 'محاسبة، مالية وبنوك',                 path: '/category/jobs/finance'         },
      { title: 'هندسة',                               path: '/category/jobs/engineering'     },
      { title: 'خدمة عملاء',                          path: '/category/jobs/customer-service' },
      { title: 'إدارة مكاتب وأعمال إدارية',           path: '/category/jobs/admin'           },
      { title: 'دوام جزئي وأعمال إضافية',             path: '/category/jobs/part-time'       },
      { title: 'تسويق وإدارة منتجات',                 path: '/category/jobs/marketing'       },
      { title: 'راديو، سينما وتلفزيون',               path: '/category/jobs/media'           },
      { title: 'مطاعم وفنادق',                        path: '/category/jobs/hospitality'     },
      { title: 'صحة',                                 path: '/category/jobs/health'          },
      { title: 'مبيعات',                              path: '/category/jobs/sales'           },
      { title: 'صيانة وتصليح',                        path: '/category/jobs/maintenance'     },
      { title: 'زراعة وثروة حيوانية',                 path: '/category/jobs/agriculture'     },
      { title: 'تصميم وإبداع',                        path: '/category/jobs/design'          },
      { title: 'نسيج وملابس',                         path: '/category/jobs/textile'         },
      { title: 'تصنيع وإنتاج',                        path: '/category/jobs/manufacturing'   },
    ],
  },
  {
    title: 'عالم الحيوان',
    icon: PawPrint, iconColor: 'text-teal-600', iconBg: 'bg-teal-50',
    children: [
      { title: 'إكسسوارات ومعدات', path: '/category/pets/accessories' },
      { title: 'أعلاف وطعام',      path: '/category/pets/food'        },
      { title: 'حيوانات أليفة',    path: '/category/pets/pets'        },
      { title: 'أسماك زينة',       path: '/category/pets/aquarium'    },
      { title: 'دواجن',             path: '/category/pets/poultry'     },
      { title: 'مواشي (أبقار)',     path: '/category/pets/cattle'      },
      { title: 'مواشي (أغنام)',     path: '/category/pets/sheep'       },
      { title: 'كائنات بحرية',     path: '/category/pets/marine-life' },
    ],
  },
  {
    title: 'باحثون عن مساعدين',
    icon: UserPlus, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50',
    children: [
      { title: 'جليسة أطفال ورضع',        path: '/category/helpers/babysitter'   },
      { title: 'رعاية مسنين ومرضى',       path: '/category/helpers/elderly-care' },
      { title: 'عاملة نظافة ومساعدة منزلية', path: '/category/helpers/cleaning'  },
    ],
  },
];

// ── SubItem — renders a plain link or an expandable nested group ──────────────

const ORANGE_PARENTS = new Set(['مركبات تجارية', 'مركبات للإيجار', 'مركبات بحرية', 'مركبات متضررة', 'كرفانات', 'مركبات كلاسيكية', 'مركبات جوية', 'عقارات سكنية', 'عقارات تجارية', 'أراضي', 'أبنية / عمارات', 'ملكية مشتركة (تايم شير)', 'منشآت سياحية']);

function SubItem({ sub, depth = 0 }: { sub: SubCategory; depth?: number }) {
  const pathname   = usePathname();
  const isActive   = pathname === sub.path;
  const isAncestor = !isActive && pathname.startsWith(sub.path + '/');
  const [open, setOpen] = useState(() => isAncestor);

  const rowPadding = depth === 0 ? 'px-4' : depth === 1 ? 'pl-8 pr-4' : 'pl-12 pr-4';
  const textBase   = depth === 0 ? 'text-sm' : 'text-[13px]';
  const dotColor   = depth === 0 ? 'bg-gray-300' : 'bg-gray-200';

  const useOrange  = ORANGE_PARENTS.has(sub.title);
  const nestedBg   = useOrange
    ? 'bg-orange-50/70 border-b border-orange-200'
    : depth >= 1
      ? 'bg-orange-50/40 border-b border-orange-100'
      : 'bg-slate-50 border-b border-gray-200';

  // Leaf link
  if (!sub.children?.length) {
    return (
      <Link
        href={sub.path}
        className={cn(
          `flex items-center gap-2 ${rowPadding} py-1.5 ${textBase} transition-colors`,
          depth > 0
            ? isActive
              ? 'text-orange-600 font-semibold bg-orange-50'
              : 'text-gray-500 hover:text-orange-600 hover:bg-orange-100/50'
            : isActive
              ? 'text-blue-600 font-semibold bg-blue-50'
              : 'text-gray-600 hover:text-blue-600 hover:bg-blue-100/40',
        )}
      >
        <span className={`w-1 h-1 rounded-full ${dotColor} shrink-0`} />
        {sub.title}
      </Link>
    );
  }

  // Expandable row
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          `w-full flex items-center gap-2 ${rowPadding} py-1.5 ${textBase} transition-colors`,
          isActive || isAncestor
            ? 'text-orange-600 bg-orange-50/60'
            : 'text-gray-600 hover:text-blue-600 hover:bg-blue-100/40',
        )}
      >
        <span className={`w-1 h-1 rounded-full ${dotColor} shrink-0`} />
        <span className="flex-1 text-start">{sub.title}</span>
        <ChevronDown
          className={cn(
            'w-3 h-3 text-gray-400 transition-transform duration-200 shrink-0',
            open && 'rotate-180 text-blue-500',
          )}
        />
      </button>

      {open && (
        <div className={cn('border-t border-gray-100/60 py-2', nestedBg)}>
          {sub.children.map((child) => (
            <SubItem key={child.path} sub={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Accordion card ────────────────────────────────────────────────────────────

function AccordionCard({ cat }: { cat: RootCategory }) {
  const [open, setOpen] = useState(false);
  const Icon = cat.icon;

  return (
    <div
      className={cn(
        'rounded-xl border transition-colors overflow-hidden',
        open ? 'border-blue-200 bg-white' : 'border-gray-200 bg-white',
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50/80 transition-colors"
      >
        <div className={`w-7 h-7 rounded-lg ${cat.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-3.5 h-3.5 ${cat.iconColor}`} />
        </div>
        <span className="flex-1 text-sm font-semibold text-gray-800 text-start">
          {cat.title}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0',
            open && 'rotate-180 text-blue-500',
          )}
        />
      </button>

      {/* Subcategory list */}
      {open && (
        <div className="border-t border-gray-100 border-b border-gray-200 bg-slate-50 py-2">
          {cat.children.map((sub) => (
            <SubItem key={sub.path} sub={sub} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function HomeCategorySidebar() {
  const router = useRouter();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">

      {/* ── Quick links ── */}
      <div className="space-y-0.5">
        <Link
          href="/listings?showcase=urgent_showcase"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-orange-50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-orange-100 flex items-center justify-center text-sm shrink-0 transition-colors">
            🚨
          </div>
          <span className="text-sm text-gray-700 group-hover:text-orange-600 font-medium transition-colors">
            عاجل عاجل
          </span>
        </Link>

        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
          <span className="text-sm text-gray-700 leading-relaxed">
            <Link href="/listings?showcase=last_48h" className="text-blue-600 hover:underline">آخر 48 ساعة</Link>
            {' · '}
            <Link href="/listings?showcase=one_week" className="text-blue-600 hover:underline">آخر أسبوع</Link>
            {' · '}
            <Link href="/listings?showcase=one_month" className="text-blue-600 hover:underline">آخر شهر</Link>
          </span>
        </div>
      </div>

      {/* ── All listings ── */}
      <button
        type="button"
        onClick={() => router.push('/listings')}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
      >
        <LayoutGrid className="w-3.5 h-3.5 shrink-0 text-gray-400" />
        كل الإعلانات
      </button>

      {/* ── Category accordion cards ── */}
      <div className="space-y-1.5">
        {SIDEBAR_CATEGORIES.map((cat) => (
          <AccordionCard key={cat.title} cat={cat} />
        ))}
      </div>

    </div>
  );
}
