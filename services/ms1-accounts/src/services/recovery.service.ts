import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { config } from '../config/env';
import { eventBus } from './event-bus';
import { logAudit } from './audit.service';
import { createAuthChallenge, hashString, CreatedChallenge } from './challenge.service';
import { normalizeToE164, isValidE164Algerian } from '../utils/phone';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  RateLimitError,
  ApiError,
} from '@forsa/common';
import { ChallengePurpose, ChallengeStatus } from '@prisma/client';

export interface RecoveryStartResult {
  message: string;
}

export interface RebindPhoneStartResult {
  challengeId: string;
  deepLink: string;
  expiresAt: Date;
}

export class RecoveryService {
  /**
   * POST /auth/recovery/start { email }
   * Anti-énumération : même réponse 202 synchrone qu'un compte existe ou non.
   * Limite DB : max 3 par 24h par email (connu ou inconnu via recovery_attempts).
   * Traitement asynchrone (setImmediate) pour éviter les attaques temporelles.
   */
  public static async startRecovery(email: string, locale: string = 'fr'): Promise<RecoveryStartResult> {
    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = hashString(normalizedEmail);

    // 1. Limite en base de données : max 3 par 24h par email (sur recovery_attempts)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentRequests = await prisma.recoveryAttempt.count({
      where: {
        emailHash,
        createdAt: { gte: oneDayAgo },
      },
    });

    if (recentRequests >= 3) {
      throw new RateLimitError(
        'Trop de demandes de récupération pour cette adresse e-mail. Veuillez réessayer dans 24 heures.'
      );
    }

    // Enregistrer la tentative pour cet email (connu ou inconnu)
    await prisma.recoveryAttempt.create({
      data: { emailHash },
    });

    // 2. Traitement asynchrone pour anti-énumération parfaite
    setImmediate(async () => {
      try {
        const user = await prisma.user.findFirst({
          where: {
            email: { equals: normalizedEmail, mode: 'insensitive' },
            status: 'ACTIVE',
            emailVerifiedAt: { not: null },
          },
        });

        if (user) {
          // Invalider les défis précédents non validés
          await prisma.authChallenge.updateMany({
            where: {
              emailHash,
              purpose: ChallengePurpose.RECOVER_PHONE,
              status: ChallengeStatus.PENDING,
            },
            data: { status: ChallengeStatus.EXPIRED },
          });

          // Générer code à 6 chiffres
          const code = crypto.randomInt(100000, 1000000).toString();
          const codeHash = hashString(code);
          const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min TTL

          await prisma.authChallenge.create({
            data: {
              userId: user.id,
              email: normalizedEmail,
              emailHash,
              purpose: ChallengePurpose.RECOVER_PHONE,
              codeHash,
              expiresAt,
              status: ChallengeStatus.PENDING,
              attempts: 0,
              maxAttempts: 5,
            },
          });

          // Publier l'événement email.send
          await eventBus.publish('email.send', {
            eventId: `evt-recovery-${Date.now()}-${user.id}`,
            to: normalizedEmail,
            template: 'recovery',
            locale,
            data: { code },
            code,
          });

          await logAudit({
            userId: user.id,
            action: 'PHONE_RECOVERY_STARTED',
            metadata: { method: 'email' },
          });
        }
      } catch (err: any) {
        console.error('[RecoveryService] Erreur lors du traitement asynchrone de récupération:', err.message);
      }
    });

    return {
      message: 'Si un compte actif existe avec cet e-mail, un code de récupération a été envoyé.',
    };
  }

  /**
   * POST /auth/recovery/verify { email, code }
   * Vérifie le code à 6 chiffres. Émet un recoveryToken temporaire (15 min) à usage unique.
   */
  public static async verifyRecovery(email: string, code: string): Promise<{ recoveryToken: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = hashString(normalizedEmail);

    const challenge = await prisma.authChallenge.findFirst({
      where: {
        emailHash,
        purpose: ChallengePurpose.RECOVER_PHONE,
        status: ChallengeStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge || challenge.expiresAt <= new Date()) {
      if (challenge) {
        await prisma.authChallenge.update({
          where: { id: challenge.id },
          data: { status: ChallengeStatus.EXPIRED },
        });
      }
      throw new BadRequestError('Code de récupération invalide ou expiré.');
    }

    if (challenge.attempts >= (challenge.maxAttempts || 5)) {
      await prisma.authChallenge.update({
        where: { id: challenge.id },
        data: { status: ChallengeStatus.FAILED },
      });
      throw new BadRequestError('Nombre maximal de tentatives dépassé. Veuillez refaire une demande.');
    }

    const hashedCode = hashString(code);
    if (hashedCode !== challenge.codeHash) {
      await prisma.authChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      const attemptsLeft = (challenge.maxAttempts || 5) - (challenge.attempts + 1);
      throw new BadRequestError(`Code de récupération incorrect. Tentatives restantes : ${attemptsLeft}`);
    }

    if (!challenge.userId) {
      throw new BadRequestError('Défi de récupération orphelin.');
    }

    // Générer un recovery token sécurisé à usage unique (TTL 15 min)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashString(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.$transaction([
      prisma.authChallenge.update({
        where: { id: challenge.id },
        data: { status: ChallengeStatus.VERIFIED },
      }),
      prisma.recoveryToken.create({
        data: {
          tokenHash,
          userId: challenge.userId,
          email: normalizedEmail,
          scope: 'phone_recovery',
          expiresAt,
        },
      }),
    ]);

    await logAudit({
      userId: challenge.userId,
      action: 'PHONE_RECOVERY_CODE_VERIFIED',
      metadata: { method: 'email' },
    });

    return { recoveryToken: rawToken };
  }

  /**
   * POST /auth/recovery/rebind-phone/start { recoveryToken, newPhone }
   * Valide le recoveryToken et initie le défi Telegram pour lier le nouveau numéro.
   */
  public static async startRebindPhone(
    recoveryToken: string,
    newPhone: string
  ): Promise<RebindPhoneStartResult> {
    const tokenHash = hashString(recoveryToken);

    const tokenRecord = await prisma.recoveryToken.findUnique({
      where: { tokenHash },
    });

    if (!tokenRecord || tokenRecord.usedAt !== null || tokenRecord.expiresAt <= new Date()) {
      throw new UnauthorizedError('Token de récupération invalide ou expiré.');
    }

    const normalizedPhone = normalizeToE164(newPhone);
    if (!normalizedPhone || !isValidE164Algerian(normalizedPhone)) {
      throw new BadRequestError(
        'Numéro de téléphone invalide. Les numéros algériens (+213 5/6/7) sont requis.'
      );
    }

    // Vérifier si le numéro est déjà utilisé par un autre compte actif
    const existing = await prisma.user.findUnique({
      where: { phoneE164: normalizedPhone },
    });

    if (existing && existing.id !== tokenRecord.userId) {
      const conflictErr = new ConflictError('Ce numéro de téléphone est déjà associé à un autre compte.');
      (conflictErr as any).code = 'PHONE_ALREADY_IN_USE';
      throw conflictErr;
    }

    // Fail-fast si le broker est indisponible
    if (typeof eventBus.isBrokerUp === 'function' && !eventBus.isBrokerUp()) {
      throw new ApiError(503, 'BROKER_UNAVAILABLE', 'Le service de messagerie (broker) est indisponible.');
    }

    // Créer le défi Telegram associé à la récupération
    const challenge: CreatedChallenge = await createAuthChallenge(
      normalizedPhone,
      ChallengePurpose.RECOVER_PHONE,
      tokenRecord.userId
    );

    // GATE RULE & 5B-2 Fix: Le bus transmet nonceHash, jamais le nonce brut !
    await eventBus.publish('telegram.challenge.created', {
      challengeId: challenge.challengeId,
      nonceHash: challenge.nonceHash,
      phone: normalizedPhone,
      expiresAt: challenge.expiresAt,
    });

    return {
      challengeId: challenge.challengeId,
      deepLink: challenge.deepLink,
      expiresAt: challenge.expiresAt,
    };
  }

  /**
   * Finalise la récupération du numéro (appelé via telegram.contact.received ou telegramVerify)
   */
  public static async completePhoneRecovery(
    userId: string,
    newPhone: string,
    telegramUserId?: string,
    telegramChatId?: string
  ): Promise<{ success: boolean; isMerchantDelay: boolean; pendingPhoneActivateAt?: Date | null }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { shop: true },
    });

    if (!user) {
      throw new NotFoundError('Utilisateur introuvable pour la récupération.');
    }

    const isApprovedMerchant =
      user.roles.includes('MERCHANT') &&
      user.shop?.verificationStatus === 'APPROVED' &&
      config.recoveryMerchantDelayHours > 0;

    let pendingActivateAt: Date | null = null;

    if (isApprovedMerchant) {
      pendingActivateAt = new Date(Date.now() + config.recoveryMerchantDelayHours * 3600 * 1000);

      await prisma.user.update({
        where: { id: userId },
        data: {
          pendingPhone: newPhone,
          pendingPhoneActivateAt: pendingActivateAt,
        },
      });

      if (user.email) {
        await eventBus.publish('email.send', {
          eventId: `evt-recovery-pending-${Date.now()}-${userId}`,
          to: user.email,
          template: 'phone-change-pending',
          delayHours: config.recoveryMerchantDelayHours,
          data: { delayHours: config.recoveryMerchantDelayHours },
        });
      }
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneE164: newPhone,
          telegramUserId: telegramUserId ? String(telegramUserId) : user.telegramUserId,
          telegramChatId: telegramChatId ? String(telegramChatId) : user.telegramChatId,
          telegramBlocked: false,
        },
      });

      if (user.email) {
        await eventBus.publish('email.send', {
          eventId: `evt-recovery-complete-${Date.now()}-${userId}`,
          to: user.email,
          template: 'phone-changed',
          data: {},
        });
      }
    }

    // Révocation de toutes les sessions actives existantes
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });

    // Consommer le recoveryToken
    await prisma.recoveryToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Journal d'audit
    await logAudit({
      userId,
      action: 'PHONE_RECOVERED',
      metadata: {
        newPhone,
        isMerchantDelay: isApprovedMerchant,
        pendingActivateAt: pendingActivateAt ? pendingActivateAt.toISOString() : null,
      },
    });

    return {
      success: true,
      isMerchantDelay: isApprovedMerchant,
      pendingPhoneActivateAt: pendingActivateAt,
    };
  }

  /**
   * Vérifie et active le numéro en attente si le délai est écoulé (appelé au login et dans GET /users/me).
   */
  public static async checkAndApplyPendingPhone(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        pendingPhone: true,
        pendingPhoneActivateAt: true,
      },
    });

    if (
      user &&
      user.pendingPhone &&
      user.pendingPhoneActivateAt &&
      new Date() >= user.pendingPhoneActivateAt
    ) {
      const activatedPhone = user.pendingPhone;

      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneE164: activatedPhone,
          pendingPhone: null,
          pendingPhoneActivateAt: null,
        },
      });

      await logAudit({
        userId,
        action: 'PHONE_CHANGE_ACTIVATED',
        metadata: { activatedPhone },
      });

      if (user.email) {
        await eventBus.publish('email.send', {
          eventId: `evt-phone-activated-${Date.now()}-${userId}`,
          to: user.email,
          template: 'phone-changed',
          data: {},
        });
      }

      return true;
    }

    return false;
  }
}
