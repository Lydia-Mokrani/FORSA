import crypto from 'crypto';
import { eventBus } from '../services/event-bus';
import { prisma } from '../config/prisma';
import { config } from '../config/env';
import { maskPhone } from '../utils/mask-phone';
import { ChallengePurpose, ChallengeStatus } from '@prisma/client';
import { hashString, challengeCodeCache } from '../services/challenge.service';
import { RecoveryService } from '../services/recovery.service';

export async function initAuthEventListeners(): Promise<void> {
  // File partagée entre toutes les instances MS1 (competing consumers, un seul traitement par événement)
  await eventBus.subscribe(
    'telegram.contact.received',
    async (event) => {
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

        try {
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
            `[AuthEventListener] ✅ Numéro mis à jour avec succès pour userId=${challenge.userId} (${maskPhone(oldPhone)} -> ${maskPhone(payload.phone)})`
          );

          // Confirmation au bot Telegram
          await eventBus.publish('telegram.send.message', {
            chatId: String(payload.chatId),
            text: `✅ *Votre numéro a été mis à jour avec succès !*\n\nVotre compte FORSA est désormais associé au numéro \`${payload.phone}\`.`,
          });

          return;
        } catch (txError: any) {
          // Détection précise des violations de contraintes uniques (Cas A: Telegram lié, Cas B: Numéro lié)
          const isUniqueConstraint = txError.code === 'P2002' || txError.message?.includes('Unique constraint');
          const targetStr = JSON.stringify(txError.meta?.target || txError.message || '');
          const isTelegramConflict = targetStr.includes('telegram_user_id') || targetStr.includes('telegramUserId');

          const failReason = isTelegramConflict
            ? 'TELEGRAM_ACCOUNT_ALREADY_LINKED'
            : (isUniqueConstraint ? 'PHONE_ALREADY_IN_USE' : 'TRANSACTION_ERROR');

          const userMessage = isTelegramConflict
            ? '❌ *Action refusée :* Ce compte Telegram est déjà lié à un autre compte FORSA.'
            : '❌ *Action refusée :* Ce numéro de téléphone est déjà associé à un autre compte FORSA.';

          // 1. Le défi de changement de numéro passe au statut FAILED
          await prisma.authChallenge.update({
            where: { id: challenge.id },
            data: { status: ChallengeStatus.FAILED },
          }).catch(() => {});

          // 2. Événement correspondant enregistré dans audit_logs
          await prisma.auditLog.create({
            data: {
              userId: challenge.userId,
              action: 'PHONE_CHANGE_FAILED',
              metadata: {
                reason: failReason,
                target: txError.meta?.target || null,
                attemptedPhone: payload.phone,
                attemptedTelegramUserId: payload.telegramUserId,
              },
            },
          }).catch(() => {});

          // 3. Message explicite envoyé via le bot Telegram
          await eventBus.publish('telegram.send.message', {
            chatId: String(payload.chatId),
            text: userMessage,
          });

          console.warn(
            `[AuthEventListener] Conflit de contrainte unique lors du changement de numéro (userId=${challenge.userId}, raison=${failReason}):`,
            txError.message
          );
          return;
        }
      }

      // ─── CAS 1B : RÉCUPÉRATION DU NUMÉRO (RECOVER_PHONE) ───────────────────
      if (challenge.purpose === ChallengePurpose.RECOVER_PHONE && challenge.userId) {
        try {
          const recoveryRes = await RecoveryService.completePhoneRecovery(
            challenge.userId,
            payload.phone,
            payload.telegramUserId,
            payload.chatId
          );

          await prisma.authChallenge.update({
            where: { id: challenge.id },
            data: { status: ChallengeStatus.VERIFIED },
          });

          const msg = recoveryRes.isMerchantDelay
            ? `🔒 *Demande de récupération enregistrée.*\n\nPar mesure de sécurité pour votre boutique vérifiée, votre nouveau numéro sera activé dans ${config.recoveryMerchantDelayHours} heures.`
            : `✅ *Votre numéro a été récupéré avec succès !*\n\nVotre compte FORSA est désormais associé au numéro \`${payload.phone}\`.`;

          await eventBus.publish('telegram.send.message', {
            chatId: String(payload.chatId),
            text: msg,
          });

          return;
        } catch (recoveryErr: any) {
          console.error('[AuthEventListener] Erreur lors de la récupération du numéro:', recoveryErr.message);
          await prisma.authChallenge.update({
            where: { id: challenge.id },
            data: { status: ChallengeStatus.FAILED },
          }).catch(() => {});
          return;
        }
      }

      // ─── CAS 2 : CONNEXION / INSCRIPTION / CONFIRMATION ────────────────────
      const code = crypto.randomInt(100000, 999999).toString();
      const codeHash = hashString(code);
      const codeExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min TTL

      challengeCodeCache.set(challenge.id, code);

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

      if (process.env.NODE_ENV === 'development') {
        console.log(`[AuthEventListener] Code OTP émis pour ${maskPhone(payload.phone)}`);
      }

      // Publier sur le bus pour envoi par le bot (avec TTL message garanti par le bus)
      await eventBus.publish('telegram.send.otp', {
        chatId: String(payload.chatId),
        code,
        expiresAt: codeExpiresAt,
        challengeId: challenge.id,
      });
    } catch (err: any) {
      console.error('[AuthEventListener] Erreur traitement telegram.contact.received:', err.message);
    }
  }, 'q.ms1-accounts.telegram.contact.received');
}
