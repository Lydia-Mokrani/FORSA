import fs from 'fs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface TokenPayload {
  sub: string;                      // ID utilisateur (userId)
  email: string;
  role: 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
  fullName: string;
  emailVerified: boolean;
  phoneVerified?: boolean;
  
  // Identifiant de la boutique et du commerçant (aligné avec MS2)
  shopId?: string | null;           // UUID de la boutique
  merchantId?: string | null;       // ID utilisateur du commerçant (= sub / userId, attendu par MS2)

  // Statut d'approbation boutique / commerçant (aligné avec MS2)
  shopStatus?: string | null;
  merchantStatus?: string | null;   // 'PENDING' | 'APPROVED' | 'SUSPENDED' (attendu par MS2)
}

class JwtService {
  private privateKey: string;
  private publicKey: string;

  constructor() {
    try {
      this.privateKey = fs.readFileSync(config.jwtPrivateKeyPath, 'utf8');
      this.publicKey = fs.readFileSync(config.jwtPublicKeyPath, 'utf8');
    } catch (err) {
      console.warn('[MS1-JWT] Clés non trouvées sur le disque. Génération à la volée...');
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      this.privateKey = privateKey;
      this.publicKey = publicKey;
    }
  }

  public getPublicKey(): string {
    return this.publicKey;
  }

  public generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: config.jwtAccessExpiresIn as any,
      issuer: 'forsa-ms1-accounts',
    });
  }

  public generateRefreshToken(): { token: string; hash: string } {
    const rawToken = crypto.randomBytes(40).toString('hex');
    const hash = this.hashToken(rawToken);
    return { token: rawToken, hash };
  }

  public hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  public verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
      issuer: 'forsa-ms1-accounts',
    }) as TokenPayload;
  }
}

export const jwtService = new JwtService();
