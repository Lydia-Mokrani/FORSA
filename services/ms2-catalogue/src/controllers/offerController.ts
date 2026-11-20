// src/controllers/offerController.ts
// Handles all offer-related HTTP requests for MS2.

import { Request, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs/promises';
import { prisma } from '../config/prisma';
import { Errors } from '../utils/apiError';
import { parsePagination, buildPaginatedResponse } from '../utils/pagination';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { AuthenticatedRequest, OfferSearchParams } from '../types';
import { publishEvent } from '../messaging/publisher';
import { v4 as uuidv4 } from 'uuid';
import { Prisma, OfferStatus } from '@prisma/client';

// ─── Validation schemas ───────────────────────────────────────────────────────

const CreateOfferSchema = z.object({
  shopId:            z.string().uuid(),
  categoryId:        z.string().uuid(),
  name:              z.string().min(3).max(120),
  description:       z.string().min(10).max(2000),
  originalPrice:     z.number().positive(),
  discountedPrice:   z.number().positive(),
  quantityAvailable: z.number().int().positive(),
  expiresAt:         z.string().datetime(),
  productExpiryDate: z.string().datetime().optional(),
});

const UpdateOfferSchema = CreateOfferSchema.partial().omit({ shopId: true });

// ─── Helper ───────────────────────────────────────────────────────────────────

function calcDiscount(original: number, discounted: number): number {
  return Math.round((1 - discounted / original) * 100);
}

type OfferWithRelations = Prisma.OfferGetPayload<{
  include: { photos: true; category: true; shop: true };
}> | any;

function mapOfferToResponse(offer: OfferWithRelations) {
  return {
    id:                offer.id,
    merchantId:        offer.merchant_id,
    shopId:            offer.shop_id,
    categoryId:        offer.category_id,
    name:              offer.name,
    description:       offer.description,
    originalPrice:     Number(offer.original_price),
    discountedPrice:   Number(offer.discounted_price),
    discountPercent:   offer.discount_percent,
    quantityAvailable: offer.quantity_available,
    quantityInitial:   offer.quantity_initial,
    expiresAt:         offer.expires_at,
    productExpiryDate: offer.product_expiry_date,
    status:            offer.status,
    datePhotoUrl:      offer.date_photo_url,
    rejectionReason:   offer.rejection_reason,
    createdAt:         offer.created_at,
    updatedAt:         offer.updated_at,
    publishedAt:       offer.published_at,
    photos:            (offer.photos || []).map((p: any) => ({
      id:        p.id,
      url:       p.url,
      sortOrder: p.sort_order,
    })),
    category: offer.category ? {
      id:     offer.category.id,
      slug:   offer.category.slug,
      nameFr: offer.category.name_fr,
      nameAr: offer.category.name_ar,
      icon:   offer.category.icon,
    } : null,
    shop: offer.shop ? {
      id:            offer.shop.id,
      name:          offer.shop.name,
      address:       offer.shop.address,
      latitude:      offer.shop.latitude,
      longitude:     offer.shop.longitude,
      averageRating: offer.shop.average_rating,
      salesCount:    offer.shop.sales_count,
    } : null,
  };
}

// ─── GET /api/offers ──────────────────────────────────────────────────────────

export async function getOffers(req: Request, res: Response): Promise<void> {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const params: OfferSearchParams = {
      ...pagination,
      lat:         req.query.lat         ? parseFloat(String(req.query.lat))         : undefined,
      lng:         req.query.lng         ? parseFloat(String(req.query.lng))         : undefined,
      radius:      req.query.radius      ? parseFloat(String(req.query.radius))      : undefined,
      q:           req.query.q           ? String(req.query.q)                       : undefined,
      category:    req.query.category    ? String(req.query.category)                : undefined,
      minPrice:    req.query.minPrice    ? parseFloat(String(req.query.minPrice))    : undefined,
      maxPrice:    req.query.maxPrice    ? parseFloat(String(req.query.maxPrice))    : undefined,
      minDiscount: req.query.minDiscount ? parseFloat(String(req.query.minDiscount)) : undefined,
      available:   req.query.available   ? req.query.available === 'true'           : undefined,
      sort:        (req.query.sort as OfferSearchParams['sort']) ?? 'deadline',
    };

    // Build where clause
    const where: Prisma.OfferWhereInput = {
      status: OfferStatus.ACTIVE,
    };

    if (params.q) {
      where.name = { contains: params.q, mode: 'insensitive' };
    }
    if (params.category) {
      where.category = { slug: params.category };
    }
    if (params.minPrice !== undefined) {
      where.discounted_price = { ...where.discounted_price as object, gte: params.minPrice };
    }
    if (params.maxPrice !== undefined) {
      where.discounted_price = { ...where.discounted_price as object, lte: params.maxPrice };
    }
    if (params.minDiscount !== undefined) {
      where.discount_percent = { gte: params.minDiscount };
    }
    if (params.available) {
      where.quantity_available = { gt: 0 };
    }

    // Distance filter — applied post-query using Haversine if lat/lng provided
    // (For production scale, use PostGIS; for now we filter in-memory from DB results)
    const orderBy: Prisma.OfferOrderByWithRelationInput[] = [];
    if (params.sort === 'price')    orderBy.push({ discounted_price: 'asc' });
    if (params.sort === 'deadline') orderBy.push({ expires_at: 'asc' });
    if (params.sort === 'discount') orderBy.push({ discount_percent: 'desc' });
    if (params.sort === 'distance' && params.lat !== undefined && params.lng !== undefined) {
      // Distance sort — fetch all matching, sort in JS, then paginate
      // (acceptable for now; replace with PostGIS for production)
    }

    const [offers, total] = await prisma.$transaction([
      prisma.offer.findMany({
        where,
        include: { photos: { orderBy: { sort_order: 'asc' } }, category: true, shop: true },
        orderBy: orderBy.length ? orderBy : [{ expires_at: 'asc' }],
        skip:    (pagination.page - 1) * pagination.limit,
        take:    pagination.limit,
      }),
      prisma.offer.count({ where }),
    ]);

    // Post-filter by distance if lat/lng/radius provided
    let filtered = offers;
    if (params.lat !== undefined && params.lng !== undefined && params.radius !== undefined) {
      const { haversineKm } = await import('../utils/haversine');
      filtered = offers.filter((o) => {
        const dist = haversineKm(params.lat!, params.lng!, o.shop.latitude, o.shop.longitude);
        return dist <= params.radius!;
      });
    }

    res.json(buildPaginatedResponse(filtered.map(mapOfferToResponse), total, pagination));
  } catch (error) {
    logger.error('getOffers error', { error });
    Errors.internal(res);
  }
}

// ─── GET /api/offers/:id ─────────────────────────────────────────────────────

export async function getOfferById(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const offer = await prisma.offer.findUnique({
      where:   { id },
      include: { photos: { orderBy: { sort_order: 'asc' } }, category: true, shop: true },
    });

    if (!offer || offer.status === OfferStatus.HIDDEN) {
      Errors.notFound(res, 'Offer not found.');
      return;
    }

    res.json({ data: mapOfferToResponse(offer) });
  } catch (error) {
    logger.error('getOfferById error', { error });
    Errors.internal(res);
  }
}

// ─── GET /api/offers/mine ────────────────────────────────────────────────────

export async function getMyOffers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const merchantId = req.user.merchantId;

    const [offers, total] = await prisma.$transaction([
      prisma.offer.findMany({
        where:   { merchant_id: merchantId },
        include: { photos: { orderBy: { sort_order: 'asc' } }, category: true, shop: true },
        orderBy: [{ created_at: 'desc' }],
        skip:    (pagination.page - 1) * pagination.limit,
        take:    pagination.limit,
      }),
      prisma.offer.count({ where: { merchant_id: merchantId } }),
    ]);

    res.json(buildPaginatedResponse(offers.map(mapOfferToResponse), total, pagination));
  } catch (error) {
    logger.error('getMyOffers error', { error });
    Errors.internal(res);
  }
}

// ─── POST /api/offers ────────────────────────────────────────────────────────

export async function createOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const parsed = CreateOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      Errors.badRequest(res, 'Validation failed', { issues: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;

    // Business rule: discounted price must be strictly lower than original price
    if (data.discountedPrice >= data.originalPrice) {
      Errors.badRequest(res, 'Discounted price must be strictly lower than the original price.');
      return;
    }

    // Verify shop belongs to this merchant
    const shop = await prisma.shopSnapshot.findUnique({ where: { id: data.shopId } });
    if (!shop || shop.merchant_id !== req.user.merchantId) {
      Errors.forbidden(res, 'You do not own this shop.');
      return;
    }
    if (shop.status !== 'ACTIVE') {
      Errors.forbidden(res, 'This shop is not active.');
      return;
    }

    // Verify category exists
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      Errors.badRequest(res, 'Invalid category.');
      return;
    }

    const discountPercent = calcDiscount(data.originalPrice, data.discountedPrice);

    // Determine initial status:
    // If product_expiry_date is provided → PENDING_VERIFICATION (MS4 OCR needed)
    // Otherwise → ACTIVE immediately
    const needsVerification = !!data.productExpiryDate;
    const status = needsVerification ? OfferStatus.PENDING_VERIFICATION : OfferStatus.ACTIVE;

    const offer = await prisma.offer.create({
      data: {
        merchant_id:          req.user.merchantId,
        shop_id:              data.shopId,
        category_id:          data.categoryId,
        name:                 data.name,
        description:          data.description,
        original_price:       data.originalPrice,
        discounted_price:     data.discountedPrice,
        discount_percent:     discountPercent,
        quantity_available:   data.quantityAvailable,
        quantity_initial:     data.quantityAvailable,
        expires_at:           new Date(data.expiresAt),
        product_expiry_date:  data.productExpiryDate ? new Date(data.productExpiryDate) : undefined,
        status,
        published_at:         status === OfferStatus.ACTIVE ? new Date() : undefined,
      },
      include: { photos: true, category: true, shop: true },
    });

    // Publish event to RabbitMQ
    if (needsVerification) {
      await publishEvent({
        eventId:    uuidv4(),
        type:       'offer.needs_verification',
        occurredAt: new Date().toISOString(),
        payload: {
          offerId:          offer.id,
          merchantId:       req.user.merchantId,
          productExpiryDate: data.productExpiryDate,
          datePhotoUrl:     offer.date_photo_url,
        },
      });
    } else {
      await publishEvent({
        eventId:    uuidv4(),
        type:       'offer.published',
        occurredAt: new Date().toISOString(),
        payload: {
          offerId:    offer.id,
          merchantId: req.user.merchantId,
          shopId:     data.shopId,
          categoryId: data.categoryId,
        },
      });
    }

    res.status(201).json({ data: mapOfferToResponse(offer) });
  } catch (error) {
    logger.error('createOffer error', { error });
    Errors.internal(res);
  }
}

// ─── PATCH /api/offers/:id ───────────────────────────────────────────────────

export async function updateOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const existing = await prisma.offer.findUnique({ where: { id } });

    if (!existing) {
      Errors.notFound(res, 'Offer not found.');
      return;
    }
    // Ownership check
    if (existing.merchant_id !== req.user.merchantId) {
      Errors.forbidden(res, 'You do not own this offer.');
      return;
    }
    // Status check — cannot edit expired/sold-out offers
    if ([OfferStatus.EXPIRED, OfferStatus.SOLD_OUT, OfferStatus.REJECTED].includes(existing.status as any)) {
      Errors.badRequest(res, `Cannot edit an offer with status '${existing.status}'.`);
      return;
    }

    const parsed = UpdateOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      Errors.badRequest(res, 'Validation failed', { issues: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;

    // Price validation if either price is being updated
    const newOriginal   = data.originalPrice   ?? Number(existing.original_price);
    const newDiscounted = data.discountedPrice  ?? Number(existing.discounted_price);
    if (newDiscounted >= newOriginal) {
      Errors.badRequest(res, 'Discounted price must be strictly lower than the original price.');
      return;
    }

    const discountPercent = calcDiscount(newOriginal, newDiscounted);

    const updated = await prisma.offer.update({
      where: { id },
      data: {
        name:               data.name,
        description:        data.description,
        original_price:     data.originalPrice,
        discounted_price:   data.discountedPrice,
        discount_percent:   discountPercent,
        quantity_available: data.quantityAvailable,
        expires_at:         data.expiresAt ? new Date(data.expiresAt) : undefined,
        product_expiry_date: data.productExpiryDate ? new Date(data.productExpiryDate) : undefined,
        category_id:        data.categoryId,
      },
      include: { photos: { orderBy: { sort_order: 'asc' } }, category: true, shop: true },
    });

    res.json({ data: mapOfferToResponse(updated) });
  } catch (error) {
    logger.error('updateOffer error', { error });
    Errors.internal(res);
  }
}

// ─── DELETE /api/offers/:id ──────────────────────────────────────────────────

export async function deleteOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const existing = await prisma.offer.findUnique({ where: { id } });

    if (!existing) {
      Errors.notFound(res, 'Offer not found.');
      return;
    }
    if (existing.merchant_id !== req.user.merchantId) {
      Errors.forbidden(res, 'You do not own this offer.');
      return;
    }
    // Cannot delete if there are active reservations (MS3 would have set quantity < initial)
    // We check for stock movements as a proxy
    const hasReservations = await prisma.stockMovement.findFirst({
      where: { offer_id: id, movement_type: 'RESERVE' },
    });
    if (hasReservations) {
      Errors.conflict(res, 'Cannot delete an offer that has active reservations.');
      return;
    }

    await prisma.offer.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    logger.error('deleteOffer error', { error });
    Errors.internal(res);
  }
}

// ─── POST /api/offers/:id/photos ─────────────────────────────────────────────

export async function uploadOfferPhotos(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const files  = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      Errors.badRequest(res, 'No files uploaded.');
      return;
    }

    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) {
      Errors.notFound(res, 'Offer not found.');
      return;
    }
    if (offer.merchant_id !== req.user.merchantId) {
      Errors.forbidden(res, 'You do not own this offer.');
      return;
    }

    // Compress images using sharp
    const photoRecords = [];
    for (let i = 0; i < files.length; i++) {
      const file        = files[i];
      const compressed  = `compressed_${file.filename}`;
      const outputPath  = path.join(env.UPLOAD_DIR, compressed);

      await sharp(file.path)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(outputPath);

      // Remove original
      await fs.unlink(file.path);

      const url = `${env.MEDIA_BASE_URL}/${compressed}`;

      const photo = await prisma.offerPhoto.create({
        data: {
          offer_id:   id,
          url,
          filename:   compressed,
          size_bytes: (await fs.stat(outputPath)).size,
          mime_type:  'image/jpeg',
          sort_order: i,
        },
      });
      photoRecords.push({ id: photo.id, url: photo.url, sortOrder: photo.sort_order });
    }

    res.status(201).json({ data: photoRecords });
  } catch (error) {
    logger.error('uploadOfferPhotos error', { error });
    Errors.internal(res);
  }
}
