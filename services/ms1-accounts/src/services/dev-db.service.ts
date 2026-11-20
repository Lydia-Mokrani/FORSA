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
  passwordHash: string;
  fullName: string;
  phone?: string;
  role: 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  emailVerified: boolean;
  phoneVerified: boolean;
  shop?: {
    id: string;
    name: string;
    status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
    address?: string;
  } | null;
}

class DevDbService {
  private users: Map<string, DevUser> = new Map();
  private initialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (this.initialized) return;
    const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

    // Client de démonstration
    this.users.set('client@forsa.dz', {
      id: 'usr_dev_client_01',
      email: 'client@forsa.dz',
      passwordHash: defaultPasswordHash,
      fullName: 'Karim Client',
      phone: '0550112233',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
      shop: null,
    });

    // Commerçant de démonstration approuvé
    this.users.set('merchant@forsa.dz', {
      id: 'usr_dev_merchant_01',
      email: 'merchant@forsa.dz',
      passwordHash: defaultPasswordHash,
      fullName: 'Ahmed Boulanger',
      phone: '0550445566',
      role: 'MERCHANT',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
      shop: {
        id: 'shop_dev_boulangerie_01',
        name: 'Boulangerie El Amel',
        status: 'APPROVED',
        address: '14 Rue Didouche Mourad, Alger',
      },
    });

    // Commerçant suspendu pour démonstration de l'écran 06
    this.users.set('suspendu@forsa.dz', {
      id: 'usr_dev_suspended_01',
      email: 'suspendu@forsa.dz',
      passwordHash: defaultPasswordHash,
      fullName: 'Commerçant Non-Conforme',
      phone: '0550998877',
      role: 'MERCHANT',
      status: 'SUSPENDED',
      emailVerified: true,
      phoneVerified: false,
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
    return this.users.get(email.toLowerCase()) || null;
  }

  public async createUser(user: DevUser): Promise<DevUser> {
    await this.init();
    this.users.set(user.email.toLowerCase(), user);
    return user;
  }
}

export const devDb = new DevDbService();
