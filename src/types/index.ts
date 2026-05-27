export interface UserProfile {
  firstName: string;
  lastName: string;
}

export interface CorporateProfile {
  companyName?: string;
  logo?: string;
  verified?: boolean;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  avatar?: string;
  userType: 'USER' | 'ADMIN' | 'CORPORATE';
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
  title: string;
  description: string;
  price: number;
  currency: 'SYP' | 'USD';
  city: string;
  country?: string;
  district?: string;
  neighborhood?: string;
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
  // Doping / monetisation fields — each operates in its own domain
  isUrgent?: boolean;
  hasHighlightFrame?: boolean;
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
