import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  ForbiddenError,
} from '@forsa/common';
import { prisma } from '../config/prisma';
import { jwtService } from '../services/jwt.service';
import { rabbitMQ } from '../services/rabbitmq.service';

const registerSchema = z.object({
  email: z.string().email('Format email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  fullName: z.string().min(2, 'Le nom complet est requis'),
  phone: z.string().optional(),
  role: z.enum(['CUSTOMER', 'MERCHANT']).default('CUSTOMER'),
});

const loginSchema = z.object({
  email: z.string().email('Format email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token invalide'),
});

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      const { email, password, fullName, phone, role } = parsed.data;

      const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (existingUser) {
        throw new ConflictError('Un compte existe déjà avec cette adresse email.');
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          fullName,
          phone,
          role,
        },
      });

      // Émission de l'événement user.registered sur RabbitMQ
      await rabbitMQ.publish('user.registered', {
        userId: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      }).catch((err) => console.warn('[MS1-Auth] RabbitMQ publish user.registered warning:', err.message));

      // Génération des tokens
      const accessToken = jwtService.generateAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        shopId: null,
        merchantId: null,
        shopStatus: null,
        merchantStatus: null,
      });

      const { token: rawRefreshToken, hash: refreshHash } = jwtService.generateRefreshToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: refreshHash,
          expiresAt,
        },
      });

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          status: user.status,
          phoneVerified: user.phoneVerified,
          emailVerified: user.emailVerified,
        },
        accessToken,
        refreshToken: rawRefreshToken,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { shop: true },
      });

      if (!user) {
        throw new UnauthorizedError('Identifiants invalides.');
      }

      if (user.status === 'SUSPENDED') {
        throw new ForbiddenError('Ce compte a été suspendu pour non-respect des règles de la plateforme.');
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Identifiants invalides.');
      }

      const shopId = user.shop?.id || null;
      const shopStatus = user.shop?.status || null;

      const accessToken = jwtService.generateAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        shopId,
        merchantId: shopId,
        shopStatus,
        merchantStatus: shopStatus,
      });

      const { token: rawRefreshToken, hash: refreshHash } = jwtService.generateRefreshToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: refreshHash,
          expiresAt,
        },
      });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          status: user.status,
          phoneVerified: user.phoneVerified,
          emailVerified: user.emailVerified,
          shopId: user.shop?.id,
          shopStatus: user.shop?.status,
        },
        accessToken,
        refreshToken: rawRefreshToken,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = refreshSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError('Le paramètre refreshToken est obligatoire.');
      }

      const tokenHash = jwtService.hashToken(parsed.data.refreshToken);

      const savedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: { include: { shop: true } } },
      });

      if (!savedToken || savedToken.revoked || savedToken.expiresAt < new Date()) {
        throw new UnauthorizedError('Session expirée ou refresh token invalide. Veuillez vous reconnecter.');
      }

      // Révocation de l'ancien token (rotation sécurisée)
      await prisma.refreshToken.update({
        where: { id: savedToken.id },
        data: { revoked: true },
      });

      const { user } = savedToken;
      const shopId = user.shop?.id || null;
      const shopStatus = user.shop?.status || null;

      const newAccessToken = jwtService.generateAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        shopId,
        merchantId: shopId,
        shopStatus,
        merchantStatus: shopStatus,
      });

      const { token: newRawRefreshToken, hash: newRefreshHash } = jwtService.generateRefreshToken();
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newRefreshHash,
          expiresAt: newExpiresAt,
        },
      });

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRawRefreshToken,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        const tokenHash = jwtService.hashToken(refreshToken);
        await prisma.refreshToken.updateMany({
          where: { tokenHash },
          data: { revoked: true },
        });
      }
      res.json({ message: 'Déconnexion réussie.' });
    } catch (err) {
      next(err);
    }
  }

  public static getPublicKey(_req: Request, res: Response): void {
    res.json({
      algorithm: 'RS256',
      issuer: 'forsa-ms1-accounts',
      publicKey: jwtService.getPublicKey(),
    });
  }
}
