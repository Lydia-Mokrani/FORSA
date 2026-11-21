import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { devDb, isPostgresAlive } from './dev-db.service';

export type EmailTokenType = 'VERIFY_EMAIL' | 'RESET_PASSWORD';

const TTL_MS: Record<EmailTokenType, number> = {
  VERIFY_EMAIL: 24 * 60 * 60 * 1000,   // 24 heures
  RESET_PASSWORD: 60 * 60 * 1000,       // 1 heure
};

const COOLDOWN_MS = 60 * 1000; // 60 secondes entre deux envois

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Crée un nouveau jeton email pour l'utilisateur.
 * Stocke uniquement le hash en base.
 * Retourne le token brut à envoyer par email.
 */
export async function issueEmailToken(
  userId: string,
  type: EmailTokenType,
): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TTL_MS[type]);

  if (await isPostgresAlive()) {
    await prisma.emailToken.create({
      data: { userId, type: type as any, tokenHash, expiresAt },
    });
  } else {
    // Stockage en mémoire pour dev sans Postgres
    devDb.emailTokens.set(tokenHash, { userId, type, expiresAt, usedAt: null });
  }

  return { token, expiresAt };
}

/**
 * Vérifie si l'utilisateur est en cooldown pour ce type de jeton.
 * Retourne true si un jeton a été émis il y a moins de COOLDOWN_MS.
 */
export async function isInCooldown(
  userId: string,
  type: EmailTokenType,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - COOLDOWN_MS);

  if (await isPostgresAlive()) {
    const recent = await prisma.emailToken.findFirst({
      where: {
        userId,
        type: type as any,
        createdAt: { gte: cutoff },
      },
    });
    return !!recent;
  }

  // Vérification en mémoire
  for (const [, t] of devDb.emailTokens) {
    if (
      t.userId === userId &&
      t.type === type &&
      t.expiresAt.getTime() > Date.now() - TTL_MS[type] + COOLDOWN_MS
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Vérifie et consomme un jeton email.
 * Retourne { userId, type } si valide, lève une exception sinon.
 */
export async function consumeEmailToken(
  token: string,
): Promise<{ userId: string; type: EmailTokenType }> {
  const tokenHash = hashToken(token);

  if (await isPostgresAlive()) {
    const emailToken = await prisma.emailToken.findUnique({
      where: { tokenHash },
    });

    if (!emailToken) throw new Error('TOKEN_NOT_FOUND');
    if (emailToken.usedAt) throw new Error('TOKEN_ALREADY_USED');
    if (emailToken.expiresAt < new Date()) throw new Error('TOKEN_EXPIRED');

    await prisma.emailToken.update({
      where: { id: emailToken.id },
      data: { usedAt: new Date() },
    });

    return { userId: emailToken.userId, type: emailToken.type as EmailTokenType };
  }

  // Mode dev-db
  const t = devDb.emailTokens.get(tokenHash);
  if (!t) throw new Error('TOKEN_NOT_FOUND');
  if (t.usedAt) throw new Error('TOKEN_ALREADY_USED');
  if (t.expiresAt < new Date()) throw new Error('TOKEN_EXPIRED');
  t.usedAt = new Date();
  return { userId: t.userId, type: t.type };
}
