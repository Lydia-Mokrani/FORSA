// frontend/src/features/catalogue/types/index.ts

export interface Category {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  icon?: string;
  sortOrder: number;
}

export interface ShopSnapshot {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  averageRating: number;
  salesCount: number;
}

export interface OfferPhoto {
  id: string;
  url: string;
  sortOrder: number;
}

export type OfferStatus =
  | 'DRAFT'
  | 'PENDING_VERIFICATION'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'SOLD_OUT'
  | 'REJECTED'
  | 'HIDDEN';

export interface Offer {
  id: string;
  merchantId: string;
  shopId: string;
  categoryId: string;
  name: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  quantityAvailable: number;
  quantityInitial: number;
  expiresAt: string;
  productExpiryDate?: string;
  status: OfferStatus;
  datePhotoUrl?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  photos: OfferPhoto[];
  category: Category;
  shop: ShopSnapshot;
}

export interface OfferFilterParams {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
  available?: boolean;
  lat?: number;
  lng?: number;
  radius?: number;
  sort?: 'distance' | 'price' | 'deadline' | 'discount';
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface MerchantStats {
  totalOffers: number;
  activeOffers: number;
  expiredOffers: number;
  pendingVerification: number;
  soldOutOffers: number;
  hiddenOffers: number;
  reservedProducts: number;
  pickups: number;
  reviews: number;
}

export interface MerchantDashboardData {
  stats: MerchantStats;
  recentOffers: {
    id: string;
    name: string;
    status: OfferStatus;
    discountedPrice: number;
    discountPercent: number;
    expiresAt: string;
    updatedAt: string;
    category: {
      nameFr: string;
      icon?: string;
    };
    thumbnailUrl: string | null;
  }[];
  shops: {
    id: string;
    name: string;
    address: string;
    averageRating: number;
    salesCount: number;
    status: string;
  }[];
}
