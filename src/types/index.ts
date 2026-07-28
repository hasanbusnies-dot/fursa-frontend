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
  userType: 'USER' | 'ADMIN' | 'CORPORATE' | 'FIELD_AGENT' | 'ACCOUNTANT';
  profile: UserProfile;
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
