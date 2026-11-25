import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { eventBus } from './event-bus';
import { logAudit } from './audit.service';
import { hashString } from './challenge.service';
import { BadRequestError, RateLimitError } from '@forsa/common';
import { ChallengePurpose, ChallengeStatus } from '@prisma/client';

export class EmailVerificationService {
  /**
   * Initialise l'envoi d'un code de vérification d'e-mail (lors de l'inscription ou changement d'e-mail).
   */
  public static async initiateEmailVerification(
    userId: string,
    email: string,
    locale: string = 'fr'
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = hashString(normalizedEmail);

    // Invalider les défis précédents non validés pour cet utilisateur
    await prisma.authChallenge.updateMany({
      where: {
        userId,
        purpose: ChallengePurpose.EMAIL_VERIFY,
        status: ChallengeStatus.PENDING,
      },
      data: { status: ChallengeStatus.EXPIRED },
    });

    // Générer code à 6 chiffres (TTL 10 min, max 5 tentatives)
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = hashString(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.authChallenge.create({
      data: {
        userId,
        email: normalizedEmail,
        emailHash,
        purpose: ChallengePurpose.EMAIL_VERIFY,
        codeHash,
        expiresAt,
        status: ChallengeStatus.PENDING,
        attempts: 0,
        maxAttempts: 5,
      },
    });

    await eventBus.publish('email.send', {
      eventId: `evt-email-verify-${Date.now()}-${userId}`,
      to: normalizedEmail,
      template: 'verify',
      locale,
      data: { code },
      code,
    });
  }

  /**
   * POST /auth/email/verify { code }
   * Valide le code et met à jour email_verified_at.
   */
  public static async verifyEmail(userId: string, code: string): Promise<boolean> {
    const challenge = await prisma.authChallenge.findFirst({
      where: {
        userId,
        purpose: ChallengePurpose.EMAIL_VERIFY,
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
      throw new BadRequestError('Code de vérification invalide ou expiré.');
    }

    if (challenge.attempts >= (challenge.maxAttempts || 5)) {
      await prisma.authChallenge.update({
        where: { id: challenge.id },
        data: { status: ChallengeStatus.FAILED },
      });
      throw new BadRequestError('Nombre maximal de tentatives dépassé. Veuillez demander un nouveau code.');
    }

    const hashedCode = hashString(code);
    if (hashedCode !== challenge.codeHash) {
      await prisma.authChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      const attemptsLeft = (challenge.maxAttempts || 5) - (challenge.attempts + 1);
      throw new BadRequestError(`Code de vérification incorrect. Tentatives restantes : ${attemptsLeft}`);
    }

    const verifiedAt = new Date();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, pendingEmail: true },
    });

    // Mettre à jour l'utilisateur et le défi dans une transaction atomique
    const userUpdateData: any = { emailVerifiedAt: verifiedAt };
    if (user?.pendingEmail && challenge.email === user.pendingEmail) {
      userUpdateData.email = user.pendingEmail;
      userUpdateData.pendingEmail = null;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      }),
      prisma.authChallenge.update({
        where: { id: challenge.id },
        data: { status: ChallengeStatus.VERIFIED },
      }),
    ]);

    await logAudit({
      userId,
      action: 'EMAIL_VERIFIED',
      metadata: { email: challenge.email, verifiedAt: verifiedAt.toISOString() },
    });

    return true;
  }

  /**
   * POST /auth/email/resend
   * Renvoi d'un nouveau code. Limite : max 3 par heure par utilisateur.
   */
  public static async resendVerification(userId: string, locale: string = 'fr'): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, pendingEmail: true },
    });

    const targetEmail = user?.pendingEmail || user?.email;
    if (!user || !targetEmail) {
      throw new BadRequestError('Aucune adresse e-mail associée à ce compte.');
    }

    // Vérification de la limite : max 3 par heure
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await prisma.authChallenge.count({
      where: {
        userId,
        purpose: ChallengePurpose.EMAIL_VERIFY,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (count >= 3) {
      throw new RateLimitError(
        'Trop de demandes de renvoi de code. Veuillez patienter avant de réessayer (maximum 3 par heure).'
      );
    }

    await this.initiateEmailVerification(userId, targetEmail, locale);
  }
}
