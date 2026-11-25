import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ApiError,
} from '@forsa/common';
import { prisma } from '../config/prisma';
import { eventBus } from '../services/event-bus';
import { phoneE164Schema, normalizeToE164 } from '../utils/phone';
import {
  createAuthChallenge,
  getChallengeStatus,
  verifyAuthChallenge,
  hashString,
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
import { RecoveryService } from '../services/recovery.service';
import { EmailVerificationService } from '../services/email-verification.service';
import { Role, ChallengePurpose } from '@prisma/client';

const startSchema = z.object({
  phone: z.string().min(1, 'Le numéro de téléphone est requis'),
});

const verifySchema = z.object({
  challengeId: z.string().uuid('ID de défi invalide'),
  code: z.string().regex(/^\d{6}$/, 'Le code doit contenir exactement 6 chiffres'),
  role: z.enum(['CUSTOMER', 'MERCHANT']).optional(),
  email: z.string().email('Format email invalide').optional(),
});

const emailVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Le code doit contenir exactement 6 chiffres'),
});

const recoveryStartSchema = z.object({
  email: z.string().email('Format email invalide'),
});

const recoveryVerifySchema = z.object({
  email: z.string().email('Format email invalide'),
  code: z.string().regex(/^\d{6}$/, 'Le code doit contenir exactement 6 chiffres'),
});

const rebindPhoneStartSchema = z.object({
  recoveryToken: z.string().min(1, 'Token de récupération manquant'),
  newPhone: z.string().min(1, 'Nouveau numéro requis'),
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
   * - Vérification de la disponibilité du broker (fail-fast synchrone 503 BROKER_UNAVAILABLE)
   * - Crée un AuthChallenge (nonce 128 bits haché, TTL 10 min)
   * - Publie telegram.challenge.created sur le bus d'événements
   * - Si returning user avec telegramChatId : émet l'OTP via telegram.send.otp
   * - Réponse identique si le numéro existe ou non (anti-énumération)
   */
  public static async telegramStart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = startSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      const phone = normalizeToE164(parsed.data.phone);
      if (!phone) {
        throw new BadRequestError('Numéro de téléphone mobile algérien invalide (+213 5/6/7 xx xx xx).');
      }

      // 1. Fail-fast si le broker est déconnecté
      if (typeof eventBus.isBrokerUp === 'function' && !eventBus.isBrokerUp()) {
        res.status(503).json({
          error: 'BROKER_UNAVAILABLE',
          message: 'Le service de messagerie (broker) est indisponible.',
        });
        return;
      }

      const challenge = await createAuthChallenge(phone, ChallengePurpose.LOGIN);

      try {
        // 2. Publication du défi créé à destination de MS5 (condensat SHA-256 uniquement, jamais le nonce brut)
        await eventBus.publish('telegram.challenge.created', {
          challengeId: challenge.challengeId,
          nonceHash: challenge.nonceHash,
          phone,
          expiresAt: challenge.expiresAt,
        });

        // 3. Si l'utilisateur possède déjà un telegramChatId, générer et envoyer l'OTP directement
        const user = await prisma.user.findUnique({ where: { phoneE164: phone } });
        if (user?.telegramChatId) {
          const code = crypto.randomInt(100000, 999999).toString();
          const codeHash = hashString(code);
          const codeExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

          await prisma.authChallenge.update({
            where: { id: challenge.challengeId },
            data: { codeHash, expiresAt: codeExpiresAt },
          });

          await eventBus.publish('telegram.send.otp', {
            chatId: user.telegramChatId,
            code,
            expiresAt: codeExpiresAt,
            challengeId: challenge.challengeId,
          });
        }
      } catch (busErr: any) {
        if (busErr?.message?.includes('BROKER_UNAVAILABLE')) {
          res.status(503).json({
            error: 'BROKER_UNAVAILABLE',
            message: 'Le service de messagerie (broker) est indisponible.',
          });
          return;
        }
        throw busErr;
      }

      res.status(200).json({
        challengeId: challenge.challengeId,
        deepLink: challenge.deepLink,
        expiresAt: challenge.expiresAt,
      });
    } catch (err: any) {
      if (err?.message?.includes('BROKER_UNAVAILABLE')) {
        res.status(503).json({
          error: 'BROKER_UNAVAILABLE',
          message: 'Le service de messagerie (broker) est indisponible.',
        });
        return;
      }
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
      if (!phoneE164) {
        throw new BadRequestError('Numéro de téléphone manquant pour ce défi.');
      }

      // Cas spécial : Récupération de compte (RECOVER_PHONE)
      if (challenge.purpose === ChallengePurpose.RECOVER_PHONE && challenge.userId) {
        const recoveryRes = await RecoveryService.completePhoneRecovery(
          challenge.userId,
          phoneE164,
          (req.headers['x-telegram-user-id'] as string) || undefined,
          (req.headers['x-telegram-chat-id'] as string) || undefined
        );

        return res.status(200).json({
          success: true,
          message: 'Numéro de téléphone récupéré avec succès.',
          isMerchantDelay: recoveryRes.isMerchantDelay,
          pendingPhoneActivateAt: recoveryRes.pendingPhoneActivateAt,
        }) as any;
      }

      // 2. Recherche ou création de l'utilisateur
      let user = await prisma.user.findUnique({
        where: { phoneE164 },
        include: { shop: true, preferences: true },
      });

      // Vérification d'unicité de l'email si fourni
      let normalizedEmail: string | null = null;
      if (parsed.data.email) {
        normalizedEmail = parsed.data.email.toLowerCase().trim();
        const conflict = await prisma.user.findFirst({
          where: {
            email: { equals: normalizedEmail, mode: 'insensitive' },
            id: user ? { not: user.id } : undefined,
          },
        });
        if (conflict) {
          const conflictErr = new ConflictError('Cette adresse e-mail est déjà utilisée par un autre compte.');
          (conflictErr as any).code = 'EMAIL_ALREADY_USED';
          throw conflictErr;
        }
      }

      let isNewUser = false;

      const requestedRole = parsed.data.role === 'MERCHANT' ? Role.MERCHANT : Role.CUSTOMER;

      if (user) {
        // Activation check pour pendingPhone
        await RecoveryService.checkAndApplyPendingPhone(user.id);

        if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
          throw new ForbiddenError('Ce compte a été suspendu ou supprimé.');
        }

        const targetMode = requestedRole === Role.MERCHANT && user.roles.includes(Role.MERCHANT) ? 'merchant' : 'customer';
        const updateData: any = {};
        if (user.status === 'DEACTIVATED') {
          updateData.status = 'ACTIVE';
        }
        if (user.activeMode !== targetMode) {
          updateData.activeMode = targetMode;
        }
        if (normalizedEmail && normalizedEmail !== user.email) {
          updateData.email = normalizedEmail;
          updateData.emailVerifiedAt = null;
        }

        if (Object.keys(updateData).length > 0) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
            include: { shop: true, preferences: true },
          });
          if (updateData.email) {
            await EmailVerificationService.initiateEmailVerification(user.id, normalizedEmail!);
          }
        }
      } else {
        isNewUser = true;
        const initialRoles = requestedRole === Role.MERCHANT ? [Role.CUSTOMER, Role.MERCHANT] : [Role.CUSTOMER];
        const initialMode = requestedRole === Role.MERCHANT ? 'merchant' : 'customer';

        // Création du compte utilisateur
        user = await prisma.user.create({
          data: {
            phoneE164,
            email: normalizedEmail,
            emailVerifiedAt: null,
            roles: initialRoles,
            activeMode: initialMode,
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

        if (normalizedEmail) {
          await EmailVerificationService.initiateEmailVerification(user.id, normalizedEmail);
        }
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
          emailVerified: Boolean(user.emailVerifiedAt),
          email_verified: Boolean(user.emailVerifiedAt),
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
        emailVerified: Boolean(updatedUser.emailVerifiedAt),
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

  /**
   * POST /auth/email/verify
   * Valide le code à 6 chiffres envoyé par e-mail et enregistre email_verified_at.
   */
  public static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const parsed = emailVerifySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      await EmailVerificationService.verifyEmail(userId, parsed.data.code);

      res.status(200).json({
        success: true,
        message: 'Adresse e-mail vérifiée avec succès.',
        emailVerified: true,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /auth/email/resend
   * Renvoi d'un nouveau code de vérification d'e-mail (max 3 par heure).
   */
  public static async resendEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      await EmailVerificationService.resendVerification(userId);

      res.status(200).json({
        success: true,
        message: 'Code de vérification renvoyé avec succès.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /auth/recovery/start
   * Démarre la récupération du compte par e-mail avec anti-énumération (202 Accepted).
   */
  public static async recoveryStart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = recoveryStartSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      const result = await RecoveryService.startRecovery(parsed.data.email);
      res.status(202).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /auth/recovery/verify
   * Vérifie le code de récupération et émet un recoveryToken temporaire (15 min).
   */
  public static async recoveryVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = recoveryVerifySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      const result = await RecoveryService.verifyRecovery(parsed.data.email, parsed.data.code);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /auth/recovery/rebind-phone/start
   * Vérifie le recoveryToken et initie le défi Telegram pour lier le nouveau numéro.
   */
  public static async recoveryRebindPhoneStart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = rebindPhoneStartSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      const result = await RecoveryService.startRebindPhone(
        parsed.data.recoveryToken,
        parsed.data.newPhone
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
