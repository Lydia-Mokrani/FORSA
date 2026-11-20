import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '@forsa/common';
import { prisma } from '../config/prisma';

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
});

const verifyPhoneSchema = z.object({
  code: z.string().length(4, 'Le code doit contenir exactement 4 chiffres'),
});

export class UserController {
  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          status: true,
          phoneVerified: true,
          emailVerified: true,
          createdAt: true,
          shop: {
            select: {
              id: true,
              name: true,
              description: true,
              address: true,
              latitude: true,
              longitude: true,
              phone: true,
              status: true,
              logoUrl: true,
            },
          },
        },
      });

      if (!user) throw new NotFoundError('Utilisateur non trouvé.');

      res.json({ user });
    } catch (err) {
      next(err);
    }
  }

  public static async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: parsed.data,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          phoneVerified: true,
          updatedAt: true,
        },
      });

      res.json({ user: updated });
    } catch (err) {
      next(err);
    }
  }

  public static async requestPhoneOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.phone) {
        throw new BadRequestError('Veuillez d abord renseigner un numéro de téléphone dans votre profil.');
      }

      // Génération code à 4 chiffres (simulé pour soutenance / démo)
      const simulatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.phoneOtp.create({
        data: {
          userId,
          code: simulatedOtp,
          expiresAt,
        },
      });

      console.log(`[MS1-OTP] SMS simulé envoyé au ${user.phone} : Code OTP = [ ${simulatedOtp} ]`);

      res.json({
        message: 'Code de vérification envoyé par SMS (simulé).',
        simulatedCode: process.env.NODE_ENV !== 'production' ? simulatedOtp : undefined,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async confirmPhoneOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const parsed = verifyPhoneSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError('Format de code OTP invalide.');
      }

      const otpRecord = await prisma.phoneOtp.findFirst({
        where: {
          userId,
          code: parsed.data.code,
          used: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!otpRecord) {
        throw new BadRequestError('Code de vérification incorrect ou expiré.');
      }

      // Valider l'OTP et mettre à jour l'utilisateur
      await prisma.$transaction([
        prisma.phoneOtp.update({
          where: { id: otpRecord.id },
          data: { used: true },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { phoneVerified: true },
        }),
      ]);

      res.json({
        message: 'Votre numéro de téléphone a été validé avec succès.',
        phoneVerified: true,
      });
    } catch (err) {
      next(err);
    }
  }
}
