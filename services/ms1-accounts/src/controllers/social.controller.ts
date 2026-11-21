import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/prisma';
import { devDb, isPostgresAlive } from '../services/dev-db.service';
import { createSession } from '../services/session.service';
import { config } from '../config/env';
import {
  ApiError,
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from '@forsa/common';

const googleClient = new OAuth2Client(config.googleClientId);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findUserById(id: string): Promise<any | null> {
  if (await isPostgresAlive()) {
    return prisma.user.findUnique({
      where: { id },
      include: { shop: true, socialAccounts: true },
    });
  }
  const u = devDb.users.get(id);
  return u ? { ...u, shop: null, socialAccounts: [] } : null;
}

async function findUserByEmail(email: string): Promise<any | null> {
  if (await isPostgresAlive()) {
    return prisma.user.findUnique({
      where: { email },
      include: { shop: true, socialAccounts: true },
    });
  }
  const u = [...devDb.users.values()].find((x) => x.email === email);
  return u ? { ...u, shop: null, socialAccounts: [] } : null;
}

// ─── SocialController ─────────────────────────────────────────────────────────

export class SocialController {
  /**
   * POST /api/auth/google
   * Connexion / inscription via Google ID Token.
   *
   * Flux :
   *  1. Vérification du token Google
   *  2. SocialAccount existant → connexion directe
   *  3. Email déjà utilisé sans liaison Google → 409 ACCOUNT_EXISTS
   *  4. Nouveau compte → 202 NEEDS_ROLE (l'utilisateur choisit son espace)
   */
  static async google(req: Request, res: Response, next: NextFunction) {
    try {
      if (!config.googleClientId) {
        throw new ApiError(503, 'GOOGLE_NOT_CONFIGURED', 'La connexion Google n\'est pas encore configurée.');
      }

      const { idToken, role } = req.body;
      if (!idToken) throw new ApiError(400, 'MISSING_TOKEN', 'Le token Google est requis');

      // 1. Vérifier le token
      let ticket: any;
      try {
        ticket = await googleClient.verifyIdToken({
          idToken,
          audience: config.googleClientId,
        });
      } catch {
        throw new ApiError(401, 'INVALID_GOOGLE_TOKEN', 'Token Google invalide ou expiré');
      }

      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) {
        throw new ApiError(401, 'INVALID_GOOGLE_TOKEN', 'Token Google invalide');
      }

      const googleId = payload.sub;
      const email = payload.email.toLowerCase();
      const fullName = payload.name || email.split('@')[0];
      const avatarUrl = payload.picture || null;

      // 2. Chercher un SocialAccount Google existant
      let socialAccount: any = null;
      if (await isPostgresAlive()) {
        socialAccount = await prisma.socialAccount.findUnique({
          where: { provider_providerUserId: { provider: 'GOOGLE', providerUserId: googleId } },
          include: { user: { include: { shop: true } } },
        });
      }

      if (socialAccount) {
        // Connexion directe
        const user = socialAccount.user;
        if (user.status === 'SUSPENDED') {
          throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'Votre compte est suspendu');
        }
        const session = await createSession(user);
        return res.json({
          ...session,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            avatarUrl: user.avatarUrl,
            emailVerified: user.emailVerified,
            phoneVerified: user.phoneVerified,
            needsPhone: !user.phone || !user.phoneVerified,
          },
        });
      }

      // 3. Email déjà utilisé par un compte classique ?
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          code: 'ACCOUNT_EXISTS',
          message: 'Un compte existe déjà avec cette adresse. Connectez-vous avec votre mot de passe pour lier Google.',
          email,
        });
      }

      // 4. Si un rôle est fourni, créer le compte immédiatement
      if (role && ['CUSTOMER', 'MERCHANT'].includes(role)) {
        let newUser: any;
        if (await isPostgresAlive()) {
          newUser = await prisma.user.create({
            data: {
              email,
              fullName,
              role,
              avatarUrl,
              emailVerified: true,
              phoneVerified: false,
              socialAccounts: {
                create: {
                  provider: 'GOOGLE',
                  providerUserId: googleId,
                },
              },
            },
            include: { shop: true },
          });
        } else {
          newUser = {
            id: `usr_${Date.now()}`,
            email,
            fullName,
            role,
            avatarUrl,
            emailVerified: true,
            phoneVerified: false,
            status: 'ACTIVE',
            createdAt: new Date(),
          };
          devDb.users.set(newUser.id, newUser);
        }

        const session = await createSession(newUser);
        return res.status(201).json({
          ...session,
          user: {
            id: newUser.id,
            email: newUser.email,
            fullName: newUser.fullName,
            role: newUser.role,
            avatarUrl: newUser.avatarUrl,
            emailVerified: newUser.emailVerified,
            phoneVerified: newUser.phoneVerified,
            needsPhone: true,
          },
        });
      }

      // 5. Nouveau compte sans rôle prédéfini → NEEDS_ROLE (Figma Frame 20)
      return res.status(202).json({
        code: 'NEEDS_ROLE',
        message: 'Choisissez votre espace pour créer votre compte.',
        googleId,
        email,
        fullName,
        avatarUrl,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/apple
   * Apple Sign-In nécessite un compte Apple Developer payant.
   */
  static async apple(_req: Request, res: Response) {
    res.status(501).json({
      code: 'NOT_IMPLEMENTED',
      message: 'La connexion avec Apple n\'est pas encore disponible.',
    });
  }

  /**
   * GET /api/users/me/social
   * Liste les comptes sociaux liés.
   */
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      let accounts: any[] = [];
      if (await isPostgresAlive()) {
        accounts = await prisma.socialAccount.findMany({ where: { userId } });
      }

      res.json(accounts.map((a) => ({ provider: a.provider, linkedAt: a.createdAt })));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/users/me/social/google
   * Lie un compte Google après connexion par mot de passe.
   */
  static async linkGoogle(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      if (!config.googleClientId) {
        throw new ApiError(503, 'GOOGLE_NOT_CONFIGURED', 'La connexion Google n\'est pas encore configurée.');
      }

      const { idToken } = req.body;
      if (!idToken) throw new ApiError(400, 'MISSING_TOKEN', 'Le token Google est requis');

      let ticket: any;
      try {
        ticket = await googleClient.verifyIdToken({
          idToken,
          audience: config.googleClientId,
        });
      } catch {
        throw new ApiError(401, 'INVALID_GOOGLE_TOKEN', 'Token Google invalide ou expiré');
      }

      const payload = ticket.getPayload();
      const googleId = payload?.sub;
      if (!googleId) throw new ApiError(401, 'INVALID_GOOGLE_TOKEN', 'Token Google invalide');

      if (await isPostgresAlive()) {
        try {
          await prisma.socialAccount.create({
            data: { provider: 'GOOGLE', providerUserId: googleId, userId },
          });
        } catch (err: any) {
          if (err.code === 'P2002') {
            throw new ApiError(409, 'ALREADY_LINKED', 'Ce compte Google est déjà lié à un compte FORSA');
          }
          throw err;
        }
      }

      res.json({ message: 'Compte Google lié avec succès.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/users/me/social/:provider
   * Délie un compte social. Interdit si c'est le seul moyen de connexion.
   */
  static async unlink(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const provider = req.params.provider?.toUpperCase();
      if (!['GOOGLE', 'APPLE'].includes(provider)) {
        throw new ApiError(400, 'INVALID_PROVIDER', 'Fournisseur invalide');
      }

      if (await isPostgresAlive()) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { socialAccounts: true },
        });

        if (!user) throw new UnauthorizedError();

        // Vérifier qu'il reste au moins un moyen de connexion
        const hasSocialToRemove = user.socialAccounts.some(
          (a) => a.provider === provider,
        );
        const hasPassword = !!user.passwordHash;
        const otherSocials = user.socialAccounts.filter((a) => a.provider !== provider);

        if (hasSocialToRemove && !hasPassword && otherSocials.length === 0) {
          throw new ApiError(
            403,
            'LAST_LOGIN_METHOD',
            'Vous ne pouvez pas supprimer votre dernier moyen de connexion. Ajoutez un mot de passe d\'abord.',
          );
        }

        await prisma.socialAccount.deleteMany({
          where: { userId, provider: provider as any },
        });
      }

      res.json({ message: `Compte ${provider} délié avec succès.` });
    } catch (err) {
      next(err);
    }
  }
}
