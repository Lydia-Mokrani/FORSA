/**
 * Service d'authentification Telegram et gestion des tokens (MS1)
 *
 * Sécurité des tokens :
 * - Access Token conservé STRICTEMENT en mémoire (variable de module).
 * - Refresh Token stocké dans le localStorage (avec fallback / persistance de session).
 *   NOTE PROD : Pour un niveau de sécurité optimal contre XSS, il est recommandé
 *   de configurer le backend pour stocker le Refresh Token dans un cookie httpOnly + SameSite=Strict.
 * - `authFetch` intercepte automatiquement les requêtes et renouvelle l'access token
 *   sur erreur 401 via `POST /api/auth/refresh`.
 */

export interface UserRole {
  name: string;
}

export interface ShopInfo {
  id: string;
  name: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  address?: string;
  category?: string;
  rejectReason?: string | null;
}

export interface UserPreferences {
  preferredLocation?: string | null;
  searchRadiusKm?: number;
  pushEnabled?: boolean;
  telegramNotifications?: boolean;
  emailNotifications?: boolean;
}

export interface AuthUser {
  id: string;
  phoneE164: string;
  roles: string[];
  activeMode: 'customer' | 'merchant';
  status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | 'DELETED';
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  shop?: ShopInfo | null;
  preferences?: UserPreferences | null;
  twoFactorEnabled?: boolean;
}

export interface TelegramStartResponse {
  challengeId: string;
  deepLink: string;
  expiresAt: string;
}

export interface TelegramChallengeStatusResponse {
  id: string;
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED' | 'FAILED';
  codeSent: boolean;
}

export interface TelegramVerifyResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Access token en mémoire
let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const getAccessToken = (): string | null => inMemoryAccessToken;

export const setAccessToken = (token: string | null): void => {
  inMemoryAccessToken = token;
};

export const getStoredRefreshToken = (): string | null => {
  try {
    return localStorage.getItem('forsa_refresh_token');
  } catch {
    return null;
  }
};

export const setStoredRefreshToken = (token: string | null): void => {
  try {
    if (token) {
      localStorage.setItem('forsa_refresh_token', token);
    } else {
      localStorage.removeItem('forsa_refresh_token');
    }
  } catch (e) {
    console.error('Erreur stockage refresh token:', e);
  }
};

export const getStoredUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem('forsa_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: AuthUser | null): void => {
  try {
    if (user) {
      localStorage.setItem('forsa_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('forsa_user');
    }
  } catch (e) {
    console.error('Erreur stockage user:', e);
  }
};

/**
 * Appel API avec rafraîchissement transparent du token sur 401
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = getAccessToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Tenter de renouveler le token
    const newToken = await refreshAuthSession();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(url, { ...options, headers });
    }
  }

  return response;
}

/**
 * Renouvelle la session via POST /api/auth/refresh
 */
export async function refreshAuthSession(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    logoutLocally();
    return null;
  }

  // Éviter les appels multiples concurrents de refresh
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        logoutLocally();
        return null;
      }

      const data = await res.json();
      setAccessToken(data.accessToken);
      if (data.refreshToken) {
        setStoredRefreshToken(data.refreshToken);
      }
      return data.accessToken as string;
    } catch {
      logoutLocally();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function logoutLocally(): void {
  setAccessToken(null);
  setStoredRefreshToken(null);
  setStoredUser(null);
}

/**
 * POST /api/auth/telegram/start
 */
export async function startTelegramAuth(phone: string): Promise<TelegramStartResponse> {
  const res = await fetch('/api/auth/telegram/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || 'Erreur lors de l’initialisation Telegram.';
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.code = data?.error?.code || data?.code;
    err.retryAfter = data?.retryAfter || 60;
    throw err;
  }

  return data;
}

/**
 * GET /api/auth/telegram/challenges/:id
 */
export async function getTelegramChallengeStatus(challengeId: string): Promise<TelegramChallengeStatusResponse> {
  const res = await fetch(`/api/auth/telegram/challenges/${challengeId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || 'Erreur lors de la récupération du statut.';
    const err: any = new Error(errorMsg);
    err.status = res.status;
    throw err;
  }

  return data;
}

/**
 * POST /api/auth/telegram/verify
 */
export async function verifyTelegramAuth(
  challengeId: string,
  code: string,
  role?: 'CUSTOMER' | 'MERCHANT'
): Promise<TelegramVerifyResponse> {
  const res = await fetch('/api/auth/telegram/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, code, role }),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || 'Code de vérification invalide.';
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.code = data?.error?.code || data?.code;
    err.attemptsLeft = data?.attemptsLeft;
    throw err;
  }

  // Stockage
  setAccessToken(data.accessToken);
  if (data.refreshToken) {
    setStoredRefreshToken(data.refreshToken);
  }
  if (data.user) {
    setStoredUser(data.user);
  }

  return data;
}

export interface GoogleAuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

/**
 * POST /api/auth/google
 * Authentifie l'utilisateur via le jeton Google idToken émis par GIS.
 * Stocke l'accessToken en mémoire et le refreshToken dans le stockage local de manière
 * strictement identique au flux Telegram.
 * L'idToken n'est jamais stocké ni consigné dans les logs.
 */
export async function loginWithGoogle(idToken: string): Promise<GoogleAuthResponse> {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Réponse non-JSON (ex: 502/504 ou 404 HTML)
  }

  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || 'Connexion Google indisponible.';
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.code = data?.error?.code || data?.code;
    throw err;
  }

  // Stockage identique à verifyTelegramAuth
  setAccessToken(data.accessToken);
  if (data.refreshToken) {
    setStoredRefreshToken(data.refreshToken);
  }
  if (data.user) {
    setStoredUser(data.user);
  }

  return data;
}

/**
 * POST /api/auth/logout
 */
export async function logout(): Promise<void> {
  const refreshToken = getStoredRefreshToken();
  try {
    await authFetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (e) {
    console.warn('Erreur lors de l’appel logout backend:', e);
  } finally {
    logoutLocally();
  }
}

/**
 * POST /api/users/me/phone/change/start
 */
export async function startPhoneChange(): Promise<{ challengeId: string; expiresAt: string; message: string }> {
  const res = await authFetch('/api/users/me/phone/change/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || 'Impossible d’initier le changement de numéro.';
    const err: any = new Error(errorMsg);
    err.status = res.status;
    throw err;
  }

  return data;
}

/**
 * POST /api/users/me/phone/change/verify
 */
export async function verifyPhoneChange(
  challengeId: string,
  code: string,
  newPhone: string
): Promise<{ status: string; step2ChallengeId: string; deepLink: string; expiresAt: string; message: string }> {
  const res = await authFetch('/api/users/me/phone/change/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, code, newPhone }),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || 'Erreur lors de la confirmation du nouveau numéro.';
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.code = data?.error?.code || data?.code;
    throw err;
  }

  return data;
}

/**
 * GET /api/users/me
 */
export async function getCurrentUser(): Promise<AuthUser> {
  const res = await authFetch('/api/users/me', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || 'Impossible de récupérer le profil.';
    const err: any = new Error(errorMsg);
    err.status = res.status;
    throw err;
  }

  const user = data.user || data;
  setStoredUser(user);
  return user;
}

/**
 * Helper de redirection post-connexion selon le profil et statut
 */
export function getPostLoginRedirect(user: AuthUser, requestedRole?: 'CUSTOMER' | 'MERCHANT'): string {
  if (user.status === 'SUSPENDED') {
    return '/account/suspended';
  }

  // 1. Si le rôle demandé est explicitement CLIENT : toujours rediriger vers l'espace client
  if (requestedRole === 'CUSTOMER') {
    return '/';
  }

  // 2. Si le rôle demandé est explicitement COMMERÇANT
  if (requestedRole === 'MERCHANT') {
    const shopStatus = user.shop?.verificationStatus;
    if (shopStatus === 'APPROVED') {
      return '/merchant/dashboard';
    }
    return '/merchant/status';
  }

  // 3. Si aucun rôle n'a été spécifié, se baser sur le mode actif de l'utilisateur
  if (user.activeMode === 'merchant' && user.roles?.includes('MERCHANT')) {
    const shopStatus = user.shop?.verificationStatus;
    if (shopStatus === 'APPROVED') {
      return '/merchant/dashboard';
    }
    return '/merchant/status';
  }

  return '/';
}

/**
 * GET /api/auth/sessions (MS1 Settings)
 */
export interface UserSession {
  id: string;
  device?: string;
  ipAddress?: string;
  userAgent?: string;
  lastActiveAt?: string;
  createdAt?: string;
  current?: boolean;
}

export async function getActiveSessions(): Promise<UserSession[]> {
  try {
    const res = await authFetch('/api/auth/sessions');
    if (!res.ok) return [];
    const data = await res.json();
    return data?.sessions || (Array.isArray(data) ? data : []);
  } catch {
    return [];
  }
}

/**
 * POST /api/auth/switch-mode (MS1 Settings Mode)
 */
export async function switchUserMode(targetRole: 'CUSTOMER' | 'MERCHANT'): Promise<any> {
  const mode = targetRole === 'MERCHANT' ? 'merchant' : 'customer';
  const res = await authFetch('/api/auth/switch-mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetRole, mode }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || 'Impossible de changer de mode.';
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }
  if (data?.user) {
    setStoredUser(data.user);
  }
  return data;
}

/**
 * DELETE /api/auth/sessions/:id
 */
export async function revokeUserSession(sessionId: string): Promise<boolean> {
  try {
    const res = await authFetch(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * POST /api/auth/email/verify
 */
export async function verifyEmailCode(code: string): Promise<any> {
  const res = await authFetch('/api/auth/email/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error?.message || 'Code de vérification e-mail invalide.');
  }
  return data;
}

/**
 * POST /api/auth/email/resend
 */
export async function resendEmailCode(): Promise<any> {
  const res = await authFetch('/api/auth/email/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error?.message || 'Erreur lors du renvoi du code.');
  }
  return data;
}

/**
 * PUT /api/users/me
 */
export async function updateUserProfile(payload: {
  fullName?: string;
  email?: string;
  preferredLocation?: string | null;
  searchRadiusKm?: number;
  pushEnabled?: boolean;
  telegramNotifications?: boolean;
  emailNotifications?: boolean;
  twoFactorEnabled?: boolean;
  password?: string;
  currentPassword?: string;
}): Promise<any> {
  const res = await authFetch('/api/users/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error?.message || 'Erreur lors de la mise à jour du profil.');
  }
  if (data?.user) {
    setStoredUser(data.user);
  }
  return data?.user || data;
}

/**
 * GET /api/shops/me
 */
export async function getMyShop(): Promise<any> {
  try {
    const res = await authFetch('/api/shops/me');
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.shop || data;
  } catch {
    return null;
  }
}

/**
 * PUT /api/shops/me
 */
export async function updateMyShop(payload: {
  name?: string;
  category?: string;
  address?: string;
  openingHours?: string;
  phone?: string;
  description?: string;
}): Promise<any> {
  const res = await authFetch('/api/shops/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error?.message || 'Erreur lors de la mise à jour du commerce.');
  }
  return data?.shop || data;
}

/**
 * POST /api/auth/recovery/start
 */
export async function startEmailRecovery(email: string): Promise<any> {
  const res = await fetch('/api/auth/recovery/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error?.message || 'Erreur lors de l’envoi du code de récupération.');
  }
  return data;
}

/**
 * POST /api/auth/recovery/verify
 */
export async function verifyEmailRecovery(email: string, code: string): Promise<any> {
  const res = await fetch('/api/auth/recovery/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error?.message || 'Code de récupération incorrect ou expiré.');
  }
  return data;
}

export interface ShopVerificationStatus {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectReason?: string | null;
  submittedAt?: string;
  reviewedAt?: string | null;
}

export interface ShopDocumentItem {
  id: string;
  type: 'commercial_register' | 'tax_id' | 'storefront' | string;
  status: 'VALIDATED' | 'REJECTED' | 'PENDING';
  reason?: string | null;
  uploadedAt: string;
  url?: string;
  originalName?: string;
  size?: number;
}

/**
 * GET /api/shops/me/verification
 * Récupère le statut officiel de vérification et le motif de rejet éventuel
 */
export async function getShopVerification(): Promise<ShopVerificationStatus> {
  const res = await authFetch('/api/shops/me/verification', { method: 'GET' });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || 'Impossible de récupérer le statut de vérification.');
  }
  return data;
}

/**
 * GET /api/shops/me/documents
 * Récupère la liste des pièces justificatives téléversées
 */
export async function getShopDocuments(): Promise<{ documents: ShopDocumentItem[] }> {
  const res = await authFetch('/api/shops/me/documents', { method: 'GET' });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || 'Impossible de récupérer les documents.');
  }
  return data?.documents ? data : { documents: Array.isArray(data) ? data : [] };
}

/**
 * POST /api/shops/me/documents
 * Envoi multipart des pièces justificatives
 */
export async function uploadShopDocuments(formData: FormData): Promise<any> {
  const res = await authFetch('/api/shops/me/documents', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || 'Erreur lors de l’envoi des documents.');
  }
  return data;
}
