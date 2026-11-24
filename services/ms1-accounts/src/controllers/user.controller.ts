import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { z } from 'zod';
import fs from 'fs';
import crypto from 'crypto';
import {
  ApiError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from '@forsa/common';
import { prisma } from '../config/prisma';
import { devDb, isPostgresAlive } from '../services/dev-db.service';
import { normalizeToE164, isValidE164Algerian } from '../utils/phone';
import { avatarFilePath, hasImageSignature } from '../middleware/avatar-upload.middleware';
import { AuthController } from './auth.controller';
import { logAudit } from '../services/audit.service';
import { eventBus } from '../services/event-bus';
import { createAuthChallenge, verifyAuthChallenge, hashString } from '../services/challenge.service';
import { ChallengePurpose, ChallengeStatus } from '@prisma/client';

// ─── Schémas Zod ──────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Le nom doit comporter au moins 2 caractères').optional(),
  email: z.union([z.string().email('Format email invalide'), z.literal(''), z.null()]).optional(),
  preferredLocation: z.string().nullable().optional(),
  searchRadiusKm: z.number().int().min(1).max(500).optional(),
  pushEnabled: z.boolean().optional(),
  telegramNotifications: z.boolean().optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const profileSelect = {
  id: true,
  email: true,
  fullName: true,
  phoneE164: true,
  avatarUrl: true,
  roles: true,
  activeMode: true,
  status: true,
  createdAt: true,
  shop: {
    select: {
      id: true,
      name: true,
      description: true,
      address: true,
      latitude: true,
      longitude: true,
      phone: true,
      verificationStatus: true,
      logoUrl: true,
      openingHours: true,
    },
  },
  preferences: {
    select: {
      preferredLocation: true,
      searchRadiusKm: true,
      pushEnabled: true,
      telegramNotifications: true,
    },
  },
};

async function findUserWithProfile(userId: string): Promise<any> {
  if (await isPostgresAlive()) {
    try {
      const pUser = await prisma.user.findUnique({
        where: { id: userId },
        select: profileSelect,
      });
      if (pUser) {
        return {
          id: pUser.id,
          phoneE164: pUser.phoneE164,
          fullName: pUser.fullName,
          avatarUrl: pUser.avatarUrl,
          email: pUser.email,
          roles: pUser.roles,
          activeMode: pUser.activeMode,
          status: pUser.status,
          createdAt: pUser.createdAt,
          shop: pUser.shop,
          shopStatus: pUser.shop?.verificationStatus ?? null,
          preferences: pUser.preferences ?? {
            preferredLocation: null,
            searchRadiusKm: 10,
            pushEnabled: true,
            telegramNotifications: true,
          },
          // Compatibilité avec le front existant
          phone: pUser.phoneE164,
          role: pUser.activeMode === 'merchant' ? 'MERCHANT' : 'CUSTOMER',
          phoneVerified: true,
          emailVerified: !!pUser.email,
        };
      }
    } catch {
      // fallback devDb
    }
  }

  const u: any = devDb.users.get(userId);
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phoneE164: u.phoneE164 ?? u.phone ?? null,
    phone: u.phoneE164 ?? u.phone ?? null,
    avatarUrl: u.avatarUrl ?? null,
    roles: u.roles || [u.role || 'CUSTOMER'],
    activeMode: u.activeMode || (u.role === 'MERCHANT' ? 'merchant' : 'customer'),
    role: u.role || 'CUSTOMER',
    status: u.status || 'ACTIVE',
    phoneVerified: true,
    emailVerified: !!u.email,
    createdAt: u.createdAt || new Date(),
    shop: null,
    shopStatus: null,
    preferences: {
      preferredLocation: null,
      searchRadiusKm: 10,
      pushEnabled: true,
      telegramNotifications: true,
      language: 'fr',
      notificationsEnabled: true,
    },
  };
}

// ─── UserController ───────────────────────────────────────────────────────────

export class UserController {
  /**
   * GET /api/users/me
   * Profil complet de l'utilisateur connecté avec preferences, roles, activeMode et boutique.
   */
  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const user = await findUserWithProfile(userId);
      if (!user) throw new NotFoundError('Utilisateur non trouvé.');

      res.json({ user });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/users/me
   * Mise à jour du profil et des préférences (preferredLocation, searchRadiusKm, etc.).
   */
  public static async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      const current = await findUserWithProfile(userId);
      if (!current) throw new NotFoundError('Utilisateur non trouvé.');

      const { fullName, email, preferredLocation, searchRadiusKm, pushEnabled, telegramNotifications } = parsed.data;

      // Traitement de l'email : stocker null si vide
      let formattedEmail: string | null | undefined = undefined;
      if (email !== undefined) {
        if (email === '' || email === null) {
          formattedEmail = null;
        } else {
          formattedEmail = email.toLowerCase().trim();
          if (current.email !== formattedEmail) {
            if (await isPostgresAlive()) {
              const conflict = await prisma.user.findFirst({
                where: { email: formattedEmail, id: { not: userId } },
              });
              if (conflict) {
                throw new ConflictError('Cette adresse e-mail est déjà utilisée par un autre compte.');
              }
            }
          }
        }
      }

      if (await isPostgresAlive()) {
        const updateUserData: any = {};
        if (fullName !== undefined) updateUserData.fullName = fullName;
        if (formattedEmail !== undefined) updateUserData.email = formattedEmail;

        if (Object.keys(updateUserData).length > 0) {
          await prisma.user.update({
            where: { id: userId },
            data: updateUserData,
          });
        }

        if (
          preferredLocation !== undefined ||
          searchRadiusKm !== undefined ||
          pushEnabled !== undefined ||
          telegramNotifications !== undefined
        ) {
          await prisma.userPreferences.upsert({
            where: { userId },
            update: {
              ...(preferredLocation !== undefined ? { preferredLocation } : {}),
              ...(searchRadiusKm !== undefined ? { searchRadiusKm } : {}),
              ...(pushEnabled !== undefined ? { pushEnabled } : {}),
              ...(telegramNotifications !== undefined ? { telegramNotifications } : {}),
            },
            create: {
              userId,
              preferredLocation: preferredLocation || null,
              searchRadiusKm: searchRadiusKm || 10,
              pushEnabled: pushEnabled !== undefined ? pushEnabled : true,
              telegramNotifications: telegramNotifications !== undefined ? telegramNotifications : true,
            },
          });
        }

        const updated = await findUserWithProfile(userId);
        return res.json({ user: updated }) as any;
      } else {
        const u: any = devDb.users.get(userId);
        if (!u) throw new NotFoundError('Utilisateur non trouvé.');
        if (fullName !== undefined) u.fullName = fullName;
        if (formattedEmail !== undefined) u.email = formattedEmail;
        return res.json({ user: await findUserWithProfile(userId) }) as any;
      }
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictError('Cette adresse e-mail est déjà utilisée par un autre compte.');
      }
      next(err);
    }
  }

  /**
   * POST /api/users/me/phone/change/start
   * Étape 1 : envoie un code de confirmation sur le compte Telegram actuel de l'utilisateur (CONFIRM_SENSITIVE)
   */
  public static async changePhoneStart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundError('Utilisateur non trouvé.');

      if (!user.phoneE164 || !user.telegramChatId) {
        throw new BadRequestError('Aucun compte Telegram n\'est lié à votre compte actuel pour recevoir le code de confirmation.');
      }

      const code = crypto.randomInt(100000, 999999).toString();
      const codeHash = hashString(code);
      const nonce = crypto.randomBytes(16).toString('hex');
      const nonceHash = hashString(nonce);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // TTL 5 min

      const challenge = await prisma.authChallenge.create({
        data: {
          phone: user.phoneE164,
          purpose: ChallengePurpose.CONFIRM_SENSITIVE,
          userId: user.id,
          nonceHash,
          codeHash,
          expiresAt,
          status: ChallengeStatus.PENDING,
        },
      });

      // Publier l'événement pour que le bot Telegram envoie l'OTP
      await eventBus.publish('telegram.send.otp', {
        chatId: user.telegramChatId,
        code,
        expiresAt,
        challengeId: challenge.id,
      }).catch((e) => console.warn('[EventBus] Erreur publish telegram.send.otp:', e.message));

      if (process.env.NODE_ENV === 'development') {
        console.log(`[ChangePhoneDev] 🔑 Code confirmation étape 1 pour ${user.phoneE164}: ${code}`);
      }

      await logAudit({
        userId: user.id,
        action: 'PHONE_CHANGE_INITIATED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
      });

      res.status(200).json({
        challengeId: challenge.id,
        expiresAt: challenge.expiresAt,
        message: 'Un code de confirmation a été envoyé sur votre compte Telegram actuel.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/users/me/phone/change/verify
   * Étape 2 : vérifie le code de l'étape 1, contrôle le nouveau numéro et génère le lien Telegram pour liaison
   */
  public static async changePhoneVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const schema = z.object({
        challengeId: z.string().uuid('Identifiant de défi invalide'),
        code: z.string().length(6, 'Le code doit contenir 6 chiffres'),
        newPhone: z.string().min(8, 'Le nouveau numéro de téléphone est requis'),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      const { challengeId, code, newPhone } = parsed.data;

      const normalizedNewPhone = normalizeToE164(newPhone);
      if (!normalizedNewPhone || !isValidE164Algerian(normalizedNewPhone)) {
        throw new BadRequestError('Nouveau numéro de mobile algérien invalide (+213 5/6/7 xx xx xx).');
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundError('Utilisateur non trouvé.');

      if (user.phoneE164 === normalizedNewPhone) {
        throw new BadRequestError('Le nouveau numéro doit être différent de votre numéro actuel.');
      }

      // Vérifier si le nouveau numéro est déjà pris par un autre utilisateur
      const existingUser = await prisma.user.findUnique({
        where: { phoneE164: normalizedNewPhone },
      });
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError('Ce numéro de téléphone est déjà associé à un autre compte.');
      }

      // Vérifier le défi d'étape 1 (CONFIRM_SENSITIVE)
      const step1Result = await verifyAuthChallenge(challengeId, code);
      if (!step1Result.success) {
        throw new BadRequestError('Code de confirmation invalide ou expiré.');
      }

      // Créer le défi d'étape 2 (CHANGE_PHONE)
      const step2Challenge = await createAuthChallenge(
        normalizedNewPhone,
        ChallengePurpose.CHANGE_PHONE,
        user.id,
        normalizedNewPhone
      );

      res.status(200).json({
        status: 'AWAITING_TELEGRAM_LINK',
        step2ChallengeId: step2Challenge.challengeId,
        deepLink: step2Challenge.deepLink,
        expiresAt: step2Challenge.expiresAt,
        message: 'Code confirmé. Veuillez ouvrir le lien Telegram avec le compte possédant votre nouveau numéro pour finaliser la mise à jour.',
      });
    } catch (err) {
      next(err);
    }
  }

  public static async uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      if (!req.file || !req.file.buffer) {
        throw new BadRequestError('Aucun fichier reçu. Envoyez un fichier dans le champ "avatar".');
      }

      const buffer = req.file.buffer;

      if (!hasImageSignature(buffer, req.file.mimetype)) {
        throw new ApiError(400, 'INVALID_FILE_CONTENT', 'Le contenu du fichier ne correspond pas à une image valide.');
      }

      const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
      const avatarId = crypto.randomBytes(16).toString('hex');
      const newUrl = `/api/users/avatars/${avatarId}${ext}`;

      if (await isPostgresAlive()) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            avatarId,
            avatarUrl: newUrl,
            avatarData: buffer,
            avatarMime: req.file.mimetype,
          },
        });
      } else {
        const u = devDb.users.get(userId) as any;
        if (u) {
          u.avatarId = avatarId;
          u.avatarUrl = newUrl;
          u.avatarData = buffer;
          u.avatarMime = req.file.mimetype;
        }
      }

      res.json({ avatarUrl: newUrl });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      if (await isPostgresAlive()) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            avatarId: null,
            avatarUrl: null,
            avatarData: null,
            avatarMime: null,
          },
        });
      } else {
        const u = devDb.users.get(userId) as any;
        if (u) {
          u.avatarId = null;
          u.avatarUrl = null;
          u.avatarData = null;
          u.avatarMime = null;
        }
      }

      res.json({ message: 'Photo de profil supprimée.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/users/avatars/:filename
   * Sert l'avatar depuis la base de données (BYTEA) via un identifiant aléatoire non devinable (avatarId).
   * Rétrocompatibilité : l'ancienne URL reste servie uniquement tant qu'elle correspond à l'avatar courant du propriétaire.
   */
  public static async getAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { filename } = req.params;
      if (
        !filename ||
        path.basename(filename) !== filename ||
        !/^[a-zA-Z0-9._-]+$/.test(filename)
      ) {
        throw new NotFoundError('Avatar non trouvé');
      }

      const idWithoutExt = filename.replace(/\.[^.]+$/, '');
      const expectedUrl = `/api/users/avatars/${filename}`;

      // 1. Recherche stricte par avatarId aléatoire ou URL courante du propriétaire (jamais par user.id)
      if (await isPostgresAlive()) {
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { avatarId: idWithoutExt },
              { avatarUrl: expectedUrl },
            ],
          },
          select: { avatarData: true, avatarMime: true },
        });

        if (!user) {
          throw new NotFoundError('Avatar non trouvé');
        }

        if (user.avatarData) {
          res.setHeader('Content-Type', user.avatarMime || 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=604800');
          return res.status(200).send(Buffer.from(user.avatarData)) as any;
        }

        // Fallback disque rétrocompatible uniquement si le propriétaire pointe toujours sur cette ancienne URL
        const legacyPath = avatarFilePath(filename);
        if (fs.existsSync(legacyPath)) {
          res.setHeader('Cache-Control', 'public, max-age=604800');
          return res.sendFile(legacyPath);
        }

        throw new NotFoundError('Avatar non trouvé');
      }

      // Fallback devDb
      const matched = Array.from(devDb.users.values()).find(
        (u: any) => u.avatarId === idWithoutExt || u.avatarUrl === expectedUrl
      ) as any;

      if (matched?.avatarData) {
        res.setHeader('Content-Type', matched.avatarMime || 'image/jpeg');
        return res.status(200).send(Buffer.from(matched.avatarData)) as any;
      }

      if (matched) {
        const legacyPath = avatarFilePath(filename);
        if (fs.existsSync(legacyPath)) {
          res.setHeader('Cache-Control', 'public, max-age=604800');
          return res.sendFile(legacyPath);
        }
      }

      throw new NotFoundError('Avatar non trouvé');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Alias de compatibilité pour POST /users/me/switch-mode -> redirige vers AuthController.switchMode
   */
  public static async switchMode(req: Request, res: Response, next: NextFunction): Promise<void> {
    return AuthController.switchMode(req, res, next);
  }
}
