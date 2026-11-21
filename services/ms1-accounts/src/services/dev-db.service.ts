import bcrypt from 'bcrypt';
import net from 'net';

let lastCheckTime = 0;
let cachedStatus = false;

export async function isPostgresAlive(): Promise<boolean> {
  const now = Date.now();
  if (now - lastCheckTime < 4000) {
    return cachedStatus;
  }
  return new Promise((resolve) => {
    const socket = net.createConnection({ port: 5432, host: '127.0.0.1', timeout: 150 });
    socket.on('connect', () => {
      socket.destroy();
      cachedStatus = true;
      lastCheckTime = Date.now();
      resolve(true);
    });
    const onError = () => {
      socket.destroy();
      cachedStatus = false;
      lastCheckTime = Date.now();
      resolve(false);
    };
    socket.on('error', onError);
    socket.on('timeout', onError);
  });
}

export interface DevUser {
  id: string;
  email: string;
  passwordHash?: string | null;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt?: Date;
  shop?: {
    id: string;
    name: string;
    status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
    address?: string;
  } | null;
}

export interface DevRefreshToken {
  userId: string;
  revoked: boolean;
  expiresAt: Date;
}

export interface DevEmailToken {
  userId: string;
  type: 'VERIFY_EMAIL' | 'RESET_PASSWORD';
  expiresAt: Date;
  usedAt: Date | null;
}

export interface DevPhoneOtp {
  userId: string;
  codeHash: string;
  expiresAt: Date;
  used: boolean;
  attempts: number;
  createdAt: Date;
}

class DevDbService {
  // Maps publiques accessibles depuis les services
  public users: Map<string, DevUser> = new Map();
  public refreshTokens: Map<string, DevRefreshToken> = new Map();
  public emailTokens: Map<string, DevEmailToken> = new Map();
  public phoneOtps: Map<string, DevPhoneOtp> = new Map();

  private initialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (this.initialized) return;
    const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

    // Client de démonstration
    this.users.set('usr_dev_client_01', {
      id: 'usr_dev_client_01',
      email: 'client@forsa.dz',
      passwordHash: defaultPasswordHash,
      fullName: 'Karim Client',
      phone: '0550112233',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
      createdAt: new Date(),
      shop: null,
    });

    // Commerçant de démonstration approuvé
    this.users.set('usr_dev_merchant_01', {
      id: 'usr_dev_merchant_01',
      email: 'merchant@forsa.dz',
      passwordHash: defaultPasswordHash,
      fullName: 'Ahmed Boulanger',
      phone: '0550445566',
      role: 'MERCHANT',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
      createdAt: new Date(),
      shop: {
        id: 'shop_dev_boulangerie_01',
        name: 'Boulangerie El Amel',
        status: 'APPROVED',
        address: '14 Rue Didouche Mourad, Alger',
      },
    });

    // Commerçant suspendu pour démonstration de l'écran 06
    this.users.set('usr_dev_suspended_01', {
      id: 'usr_dev_suspended_01',
      email: 'suspendu@forsa.dz',
      passwordHash: defaultPasswordHash,
      fullName: 'Commerçant Non-Conforme',
      phone: '0550998877',
      role: 'MERCHANT',
      status: 'SUSPENDED',
      emailVerified: true,
      phoneVerified: false,
      createdAt: new Date(),
      shop: {
        id: 'shop_dev_suspended_01',
        name: 'Boutique Suspendue',
        status: 'SUSPENDED',
        address: 'Alger',
      },
    });

    this.initialized = true;
  }

  public async findByEmail(email: string): Promise<DevUser | null> {
    await this.init();
    for (const [, u] of this.users) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  }

  public async createUser(user: DevUser): Promise<DevUser> {
    await this.init();
    user.createdAt = user.createdAt ?? new Date();
    this.users.set(user.id, user);
    return user;
  }

  public get(id: string): DevUser | undefined {
    return this.users.get(id);
  }
}

export const devDb = new DevDbService();
