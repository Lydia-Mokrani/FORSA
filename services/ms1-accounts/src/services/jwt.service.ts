import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface TokenPayload {
  sub: string;                      // ID utilisateur (userId)
  roles: ('CUSTOMER' | 'MERCHANT' | 'ADMIN')[];
  mode: string;                     // 'customer' | 'merchant'
  shopStatus?: string | null;
  // Champs optionnels et rétro-compatibilité
  role?: 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  shopId?: string | null;
  merchantId?: string | null;
  merchantStatus?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

class JwtService {
  private privateKey: string = '';
  private publicKey: string = '';

  constructor() {
    this.initKeys();
  }

  private initKeys(): void {
    // 1. Recherche des fichiers de clés PEM existants sur le disque
    const candidatePrivatePaths = [
      path.resolve(config.jwtPrivateKeyPath),
      path.resolve(process.cwd(), config.jwtPrivateKeyPath),
      path.resolve(__dirname, '..', '..', 'keys', 'private.pem'),
      path.resolve(process.cwd(), 'services', 'ms1-accounts', 'keys', 'private.pem'),
      path.resolve(process.cwd(), 'keys', 'private.pem'),
    ];

    const candidatePublicPaths = [
      path.resolve(config.jwtPublicKeyPath),
      path.resolve(process.cwd(), config.jwtPublicKeyPath),
      path.resolve(__dirname, '..', '..', 'keys', 'public.pem'),
      path.resolve(process.cwd(), 'services', 'ms1-accounts', 'keys', 'public.pem'),
      path.resolve(process.cwd(), 'keys', 'public.pem'),
    ];

    for (let i = 0; i < candidatePrivatePaths.length; i++) {
      const privPath = candidatePrivatePaths[i];
      const pubPath = candidatePublicPaths[i];
      if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
        try {
          this.privateKey = fs.readFileSync(privPath, 'utf8');
          this.publicKey = fs.readFileSync(pubPath, 'utf8');
          console.log(`[MS1-JWT] 🔑 Clés RSA 2048 chargées depuis le disque (${pubPath})`);
          return;
        } catch (err: any) {
          console.warn(`[MS1-JWT] Échec de lecture des clés à ${privPath}: ${err.message}`);
        }
      }
    }

    // 2. Si aucune paire n'est trouvée, générer une paire RSA 2048 persistante et l'enregistrer sur le disque
    console.warn('[MS1-JWT] ⚠️ Clés PEM absentes sur le disque. Génération d\'une paire RSA 2048 persistante...');
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    this.privateKey = privateKey;
    this.publicKey = publicKey;

    // Déterminer le dossier cible pour persister les clés
    const targetDir = path.resolve(__dirname, '..', '..', 'keys');
    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const targetPrivate = path.join(targetDir, 'private.pem');
      const targetPublic = path.join(targetDir, 'public.pem');

      fs.writeFileSync(targetPrivate, privateKey, { mode: 0o600 });
      fs.writeFileSync(targetPublic, publicKey, { mode: 0o644 });
      console.log(`[MS1-JWT] 💾 Clés RSA persistantes enregistrées avec succès dans : ${targetDir}`);
    } catch (writeErr: any) {
      console.warn(`[MS1-JWT] Impossible de persister les clés sur le disque (${writeErr.message}), clés conservées en mémoire.`);
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

  /**
   * Comparaison sécurisée à temps constant de deux chaînes hexadécimales (hashes)
   */
  public constantTimeCompare(a: string, b: string): boolean {
    if (!a || !b) return false;
    try {
      const bufA = Buffer.from(a, 'hex');
      const bufB = Buffer.from(b, 'hex');
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}

export const jwtService = new JwtService();
