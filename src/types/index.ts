/**
 * The `user.profile` block on the auth responses. For an INDIVIDUAL it is the person
 * (firstName/lastName); for a CORPORATE user the backend puts the COMPANY there instead
 * — a business has no person name on the API — so first/last are absent and companyName
 * is set. Both are optional for that reason: use `displayNameOf(user)` rather than
 * interpolating the fields directly.
 */
export interface UserProfile {
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

/**
 * The person block on the NON-AUTH payloads (messaging rooms, listing detail).
 * Those endpoints serve `individualProfile`; only /me and login serve `profile`.
 *
 * Both fields are NOT NULL on the backend, and a deleted/banned party arrives
 * already masked as firstName «مستخدم محذوف» + lastName '' — so joining the two
 * reproduces the mask verbatim. See `partyName()` in src/lib/user.ts.
 */
export interface IndividualProfile {
  firstName?: string;
  lastName?: string;
}

export interface CorporateProfile {
  companyName?: string;
  logo?: string;
  verified?: boolean;
  logoUrl?: string | null;
  /** Derived live by the backend: store APPROVED && membership paidUntil > now.
      Gates the member-store seal + inline check in SellerBox. Detail payload only. */
  memberBadge?: boolean;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  avatar?: string;
  /** The API sends 'INDIVIDUAL' for a private person; 'USER' is a legacy spelling
      that no live payload uses — branch on `!!corporateProfile` instead of on
      either literal, or you get a check that can never be true. */
  userType: 'INDIVIDUAL' | 'USER' | 'ADMIN' | 'CORPORATE' | 'FIELD_AGENT' | 'ACCOUNTANT';
  /** Auth responses (/me, login) only. */
  profile: UserProfile;
  /** Messaging + listing-detail payloads. */
  individualProfile?: IndividualProfile;
  corporateProfile?: CorporateProfile;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  icon?: string;
  description?: string;
  parentId?: string;
  children?: Category[];
}

/**
 * A rung of the location catalog. Four levels since Phase 4:
 * GOVERNORATE › DISTRICT (منطقة) › SUBDISTRICT (ناحية) › PLACE (حي/قرية).
 */
export type RegionLevel = 'GOVERNORATE' | 'DISTRICT' | 'SUBDISTRICT' | 'PLACE';

/** One node of a listing's `locationPath`. */
export interface RegionPathNode {
  slug: string;
  nameAr: string;
  level: RegionLevel;
}

/**
 * The region a listing is actually filed against — the DEEPEST node the seller
 * picked, which is not always a PLACE (a curated city ناحية is selectable too).
 * `centerLat/Lng` are the catalog's own centroid, never the seller's pin.
 */
export interface ListingRegion extends RegionPathNode {
  nameEn?: string | null;
  placeType?: string | null;
  centerLat?: number | null;
  centerLng?: number | null;
}

export interface VehicleDetails {
  make?: string;
  model?: string;
  year?: number;
  mileage?: number;
  color?: string;       // backend stores color inside vehicleDetails
  condition?: string;   // backend stores condition inside vehicleDetails
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  enginePower?: number;
  engineCapacity?: number;
  drivetrain?: string;
  gearCount?: number;
  warranty?: boolean;
  heavyDamageRecord?: boolean;
  tradeIn?: boolean;
  fromWho?: string;
  // backend returns flat string[] (what the wizard sends)
  technicalSpecs?: string[];
  // backend may return { status: string } objects or plain strings
  damageReport?: Record<string, string | { status: string; detail?: string }>;
}

export interface ListingImage {
  url: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface Listing {
  id: string;
  /**
   * Public-facing ad number (رقم الإعلان) — a DB-sequence value starting at
   * 100000001, unique and stable. Digits only, as a STRING (identifier, never
   * arithmetic). Pasting it into search resolves to this listing exactly.
   * Optional: pre-rollout payloads/caches may omit it, so the UI falls back to
   * the id tail (and hides the copy/search affordance when it does).
   */
  listingNumber?: string;
  title: string;
  description: string;
  price: number;
  currency: 'SYP' | 'USD';
  city: string;
  country?: string;
  governorate?: string | null;
  district?: string;
  neighborhood?: string;
  /** Free-text street line the seller typed (optional; often absent). */
  address?: string | null;
  /**
   * The catalog region this listing is filed against. Detail payload only, and
   * null on pre-3c rows that predate the FK — every reader must handle that.
   */
  region?: ListingRegion | null;
  /**
   * The region's full ancestry, ROOT-FIRST — «دمشق › دمشق › المزة › الربوة» —
   * with the region itself as the last node. This is the ONLY place the middle
   * rungs (منطقة / ناحية) appear: the denormalised `governorate`/`district`/
   * `neighborhood` columns below carry at most two of them. Empty on legacy rows,
   * which fall back to those columns.
   */
  locationPath?: RegionPathNode[];
  /**
   * Exact seller-provided coordinate, shown as-is on the listing map
   * (sahibinden-style — no jitter or rounding). Both are null on listings
   * created before the map picker existed, which is why every consumer runs
   * them through `toValidCoords` in `lib/map.ts` before rendering.
   */
  latitude?: number | null;
  longitude?: number | null;
  slug?: string;
  status?: string;
  // Top-level vehicle fields (sent flat in CreateListingPayload)
  condition?: string;
  make?: string;
  series?: string;
  model?: string;
  chassis?: string;
  year?: number;
  mileage?: number;
  seats?: number;
  color?: string;
  heavyDamage?: boolean;
  plateNumber?: string;
  // Complex top-level fields
  damageReport?: Record<string, string | { status: string; detail?: string }>;
  technicalSpecs?: string[];
  category?: Category;
  categoryId?: string;
  images: ListingImage[];
  attributes?: Record<string, string>;
  vehicleDetails?: VehicleDetails;
  phoneNumber?: string | null;
  showPhoneNumber?: boolean;
  acceptsOffers?: boolean;
  isFeatured?: boolean;
  // Owner payload only (my-listings routes): active dopings, soonest-first;
  // REFRESH never appears (it has no duration). Absent on public payloads.
  activeDopings?: { type: string; expiresAt: string }[];
  // Doping / monetisation fields — each operates in its own domain
  isUrgent?: boolean;
  hasHighlightFrame?: boolean;
  urgentUntil?: string | null;             // Acil — time-windowed (gates عاجل badge)
  highlightUntil?: string | null;          // Öne Çıkan çerçeve — time-windowed
  homepageShowcaseUntil?: string | null;   // Anasayfa Vitrini
  categoryShowcaseUntil?: string | null;   // Kategori Vitrini
  topOfSearchUntil?: string | null;        // Üst Sıradayım
  user?: User;
  /** Backend may embed questions with the listing detail response */
  questions?: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface Advertisement {
  id: string;
  companyName: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'GIF' | 'VIDEO' | 'TEXT';
  targetUrl: string;
  isActive: boolean;
  // TEXT-type design fields
  adText?: string;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  sender?: User;
  roomId: string;
  isRead?: boolean;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  listing?: Listing;
  buyer?: User;
  seller?: User;
  /** Legacy/alternate shape — some backends still send this */
  participants?: User[];
  messages?: Message[];
  lastMessage?: Message;
  unreadCount?: number;
  updatedAt: string;
  createdAt: string;
}
