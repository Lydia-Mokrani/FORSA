import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import fs from 'fs';
import bcrypt from 'bcrypt';
import {
  ApiError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from '@forsa/common';
import { prisma } from '../config/prisma';
import { devDb, isPostgresAlive } from '../services/dev-db.service';
import { jwtService } from '../services/jwt.service';
import { createSession } from '../services/session.service';
import { issueEmailToken } from '../services/email-token.service';
import { rabbitMQ } from '../services/rabbitmq.service';
import { sendSms, sendTwilioVerification, checkTwilioVerification } from '../services/sms.service';
import { registerPendingTelegramOtp, getTelegramDeepLink, getPendingOtpByUserId } from '../services/telegram.service';
import { mobilePhoneSchema } from '../utils/phone';
import { avatarFilePath, hasImageSignature } from '../middleware/avatar-upload.middleware';
import { config } from '../config/env';

// ─── Constantes OTP ───────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const OTP_TTL_MS = 5 * 60 * 1000;         // 5 minutes
const OTP_RESEND_MS = 60 * 1000;           // 60 secondes entre envois
const OTP_MAX_ATTEMPTS = 5;               // Essais max avant blocage
const OTP_MAX_PER_HOUR = 5;               // Envois max par heure

// ─── Schémas Zod ──────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Le nom doit comporter au moins 2 caractères').optional(),
  email: z.string().email('Format email invalide').optional(),
  phone: mobilePhoneSchema.optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
  newPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Au moins une lettre majuscule requise')
    .regex(/[0-9]/, 'Au moins un chiffre requis'),
});

const verifyPhoneSchema = z.object({
  code: z.string().regex(/^\d{6}$/, `Le code doit contenir exactement ${OTP_LENGTH} chiffres`),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashOtp(userId: string, code: string): string {
  return jwtService.hashToken(`${userId}:${code}`);
}

const profileSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  avatarUrl: true,
  role: true,
  status: true,
  phoneVerified: true,
  emailVerified: true,
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
      status: true,
      logoUrl: true,
    },
  },
};

async function findUserWithProfile(userId: string): Promise<any> {
  if (await isPostgresAlive()) {
    return prisma.user.findUnique({ where: { id: userId }, select: profileSelect });
  }
  const u = devDb.users.get(userId);
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone ?? null,
    avatarUrl: u.avatarUrl ?? null,
    role: u.role,
    status: u.status,
    phoneVerified: u.phoneVerified,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
    shop: null,
  };
}

// ─── UserController ───────────────────────────────────────────────────────────

export class UserController {
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

  public static async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      const data: any = { ...parsed.data };
      // Si le téléphone change, repasser en "non vérifié"
      if (data.phone !== undefined) {
        data.phoneVerified = false;
      }

      // Si l'e-mail change, vérifier unicité et repasser en "non vérifié"
      if (data.email !== undefined) {
        data.email = data.email.toLowerCase().trim();
        const current = await findUserWithProfile(userId);
        if (current && current.email !== data.email) {
          let existingUser: any;
          if (await isPostgresAlive()) {
            existingUser = await prisma.user.findUnique({ where: { email: data.email } });
          } else {
            existingUser = [...devDb.users.values()].find((u) => u.email === data.email);
          }
          if (existingUser && existingUser.id !== userId) {
            throw new ApiError(409, 'EMAIL_CONFLICT', 'Cette adresse e-mail est déjà utilisée par un autre compte.');
          }
          data.emailVerified = false;
          try {
            const { token: verifyToken } = await issueEmailToken(userId, 'VERIFY_EMAIL');
            await rabbitMQ.publish('user.registered', {
              userId,
              email: data.email,
              fullName: data.fullName || current.fullName,
              role: current.role,
              verifyToken,
            }).catch(() => {});
          } catch (_) {}
        }
      }

      try {
        if (await isPostgresAlive()) {
          const updated = await prisma.user.update({
            where: { id: userId },
            data,
            select: profileSelect,
          });
          return res.json({ user: updated }) as any;
        } else {
          const u = devDb.users.get(userId);
          if (!u) throw new NotFoundError('Utilisateur non trouvé.');
          Object.assign(u, data);
          return res.json({ user: await findUserWithProfile(userId) }) as any;
        }
      } catch (err: any) {
        if (err.code === 'P2002') {
          const target = err.meta?.target;
          if (Array.isArray(target) && target.includes('email')) {
            throw new ApiError(409, 'EMAIL_CONFLICT', 'Cette adresse e-mail est déjà utilisée par un autre compte.');
          }
          throw new ApiError(409, 'PHONE_CONFLICT', 'Ce numéro de téléphone est déjà utilisé par un autre compte.');
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  }

  public static async requestPhoneOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      let user: any;
      if (await isPostgresAlive()) {
        user = await prisma.user.findUnique({ where: { id: userId } });
      } else {
        user = devDb.users.get(userId);
      }

      if (!user) throw new NotFoundError('Utilisateur non trouvé.');

      // Permettre de passer `phone` dans le body pour renseigner ou mettre à jour le numéro (ex: compte Google sans téléphone)
      if (req.body?.phone) {
        const parsed = mobilePhoneSchema.safeParse(req.body.phone);
        if (!parsed.success) {
          throw new BadRequestError('Numéro de téléphone incorrect. Il doit comporter 9 chiffres et commencer par 5, 6 ou 7 (ex: 6 61 45 17 40).');
        }
        const cleanedPhone = parsed.data;

        // Vérifier conflit avec un autre compte
        let conflict: any = null;
        if (await isPostgresAlive()) {
          conflict = await prisma.user.findFirst({
            where: { phone: cleanedPhone, id: { not: userId } },
          });
        } else {
          conflict = [...devDb.users.values()].find(
            (u) => u.phone === cleanedPhone && u.id !== userId,
          );
        }
        if (conflict) {
          throw new ApiError(409, 'PHONE_CONFLICT', 'Ce numéro de téléphone est déjà associé à un autre compte.');
        }

        if (user.phone !== cleanedPhone) {
          if (await isPostgresAlive()) {
            user = await prisma.user.update({
              where: { id: userId },
              data: { phone: cleanedPhone, phoneVerified: false },
            });
          } else {
            user.phone = cleanedPhone;
            user.phoneVerified = false;
          }
        }
      }

      if (!user.phone) {
        throw new BadRequestError('Veuillez renseigner un numéro de téléphone.');
      }

      if (user.phoneVerified) {
        throw new ApiError(409, 'PHONE_ALREADY_VERIFIED', 'Votre numéro est déjà vérifié.');
      }

      // Cooldown : vérifier le dernier envoi
      const cooldownCutoff = new Date(Date.now() - OTP_RESEND_MS);
      let recentOtp: any = null;

      if (await isPostgresAlive()) {
        recentOtp = await prisma.phoneOtp.findFirst({
          where: {
            userId,
            used: false,
            createdAt: { gte: cooldownCutoff },
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (recentOtp) {
        const resendInSeconds = Math.ceil(
          (recentOtp.createdAt.getTime() + OTP_RESEND_MS - Date.now()) / 1000,
        );
        throw new ApiError(429, 'OTP_COOLDOWN', `Veuillez attendre ${resendInSeconds} secondes avant de renvoyer le code.`, [
          { resendInSeconds, retryAfter: resendInSeconds },
        ]);
      }

      // Limite horaire
      const hourCutoff = new Date(Date.now() - 60 * 60 * 1000);
      if (await isPostgresAlive()) {
        const hourlyCount = await prisma.phoneOtp.count({
          where: { userId, createdAt: { gte: hourCutoff } },
        });
        if (hourlyCount >= OTP_MAX_PER_HOUR) {
          throw new ApiError(429, 'OTP_TOO_MANY_REQUESTS', 'Trop de codes envoyés. Réessayez dans une heure.');
        }
      }

      // Générer code aléatoire secret 6 chiffres
      const code = String(Math.floor(Math.random() * 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
      const codeHash = hashOtp(userId, code);
      const expiresAt = new Date(Date.now() + OTP_TTL_MS);

      // Enregistrer pour deep link Telegram bot (envoi automatique UNIQUEMENT si ce numéro précis est lié)
      const telegramToken = registerPendingTelegramOtp(userId, code, user.phone, user.fullName);
      const telegramLink = getTelegramDeepLink(telegramToken);

      // 1. Envoi par SMS Twilio si numéro vérifié
      const sentViaTwilio = await sendTwilioVerification(user.phone);

      // 2. Log serveur
      await sendSms(user.phone, `Votre code FORSA : ${code}\nValable 5 minutes.`);

      if (await isPostgresAlive()) {
        await prisma.phoneOtp.create({
          data: { userId, codeHash, expiresAt },
        });
      } else {
        devDb.phoneOtps = devDb.phoneOtps ?? new Map();
        devDb.phoneOtps.set(`${userId}-${Date.now()}`, {
          userId,
          codeHash,
          expiresAt,
          used: false,
          attempts: 0,
          createdAt: new Date(),
        });
      }

      res.json({
        message: `Code à ${OTP_LENGTH} chiffres disponible.`,
        expiresInSeconds: OTP_TTL_MS / 1000,
        resendInSeconds: OTP_RESEND_MS / 1000,
        sentViaTwilio,
        telegramToken,
        telegramLink,
        botUsername: 'forsa_auth_bot',
        phone: user.phone,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getPhoneStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const user = await findUserWithProfile(userId);
      if (!user) throw new NotFoundError('Utilisateur non trouvé.');

      const pending = getPendingOtpByUserId(userId);

      res.json({
        phoneVerified: !!user.phoneVerified,
        telegramMismatch: !!pending?.telegramMismatch,
        mismatchPhone: pending?.mismatchPhone,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async confirmPhoneOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const parsed = verifyPhoneSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError('Format de code OTP invalide.');
      }

      const { code } = parsed.data;

      let otpRecord: any;
      if (await isPostgresAlive()) {
        otpRecord = await prisma.phoneOtp.findFirst({
          where: { userId, used: false },
          orderBy: { createdAt: 'desc' },
        });
      } else {
        const entries = [...(devDb.phoneOtps?.entries() ?? [])];
        otpRecord = entries
          .filter(([, v]) => v.userId === userId && !v.used)
          .sort(([, a], [, b]) => b.createdAt.getTime() - a.createdAt.getTime())
          .map(([k, v]) => ({ ...v, _key: k }))[0];
      }

      if (!otpRecord) {
        throw new ApiError(400, 'OTP_EXPIRED', 'Aucun code en attente. Demandez un nouveau code.');
      }

      if (otpRecord.expiresAt < new Date()) {
        throw new ApiError(400, 'OTP_EXPIRED', 'Votre code a expiré. Demandez un nouveau code.');
      }

      if ((otpRecord.attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
        throw new ApiError(429, 'OTP_TOO_MANY_ATTEMPTS', 'Trop d\'essais incorrects. Demandez un nouveau code.');
      }

      // 1. Tenter la vérification via Twilio Verify si activé
      const user = await findUserWithProfile(userId);
      const isTwilioApproved = user?.phone ? await checkTwilioVerification(user.phone, code) : false;

      // 2. Vérification locale cryptographique stricte du code exact
      const expectedHash = hashOtp(userId, code);
      const isLocalHashValid = crypto.timingSafeEqual(
        Buffer.from(expectedHash, 'hex'),
        Buffer.from(otpRecord.codeHash, 'hex'),
      );

      // Sécurité 100% stricte : seul le code exact généré et envoyé est accepté
      const isValid = isTwilioApproved || isLocalHashValid;

      if (!isValid) {
        // Incrémenter les tentatives
        if (await isPostgresAlive()) {
          await prisma.phoneOtp.update({
            where: { id: otpRecord.id },
            data: { attempts: { increment: 1 } },
          });
        } else if (otpRecord._key) {
          const entry = devDb.phoneOtps?.get(otpRecord._key);
          if (entry) entry.attempts = (entry.attempts ?? 0) + 1;
        }

        const attemptsLeft = OTP_MAX_ATTEMPTS - (otpRecord.attempts + 1);
        throw new ApiError(400, 'OTP_INVALID', `Code incorrect. ${attemptsLeft} essai(s) restant(s).`, [{ attemptsLeft }]);
      }

      // Succès : valider
      if (await isPostgresAlive()) {
        await prisma.$transaction([
          prisma.phoneOtp.update({ where: { id: otpRecord.id }, data: { used: true } }),
          prisma.user.update({ where: { id: userId }, data: { phoneVerified: true } }),
        ]);
      } else {
        if (otpRecord._key) {
          const entry = devDb.phoneOtps?.get(otpRecord._key);
          if (entry) entry.used = true;
        }
        const u = devDb.users.get(userId);
        if (u) u.phoneVerified = true;
      }

      res.json({ message: 'Numéro de téléphone vérifié avec succès.', phoneVerified: true });
    } catch (err) {
      next(err);
    }
  }

  public static async uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      if (!req.file) {
        throw new BadRequestError('Aucun fichier reçu. Envoyez un fichier dans le champ "avatar".');
      }

      const filePath = req.file.path;

      if (!hasImageSignature(filePath, req.file.mimetype)) {
        fs.unlinkSync(filePath);
        throw new ApiError(400, 'INVALID_FILE_CONTENT', 'Le contenu du fichier ne correspond pas à une image valide.');
      }

      const newUrl = `/api/users/avatars/${req.file.filename}`;

      // Supprimer l'ancienne photo
      let oldAvatarUrl: string | null = null;
      if (await isPostgresAlive()) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
        oldAvatarUrl = user?.avatarUrl ?? null;
        await prisma.user.update({ where: { id: userId }, data: { avatarUrl: newUrl } });
      } else {
        const u = devDb.users.get(userId);
        if (u) { oldAvatarUrl = u.avatarUrl ?? null; u.avatarUrl = newUrl; }
      }

      if (oldAvatarUrl) {
        const oldFilename = oldAvatarUrl.split('/').pop();
        if (oldFilename) {
          const oldPath = avatarFilePath(oldFilename);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
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

      let oldAvatarUrl: string | null = null;
      if (await isPostgresAlive()) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
        oldAvatarUrl = user?.avatarUrl ?? null;
        await prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
      } else {
        const u = devDb.users.get(userId);
        if (u) { oldAvatarUrl = u.avatarUrl ?? null; u.avatarUrl = null; }
      }

      if (oldAvatarUrl) {
        const oldFilename = oldAvatarUrl.split('/').pop();
        if (oldFilename) {
          const oldPath = avatarFilePath(oldFilename);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      }

      res.json({ message: 'Photo de profil supprimée.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/users/me/password
   * Modification du mot de passe avec vérification de l'ancien mot de passe et hashage bcrypt.
   */
  public static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      const { currentPassword, newPassword } = parsed.data;

      let user: any;
      if (await isPostgresAlive()) {
        user = await prisma.user.findUnique({ where: { id: userId } });
      } else {
        user = devDb.users.get(userId);
      }

      if (!user) throw new NotFoundError('Utilisateur non trouvé.');

      if (user.passwordHash) {
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
          throw new BadRequestError('Le mot de passe actuel est incorrect.');
        }
      }

      const newHash = await bcrypt.hash(newPassword, 12);

      if (await isPostgresAlive()) {
        await prisma.user.update({
          where: { id: userId },
          data: { passwordHash: newHash },
        });
      } else {
        user.passwordHash = newHash;
      }

      res.json({ message: 'Mot de passe modifié avec succès.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/users/me/switch-mode
   * Bascule dynamique du rôle entre CLIENT et COMMERÇANT et réémission des tokens JWT.
   */
  public static async switchMode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      let user: any;
      if (await isPostgresAlive()) {
        user = await prisma.user.findUnique({ where: { id: userId }, include: { shop: true } });
      } else {
        user = devDb.users.get(userId);
      }

      if (!user) throw new NotFoundError('Utilisateur non trouvé.');

      const newRole = user.role === 'CUSTOMER' ? 'MERCHANT' : 'CUSTOMER';

      if (await isPostgresAlive()) {
        user = await prisma.user.update({
          where: { id: userId },
          data: { role: newRole },
          include: { shop: true },
        });
      } else {
        user.role = newRole;
      }

      const session = await createSession(user);

      res.json({
        message: `Mode basculé en ${newRole === 'MERCHANT' ? 'Commerçant' : 'Client'}.`,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          avatarUrl: user.avatarUrl,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          status: user.status,
          shop: user.shop,
        },
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
    } catch (err) {
      next(err);
    }
  }
}
