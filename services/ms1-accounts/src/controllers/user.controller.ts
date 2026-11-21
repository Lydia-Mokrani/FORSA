import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import fs from 'fs';
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
import { sendSms, sendTwilioVerification, checkTwilioVerification } from '../services/sms.service';
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
  fullName: z.string().min(2).optional(),
  phone: mobilePhoneSchema.optional(),
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

      if (!user || !user.phone) {
        throw new BadRequestError('Veuillez d\'abord renseigner un numéro de téléphone dans votre profil.');
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

      // Tenter d'envoyer un vrai SMS via Twilio Verify
      const sentViaTwilio = await sendTwilioVerification(user.phone);

      // Générer code 6 chiffres (local ou secours)
      const code = String(Math.floor(Math.random() * 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
      const codeHash = hashOtp(userId, code);
      const expiresAt = new Date(Date.now() + OTP_TTL_MS);

      if (!sentViaTwilio) {
        await sendSms(user.phone, `Votre code FORSA : ${code}\nValable 5 minutes.`);
      }

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
        message: `Code à ${OTP_LENGTH} chiffres envoyé par SMS.`,
        expiresInSeconds: OTP_TTL_MS / 1000,
        resendInSeconds: OTP_RESEND_MS / 1000,
        sentViaTwilio,
        // Afficher en dev pour la soutenance si Twilio n'a pas été utilisé
        ...((config.nodeEnv !== 'production' && !sentViaTwilio) ? { simulatedCode: code } : {}),
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

      // 2. Vérification locale du code
      const expectedHash = hashOtp(userId, code);
      const isValid = isTwilioApproved || crypto.timingSafeEqual(
        Buffer.from(expectedHash, 'hex'),
        Buffer.from(otpRecord.codeHash, 'hex'),
      );

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
}
