import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ApiError,
} from '@forsa/common';
import { prisma } from '../config/prisma';
import { phoneE164Schema, normalizeToE164 } from '../utils/phone';
import {
  createAuthChallenge,
  getChallengeStatus,
  verifyAuthChallenge,
} from '../services/challenge.service';
import {
  createSession,
  rotateRefreshToken,
  revokeRefreshToken,
  listUserSessions,
  revokeSessionById,
} from '../services/session.service';
import { jwtService, TokenPayload } from '../services/jwt.service';
import { logAudit } from '../services/audit.service';
import { Role, ChallengePurpose } from '@prisma/client';

const startSchema = z.object({
  phone: z.string().min(1, 'Le numéro de téléphone est requis'),
});

const verifySchema = z.object({
  challengeId: z.string().uuid('ID de défi invalide'),
  code: z.string().regex(/^\d{6}$/, 'Le code doit contenir exactement 6 chiffres'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token manquant'),
});

const switchModeSchema = z.object({
  mode: z.enum(['customer', 'merchant'], {
    errorMap: () => ({ message: 'Le mode doit être "customer" ou "merchant"' }),
  }),
});

export class AuthController {
  /**
   * POST /auth/telegram/start
   * - Vérifie et normalise le numéro en E.164
   * - Crée un AuthChallenge (nonce 128 bits haché, TTL 10 min)
   * - Réponse identique si le numéro existe ou non (anti-énumération)
   */
  public static async telegramStart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = startSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      const phone = normalizeToE164(parsed.data.phone);

      const challenge = await createAuthChallenge(phone, ChallengePurpose.LOGIN);

      res.status(200).json({
        challengeId: challenge.challengeId,
        deepLink: challenge.deepLink,
        expiresAt: challenge.expiresAt,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /auth/telegram/challenges/:id
   * - Retourne uniquement le statut et l'indicateur codeSent
   */
  public static async telegramChallengeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challengeId = req.params.id;
      const status = await getChallengeStatus(challengeId);

      res.status(200).json(status);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /auth/telegram/verify
   * - Vérifie le code à 6 chiffres haché
   * - Charge ou crée l'utilisateur avec ses préférences
   * - Renvoie JWT RS256 (15 min) + Refresh token (7 jours)
   */
  public static async telegramVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = verifySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      const { challengeId, code } = parsed.data;

      // 1. Vérification du défi
      let verificationResult;
      try {
        verificationResult = await verifyAuthChallenge(challengeId, code);
      } catch (err: any) {
        await logAudit({
          action: 'AUTH_VERIFY_FAILED',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: { challengeId, error: err.message },
        });
        throw err;
      }

      const challenge = verificationResult.challenge;
      const phoneE164 = challenge.phone;

      // 2. Recherche ou création de l'utilisateur
      let user = await prisma.user.findUnique({
        where: { phoneE164 },
        include: { shop: true, preferences: true },
      });

      let isNewUser = false;

      if (user) {
        // Réactivation si désactivé (spec §7)
        if (user.status === 'DEACTIVATED') {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { status: 'ACTIVE' },
            include: { shop: true, preferences: true },
          });
        } else if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
          throw new ForbiddenError('Ce compte a été suspendu ou supprimé.');
        }
      } else {
        isNewUser = true;
        // Création du compte utilisateur avec rôle CUSTOMER par défaut
        user = await prisma.user.create({
          data: {
            phoneE164,
            roles: [Role.CUSTOMER],
            activeMode: 'customer',
            status: 'ACTIVE',
            preferences: {
              create: {
                searchRadiusKm: 10,
                pushEnabled: true,
                telegramNotifications: true,
              },
            },
          },
          include: { shop: true, preferences: true },
        });
      }

      // 3. Création de la session (JWT RS256 15min + Refresh 7d)
      const session = await createSession(user, req);

      // 4. Audit log
      await logAudit({
        userId: user.id,
        action: isNewUser ? 'AUTH_REGISTER' : 'AUTH_LOGIN',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { phone: phoneE164, method: 'telegram_otp' },
      });

      res.status(200).json({
        user: {
          id: user.id,
          phone: user.phoneE164,
          phoneE164: user.phoneE164,
          roles: user.roles,
          activeMode: user.activeMode,
          status: user.status,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          shop: user.shop,
          preferences: user.preferences,
        },
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresIn: session.expiresIn,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /auth/refresh
   * - Rotation du refresh token
   * - Détection et blocage en cas de rejeu
   */
  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = refreshSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError('Refresh token manquant ou invalide.');
      }

      const result = await rotateRefreshToken(parsed.data.refreshToken, req);

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /auth/logout
   * - Révocation du refresh token
   */
  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.body?.refreshToken;
      if (rawRefreshToken) {
        await revokeRefreshToken(rawRefreshToken);
      }

      if (req.user?.sub) {
        await logAudit({
          userId: req.user.sub,
          action: 'AUTH_LOGOUT',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }

      res.status(200).json({
        success: true,
        message: 'Déconnexion réussie.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /auth/sessions
   * - Liste les sessions actives de l'utilisateur
   */
  public static async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw new UnauthorizedError();
      }

      const sessions = await listUserSessions(userId);
      res.status(200).json({ sessions });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /auth/sessions/:id
   * - Révocation d'une session spécifique
   */
  public static async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw new UnauthorizedError();
      }

      const sessionId = req.params.id;
      const revoked = await revokeSessionById(userId, sessionId);

      if (!revoked) {
        throw new NotFoundError('Session introuvable ou déjà révoquée.');
      }

      await logAudit({
        userId,
        action: 'SESSION_REVOKED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { sessionId },
      });

      res.status(200).json({ success: true, message: 'Session révoquée avec succès.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /auth/switch-mode (et alias /users/me/switch-mode)
   * - Refusé si mode commerçant demandé alors que l'utilisateur n'a pas le rôle MERCHANT
   *   ou que la boutique n'est pas APPROVED (spec §7)
   */
  public static async switchMode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw new UnauthorizedError();
      }

      const parsed = switchModeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      const targetMode = parsed.data.mode;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { shop: true },
      });

      if (!user) {
        throw new UnauthorizedError('Utilisateur introuvable.');
      }

      if (targetMode === 'merchant') {
        const hasMerchantRole = user.roles.includes(Role.MERCHANT);
        const isShopApproved = user.shop?.verificationStatus === 'APPROVED';

        if (!hasMerchantRole || !isShopApproved) {
          throw new ForbiddenError(
            'Passage en mode commerçant non autorisé : votre compte doit disposer du rôle commerçant et d\'une boutique approuvée.'
          );
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { activeMode: targetMode },
        include: { shop: true },
      });

      // Émission d'un nouveau JWT avec le mode mis à jour
      const shopStatus = updatedUser.shop?.verificationStatus ?? null;
      const tokenPayload: TokenPayload = {
        sub: updatedUser.id,
        roles: updatedUser.roles,
        mode: updatedUser.activeMode,
        shopStatus,
        role: updatedUser.roles[0] || 'CUSTOMER',
        email: updatedUser.email,
        phone: updatedUser.phoneE164,
        fullName: updatedUser.fullName,
        shopId: updatedUser.shop?.id ?? null,
        merchantId: updatedUser.activeMode === 'merchant' ? updatedUser.id : null,
      };

      const accessToken = jwtService.generateAccessToken(tokenPayload);

      await logAudit({
        userId,
        action: 'SWITCH_MODE',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { newMode: targetMode },
      });

      res.status(200).json({
        success: true,
        activeMode: targetMode,
        accessToken,
      });
    } catch (err) {
      next(err);
    }
  }
}
