import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
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
import { normalizeToE164, isValidE164Algerian } from '../utils/phone';
import { avatarFilePath, hasImageSignature } from '../middleware/avatar-upload.middleware';
import { AuthController } from './auth.controller';
import { logAudit } from '../services/audit.service';

// ─── Schémas Zod ──────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Le nom doit comporter au moins 2 caractères').optional(),
  email: z.union([z.string().email('Format email invalide'), z.literal(''), z.null()]).optional(),
  preferredLocation: z.string().nullable().optional(),
  searchRadiusKm: z.number().int().min(1).max(500).optional(),
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
    },
  },
  preferences: {
    select: {
      preferredLocation: true,
      searchRadiusKm: true,
      language: true,
      notificationsEnabled: true,
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
          ...pUser,
          // Compatibilité avec le front existant
          phone: pUser.phoneE164,
          role: pUser.activeMode === 'merchant' ? 'MERCHANT' : 'CUSTOMER',
          phoneVerified: true,
          emailVerified: !!pUser.email,
        };
      }
    } catch {
      // fallback
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
    roles: u.roles || [u.role || 'CLIENT'],
    activeMode: u.activeMode || (u.role === 'MERCHANT' ? 'merchant' : 'client'),
    role: u.role || 'CUSTOMER',
    status: u.status || 'ACTIVE',
    phoneVerified: true,
    emailVerified: !!u.email,
    createdAt: u.createdAt || new Date(),
    shop: null,
    preferences: {
      preferredLocation: null,
      searchRadiusKm: 10,
      language: 'fr',
      notificationsEnabled: true,
    },
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

      const current = await findUserWithProfile(userId);
      if (!current) throw new NotFoundError('Utilisateur non trouvé.');

      const { fullName, email, preferredLocation, searchRadiusKm } = parsed.data;

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

        if (preferredLocation !== undefined || searchRadiusKm !== undefined) {
          await prisma.userPreferences.upsert({
            where: { userId },
            update: {
              ...(preferredLocation !== undefined ? { preferredLocation } : {}),
              ...(searchRadiusKm !== undefined ? { searchRadiusKm } : {}),
            },
            create: {
              userId,
              preferredLocation: preferredLocation || null,
              searchRadiusKm: searchRadiusKm || 10,
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

      let oldAvatarUrl: string | null = null;
      if (await isPostgresAlive()) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
        oldAvatarUrl = user?.avatarUrl ?? null;
        await prisma.user.update({ where: { id: userId }, data: { avatarUrl: newUrl } });
      } else {
        const u = devDb.users.get(userId);
        if (u) {
          oldAvatarUrl = u.avatarUrl ?? null;
          u.avatarUrl = newUrl;
        }
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
        if (u) {
          oldAvatarUrl = u.avatarUrl ?? null;
          u.avatarUrl = null;
        }
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
   * Alias de compatibilité pour POST /users/me/switch-mode -> redirige vers AuthController.switchMode
   */
  public static async switchMode(req: Request, res: Response, next: NextFunction): Promise<void> {
    return AuthController.switchMode(req, res, next);
  }
}
