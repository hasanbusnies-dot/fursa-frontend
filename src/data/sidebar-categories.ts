import type { ElementType } from 'react';
import {
  Building2, Car, Wrench, ShoppingBag, Factory,
  Hammer, GraduationCap, Briefcase, PawPrint, UserPlus,
} from 'lucide-react';

export type SubCategory = { title: string; path: string; children?: SubCategory[] };
export type RootCategory = {
  slug:      string;
  title:     string;
  icon:      ElementType;
  iconColor: string;
  iconBg:    string;
  children:  SubCategory[];
};

export const SIDEBAR_CATEGORIES: RootCategory[] = [
  {
    slug: 'real-estate',
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
    slug: 'vehicles',
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
    slug: 'parts',
    title: 'قطع غيار وإكسسوارات وتعديل',
    icon: Wrench, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50',
    children: [
      { title: 'معدات السيارات',        path: '/category/parts/auto'       },
      { title: 'معدات الدراجات النارية', path: '/category/parts/motorcycle' },
      { title: 'معدات المركبات البحرية', path: '/category/parts/marine'     },
    ],
  },
  {
    slug: 'shopping',
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
    slug: 'industrial',
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
    slug: 'services',
    title: 'حرفيون وخدمات',
    icon: Hammer, iconColor: 'text-cyan-600', iconBg: 'bg-cyan-50',
    children: [
      { title: 'تجديد وديكور المنزل',   path: '/category/services/home-renovation' },
      { title: 'نقل وشحن',              path: '/category/services/transport'        },
      { title: 'صيانة وخدمات السيارات', path: '/category/services/auto-service'     },
    ],
  },
  {
    slug: 'tutors',
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
    slug: 'jobs',
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
    slug: 'pets',
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
    slug: 'helpers',
    title: 'باحثون عن مساعدين',
    icon: UserPlus, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50',
    children: [
      { title: 'جليسة أطفال ورضع',           path: '/category/helpers/babysitter'   },
      { title: 'رعاية مسنين ومرضى',          path: '/category/helpers/elderly-care' },
      { title: 'عاملة نظافة ومساعدة منزلية', path: '/category/helpers/cleaning'     },
    ],
  },
];

// Recursively search children for a node whose path matches targetPath.
function searchTree(cats: SubCategory[], targetPath: string): SubCategory | null {
  for (const cat of cats) {
    if (cat.path === targetPath) return cat;
    if (cat.children?.length) {
      const found = searchTree(cat.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Given an array of URL slug segments (e.g. ['vehicles', 'rentals']),
 * returns the matching category node, its displayable children, and the
 * /category/… path for "see all listings in this category" links.
 *
 * Returns null when the slug doesn't match any known category.
 */
export function findCategoryNode(slugParts: string[]): {
  title:        string;
  children:     SubCategory[];
  categoryPath: string;
} | null {
  if (!slugParts.length) return null;

  const root = SIDEBAR_CATEGORIES.find((c) => c.slug === slugParts[0]);
  if (!root) return null;

  if (slugParts.length === 1) {
    return {
      title:        root.title,
      children:     root.children,
      categoryPath: `/category/${slugParts[0]}`,
    };
  }

  const targetPath = '/category/' + slugParts.join('/');
  const found = searchTree(root.children, targetPath);
  if (!found) return null;

  return {
    title:        found.title,
    children:     found.children ?? [],
    categoryPath: found.path,
  };
}
