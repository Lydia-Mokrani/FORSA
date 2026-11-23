import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { config } from '../config/env';
import { ChallengePurpose, ChallengeStatus } from '@prisma/client';
import { normalizeToE164, isValidE164Algerian } from '../utils/phone';
import { ApiError, BadRequestError, NotFoundError } from '@forsa/common';

export function hashString(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function constantTimeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export interface CreatedChallenge {
  challengeId: string;
  nonce: string;
  deepLink: string;
  expiresAt: Date;
}

/**
 * Crée un nouveau défi d'authentification Telegram (spec §3.1)
 * - Nonce 128 bits aléatoire (32 car. hex)
 * - Nonce haché en SHA-256 stocké en base
 * - TTL 10 minutes
 * - Lien Telegram https://t.me/forsa_auth_bot?start=<nonce>
 */
export async function createAuthChallenge(
  rawPhone: string,
  purpose: ChallengePurpose = ChallengePurpose.LOGIN,
  userId?: string,
  newPhone?: string
): Promise<CreatedChallenge> {
  const phone = normalizeToE164(rawPhone);
  if (!phone || !isValidE164Algerian(phone)) {
    throw new BadRequestError('Numéro de téléphone mobile algérien invalide (+213 5/6/7 xx xx xx).');
  }

  // Nonce 128-bit (16 octets = 32 caractères hex)
  const nonce = crypto.randomBytes(16).toString('hex');
  const nonceHash = hashString(nonce);

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const challenge = await prisma.authChallenge.create({
    data: {
      phone,
      purpose,
      nonceHash,
      expiresAt,
      attempts: 0,
      status: ChallengeStatus.PENDING,
      userId: userId || null,
      newPhone: newPhone ? normalizeToE164(newPhone) : null,
    },
  });

  const botUsername = config.telegramBotUsername || 'forsa_auth_bot';
  const deepLink = `https://t.me/${botUsername}?start=${nonce}`;

  if (process.env.NODE_ENV === 'development') {
    console.log(`[ChallengeDev] 🛡️ Nouveau défi créé pour ${phone} (ID: ${challenge.id})`);
    console.log(`[ChallengeDev] 🔗 DeepLink Telegram: ${deepLink}`);
  }

  return {
    challengeId: challenge.id,
    nonce,
    deepLink,
    expiresAt,
  };
}

/**
 * Récupère le statut public d'un défi (spec §6)
 */
export async function getChallengeStatus(challengeId: string) {
  const challenge = await prisma.authChallenge.findUnique({
    where: { id: challengeId },
    select: {
      id: true,
      status: true,
      codeHash: true,
      expiresAt: true,
    },
  });

  if (!challenge) {
    throw new NotFoundError('Défi d\'authentification introuvable.');
  }

  const now = new Date();
  let currentStatus = challenge.status;

  if (currentStatus === ChallengeStatus.PENDING && challenge.expiresAt <= now) {
    currentStatus = ChallengeStatus.EXPIRED;
    // Mettre à jour en base de manière asynchrone
    prisma.authChallenge.update({
      where: { id: challengeId },
      data: { status: ChallengeStatus.EXPIRED },
    }).catch(() => {});
  }

  return {
    id: challenge.id,
    status: currentStatus,
    codeSent: !!challenge.codeHash,
    expiresAt: challenge.expiresAt,
  };
}

/**
 * Vérifie le code à 6 chiffres soumis par l'utilisateur
 * - TTL 5 min
 * - Max 5 essais
 * - Comparaison à temps constant
 * - Défi à usage unique
 */
export async function verifyAuthChallenge(challengeId: string, inputCode: string) {
  const challenge = await prisma.authChallenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    throw new NotFoundError('Défi d\'authentification introuvable.');
  }

  const now = new Date();

  // 1. Vérification de l'état
  if (challenge.status === ChallengeStatus.VERIFIED) {
    throw new BadRequestError('Ce défi a déjà été validé et consommé.');
  }

  if (challenge.status === ChallengeStatus.FAILED) {
    throw new BadRequestError('Ce défi a été verrouillé suite à un trop grand nombre d\'essais.');
  }

  if (challenge.status === ChallengeStatus.EXPIRED || challenge.expiresAt <= now) {
    if (challenge.status !== ChallengeStatus.EXPIRED) {
      await prisma.authChallenge.update({
        where: { id: challengeId },
        data: { status: ChallengeStatus.EXPIRED },
      });
    }
    throw new BadRequestError('Ce code a expiré. Veuillez relancer la vérification.');
  }

  // 2. Vérification des tentatives
  if (challenge.attempts >= 5) {
    await prisma.authChallenge.update({
      where: { id: challengeId },
      data: { status: ChallengeStatus.FAILED },
    });
    throw new BadRequestError('Nombre maximal de tentatives dépassé. Défi verrouillé.');
  }

  // 3. Vérification si un code a bien été émis
  if (!challenge.codeHash) {
    throw new BadRequestError('Aucun code n\'a encore été envoyé sur Telegram pour ce défi.');
  }

  // 4. Comparaison à temps constant
  const inputHash = hashString(inputCode.trim());
  const isValid = constantTimeCompare(inputHash, challenge.codeHash);

  if (!isValid) {
    const newAttempts = challenge.attempts + 1;
    const isNowFailed = newAttempts >= 5;

    await prisma.authChallenge.update({
      where: { id: challengeId },
      data: {
        attempts: newAttempts,
        status: isNowFailed ? ChallengeStatus.FAILED : ChallengeStatus.PENDING,
      },
    });

    const remaining = Math.max(0, 5 - newAttempts);
    if (isNowFailed) {
      throw new BadRequestError('Code incorrect. Trop de tentatives : défi verrouillé.');
    }
    throw new BadRequestError(`Code incorrect. ${remaining} essai(s) restant(s).`);
  }

  // 5. Succès : marquer le défi comme validé (usage unique)
  await prisma.authChallenge.update({
    where: { id: challengeId },
    data: {
      status: ChallengeStatus.VERIFIED,
      attempts: challenge.attempts + 1,
    },
  });

  return {
    success: true,
    challenge,
  };
}
