import { api } from './api';

// ═══════════════════════════════════════════════════════════════════════════════
// doushesh catalog tree — the slug-based CATEGORY → BRAND → MODEL tree that powers
// the "select-to-add" listing flow. Backend mounts these under /api/v1/catalog and
// returns RAW ARRAYS (not the { data } ApiResponse envelope), so the `api` wrapper's
// passthrough json() is exactly what we want here.
//   GET /catalog/categories?parent=<slug>   → children of a node (roots if no parent)
//   GET /catalog/categories/:slug/path       → breadcrumb root → node (carries id+type)
//   GET /catalog/categories/:slug/filters     → inherited filter set for the node
// ═══════════════════════════════════════════════════════════════════════════════

export type CatalogNodeType = 'CATEGORY' | 'BRAND' | 'MODEL';

// A child node as returned by GET /catalog/categories.
export interface CatalogNode {
  slug: string;
  name: string;        // Latin (e.g. "Audi")
  nameAr: string;      // Arabic (e.g. "أودي")
  type: CatalogNodeType;
  icon?: string | null;
  count: number;       // denormalized listingCount
  hasChildren: boolean; // false ⇒ leaf → load filters
}

// A node in the breadcrumb returned by GET /catalog/categories/:slug/path.
export interface CatalogPathNode {
  id: string;          // the categories.id UUID — the FK POST /listings needs
  slug: string;
  name: string;
  nameAr: string;
  type: CatalogNodeType;
}

export type FilterWidget =
  | 'SELECT' | 'MULTISELECT' | 'RANGE' | 'BOOLEAN' | 'TEXT' | 'LOCATION';

// A single dynamic filter definition from GET /catalog/categories/:slug/filters.
export interface CatalogFilterDef {
  key: string;
  labelAr: string;
  labelEn?: string;
  widget: FilterWidget;
  unit?: string | null;
  isRequired?: boolean;
  hint?: string | null;
  range?: { min: number | null; max: number | null };
  options?: { value: string; labelAr: string; labelEn?: string }[];
}

// The vehicles tree root slug — listings under it use the bespoke vehicle flow.
export const VEHICLES_ROOT_SLUG = 'vehicles';

export const catalogService = {
  // Children of a node (root categories when parent is null). Returns [] on error so
  // the cascading UI degrades gracefully (mirrors the reference form's r.ok ? … : []).
  getChildren: async (parent: string | null): Promise<CatalogNode[]> => {
    const q = parent ? `?parent=${encodeURIComponent(parent)}` : '';
    try {
      return await api.get<CatalogNode[]>(`/catalog/categories${q}`);
    } catch {
      return [];
    }
  },

  // Inherited filter set for a (leaf) node. Returns [] on error.
  getFilters: async (slug: string): Promise<CatalogFilterDef[]> => {
    try {
      return await api.get<CatalogFilterDef[]>(
        `/catalog/categories/${encodeURIComponent(slug)}/filters`,
      );
    } catch {
      return [];
    }
  },

  // Breadcrumb root → node. Throws on error — callers need the ids to resolve a
  // categoryId and detect the vehicle root, so failures must surface.
  getPath: (slug: string): Promise<CatalogPathNode[]> =>
    api.get<CatalogPathNode[]>(`/catalog/categories/${encodeURIComponent(slug)}/path`),

  // Resolves the UUID that POST /listings expects for `categoryId`. The picked leaf
  // may be a BRAND/MODEL node (e.g. cars → Audi → A4); the listing's category is the
  // DEEPEST CATEGORY-type node in the path (e.g. "cars"). Falls back to the leaf id.
  resolveCategoryId: async (leafSlug: string): Promise<string> => {
    const path = await catalogService.getPath(leafSlug); // root → node
    const deepestCategory = [...path].reverse().find((n) => n.type === 'CATEGORY');
    const node = deepestCategory ?? path[path.length - 1];
    if (!node) throw new Error('Could not resolve category id for slug: ' + leafSlug);
    return node.id;
  },
};
