import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { jwtService } from '../services/jwt.service';
import { devDb, isPostgresAlive } from '../services/dev-db.service';
import { ApiError, UnauthorizedError } from '@forsa/common';
import { config } from '../config/env';

/**
 * Helper: crée un accessToken + refreshToken pour un utilisateur donné.
 * Utilisé après login Google, liaison de compte, etc.
 */
export async function createSession(user: {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
  fullName: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  phone?: string | null;
  avatarUrl?: string | null;
  shop?: { id: string; status: string } | null;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const { token: refreshToken, hash: tokenHash } = jwtService.generateRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 jours

  if (await isPostgresAlive()) {
    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });
  } else {
    devDb.refreshTokens.set(tokenHash, {
      userId: user.id,
      revoked: false,
      expiresAt,
    });
  }

  const shopId = user.shop?.id ?? null;
  const shopStatus = user.shop?.status ?? null;
  const merchantId = user.role === 'MERCHANT' ? user.id : (user.shop ? user.id : null);
  const merchantStatus = shopStatus ?? (user.role === 'MERCHANT' ? 'PENDING' : null);

  const accessToken = jwtService.generateAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    shopId,
    merchantId,
    shopStatus,
    merchantStatus,
  });

  return { accessToken, refreshToken };
}
