import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { devDb, isPostgresAlive } from '../services/dev-db.service';
import { issueEmailToken, isInCooldown, consumeEmailToken } from '../services/email-token.service';
import { rabbitMQ } from '../services/rabbitmq.service';
import {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from '@forsa/common';

// ─── Schémas Zod ──────────────────────────────────────────────────────────────

const verifyEmailSchema = z.object({
  token: z.string().min(32, 'Token invalide'),
});

const resendSchema = z.object({
  email: z.string().email('Format email invalide'),
});

const forgotSchema = z.object({
  email: z.string().email('Format email invalide'),
});

const resetSchema = z.object({
  token: z.string().min(32, 'Token invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

// ─── AccountController ────────────────────────────────────────────────────────

export class AccountController {
  /**
   * POST /api/auth/verify-email
   * Vérifie l'adresse e-mail via le token reçu dans l'email de bienvenue.
   */
  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = verifyEmailSchema.parse(req.body);

      let userId: string;
      try {
        const result = await consumeEmailToken(token);
        if (result.type !== 'VERIFY_EMAIL') {
          throw new ApiError(400, 'TOKEN_INVALID', 'Ce lien n\'est pas un lien de vérification d\'e-mail');
        }
        userId = result.userId;
      } catch (err: any) {
        if (err.message === 'TOKEN_NOT_FOUND' || err.message === 'TOKEN_ALREADY_USED') {
          throw new ApiError(400, 'TOKEN_INVALID', 'Ce lien est invalide ou a déjà été utilisé');
        }
        if (err.message === 'TOKEN_EXPIRED') {
          throw new ApiError(400, 'TOKEN_EXPIRED', 'Ce lien a expiré. Demandez un nouveau lien.');
        }
        throw err;
      }

      if (await isPostgresAlive()) {
        await prisma.user.update({
          where: { id: userId },
          data: { emailVerified: true },
        });
      } else {
        const user = devDb.users.get(userId);
        if (user) user.emailVerified = true;
      }

      res.json({ message: 'Adresse e-mail vérifiée avec succès.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/resend-verification
   * Renvoie un e-mail de vérification (avec cooldown 60s).
   */
  static async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = resendSchema.parse(req.body);

      // Réponse générique (ne révèle pas si l'adresse existe)
      const genericResponse = {
        message: 'Si cette adresse est enregistrée et non vérifiée, un nouveau lien vous sera envoyé.',
      };

      let user: any;
      if (await isPostgresAlive()) {
        user = await prisma.user.findUnique({ where: { email } });
      } else {
        user = [...devDb.users.values()].find((u) => u.email === email);
      }

      if (!user || user.emailVerified) {
        return res.json(genericResponse);
      }

      if (await isInCooldown(user.id, 'VERIFY_EMAIL')) {
        return res.json(genericResponse);
      }

      const { token: verificationToken } = await issueEmailToken(user.id, 'VERIFY_EMAIL');
      const verificationLink = `http://localhost:5173/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
      console.log(`[MS1-Accounts] ✉️ Lien de vérification envoyé à ${user.email} : ${verificationLink}`);

      await rabbitMQ.publish('user.registered', {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        verificationToken,
        verificationLink,
      });

      res.json(genericResponse);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Envoie un lien de réinitialisation de mot de passe.
   */
  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = forgotSchema.parse(req.body);

      const genericResponse = {
        message: 'Si cette adresse est enregistrée, un lien de réinitialisation vous sera envoyé.',
      };

      let user: any;
      if (await isPostgresAlive()) {
        user = await prisma.user.findUnique({ where: { email } });
      } else {
        user = [...devDb.users.values()].find((u) => u.email === email);
      }

      if (!user) return res.json(genericResponse);

      if (await isInCooldown(user.id, 'RESET_PASSWORD')) {
        return res.json(genericResponse);
      }

      const { token: resetToken } = await issueEmailToken(user.id, 'RESET_PASSWORD');
      const resetLink = `http://localhost:5173/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
      console.log(`[MS1-Accounts] 🔑 Lien de réinitialisation pour ${user.email} : ${resetLink}`);

      await rabbitMQ.publish('password.reset_requested', {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        resetToken,
        resetLink,
      });

      res.json(genericResponse);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/reset-password
   * Réinitialise le mot de passe via le token reçu par email.
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = resetSchema.parse(req.body);

      let userId: string;
      try {
        const result = await consumeEmailToken(token);
        if (result.type !== 'RESET_PASSWORD') {
          throw new ApiError(400, 'TOKEN_INVALID', 'Lien invalide');
        }
        userId = result.userId;
      } catch (err: any) {
        if (err.message === 'TOKEN_NOT_FOUND' || err.message === 'TOKEN_ALREADY_USED') {
          throw new ApiError(400, 'TOKEN_INVALID', 'Ce lien est invalide ou a déjà été utilisé');
        }
        if (err.message === 'TOKEN_EXPIRED') {
          throw new ApiError(400, 'TOKEN_EXPIRED', 'Ce lien a expiré. Demandez un nouveau lien.');
        }
        throw err;
      }

      const passwordHash = await bcrypt.hash(password, 12);

      if (await isPostgresAlive()) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
          }),
          prisma.refreshToken.updateMany({
            where: { userId, revoked: false },
            data: { revoked: true },
          }),
        ]);
      } else {
        const user = devDb.users.get(userId);
        if (user) user.passwordHash = passwordHash;
        for (const [, rt] of devDb.refreshTokens) {
          if (rt.userId === userId) rt.revoked = true;
        }
      }

      res.json({ message: 'Mot de passe réinitialisé avec succès.' });
    } catch (err) {
      next(err);
    }
  }
}
