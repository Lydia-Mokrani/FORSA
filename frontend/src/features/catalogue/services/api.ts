// frontend/src/features/catalogue/services/api.ts
import { Category, Offer, OfferFilterParams, PaginatedResponse, MerchantDashboardData } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

// In-memory mock fallback data for UI preview if backend is not currently running
const MOCK_CATEGORIES: Category[] = [
  { id: '1', slug: 'bakeries', nameFr: 'Boulangeries', nameAr: 'مخابز', icon: '🥖', sortOrder: 1 },
  { id: '2', slug: 'restaurants', nameFr: 'Restaurants', nameAr: 'مطاعم', icon: '🍽️', sortOrder: 2 },
  { id: '3', slug: 'fruits-vegetables', nameFr: 'Fruits et légumes', nameAr: 'فواكه وخضروات', icon: '🥦', sortOrder: 3 },
  { id: '4', slug: 'groceries', nameFr: 'Épicerie et conserves', nameAr: 'بقالة ومعلبات', icon: '🛒', sortOrder: 4 },
  { id: '5', slug: 'near-expiry', nameFr: 'Proche DLUO', nameAr: 'قرب انتهاء الصلاحية', icon: '⏰', sortOrder: 5 },
  { id: '6', slug: 'supermarkets', nameFr: 'Supermarchés', nameAr: 'سوبرماركت', icon: '🏪', sortOrder: 6 },
  { id: '7', slug: 'clothing', nameFr: 'Vêtements', nameAr: 'ملابس', icon: '👕', sortOrder: 7 },
  { id: '8', slug: 'shoes', nameFr: 'Chaussures', nameAr: 'أحذية', icon: '👟', sortOrder: 8 },
  { id: '9', slug: 'other', nameFr: 'Autre', nameAr: 'أخرى', icon: '📦', sortOrder: 9 },
];

const MOCK_OFFERS: Offer[] = [
  {
    id: 'offer-1',
    merchantId: 'm-1',
    shopId: 's-1',
    categoryId: '1',
    name: 'Panier Surprise Viennoiseries du Soir',
    description: 'Assortiment de 6 à 8 viennoiseries artisanales fraîches du jour (croissants, pains au chocolat, brioches dorées). À récupérer avant la fermeture.',
    originalPrice: 800,
    discountedPrice: 320,
    discountPercent: 60,
    quantityAvailable: 4,
    quantityInitial: 8,
    expiresAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    photos: [
      { id: 'p1', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80', sortOrder: 0 }
    ],
    category: MOCK_CATEGORIES[0],
    shop: {
      id: 's-1',
      name: 'Boulangerie Artisanale Le Blé d’Or',
      address: '24 Rue Didouche Mourad, Alger Centre',
      latitude: 36.7725,
      longitude: 3.0588,
      averageRating: 4.8,
      salesCount: 142,
    }
  },
  {
    id: 'offer-2',
    merchantId: 'm-2',
    shopId: 's-2',
    categoryId: '3',
    name: 'Caisse Fruits & Légumes de Saison (4kg)',
    description: 'Caisse variée contenant des pommes, oranges, carottes et tomates mûres. Parfait pour soupes, jus ou cuisine immédiate.',
    originalPrice: 1200,
    discountedPrice: 480,
    discountPercent: 60,
    quantityAvailable: 7,
    quantityInitial: 12,
    expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    photos: [
      { id: 'p2', url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80', sortOrder: 0 }
    ],
    category: MOCK_CATEGORIES[2],
    shop: {
      id: 's-2',
      name: 'Primeur El Fellah',
      address: '15 Boulevard Zighoud Youcef, Alger',
      latitude: 36.7760,
      longitude: 3.0610,
      averageRating: 4.6,
      salesCount: 89,
    }
  },
  {
    id: 'offer-3',
    merchantId: 'm-3',
    shopId: 's-3',
    categoryId: '2',
    name: 'Formule Déjeuner Gourmet Invendu',
    description: 'Plat cuisiné du chef avec accompagnement et dessert. Préparé avec des ingrédients frais du jour.',
    originalPrice: 1500,
    discountedPrice: 650,
    discountPercent: 57,
    quantityAvailable: 3,
    quantityInitial: 6,
    expiresAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    photos: [
      { id: 'p3', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80', sortOrder: 0 }
    ],
    category: MOCK_CATEGORIES[1],
    shop: {
      id: 's-3',
      name: 'Bistrot La Casbah',
      address: '8 Rue Larbi Ben M\'hidi, Alger',
      latitude: 36.7740,
      longitude: 3.0560,
      averageRating: 4.9,
      salesCount: 230,
    }
  },
  {
    id: 'offer-4',
    merchantId: 'm-4',
    shopId: 's-4',
    categoryId: '4',
    name: 'Pack Épicerie & Produits Laitiers',
    description: 'Yaourts de qualité, fromage frais et biscuits proches de la date recommandée. Parfaitement sains à consommer.',
    originalPrice: 950,
    discountedPrice: 380,
    discountPercent: 60,
    quantityAvailable: 5,
    quantityInitial: 10,
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    productExpiryDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    photos: [
      { id: 'p4', url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80', sortOrder: 0 }
    ],
    category: MOCK_CATEGORIES[3],
    shop: {
      id: 's-4',
      name: 'Superette El Amel',
      address: '42 Avenue Colonel Amirouche, Alger',
      latitude: 36.7690,
      longitude: 3.0540,
      averageRating: 4.4,
      salesCount: 65,
    }
  }
];

export const CatalogueApi = {
  // GET /api/categories
  async getCategories(): Promise<Category[]> {
    try {
      const res = await fetch(`${API_BASE}/api/categories`);
      if (!res.ok) throw new Error('Network error');
      const json = await res.json();
      return json.data;
    } catch {
      return MOCK_CATEGORIES;
    }
  },

  // GET /api/offers
  async getOffers(params: OfferFilterParams = {}): Promise<PaginatedResponse<Offer>> {
    try {
      const query = new URLSearchParams();
      if (params.q) query.append('q', params.q);
      if (params.category) query.append('category', params.category);
      if (params.minPrice) query.append('minPrice', params.minPrice.toString());
      if (params.maxPrice) query.append('maxPrice', params.maxPrice.toString());
      if (params.minDiscount) query.append('minDiscount', params.minDiscount.toString());
      if (params.available !== undefined) query.append('available', params.available.toString());
      if (params.lat) query.append('lat', params.lat.toString());
      if (params.lng) query.append('lng', params.lng.toString());
      if (params.radius) query.append('radius', params.radius.toString());
      if (params.sort) query.append('sort', params.sort);
      if (params.page) query.append('page', params.page.toString());
      if (params.limit) query.append('limit', params.limit.toString());

      const res = await fetch(`${API_BASE}/api/offers?${query.toString()}`);
      if (!res.ok) throw new Error('Network error');
      return await res.json();
    } catch {
      // Mock filter in memory
      let filtered = [...MOCK_OFFERS];
      if (params.q) {
        const q = params.q.toLowerCase();
        filtered = filtered.filter(o => o.name.toLowerCase().includes(q) || o.description.toLowerCase().includes(q));
      }
      if (params.category) {
        filtered = filtered.filter(o => o.category.slug === params.category);
      }
      if (params.minPrice) {
        filtered = filtered.filter(o => o.discountedPrice >= params.minPrice!);
      }
      if (params.maxPrice) {
        filtered = filtered.filter(o => o.discountedPrice <= params.maxPrice!);
      }
      if (params.minDiscount) {
        filtered = filtered.filter(o => o.discountPercent >= params.minDiscount!);
      }
      return {
        data: filtered,
        pagination: {
          page: params.page || 1,
          limit: params.limit || 20,
          total: filtered.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        }
      };
    }
  },

  // GET /api/offers/:id
  async getOfferById(id: string): Promise<Offer | null> {
    try {
      const res = await fetch(`${API_BASE}/api/offers/${id}`);
      if (!res.ok) throw new Error('Not found');
      const json = await res.json();
      return json.data;
    } catch {
      return MOCK_OFFERS.find(o => o.id === id) || MOCK_OFFERS[0];
    }
  },

  // GET /api/offers/mine
  async getMyOffers(token?: string): Promise<PaginatedResponse<Offer>> {
    try {
      const res = await fetch(`${API_BASE}/api/offers/mine`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Auth error');
      return await res.json();
    } catch {
      return {
        data: MOCK_OFFERS,
        pagination: {
          page: 1,
          limit: 20,
          total: MOCK_OFFERS.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };
    }
  },

  // POST /api/offers
  async createOffer(data: any, token?: string): Promise<Offer> {
    const res = await fetch(`${API_BASE}/api/offers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to create offer');
    }
    const json = await res.json();
    return json.data;
  },

  // PATCH /api/offers/:id
  async updateOffer(id: string, data: any, token?: string): Promise<Offer> {
    const res = await fetch(`${API_BASE}/api/offers/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to update offer');
    }
    const json = await res.json();
    return json.data;
  },

  // DELETE /api/offers/:id
  async deleteOffer(id: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/offers/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete offer');
  },

  // POST /api/offers/:id/photos
  async uploadPhotos(id: string, files: File[], token?: string): Promise<any> {
    const formData = new FormData();
    files.forEach(f => formData.append('photos', f));
    const res = await fetch(`${API_BASE}/api/offers/${id}/photos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload photos');
    return await res.json();
  },

  // GET /api/merchant/dashboard
  async getMerchantDashboard(token?: string): Promise<MerchantDashboardData> {
    try {
      const res = await fetch(`${API_BASE}/api/merchant/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      return json.data;
    } catch {
      return {
        stats: {
          totalOffers: 18,
          activeOffers: 8,
          expiredOffers: 6,
          pendingVerification: 2,
          soldOutOffers: 2,
          hiddenOffers: 0,
          reservedProducts: 45,
          pickups: 39,
          reviews: 28,
        },
        recentOffers: MOCK_OFFERS.slice(0, 3).map(o => ({
          id: o.id,
          name: o.name,
          status: o.status,
          discountedPrice: o.discountedPrice,
          discountPercent: o.discountPercent,
          expiresAt: o.expiresAt,
          updatedAt: o.updatedAt,
          category: {
            nameFr: o.category.nameFr,
            icon: o.category.icon,
          },
          thumbnailUrl: o.photos[0]?.url || null,
        })),
        shops: [
          {
            id: 's-1',
            name: 'Boulangerie Artisanale Le Blé d’Or',
            address: '24 Rue Didouche Mourad, Alger',
            averageRating: 4.8,
            salesCount: 142,
            status: 'ACTIVE',
          }
        ]
      };
    }
  },

  // POST /api/offers/:id/date-photo
  async uploadDatePhoto(id: string, file: File, token?: string): Promise<{ datePhotoUrl: string }> {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await fetch(`${API_BASE}/api/offers/${id}/date-photo`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload date photo');
    const json = await res.json();
    return json.data;
  },

  // POST /api/offers/:id/submit
  async submitOffer(id: string, token?: string): Promise<Offer> {
    const res = await fetch(`${API_BASE}/api/offers/${id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error('Failed to submit offer');
    const json = await res.json();
    return json.data;
  },

  // POST /api/offers/:id/withdraw
  async withdrawOffer(id: string, token?: string): Promise<Offer> {
    const res = await fetch(`${API_BASE}/api/offers/${id}/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error('Failed to withdraw offer');
    const json = await res.json();
    return json.data;
  },

  // POST /api/offers/:id/stock-adjustment
  async adjustStock(id: string, payload: { quantityDelta?: number; newQuantity?: number; reason?: string }, token?: string): Promise<Offer> {
    const res = await fetch(`${API_BASE}/api/offers/${id}/stock-adjustment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to adjust stock');
    const json = await res.json();
    return json.data;
  }
};