import { Request } from 'express';
import { prisma } from '../config/prisma';
import { jwtService, TokenPayload } from './jwt.service';
import { UnauthorizedError, ForbiddenError } from '@forsa/common';
import { logAudit } from './audit.service';
import { Role } from '@prisma/client';

export interface UserSessionData {
  id: string;
  roles: Role[];
  activeMode: string;
  phoneE164?: string | null;
  email?: string | null;
  emailVerifiedAt?: Date | null;
  emailVerified?: boolean;
  fullName?: string | null;
  shop?: {
    id: string;
    verificationStatus: string;
  } | null;
}

/**
 * Crée une session complète (Access Token 15 min + Refresh Token 7 jours)
 */
export async function createSession(
  user: UserSessionData,
  req?: Request
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const { token: refreshToken, hash: tokenHash } = jwtService.generateRefreshToken();

  // TTL Refresh Token : 7 jours
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const ipAddress = req?.ip || null;
  const userAgent = req?.headers['user-agent'] || null;
  const device = (req?.headers['x-device-id'] as string) || (userAgent ? userAgent.substring(0, 50) : 'Appareil inconnu');

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      device,
      userAgent,
      ipAddress,
      revoked: false,
      expiresAt,
    },
  });

  const shopStatus = user.shop?.verificationStatus ?? null;
  const shopId = user.shop?.id ?? null;
  const primaryRole = user.roles[0] || 'CUSTOMER';
  const emailVerified = typeof user.emailVerified === 'boolean'
    ? user.emailVerified
    : Boolean(user.emailVerifiedAt);

  const tokenPayload: TokenPayload = {
    sub: user.id,
    roles: user.roles,
    mode: user.activeMode,
    shopStatus,
    role: primaryRole,
    email: user.email,
    emailVerified,
    phone: user.phoneE164,
    fullName: user.fullName,
    shopId,
    merchantId: user.activeMode === 'merchant' ? user.id : (user.shop ? user.id : null),
  };

  const accessToken = jwtService.generateAccessToken(tokenPayload);

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 900 secondes = 15 minutes
  };
}

/**
 * Rotation du refresh token : invalide l'ancien, émet une nouvelle paire.
 * En cas de rejeu d'un token déjà révoqué, révoque immédiatement TOUTES les sessions (sécurité contre le vol de session).
 */
export async function rotateRefreshToken(
  rawRefreshToken: string,
  req?: Request
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  if (!rawRefreshToken) {
    throw new UnauthorizedError('Refresh token manquant.');
  }

  const tokenHash = jwtService.hashToken(rawRefreshToken);
  const session = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: { shop: true },
      },
    },
  });

  if (!session) {
    throw new UnauthorizedError('Session invalide ou inexistante.');
  }

  // Détection de rejeu d'un token révoqué -> ALERTE SÉCURITÉ
  if (session.revoked) {
    console.warn(`[SecurityAlert] Rejeu détecté d'un refresh token révoqué pour userId=${session.userId}`);
    // Révocation de toutes les sessions de l'utilisateur
    await prisma.refreshToken.updateMany({
      where: { userId: session.userId },
      data: { revoked: true },
    });

    await logAudit({
      userId: session.userId,
      action: 'SESSION_REPLAY_DETECTED_ALL_REVOKED',
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      metadata: { attemptedTokenHash: tokenHash },
    });

    throw new UnauthorizedError('Session compromise. Toutes vos sessions ont été invalidées.');
  }

  // Vérification de la date d'expiration
  if (session.expiresAt.getTime() <= Date.now()) {
    throw new UnauthorizedError('Session expirée. Veuillez vous reconnecter.');
  }

  // Vérifier le statut de l'utilisateur
  if (session.user.status === 'SUSPENDED' || session.user.status === 'DELETED') {
    throw new ForbiddenError('Compte suspendu ou supprimé.');
  }

  // Révocation du token courant (rotation)
  await prisma.refreshToken.update({
    where: { id: session.id },
    data: { revoked: true },
  });

  // Création du nouveau token de rotation
  const { token: newRefreshToken, hash: newTokenHash } = jwtService.generateRefreshToken();
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const ipAddress = req?.ip || session.ipAddress;
  const userAgent = req?.headers['user-agent'] || session.userAgent;
  const device = (req?.headers['x-device-id'] as string) || session.device;

  await prisma.refreshToken.create({
    data: {
      tokenHash: newTokenHash,
      userId: session.userId,
      device,
      userAgent,
      ipAddress,
      revoked: false,
      expiresAt: newExpiresAt,
    },
  });

  const shopStatus = session.user.shop?.verificationStatus ?? null;
  const shopId = session.user.shop?.id ?? null;
  const primaryRole = session.user.roles[0] || 'CUSTOMER';
  const emailVerified = Boolean(session.user.emailVerifiedAt);

  const tokenPayload: TokenPayload = {
    sub: session.user.id,
    roles: session.user.roles,
    mode: session.user.activeMode,
    shopStatus,
    role: primaryRole,
    email: session.user.email,
    emailVerified,
    phone: session.user.phoneE164,
    fullName: session.user.fullName,
    shopId,
    merchantId: session.user.activeMode === 'merchant' ? session.user.id : (session.user.shop ? session.user.id : null),
  };

  const accessToken = jwtService.generateAccessToken(tokenPayload);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: 15 * 60,
  };
}

/**
 * Déconnexion : révoque le refresh token
 */
export async function revokeRefreshToken(rawRefreshToken: string): Promise<boolean> {
  if (!rawRefreshToken) return false;
  const tokenHash = jwtService.hashToken(rawRefreshToken);
  try {
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Liste les sessions actives de l'utilisateur
 */
export async function listUserSessions(userId: string) {
  const sessions = await prisma.refreshToken.findMany({
    where: {
      userId,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      device: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return sessions;
}

/**
 * Révoque une session spécifique de l'utilisateur
 */
export async function revokeSessionById(userId: string, sessionId: string): Promise<boolean> {
  const res = await prisma.refreshToken.updateMany({
    where: {
      id: sessionId,
      userId,
    },
    data: { revoked: true },
  });
  return res.count > 0;
}
