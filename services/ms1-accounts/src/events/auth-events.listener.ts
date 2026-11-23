import crypto from 'crypto';
import { eventBus } from '../services/event-bus';
import { prisma } from '../config/prisma';
import { ChallengePurpose, ChallengeStatus } from '@prisma/client';
import { hashString } from '../services/challenge.service';

export async function initAuthEventListeners(): Promise<void> {
  await eventBus.subscribe('telegram.contact.received', async (event) => {
    const payload = (event.payload || event.data) as {
      challengeId: string;
      phone: string;
      telegramUserId: string;
      chatId: string;
    };

    if (!payload?.challengeId) return;

    try {
      const challenge = await prisma.authChallenge.findUnique({
        where: { id: payload.challengeId },
        include: { user: true },
      });

      if (!challenge || challenge.status !== ChallengeStatus.PENDING || challenge.expiresAt <= new Date()) {
        console.warn(`[AuthEventListener] Défi invalide ou expiré: ${payload.challengeId}`);
        return;
      }

      // ─── CAS 1 : CHANGEMENT DE NUMÉRO (Transaction atomique) ────────────────
      if (challenge.purpose === ChallengePurpose.CHANGE_PHONE && challenge.userId) {
        const currentUser = challenge.user;
        const oldPhone = currentUser?.phoneE164 || null;
        const oldTelegramUserId = currentUser?.telegramUserId || null;

        // Transaction atomique Prisma : utilisateur, défi et journal d'audit
        await prisma.$transaction([
          // 1. Mise à jour de l'utilisateur (même compte ou nouveau compte Telegram)
          prisma.user.update({
            where: { id: challenge.userId },
            data: {
              phoneE164: payload.phone,
              telegramUserId: String(payload.telegramUserId),
              telegramChatId: String(payload.chatId),
              telegramBlocked: false,
            },
          }),
          // 2. Défi validé
          prisma.authChallenge.update({
            where: { id: challenge.id },
            data: { status: ChallengeStatus.VERIFIED },
          }),
          // 3. Journal d'audit
          prisma.auditLog.create({
            data: {
              userId: challenge.userId,
              action: 'USER_PHONE_CHANGED',
              metadata: {
                oldPhone,
                newPhone: payload.phone,
                oldTelegramUserId,
                newTelegramUserId: String(payload.telegramUserId),
                chatId: String(payload.chatId),
              },
            },
          }),
        ]);

        console.log(
          `[AuthEventListener] ✅ Numéro mis à jour avec succès pour userId=${challenge.userId} (${oldPhone} -> ${payload.phone})`
        );

        // Confirmation au bot Telegram
        await eventBus.publish('telegram.send.message', {
          chatId: String(payload.chatId),
          text: `✅ *Votre numéro a été mis à jour avec succès !*\n\nVotre compte FORSA est désormais associé au numéro \`${payload.phone}\`.`,
        });

        return;
      }

      // ─── CAS 2 : CONNEXION / INSCRIPTION / CONFIRMATION ────────────────────
      const code = crypto.randomInt(100000, 999999).toString();
      const codeHash = hashString(code);
      const codeExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min TTL

      await prisma.authChallenge.update({
        where: { id: challenge.id },
        data: {
          codeHash,
          expiresAt: codeExpiresAt,
        },
      });

      // Lier telegramUserId et telegramChatId si l'utilisateur existe déjà
      await prisma.user.updateMany({
        where: { phoneE164: payload.phone },
        data: {
          telegramUserId: String(payload.telegramUserId),
          telegramChatId: String(payload.chatId),
          telegramBlocked: false,
        },
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AuthEventListener] 🔑 Code OTP généré pour ${payload.phone}: ${code}`);
      }

      // Publier sur le bus pour envoi par le bot
      await eventBus.publish('telegram.send.otp', {
        chatId: String(payload.chatId),
        code,
        expiresAt: codeExpiresAt,
        challengeId: challenge.id,
      });
    } catch (err: any) {
      console.error('[AuthEventListener] Erreur traitement telegram.contact.received:', err.message);
    }
  });
}
