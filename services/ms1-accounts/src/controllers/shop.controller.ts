import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  UnauthorizedError,
} from '@forsa/common';
import { prisma } from '../config/prisma';
import { rabbitMQ } from '../services/rabbitmq.service';
import { config } from '../config/env';

const createShopSchema = z.object({
  name: z.string().min(2, 'Le nom du commerce est requis'),
  description: z.string().optional(),
  address: z.string().min(5, 'L adresse est requise'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: z.string().min(8, 'Le téléphone de contact est requis'),
  openingHours: z.record(z.any()).optional(),
  logoUrl: z.string().url().optional(),
});

const updateShopSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  address: z.string().min(5).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  phone: z.string().min(8).optional(),
  openingHours: z.record(z.any()).optional(),
  logoUrl: z.string().url().optional(),
});

export class ShopController {
  public static async createShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      if (req.user?.role !== 'MERCHANT') {
        throw new ForbiddenError('Seuls les utilisateurs avec le profil COMMERÇANT peuvent enregistrer une boutique.');
      }

      const existingShop = await prisma.shop.findUnique({ where: { userId } });
      if (existingShop) {
        throw new ConflictError('Une boutique est déjà associée à ce compte commerçant.');
      }

      const parsed = createShopSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      const shop = await prisma.shop.create({
        data: {
          ...parsed.data,
          userId,
          status: 'PENDING',
        },
      });

      // Émission de l'événement shop.created sur RabbitMQ pour MS2 (ShopSnapshot) et MS4/MS5
      await rabbitMQ.publish('shop.created', {
        shopId: shop.id,
        merchantId: shop.userId,
        userId: shop.userId,
        name: shop.name,
        address: shop.address,
        latitude: shop.latitude,
        longitude: shop.longitude,
        phone: shop.phone,
        status: shop.status,
      }).catch((err) => console.warn('[MS1-Shop] RabbitMQ publish shop.created warning:', err.message));

      res.status(201).json({ shop });
    } catch (err) {
      next(err);
    }
  }

  public static async getMyShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const shop = await prisma.shop.findUnique({
        where: { userId },
        include: {
          documents: {
            select: {
              id: true,
              type: true,
              originalName: true,
              mimeType: true,
              size: true,
              status: true,
              createdAt: true,
            },
          },
        },
      });

      if (!shop) {
        throw new NotFoundError('Aucune boutique trouvée pour ce compte commerçant.');
      }

      res.json({ shop });
    } catch (err) {
      next(err);
    }
  }

  public static async updateMyShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const parsed = updateShopSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      const shop = await prisma.shop.findUnique({ where: { userId } });
      if (!shop) {
        throw new NotFoundError('Boutique non trouvée.');
      }

      const updated = await prisma.shop.update({
        where: { id: shop.id },
        data: parsed.data,
      });

      // Émission de l'événement shop.updated sur RabbitMQ pour MS2 (ShopSnapshot)
      const mappedStatus = updated.status === 'APPROVED' ? 'ACTIVE' : (updated.status === 'PENDING' ? 'CLOSED' : updated.status);
      await rabbitMQ.publish('shop.updated', {
        shopId: updated.id,
        merchantId: updated.userId,
        userId: updated.userId,
        name: updated.name,
        address: updated.address,
        latitude: updated.latitude,
        longitude: updated.longitude,
        phone: updated.phone,
        status: mappedStatus,
        shopStatus: updated.status,
      }).catch((err) => console.warn('[MS1-Shop] RabbitMQ publish shop.updated warning:', err.message));

      res.json({ shop: updated });
    } catch (err) {
      next(err);
    }
  }

  public static async getPublicShopById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const shop = await prisma.shop.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          address: true,
          latitude: true,
          longitude: true,
          phone: true,
          openingHours: true,
          logoUrl: true,
          status: true,
          createdAt: true,
        },
      });

      if (!shop) {
        throw new NotFoundError('Boutique non trouvée.');
      }

      res.json({ shop });
    } catch (err) {
      next(err);
    }
  }

  public static async uploadDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const shop = await prisma.shop.findUnique({ where: { userId } });
      if (!shop) {
        throw new NotFoundError('Veuillez créer votre boutique avant de téléverser les pièces justificatives.');
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (!files || Object.keys(files).length === 0) {
        throw new BadRequestError('Aucun document fourni. Les pièces requises sont: commercial_register, tax_id, storefront.');
      }

      const createdDocs = [];

      const docTypeMapping: Record<string, 'COMMERCIAL_REGISTER' | 'TAX_ID' | 'STOREFRONT'> = {
        commercial_register: 'COMMERCIAL_REGISTER',
        tax_id: 'TAX_ID',
        storefront: 'STOREFRONT',
      };

      for (const [fieldName, fileArray] of Object.entries(files)) {
        const file = fileArray[0];
        const docType = docTypeMapping[fieldName];
        if (docType && file) {
          // Supprimer un ancien document de même type s'il existe
          await prisma.shopDocument.deleteMany({
            where: { shopId: shop.id, type: docType },
          });

          const doc = await prisma.shopDocument.create({
            data: {
              shopId: shop.id,
              type: docType,
              filename: file.filename,
              originalName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              fileUrl: `/api/shops/${shop.id}/documents/${file.filename}`,
              status: 'SUBMITTED',
            },
          });
          createdDocs.push(doc);
        }
      }

      // Émission de l'événement shop.documents_uploaded sur RabbitMQ pour MS4
      await rabbitMQ.publish('shop.documents_uploaded', {
        shopId: shop.id,
        userId: shop.userId,
        documentsCount: createdDocs.length,
      }).catch((err) => console.warn('[MS1-Shop] RabbitMQ publish shop.documents_uploaded warning:', err.message));

      res.status(201).json({
        message: 'Pièces justificatives enregistrées avec succès.',
        documents: createdDocs,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getShopDocumentsForAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const documents = await prisma.shopDocument.findMany({
        where: { shopId: id },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ documents });
    } catch (err) {
      next(err);
    }
  }

  public static async downloadDocumentForAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, filename } = req.params;

      const doc = await prisma.shopDocument.findFirst({
        where: { shopId: id, filename },
      });

      if (!doc) {
        throw new NotFoundError('Document non trouvé.');
      }

      const filePath = path.join(config.uploadDir, doc.filename);
      if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Fichier introuvable sur le volume de stockage.');
      }

      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      next(err);
    }
  }

  public static async updateShopStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      if (!status || !['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].includes(status)) {
        throw new BadRequestError('Statut invalide. Valeurs autorisées : PENDING, APPROVED, REJECTED, SUSPENDED');
      }

      const existingShop = await prisma.shop.findUnique({ where: { id }, include: { user: true } });
      if (!existingShop) {
        throw new NotFoundError('Boutique non trouvée.');
      }

      const updated = await prisma.shop.update({
        where: { id },
        data: {
          status: status as any,
          suspensionReason: status === 'SUSPENDED' ? (reason || 'Suspendu par l\'administrateur') : null,
        },
        include: { user: true },
      });

      // Synchroniser le statut du compte utilisateur
      if (status === 'SUSPENDED') {
        await prisma.user.update({
          where: { id: existingShop.userId },
          data: { status: 'SUSPENDED' },
        });
      } else if (existingShop.user.status === 'SUSPENDED' && (status === 'APPROVED' || status === 'PENDING')) {
        await prisma.user.update({
          where: { id: existingShop.userId },
          data: { status: 'ACTIVE' },
        });
      }

      // 1. Émission de l'événement shop.status_changed pour MS2 (mappé en ACTIVE / SUSPENDED / CLOSED pour l'enum ShopStatus de MS2)
      const mappedStatus = updated.status === 'APPROVED' ? 'ACTIVE' : (updated.status === 'PENDING' ? 'CLOSED' : updated.status);
      await rabbitMQ.publish('shop.status_changed', {
        shopId: updated.id,
        merchantId: updated.userId,
        userId: updated.userId,
        status: mappedStatus,
        shopStatus: updated.status,
        reason: updated.suspensionReason || undefined,
      }).catch((err) => console.warn('[MS1-Shop] RabbitMQ publish shop.status_changed warning:', err.message));

      // 2. Émission des événements explicites merchant.approved / merchant.suspended / merchant.reactivated
      if (status === 'APPROVED') {
        await rabbitMQ.publish('merchant.approved', {
          merchantId: updated.userId,
          shopId: updated.id,
          userId: updated.userId,
          decidedAt: new Date().toISOString(),
        }).catch((err) => console.warn('[MS1-Shop] RabbitMQ publish merchant.approved warning:', err.message));

        if (existingShop.status === 'SUSPENDED') {
          await rabbitMQ.publish('merchant.reactivated', {
            merchantId: updated.userId,
            shopId: updated.id,
            userId: updated.userId,
          }).catch((err) => console.warn('[MS1-Shop] RabbitMQ publish merchant.reactivated warning:', err.message));
        }
      } else if (status === 'SUSPENDED') {
        await rabbitMQ.publish('merchant.suspended', {
          merchantId: updated.userId,
          shopId: updated.id,
          userId: updated.userId,
          reason: updated.suspensionReason || 'Suspendu par l\'administrateur',
          suspendedAt: new Date().toISOString(),
        }).catch((err) => console.warn('[MS1-Shop] RabbitMQ publish merchant.suspended warning:', err.message));
      }

      res.json({ shop: updated });
    } catch (err) {
      next(err);
    }
  }
}
