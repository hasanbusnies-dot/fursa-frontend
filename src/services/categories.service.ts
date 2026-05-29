import { api } from './api';
import type { ApiResponse, Category } from '@/types';

export const FALLBACK_CATEGORIES: Category[] = [
  { id: 'fallback-1',  name: 'عقارات',                      slug: 'real-estate'               },
  {
    id: 'fallback-2', name: 'مركبات', slug: 'vehicles',
    children: [
      { id: 'fallback-2-1',  parentId: 'fallback-2', name: 'سيارات',                           slug: 'cars'        },
      { id: 'fallback-2-2',  parentId: 'fallback-2', name: 'سيارات عائلية (SUV) وبيكاب',      slug: 'suv-pickup'  },
      { id: 'fallback-2-3',  parentId: 'fallback-2', name: 'سيارات كهربائية',                  slug: 'electric'    },
      { id: 'fallback-2-4',  parentId: 'fallback-2', name: 'دراجات نارية',                     slug: 'motorcycles' },
      { id: 'fallback-2-5',  parentId: 'fallback-2', name: 'ميني فان وفان',                    slug: 'minivan'     },
      { id: 'fallback-2-6',  parentId: 'fallback-2', name: 'مركبات تجارية',                    slug: 'commercial'  },
      {
        id: 'fallback-2-7', parentId: 'fallback-2', name: 'مركبات للإيجار', slug: 'rentals',
        children: [
          { id: 'fallback-2-7-1',  parentId: 'fallback-2-7', name: 'سيارات سياحية للإيجار',            slug: 'vehicles/rentals/cars'        },
          { id: 'fallback-2-7-2',  parentId: 'fallback-2-7', name: 'دفع رباعي، جيب وبيكاب للإيجار',  slug: 'vehicles/rentals/suv-pickup'  },
          { id: 'fallback-2-7-3',  parentId: 'fallback-2-7', name: 'ميني فان وفانات تجارية للإيجار',  slug: 'vehicles/rentals/minivan'     },
          { id: 'fallback-2-7-4',  parentId: 'fallback-2-7', name: 'دراجات نارية و ATV للإيجار',       slug: 'vehicles/rentals/motorcycles' },
          { id: 'fallback-2-7-5',  parentId: 'fallback-2-7', name: 'سيارات كلاسيكية للإيجار',          slug: 'vehicles/rentals/classic'     },
          { id: 'fallback-2-7-6',  parentId: 'fallback-2-7', name: 'باصات وميكروباص للإيجار',          slug: 'vehicles/rentals/bus-minibus' },
          { id: 'fallback-2-7-7',  parentId: 'fallback-2-7', name: 'شاحنات للإيجار',                   slug: 'vehicles/rentals/trucks'      },
          { id: 'fallback-2-7-8',  parentId: 'fallback-2-7', name: 'رافعات وسيارات إنقاذ للإيجار',     slug: 'vehicles/rentals/tow-truck'   },
          { id: 'fallback-2-7-9',  parentId: 'fallback-2-7', name: 'مركبات جوية للإيجار',              slug: 'vehicles/rentals/aircraft'    },
          { id: 'fallback-2-7-10', parentId: 'fallback-2-7', name: 'كرفانات للإيجار',                  slug: 'vehicles/rentals/caravan'     },
          { id: 'fallback-2-7-11', parentId: 'fallback-2-7', name: 'سيارات كهربائية للإيجار',          slug: 'vehicles/rentals/electric'    },
        ],
      },
      {
        id: 'fallback-2-8', parentId: 'fallback-2', name: 'مركبات بحرية', slug: 'marine',
        children: [
          { id: 'fallback-2-8-1', parentId: 'fallback-2-8', name: 'مركبات بحرية للبيع',   slug: 'vehicles/marine/for-sale' },
          { id: 'fallback-2-8-2', parentId: 'fallback-2-8', name: 'مركبات بحرية للإيجار', slug: 'vehicles/marine/for-rent' },
        ],
      },
      {
        id: 'fallback-2-9', parentId: 'fallback-2', name: 'مركبات متضررة', slug: 'damaged',
        children: [
          { id: 'fallback-2-9-1', parentId: 'fallback-2-9', name: 'سيارات متضررة',                              slug: 'vehicles/damaged/cars'        },
          { id: 'fallback-2-9-2', parentId: 'fallback-2-9', name: 'سيارات الدفع الرباعي، SUV وبيك أب متضررة', slug: 'vehicles/damaged/suv'         },
          { id: 'fallback-2-9-3', parentId: 'fallback-2-9', name: 'دراجات نارية متضررة',                       slug: 'vehicles/damaged/motorcycles' },
          { id: 'fallback-2-9-4', parentId: 'fallback-2-9', name: 'ميني فان وفان مغلق متضرر',                  slug: 'vehicles/damaged/minivans'    },
          { id: 'fallback-2-9-5', parentId: 'fallback-2-9', name: 'مركبات تجارية متضررة',                      slug: 'vehicles/damaged/commercial'  },
        ],
      },
      {
        id: 'fallback-2-10', parentId: 'fallback-2', name: 'كرفانات', slug: 'caravans',
        children: [
          { id: 'fallback-2-10-1', parentId: 'fallback-2-10', name: 'كرفان سحب (مقطورة)',          slug: 'vehicles/caravans/towable'   },
          { id: 'fallback-2-10-2', parentId: 'fallback-2-10', name: 'عربة سكن بمحرك (موتورهوم)', slug: 'vehicles/caravans/motorhome' },
        ],
      },
      {
        id: 'fallback-2-11', parentId: 'fallback-2', name: 'مركبات كلاسيكية', slug: 'classic',
        children: [
          { id: 'fallback-2-11-1', parentId: 'fallback-2-11', name: 'سيارات كلاسيكية',                 slug: 'vehicles/classic/cars'        },
          { id: 'fallback-2-11-2', parentId: 'fallback-2-11', name: 'سيارات الدفع الرباعي كلاسيكية',   slug: 'vehicles/classic/suv'         },
          { id: 'fallback-2-11-3', parentId: 'fallback-2-11', name: 'دراجات نارية كلاسيكية',           slug: 'vehicles/classic/motorcycles' },
          { id: 'fallback-2-11-4', parentId: 'fallback-2-11', name: 'مركبات تجارية كلاسيكية',          slug: 'vehicles/classic/commercial'  },
        ],
      },
      {
        id: 'fallback-2-12', parentId: 'fallback-2', name: 'مركبات جوية', slug: 'air',
        children: [
          { id: 'fallback-2-12-1', parentId: 'fallback-2-12', name: 'مروحية (هليكوبتر)',            slug: 'vehicles/air/helicopter' },
          { id: 'fallback-2-12-2', parentId: 'fallback-2-12', name: 'باراموتور',                    slug: 'vehicles/air/paramotor'  },
          { id: 'fallback-2-12-3', parentId: 'fallback-2-12', name: 'طائرة',                        slug: 'vehicles/air/airplane'   },
          { id: 'fallback-2-12-4', parentId: 'fallback-2-12', name: 'طائرة شراعية ومايكرولايت',     slug: 'vehicles/air/glider'     },
        ],
      },
      { id: 'fallback-2-13', parentId: 'fallback-2', name: 'دبابات (ATV)',                      slug: 'atv'         },
      { id: 'fallback-2-14', parentId: 'fallback-2', name: 'دبابات (UTV)',                      slug: 'utv'         },
      { id: 'fallback-2-15', parentId: 'fallback-2', name: 'سيارات ذوي الاحتياجات الخاصة',     slug: 'disabled'    },
    ],
  },
  { id: 'fallback-3',  name: 'قطع غيار وإكسسوارات',         slug: 'spare-parts'               },
  { id: 'fallback-4',  name: 'سوق المستعمل والجديد',         slug: 'shopping'                  },
  { id: 'fallback-5',  name: 'آلات صناعية ومعدات',           slug: 'heavy-machinery-industry'  },
  { id: 'fallback-6',  name: 'حرفيون وخدمات',               slug: 'craftsmen-services'        },
  { id: 'fallback-7',  name: 'مدرسون خصوصيون',              slug: 'private-tutors'            },
  { id: 'fallback-8',  name: 'وظائف',                       slug: 'job-postings'              },
  { id: 'fallback-9',  name: 'عالم الحيوان',                 slug: 'animal-world'              },
  { id: 'fallback-10', name: 'باحثون عن مساعدين',            slug: 'looking-for-assistants'    },
];

// Build a nested tree from a flat list using parentId references.
function buildTree(flat: Category[]): Category[] {
  const map = new Map<string, Category>();
  flat.forEach((cat) => map.set(cat.id, { ...cat, children: [] }));

  const roots: Category[] = [];
  map.forEach((cat) => {
    if (cat.parentId) {
      const parent = map.get(cat.parentId);
      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(cat);
      } else {
        roots.push(cat); // orphan — treat as root
      }
    } else {
      roots.push(cat);
    }
  });
  return roots;
}

// Strip any child whose parentId doesn't match the containing parent.
// Fixes backends that return a corrupt /categories/tree where sibling root
// categories bleed into each other's children arrays.
function sanitizeTree(cats: Category[], parentId?: string): Category[] {
  return cats
    .filter((cat) => parentId === undefined || !cat.parentId || cat.parentId === parentId)
    .map((cat) => ({
      ...cat,
      children: cat.children?.length ? sanitizeTree(cat.children, cat.id) : [],
    }));
}

export const categoriesService = {
  // Returns a flat list of all categories.
  getAll: async (): Promise<Category[]> => {
    const res = await api.get<ApiResponse<Category[]>>('/categories');
    if (Array.isArray(res)) return res as Category[];
    if (Array.isArray(res.data)) return res.data;
    return [];
  },

  // Returns a fully nested category tree, sanitized so every node's children
  // array contains only categories whose parentId matches that node.
  getTree: async (): Promise<Category[]> => {
    try {
      const res = await api.get<ApiResponse<Category[]>>('/categories/tree');
      const data = Array.isArray(res) ? res : res.data;
      if (Array.isArray(data) && data.length) return sanitizeTree(data);
    } catch {
      // endpoint not available — fall through
    }

    try {
      const flat = await categoriesService.getAll();
      if (!flat.length) return FALLBACK_CATEGORIES;

      // If the API already returns children-populated objects, extract roots then sanitize.
      const alreadyNested = flat.some((c) => c.children && c.children.length > 0);
      if (alreadyNested) return sanitizeTree(flat.filter((c) => !c.parentId));

      return sanitizeTree(buildTree(flat));
    } catch {
      return FALLBACK_CATEGORIES;
    }
  },
};
