// frontend/src/features/profile/types.ts

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  emailVerified: boolean;
  phoneVerified: boolean;
  preferences?: {
    preferredLocation?: string | null;
    searchRadiusKm?: number;
    pushEnabled?: boolean;
    telegramNotifications?: boolean;
  } | null;
  preferredLocation?: string | null;
  createdAt: string;
  shop?: {
    id: string;
    name: string;
    description?: string | null;
    address: string;
    latitude: number;
    longitude: number;
    phone: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
    logoUrl?: string | null;
  } | null;
}

export type ProfileTab = 'info' | 'security' | 'location' | 'card';
