import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
} from '@forsa/common';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { rabbitMQ } from '../services/rabbitmq.service';
import { config } from '../config/env';
import { validateDocumentFile } from '../utils/file-validator';
import { storageService } from '../services/storage.service';
import { geocoderService, GeocoderError } from '../services/geocoder.service';

export const createShopSchema = z.object({
  name: z.string().min(2, 'Le nom du commerce est requis'),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  registryNumber: z.string().optional().nullable(),
  address: z.string().min(5, 'L adresse est requise'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  phone: z.string().min(8, 'Le téléphone de contact est requis'),
  openingHours: z.record(z.any()).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
}).refine(
  (data) => {
    const hasLat = data.latitude !== undefined && data.latitude !== null;
    const hasLng = data.longitude !== undefined && data.longitude !== null;
    return (hasLat && hasLng) || (!hasLat && !hasLng);
  },
  {
    message: 'Latitude et longitude doivent être toutes deux renseignées ou toutes deux absentes.',
    path: ['latitude'],
  }
);

export const updateShopSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  registryNumber: z.string().optional().nullable(),
  address: z.string().min(5).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  phone: z.string().min(8).optional(),
  openingHours: z.record(z.any()).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
}).refine(
  (data) => {
    const hasLat = data.latitude !== undefined && data.latitude !== null;
    const hasLng = data.longitude !== undefined && data.longitude !== null;
    return (hasLat && hasLng) || (!hasLat && !hasLng);
  },
  {
    message: 'Latitude et longitude doivent être toutes deux renseignées ou toutes deux absentes.',
    path: ['latitude'],
  }
);

export class ShopController {
  public static async createShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const existingShop = await prisma.shop.findUnique({ where: { userId } });
      if (existingShop) {
        throw new ConflictError('Une boutique est déjà associée à ce compte commerçant.');
      }

      const parsed = createShopSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
      }

      const { openingHours, category, registryNumber, ...shopData } = parsed.data;

      // Création de la boutique avec persistance de category et registryNumber
      const shop = await prisma.shop.create({
        data: {
          ...shopData,
          category: category || null,
          registryNumber: registryNumber || null,
          openingHours: openingHours !== undefined && openingHours !== null
            ? (openingHours as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          userId,
          verificationStatus: 'PENDING',
        },
      });

      // Attribution du rôle MERCHANT à l'utilisateur sans jamais autoriser ADMIN
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const currentRoles = (user.roles || []) as string[];
        const rolesSet = new Set<string>(currentRoles);
        rolesSet.add('MERCHANT');
        // Protection stricte : interdiction absolue d'attribuer le rôle ADMIN via la création de boutique
        if (!currentRoles.includes('ADMIN')) {
          rolesSet.delete('ADMIN');
        }
        const updatedRoles = Array.from(rolesSet);

        await prisma.user.update({
          where: { id: userId },
          data: {
            roles: updatedRoles as any,
            activeMode: 'merchant',
          },
        });
      }

      // Enregistrement dans les journaux d'audit (audit_logs)
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'SHOP_CREATED',
          ipAddress: req.ip || null,
          userAgent: req.headers ? (req.headers['user-agent'] as string) || null : null,
          metadata: {
            shopId: shop.id,
            shopName: shop.name,
            assignedRole: 'MERCHANT',
          },
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
        status: shop.verificationStatus,
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

      const {
        openingHours,
        category,
        registryNumber,
        latitude,
        longitude,
        address,
        ...shopData
      } = parsed.data;

      let newLatitude: number | null | undefined = latitude;
      let newLongitude: number | null | undefined = longitude;

      // Règle Lot 5A-fix : si latitude et longitude ne sont pas fournies dans la requête
      if (latitude === undefined && longitude === undefined) {
        // Si l'adresse a changé, on réinitialise latitude et longitude à null dans la base
        if (address !== undefined && address.trim() !== shop.address.trim()) {
          newLatitude = null;
          newLongitude = null;
        }
      }

      const updated = await prisma.shop.update({
        where: { id: shop.id },
        data: {
          ...shopData,
          ...(address !== undefined ? { address } : {}),
          ...(category !== undefined ? { category } : {}),
          ...(registryNumber !== undefined ? { registryNumber } : {}),
          ...(newLatitude !== undefined ? { latitude: newLatitude } : {}),
          ...(newLongitude !== undefined ? { longitude: newLongitude } : {}),
          ...(openingHours !== undefined
            ? {
                openingHours: openingHours === null
                  ? Prisma.DbNull
                  : (openingHours as Prisma.InputJsonValue),
              }
            : {}),
        },
      });

      // Émission de l'événement shop.updated sur RabbitMQ pour MS2 (ShopSnapshot)
      const mappedStatus = updated.verificationStatus === 'APPROVED' ? 'ACTIVE' : (updated.verificationStatus === 'PENDING' ? 'CLOSED' : updated.verificationStatus);
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
        shopStatus: updated.verificationStatus,
      }).catch((err) => console.warn('[MS1-Shop] RabbitMQ publish shop.updated warning:', err.message));

      res.json({ shop: updated });
    } catch (err) {
      next(err);
    }
  }

  public static async getShopVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const shop = await prisma.shop.findUnique({
        where: { userId },
        select: {
          verificationStatus: true,
          rejectReason: true,
          createdAt: true,
        },
      });

      if (!shop) {
        throw new NotFoundError('Aucune boutique trouvée pour ce compte.');
      }

      res.json({
        status: shop.verificationStatus,
        rejectReason: shop.rejectReason,
        submittedAt: shop.createdAt,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getMyDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new UnauthorizedError();

      const shop = await prisma.shop.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!shop) {
        throw new NotFoundError('Aucune boutique trouvée pour ce compte.');
      }

      const docs = await prisma.shopDocument.findMany({
        where: { shopId: shop.id },
        select: {
          id: true,
          type: true,
          status: true,
          reason: true,
          createdAt: true,
          originalName: true,
          size: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const documents = docs.map((d) => ({
        id: d.id,
        type: d.type,
        status: d.status,
        reason: d.reason,
        uploadedAt: d.createdAt,
        originalName: d.originalName,
        size: d.size,
      }));

      res.json({ documents });
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
          category: true,
          registryNumber: true,
          address: true,
          latitude: true,
          longitude: true,
          phone: true,
          logoUrl: true,
          verificationStatus: true,
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

      const docTypeMapping: Record<string, 'COMMERCIAL_REGISTER' | 'TAX_ID' | 'STOREFRONT'> = {
        commercial_register: 'COMMERCIAL_REGISTER',
        tax_id: 'TAX_ID',
        storefront: 'STOREFRONT',
      };

      // 1. Validation préalable de chaque fichier via ses magic bytes et sa taille (< 5 Mo)
      for (const [fieldName, fileArray] of Object.entries(files)) {
        const file = fileArray?.[0];
        const docType = docTypeMapping[fieldName];
        if (docType && file) {
          const validation = validateDocumentFile(file);
          if (!validation.valid) {
            throw new BadRequestError(`Fichier ${fieldName} invalide : ${validation.error}`);
          }
        }
      }

      const createdDocs = [];

      // 2. Persistance dans la base de données via StorageService (BYTEA)
      for (const [fieldName, fileArray] of Object.entries(files)) {
        const file = fileArray?.[0];
        const docType = docTypeMapping[fieldName];
        if (docType && file) {
          const validation = validateDocumentFile(file);

          // Remplacement d'un ancien document de même type s'il existe
          await prisma.shopDocument.deleteMany({
            where: { shopId: shop.id, type: docType },
          });

          const doc = await prisma.shopDocument.create({
            data: {
              shopId: shop.id,
              type: docType,
              filename: file.originalname || `${docType.toLowerCase()}_${Date.now()}`,
              originalName: file.originalname || `${docType.toLowerCase()}`,
              mimeType: validation.detectedMime || file.mimetype,
              size: file.buffer.length,
              fileUrl: null,
              storagePath: `db://${shop.id}/${docType}`,
              status: 'SUBMITTED',
            },
          });

          // Appel explicite à StorageService.put
          await storageService.put(
            doc.id,
            file.buffer,
            validation.detectedMime || file.mimetype,
            doc.originalName
          );

          createdDocs.push({
            id: doc.id,
            type: doc.type,
            status: doc.status,
            uploadedAt: doc.createdAt,
          });
        }
      }

      // Émission de l'événement merchant.submitted et shop.documents_uploaded sur RabbitMQ pour MS4
      const submitPayload = {
        shopId: shop.id,
        merchantId: shop.userId,
        userId: shop.userId,
        name: shop.name,
        documentsCount: createdDocs.length,
      };
      await rabbitMQ.publish('merchant.submitted', submitPayload)
        .catch((err) => console.warn('[MS1-Shop] RabbitMQ publish merchant.submitted warning:', err.message));
      await rabbitMQ.publish('shop.documents_uploaded', submitPayload)
        .catch((err) => console.warn('[MS1-Shop] RabbitMQ publish shop.documents_uploaded warning:', err.message));

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
        select: {
          id: true,
          shopId: true,
          type: true,
          status: true,
          reason: true,
          originalName: true,
          filename: true,
          mimeType: true,
          size: true,
          fileUrl: true,
          storagePath: true,
          createdAt: true,
          updatedAt: true,
        },
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

      // 1. Validation stricte anti-traversal sur id et filename
      if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
        throw new BadRequestError('Identifiant boutique invalide.');
      }

      // Rejeter path traversal brut ou encodé (../, %2e, %2f, %5c, absolus)
      if (
        !filename ||
        filename.includes('..') ||
        filename.includes('/') ||
        filename.includes('\\') ||
        /%2e|%2f|%5c/i.test(filename) ||
        !/^[a-zA-Z0-9_.-]+$/.test(filename)
      ) {
        throw new BadRequestError('Nom de document invalide.');
      }

      // 2. Recherche en base de données par identifiant ou nom de fichier
      const doc = await prisma.shopDocument.findFirst({
        where: {
          shopId: id,
          OR: [
            { id: filename },
            { filename: filename },
          ],
        },
      });

      if (!doc) {
        throw new NotFoundError('Document non trouvé.');
      }

      // 3. Récupération prioritaire via StorageService (stockage BYTEA en base)
      const storedFile = await storageService.get(doc.id);
      if (storedFile && storedFile.data) {
        res.setHeader('Content-Type', storedFile.mimeType || doc.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${storedFile.filename || doc.originalName}"`);
        res.send(storedFile.data);
        return;
      }

      // 4. Rétrocompatibilité : lecture sécurisée du fichier local (UNIQUEMENT depuis doc.filename vérifié en DB)
      // Ne JAMAIS utiliser l'entrée utilisateur brute pour lire le disque
      const uploadDirResolved = path.resolve(config.uploadDir);
      const safeDbFilename = path.basename(doc.filename);
      const safeTargetDiskPath = path.resolve(uploadDirResolved, safeDbFilename);

      if (
        !safeTargetDiskPath.startsWith(uploadDirResolved + path.sep) &&
        safeTargetDiskPath !== uploadDirResolved
      ) {
        throw new BadRequestError('Accès au fichier non autorisé.');
      }

      if (fs.existsSync(safeTargetDiskPath)) {
        res.setHeader('Content-Type', doc.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
        fs.createReadStream(safeTargetDiskPath).pipe(res);
        return;
      }

      throw new NotFoundError('Fichier introuvable sur le volume de stockage.');
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
          verificationStatus: status as any,
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
      const mappedStatus = updated.verificationStatus === 'APPROVED' ? 'ACTIVE' : (updated.verificationStatus === 'PENDING' ? 'CLOSED' : updated.verificationStatus);
      await rabbitMQ.publish('shop.status_changed', {
        shopId: updated.id,
        merchantId: updated.userId,
        userId: updated.userId,
        status: mappedStatus,
        shopStatus: updated.verificationStatus,
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

        if (existingShop.verificationStatus === 'SUSPENDED') {
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

  public static async geocode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = req.query.q as string | undefined;
      if (!q || !q.trim()) {
        throw new BadRequestError('Le paramètre de recherche q est requis');
      }

      const userId = req.user?.sub;
      const result = await geocoderService.geocode(q, userId);
      res.json(result);
    } catch (err: any) {
      if (err instanceof GeocoderError) {
        res.status(err.status).json({ message: err.message, code: err.code });
        return;
      }
      next(err);
    }
  }
}
