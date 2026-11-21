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
import { AuthenticatedRequest, OfferSearchParams, JwtPayload } from '../types';
import { publishEvent } from '../messaging/publisher';
import { v4 as uuidv4 } from 'uuid';
import { Prisma, OfferStatus, ProductType, MovementType, ShopStatus } from '@prisma/client';
import { haversineKm } from '../utils/haversine';
import { getAlgiersCalendarDate, isSameDayInAlgiers } from '../utils/timezone';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcDiscount(original: number, discounted: number): number {
  return Math.round((1 - discounted / original) * 100);
}

function parseNumberParam(val: unknown, name: string): { value?: number; error?: string } {
  if (val === undefined || val === null || val === '') return {};
  const num = Number(val);
  if (isNaN(num)) return { error: `Invalid numeric value for query parameter '${name}'.` };
  return { value: num };
}

/**
 * Robust ownership validation:
 * Bridges the gap where MS1's shop.created sends merchantId = shop.userId,
 * while MS1's JWT sets merchantId = shopId and sub = userId.
 */
export function isShopOwnedByMerchant(shop: { id: string; merchant_id: string }, user: JwtPayload): boolean {
  return (
    shop.merchant_id === user.merchantId ||
    shop.merchant_id === user.sub ||
    shop.id === user.shopId ||
    shop.id === user.merchantId
  );
}

export function isOfferOwnedByMerchant(offer: { merchant_id: string; shop_id: string }, user: JwtPayload): boolean {
  return (
    offer.merchant_id === user.merchantId ||
    offer.merchant_id === user.sub ||
    offer.shop_id === user.shopId ||
    offer.shop_id === user.merchantId
  );
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const CreateOfferSchema = z.object({
  shopId:            z.string().uuid(),
  categoryId:        z.string().uuid(),
  name:              z.string().min(3).max(120),
  description:       z.string().min(10).max(2000),
  productType:       z.enum(['PACKAGED', 'FRESH']),
  sameDayExpiry:     z.boolean().default(false),
  originalPrice:     z.number().positive(),
  discountedPrice:   z.number().positive(),
  quantityAvailable: z.number().int().positive(),
  expiresAt:         z.string().datetime(), // pickup deadline
  productExpiryDate: z.string().datetime(), // mandatory product expiry date
});

const UpdateOfferSchema = z.object({
  categoryId:        z.string().uuid().optional(),
  name:              z.string().min(3).max(120).optional(),
  description:       z.string().min(10).max(2000).optional(),
  productType:       z.enum(['PACKAGED', 'FRESH']).optional(),
  sameDayExpiry:     z.boolean().optional(),
  originalPrice:     z.number().positive().optional(),
  discountedPrice:   z.number().positive().optional(),
  expiresAt:         z.string().datetime().optional(),
  productExpiryDate: z.string().datetime().optional(),
});

const StockAdjustmentSchema = z.object({
  quantityDelta: z.number().int().optional(),
  newQuantity:   z.number().int().min(0).optional(),
  reason:        z.string().min(3).max(255),
}).refine(
  (data) => (data.quantityDelta !== undefined) !== (data.newQuantity !== undefined),
  { message: 'Provide exactly one of quantityDelta or newQuantity, not both or neither.' }
);

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
    productType:       offer.product_type,
    sameDayExpiry:     offer.same_day_expiry,
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

// ─── GET /api/offers (Public Catalogue Search) ───────────────────────────────

export async function getOffers(req: Request, res: Response): Promise<void> {
  try {
    const latParsed = parseNumberParam(req.query.lat, 'lat');
    if (latParsed.error) { Errors.badRequest(res, latParsed.error); return; }

    const lngParsed = parseNumberParam(req.query.lng, 'lng');
    if (lngParsed.error) { Errors.badRequest(res, lngParsed.error); return; }

    const radiusParsed = parseNumberParam(req.query.radius, 'radius');
    if (radiusParsed.error) { Errors.badRequest(res, radiusParsed.error); return; }

    // Coordinate pair requirement
    const hasLat = latParsed.value !== undefined;
    const hasLng = lngParsed.value !== undefined;
    if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
      Errors.badRequest(res, 'Both latitude and longitude must be provided together.');
      return;
    }

    if (hasLat && (latParsed.value! < -90 || latParsed.value! > 90)) {
      Errors.badRequest(res, 'Latitude must be between -90 and 90 degrees.');
      return;
    }
    if (hasLng && (lngParsed.value! < -180 || lngParsed.value! > 180)) {
      Errors.badRequest(res, 'Longitude must be between -180 and 180 degrees.');
      return;
    }
    if (radiusParsed.value !== undefined && radiusParsed.value <= 0) {
      Errors.badRequest(res, 'Radius must be a positive number of kilometers.');
      return;
    }

    const minPriceParsed = parseNumberParam(req.query.minPrice, 'minPrice');
    if (minPriceParsed.error) { Errors.badRequest(res, minPriceParsed.error); return; }

    const maxPriceParsed = parseNumberParam(req.query.maxPrice, 'maxPrice');
    if (maxPriceParsed.error) { Errors.badRequest(res, maxPriceParsed.error); return; }

    const minDiscountParsed = parseNumberParam(req.query.minDiscount, 'minDiscount');
    if (minDiscountParsed.error) { Errors.badRequest(res, minDiscountParsed.error); return; }

    const pagination = parsePagination(req.query as Record<string, unknown>);
    const params: OfferSearchParams = {
      ...pagination,
      lat:         latParsed.value,
      lng:         lngParsed.value,
      radius:      radiusParsed.value,
      q:           req.query.q ? String(req.query.q).trim() : undefined,
      category:    req.query.category ? String(req.query.category).trim() : undefined,
      productType: (req.query.productType === 'PACKAGED' || req.query.productType === 'FRESH')
                     ? req.query.productType
                     : undefined,
      minPrice:    minPriceParsed.value,
      maxPrice:    maxPriceParsed.value,
      minDiscount: minDiscountParsed.value,
      available:   req.query.available !== undefined ? req.query.available === 'true' : undefined,
      sort:        (req.query.sort as OfferSearchParams['sort']) ?? 'deadline',
    };

    const now = new Date();

    // Strict public visibility:
    // 1. ACTIVE status only
    // 2. Positive stock available (> 0)
    // 3. Pickup deadline not passed
    // 4. Product expiry date not passed
    // 5. Merchant shop must be ACTIVE
    const where: Prisma.OfferWhereInput = {
      status:              OfferStatus.ACTIVE,
      quantity_available:  { gt: 0 },
      expires_at:          { gt: now },
      product_expiry_date: { gt: now },
      shop:                { status: ShopStatus.ACTIVE },
    };

    if (params.q) {
      where.OR = [
        { name: { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
      ];
    }
    if (params.category) {
      where.category = { slug: params.category };
    }
    if (params.productType) {
      where.product_type = params.productType;
    }
    if (params.minPrice !== undefined) {
      where.discounted_price = { ...((where.discounted_price as object) || {}), gte: params.minPrice };
    }
    if (params.maxPrice !== undefined) {
      where.discounted_price = { ...((where.discounted_price as object) || {}), lte: params.maxPrice };
    }
    if (params.minDiscount !== undefined) {
      where.discount_percent = { gte: params.minDiscount };
    }

    const orderBy: Prisma.OfferOrderByWithRelationInput[] = [];
    if (params.sort === 'price')    orderBy.push({ discounted_price: 'asc' });
    if (params.sort === 'deadline') orderBy.push({ expires_at: 'asc' });
    if (params.sort === 'discount') orderBy.push({ discount_percent: 'desc' });

    // Distance filtering / sorting (must happen before pagination)
    const hasLocation = params.lat !== undefined && params.lng !== undefined;
    const isDistanceFilter = hasLocation && (params.radius !== undefined || params.sort === 'distance');

    if (isDistanceFilter) {
      const allOffers = await prisma.offer.findMany({
        where,
        include: { photos: { orderBy: { sort_order: 'asc' } }, category: true, shop: true },
        orderBy: orderBy.length ? orderBy : [{ expires_at: 'asc' }],
      });

      let resultsWithDist = allOffers.map((offer) => {
        const dist = haversineKm(params.lat!, params.lng!, offer.shop.latitude, offer.shop.longitude);
        return { offer, dist };
      });

      if (params.radius !== undefined) {
        resultsWithDist = resultsWithDist.filter((item) => item.dist <= params.radius!);
      }

      if (params.sort === 'distance') {
        resultsWithDist.sort((a, b) => a.dist - b.dist);
      }

      const total = resultsWithDist.length;
      const startIndex = (pagination.page - 1) * pagination.limit;
      const paged = resultsWithDist.slice(startIndex, startIndex + pagination.limit).map((item) => item.offer);

      res.json(buildPaginatedResponse(paged.map(mapOfferToResponse), total, pagination));
      return;
    }

    // Standard database pagination
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

    res.json(buildPaginatedResponse(offers.map(mapOfferToResponse), total, pagination));
  } catch (error) {
    logger.error('getOffers error', { error });
    Errors.internal(res);
  }
}

// ─── GET /api/offers/:id (Public Offer Details) ──────────────────────────────

export async function getOfferById(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const offer = await prisma.offer.findUnique({
      where:   { id },
      include: { photos: { orderBy: { sort_order: 'asc' } }, category: true, shop: true },
    });

    if (!offer) {
      Errors.notFound(res, 'Offer not found.');
      return;
    }

    const publicAllowedStatuses = [OfferStatus.ACTIVE, OfferStatus.SOLD_OUT];
    const now = new Date();

    if (
      !publicAllowedStatuses.includes(offer.status as any) ||
      offer.expires_at <= now ||
      offer.product_expiry_date <= now ||
      offer.shop?.status !== ShopStatus.ACTIVE
    ) {
      Errors.notFound(res, 'Offer not found or no longer available.');
      return;
    }

    res.json({ data: mapOfferToResponse(offer) });
  } catch (error) {
    logger.error('getOfferById error', { error });
    Errors.internal(res);
  }
}

// ─── GET /api/offers/mine (Merchant Offers) ───────────────────────────────────

export async function getMyOffers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const user = req.user;
    const merchantIds = Array.from(new Set([user.merchantId, user.sub, user.shopId].filter(Boolean)));

    const where: Prisma.OfferWhereInput = {
      OR: [
        { merchant_id: { in: merchantIds } },
        { shop_id: { in: merchantIds } },
      ],
    };

    const [offers, total] = await prisma.$transaction([
      prisma.offer.findMany({
        where,
        include: { photos: { orderBy: { sort_order: 'asc' } }, category: true, shop: true },
        orderBy: [{ created_at: 'desc' }],
        skip:    (pagination.page - 1) * pagination.limit,
        take:    pagination.limit,
      }),
      prisma.offer.count({ where }),
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
    const now = new Date();
    const expiryDate = new Date(data.productExpiryDate);
    const deadline   = new Date(data.expiresAt);

    // Business rule: discounted price strictly lower than original price
    if (data.discountedPrice >= data.originalPrice) {
      Errors.badRequest(res, 'Discounted price must be strictly lower than the original price.');
      return;
    }

    // Business rule: product expiry date cannot be in the past
    if (expiryDate <= now) {
      Errors.badRequest(res, 'Product expiry date cannot be in the past.');
      return;
    }

    // Business rule: pickup deadline cannot be in the past
    if (deadline <= now) {
      Errors.badRequest(res, 'Pickup deadline cannot be in the past.');
      return;
    }

    // Business rule: pickup deadline cannot exceed product expiry date
    if (deadline > expiryDate) {
      Errors.badRequest(res, 'Pickup deadline cannot be after the product expiry date.');
      return;
    }

    // Same-day expiry timezone rule (Africa/Algiers)
    if (data.sameDayExpiry) {
      const algiersExpiryDay   = getAlgiersCalendarDate(expiryDate);
      const algiersDeadlineDay = getAlgiersCalendarDate(deadline);
      const algiersToday       = getAlgiersCalendarDate(now);

      if (!isSameDayInAlgiers(expiryDate, deadline)) {
        Errors.badRequest(
          res,
          `For same-day expiry offers, the product expiry date (${algiersExpiryDay}) and pickup deadline (${algiersDeadlineDay}) must fall on the exact same calendar day in Algeria.`
        );
        return;
      }

      if (algiersDeadlineDay < algiersToday) {
        Errors.badRequest(res, 'Same-day offers cannot be created for a past calendar date in Algeria.');
        return;
      }
    }

    // Verify shop exists and belongs to this merchant (handles both userId and shopId claims)
    const shop = await prisma.shopSnapshot.findUnique({ where: { id: data.shopId } });
    if (!shop || !isShopOwnedByMerchant(shop, req.user)) {
      Errors.forbidden(res, 'You do not own this shop.');
      return;
    }
    if (shop.status !== ShopStatus.ACTIVE) {
      Errors.forbidden(res, 'This shop is not active.');
      return;
    }

    // Verify food category exists
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      Errors.badRequest(res, 'Invalid category.');
      return;
    }

    const discountPercent = calcDiscount(data.originalPrice, data.discountedPrice);

    // Offers strictly start as DRAFT
    const offer = await prisma.offer.create({
      data: {
        merchant_id:         req.user.merchantId || req.user.sub,
        shop_id:             data.shopId,
        category_id:         data.categoryId,
        name:                data.name,
        description:         data.description,
        product_type:        data.productType as ProductType,
        same_day_expiry:     data.sameDayExpiry,
        original_price:      data.originalPrice,
        discounted_price:    data.discountedPrice,
        discount_percent:    discountPercent,
        quantity_available:  data.quantityAvailable,
        quantity_initial:    data.quantityAvailable,
        expires_at:          deadline,
        product_expiry_date: expiryDate,
        status:              OfferStatus.DRAFT,
      },
      include: { photos: true, category: true, shop: true },
    });

    res.status(201).json({ data: mapOfferToResponse(offer) });
  } catch (error) {
    logger.error('createOffer error', { error });
    Errors.internal(res);
  }
}

// ─── POST /api/offers/:id/date-photo ─────────────────────────────────────────

export async function uploadDatePhoto(req: AuthenticatedRequest, res: Response): Promise<void> {
  const file = req.file;
  if (!file) {
    Errors.badRequest(res, 'No photo uploaded.');
    return;
  }

  try {
    const id = req.params.id as string;
    const offer = await prisma.offer.findUnique({ where: { id } });

    if (!offer) {
      await fs.unlink(file.path).catch(() => {});
      Errors.notFound(res, 'Offer not found.');
      return;
    }
    if (!isOfferOwnedByMerchant(offer, req.user)) {
      await fs.unlink(file.path).catch(() => {});
      Errors.forbidden(res, 'You do not own this offer.');
      return;
    }
    if (offer.status !== OfferStatus.DRAFT && offer.status !== OfferStatus.REJECTED) {
      await fs.unlink(file.path).catch(() => {});
      Errors.badRequest(res, `Cannot upload date photo for offer with status '${offer.status}'.`);
      return;
    }

    // Content validation with Sharp
    const metadata = await sharp(file.path).metadata();
    if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
      await fs.unlink(file.path).catch(() => {});
      Errors.badRequest(res, 'Uploaded file is not a valid image.');
      return;
    }

    const compressed = `compressed_date_${file.filename}`;
    const outputPath = path.join(env.UPLOAD_DIR, compressed);

    await sharp(file.path)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(outputPath);

    await fs.unlink(file.path).catch(() => {});

    const url = `${env.MEDIA_BASE_URL}/${compressed}`;

    const updated = await prisma.offer.update({
      where: { id },
      data:  { date_photo_url: url },
    });

    res.json({ data: { datePhotoUrl: updated.date_photo_url } });
  } catch (error) {
    if (file?.path) await fs.unlink(file.path).catch(() => {});
    logger.error('uploadDatePhoto error', { error });
    Errors.internal(res);
  }
}

// ─── POST /api/offers/:id/submit ─────────────────────────────────────────────

export async function submitOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const offer = await prisma.offer.findUnique({
      where:   { id },
      include: { photos: true, category: true, shop: true },
    });

    if (!offer) {
      Errors.notFound(res, 'Offer not found.');
      return;
    }
    if (!isOfferOwnedByMerchant(offer, req.user)) {
      Errors.forbidden(res, 'You do not own this offer.');
      return;
    }
    if (offer.status !== OfferStatus.DRAFT && offer.status !== OfferStatus.REJECTED) {
      Errors.badRequest(res, `Offer cannot be submitted from status '${offer.status}'.`);
      return;
    }

    // Guard: Must have at least 1 product photo
    if (!offer.photos || offer.photos.length === 0) {
      Errors.badRequest(res, 'At least one product photo must be uploaded before submitting.');
      return;
    }

    // PACKAGED products require a date label photo
    if (offer.product_type === ProductType.PACKAGED && !offer.date_photo_url) {
      Errors.badRequest(res, 'A date label photo is required for packaged products before submission.');
      return;
    }

    const now = new Date();
    if (offer.expires_at <= now || offer.product_expiry_date <= now) {
      Errors.badRequest(res, 'Cannot submit an offer whose pickup deadline or product expiry date has passed.');
      return;
    }

    // Fresh correlation ID for this verification attempt
    const verificationEventId = uuidv4();

    // Transition strictly to PENDING_VERIFICATION and record verification_event_id
    const updated = await prisma.offer.update({
      where: { id },
      data:  {
        status:                OfferStatus.PENDING_VERIFICATION,
        verification_event_id: verificationEventId,
        rejection_reason:      null,
      },
      include: { photos: true, category: true, shop: true },
    });

    // Publish event for verification service using publisher confirms
    const published = await publishEvent({
      eventId:    verificationEventId,
      type:       'offer.needs_verification',
      occurredAt: new Date().toISOString(),
      payload: {
        verificationEventId,
        offerId:           updated.id,
        merchantId:        req.user.merchantId || req.user.sub,
        productType:       updated.product_type,
        productExpiryDate: updated.product_expiry_date.toISOString(),
        datePhotoUrl:      updated.date_photo_url,
        freshnessInspectionNeeded: updated.product_type === ProductType.FRESH,
      },
    });

    // Guaranteed publishing: if publish fails, revert offer status back so it is never stuck
    if (!published) {
      await prisma.offer.update({
        where: { id },
        data: {
          status:                offer.status, // Revert to DRAFT or REJECTED
          verification_event_id: null,
        },
      });
      logger.error('Failed to confirm delivery of offer.needs_verification event; reverted offer status', { offerId: id });
      Errors.internal(res, 'Unable to submit offer for verification due to messaging broker unavailability. Please try again.');
      return;
    }

    res.json({ data: mapOfferToResponse(updated) });
  } catch (error) {
    logger.error('submitOffer error', { error });
    Errors.internal(res);
  }
}

// ─── POST /api/offers/:id/withdraw ───────────────────────────────────────────

export async function withdrawOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const offer = await prisma.offer.findUnique({ where: { id } });

    if (!offer) {
      Errors.notFound(res, 'Offer not found.');
      return;
    }
    if (!isOfferOwnedByMerchant(offer, req.user)) {
      Errors.forbidden(res, 'You do not own this offer.');
      return;
    }
    if (offer.status === OfferStatus.WITHDRAWN) {
      Errors.conflict(res, 'Offer is already withdrawn.');
      return;
    }
    if (offer.status === OfferStatus.EXPIRED || offer.status === OfferStatus.SOLD_OUT) {
      Errors.badRequest(res, `Cannot withdraw an offer with status '${offer.status}'.`);
      return;
    }

    const updated = await prisma.offer.update({
      where: { id },
      data:  {
        status:                OfferStatus.WITHDRAWN,
        verification_event_id: null,
      },
      include: { photos: true, category: true, shop: true },
    });

    await publishEvent({
      eventId:    uuidv4(),
      type:       'offer.withdrawn',
      occurredAt: new Date().toISOString(),
      payload: {
        offerId:    updated.id,
        merchantId: req.user.merchantId || req.user.sub,
      },
    });

    res.json({ data: mapOfferToResponse(updated) });
  } catch (error) {
    logger.error('withdrawOffer error', { error });
    Errors.internal(res);
  }
}

// ─── POST /api/offers/:id/stock-adjustment ───────────────────────────────────

export async function adjustStock(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const parsed = StockAdjustmentSchema.safeParse(req.body);

    if (!parsed.success) {
      Errors.badRequest(res, 'Validation failed', { issues: parsed.error.flatten() });
      return;
    }

    const { quantityDelta, newQuantity, reason } = parsed.data;

    // Concurrency-safe: lock the offer row inside the transaction with FOR UPDATE
    const result = await prisma.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw<any[]>`
        SELECT id, merchant_id, status, quantity_available, quantity_initial, expires_at, product_expiry_date, shop_id
        FROM offers
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        return { kind: 'not_found' as const };
      }

      const offer = lockedRows[0];

      if (!isOfferOwnedByMerchant(offer, req.user)) {
        return { kind: 'forbidden' as const };
      }
      if ([OfferStatus.EXPIRED, OfferStatus.REJECTED, OfferStatus.HIDDEN, OfferStatus.WITHDRAWN].includes(offer.status as any)) {
        return { kind: 'ineligible_status' as const, status: offer.status };
      }

      const currentQty = offer.quantity_available;
      let targetQty: number;
      let delta: number;

      if (newQuantity !== undefined) {
        targetQty = newQuantity;
        delta = targetQty - currentQty;
      } else {
        delta = quantityDelta!;
        targetQty = currentQty + delta;
      }

      // Reject zero change
      if (delta === 0) {
        return { kind: 'zero_change' as const };
      }

      if (targetQty < 0) {
        return { kind: 'negative_stock' as const };
      }

      // Calculate outstanding reserved quantity to recalculate quantity_initial properly
      const [resAgg, relAgg, pickAgg] = await Promise.all([
        tx.stockMovement.aggregate({
          where: { offer_id: id, movement_type: MovementType.RESERVE },
          _sum:  { quantity: true },
        }),
        tx.stockMovement.aggregate({
          where: { offer_id: id, movement_type: MovementType.RELEASE },
          _sum:  { quantity: true },
        }),
        tx.stockMovement.aggregate({
          where: { offer_id: id, movement_type: MovementType.PICKUP },
          _sum:  { quantity: true },
        }),
      ]);

      const totalReserved = resAgg._sum.quantity ?? 0;
      const totalReleased = relAgg._sum.quantity ?? 0;
      const totalPickedUp = pickAgg._sum.quantity ?? 0;
      const outstandingReserved = Math.max(0, totalReserved - totalReleased - totalPickedUp);

      // Recalculate quantity_initial as: targetQty + outstandingReserved
      const newQuantityInitial = targetQty + outstandingReserved;

      await tx.stockMovement.create({
        data: {
          offer_id:      id,
          movement_type: MovementType.ADJUSTMENT,
          quantity:      Math.abs(delta),
          reason,
        },
      });

      let newStatus = offer.status;
      let becameSoldOut = false;
      const now = new Date();

      if (targetQty === 0 && offer.status === OfferStatus.ACTIVE) {
        newStatus = OfferStatus.SOLD_OUT;
        becameSoldOut = true;
      } else if (
        targetQty > 0 &&
        offer.status === OfferStatus.SOLD_OUT &&
        new Date(offer.expires_at) > now &&
        new Date(offer.product_expiry_date) > now
      ) {
        const shop = await tx.shopSnapshot.findUnique({ where: { id: offer.shop_id } });
        if (shop?.status === ShopStatus.ACTIVE) {
          newStatus = OfferStatus.ACTIVE;
        }
      }

      const updated = await tx.offer.update({
        where: { id },
        data: {
          quantity_available: targetQty,
          quantity_initial:   newQuantityInitial,
          status:             newStatus,
        },
        include: { photos: true, category: true, shop: true },
      });

      return { kind: 'success' as const, updated, becameSoldOut };
    });

    if (result.kind === 'not_found') {
      Errors.notFound(res, 'Offer not found.');
      return;
    }
    if (result.kind === 'forbidden') {
      Errors.forbidden(res, 'You do not own this offer.');
      return;
    }
    if (result.kind === 'ineligible_status') {
      Errors.badRequest(res, `Cannot adjust stock for an offer with status '${result.status}'.`);
      return;
    }
    if (result.kind === 'zero_change') {
      Errors.badRequest(res, 'Stock adjustment must result in a change to available quantity.');
      return;
    }
    if (result.kind === 'negative_stock') {
      Errors.badRequest(res, 'Adjusted quantity cannot be negative.');
      return;
    }

    if (result.becameSoldOut) {
      await publishEvent({
        eventId:    uuidv4(),
        type:       'offer.sold_out',
        occurredAt: new Date().toISOString(),
        payload: {
          offerId:    id,
          merchantId: req.user.merchantId || req.user.sub,
        },
      });
    }

    res.json({ data: mapOfferToResponse(result.updated) });
  } catch (error) {
    logger.error('adjustStock error', { error });
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
    if (!isOfferOwnedByMerchant(existing, req.user)) {
      Errors.forbidden(res, 'You do not own this offer.');
      return;
    }
    if ([OfferStatus.EXPIRED, OfferStatus.SOLD_OUT, OfferStatus.REJECTED, OfferStatus.WITHDRAWN].includes(existing.status as any)) {
      Errors.badRequest(res, `Cannot edit an offer with status '${existing.status}'.`);
      return;
    }

    const parsed = UpdateOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      Errors.badRequest(res, 'Validation failed', { issues: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;

    // Verify category if updated
    if (data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!category) {
        Errors.badRequest(res, 'Specified category does not exist.');
        return;
      }
    }

    // Price validation
    const newOriginal   = data.originalPrice   ?? Number(existing.original_price);
    const newDiscounted = data.discountedPrice  ?? Number(existing.discounted_price);
    if (newDiscounted >= newOriginal) {
      Errors.badRequest(res, 'Discounted price must be strictly lower than the original price.');
      return;
    }

    const now = new Date();
    const expiryDate = data.productExpiryDate ? new Date(data.productExpiryDate) : existing.product_expiry_date;
    const deadline   = data.expiresAt ? new Date(data.expiresAt) : existing.expires_at;

    if (data.productExpiryDate && expiryDate <= now) {
      Errors.badRequest(res, 'Product expiry date cannot be in the past.');
      return;
    }
    if (data.expiresAt && deadline <= now) {
      Errors.badRequest(res, 'Pickup deadline cannot be in the past.');
      return;
    }
    if (deadline > expiryDate) {
      Errors.badRequest(res, 'Pickup deadline cannot be after the product expiry date.');
      return;
    }

    // Same-day expiry timezone check
    const isSameDay = data.sameDayExpiry ?? existing.same_day_expiry;
    if (isSameDay) {
      const algiersExpiryDay   = getAlgiersCalendarDate(expiryDate);
      const algiersDeadlineDay = getAlgiersCalendarDate(deadline);
      const algiersToday       = getAlgiersCalendarDate(now);

      if (!isSameDayInAlgiers(expiryDate, deadline)) {
        Errors.badRequest(
          res,
          `For same-day expiry offers, product expiry (${algiersExpiryDay}) and pickup deadline (${algiersDeadlineDay}) must fall on the exact same calendar day in Algeria.`
        );
        return;
      }

      if (algiersDeadlineDay < algiersToday) {
        Errors.badRequest(res, 'Same-day offers cannot be set for a past calendar date in Algeria.');
        return;
      }
    }

    const discountPercent = calcDiscount(newOriginal, newDiscounted);

    // Lifecycle transitions:
    let newStatus = existing.status;
    let newVerificationEventId = existing.verification_event_id;
    let needsVerificationPublish = false;
    const targetProductType = (data.productType as ProductType) || existing.product_type;

    if (existing.status === OfferStatus.PENDING_VERIFICATION) {
      const hasCriticalChange =
        data.productType !== undefined ||
        data.productExpiryDate !== undefined ||
        data.expiresAt !== undefined;

      if (hasCriticalChange) {
        newStatus = OfferStatus.DRAFT;
        newVerificationEventId = null; // Invalidate previous verification event
      }
    } else if (existing.status === OfferStatus.ACTIVE) {
      const changedExpiry = data.productExpiryDate !== undefined && data.productExpiryDate !== existing.product_expiry_date.toISOString();
      const changedType = data.productType !== undefined && data.productType !== existing.product_type;

      if (changedExpiry || changedType) {
        if (targetProductType === ProductType.PACKAGED && !existing.date_photo_url) {
          newStatus = OfferStatus.DRAFT;
          newVerificationEventId = null;
        } else {
          newStatus = OfferStatus.PENDING_VERIFICATION;
          newVerificationEventId = uuidv4();
          needsVerificationPublish = true;
        }
      }
    }

    const updated = await prisma.offer.update({
      where: { id },
      data: {
        name:                  data.name,
        description:           data.description,
        product_type:          data.productType as ProductType | undefined,
        same_day_expiry:       data.sameDayExpiry,
        original_price:        data.originalPrice,
        discounted_price:      data.discountedPrice,
        discount_percent:      discountPercent,
        expires_at:            data.expiresAt ? new Date(data.expiresAt) : undefined,
        product_expiry_date:   data.productExpiryDate ? new Date(data.productExpiryDate) : undefined,
        category_id:           data.categoryId,
        status:                newStatus,
        verification_event_id: newVerificationEventId,
      },
      include: { photos: { orderBy: { sort_order: 'asc' } }, category: true, shop: true },
    });

    if (needsVerificationPublish && newVerificationEventId) {
      await publishEvent({
        eventId:    newVerificationEventId,
        type:       'offer.needs_verification',
        occurredAt: new Date().toISOString(),
        payload: {
          verificationEventId: newVerificationEventId,
          offerId:           updated.id,
          merchantId:        req.user.merchantId || req.user.sub,
          productType:       updated.product_type,
          productExpiryDate: updated.product_expiry_date.toISOString(),
          datePhotoUrl:      updated.date_photo_url,
          freshnessInspectionNeeded: updated.product_type === ProductType.FRESH,
        },
      });
    }

    res.json({ data: mapOfferToResponse(updated) });
  } catch (error) {
    logger.error('updateOffer error', { error });
    Errors.internal(res);
  }
}

// ─── DELETE /api/offers/:id (Soft-withdrawal) ────────────────────────────────

export async function deleteOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const existing = await prisma.offer.findUnique({ where: { id } });

    if (!existing) {
      Errors.notFound(res, 'Offer not found.');
      return;
    }
    if (!isOfferOwnedByMerchant(existing, req.user)) {
      Errors.forbidden(res, 'You do not own this offer.');
      return;
    }
    if (existing.status === OfferStatus.WITHDRAWN) {
      Errors.conflict(res, 'Offer is already withdrawn.');
      return;
    }
    if (existing.status === OfferStatus.EXPIRED || existing.status === OfferStatus.SOLD_OUT) {
      Errors.badRequest(res, `Cannot withdraw an offer with status '${existing.status}'.`);
      return;
    }

    await prisma.offer.update({
      where: { id },
      data:  {
        status:                OfferStatus.WITHDRAWN,
        verification_event_id: null,
      },
    });

    await publishEvent({
      eventId:    uuidv4(),
      type:       'offer.withdrawn',
      occurredAt: new Date().toISOString(),
      payload:    { offerId: id, merchantId: req.user.merchantId || req.user.sub },
    });

    res.status(204).send();
  } catch (error) {
    logger.error('deleteOffer error', { error });
    Errors.internal(res);
  }
}

// ─── POST /api/offers/:id/photos ─────────────────────────────────────────────

export async function uploadOfferPhotos(req: AuthenticatedRequest, res: Response): Promise<void> {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    Errors.badRequest(res, 'No files uploaded.');
    return;
  }

  const cleanupFiles = async () => {
    for (const f of files) {
      await fs.unlink(f.path).catch(() => {});
    }
  };

  try {
    const id = req.params.id as string;

    // Validate ALL uploaded images with Sharp before doing any processing
    for (const file of files) {
      try {
        const metadata = await sharp(file.path).metadata();
        if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
          await cleanupFiles();
          Errors.badRequest(res, `File '${file.originalname}' is not a valid JPEG, PNG, or WebP image.`);
          return;
        }
      } catch {
        await cleanupFiles();
        Errors.badRequest(res, `File '${file.originalname}' could not be processed as an image.`);
        return;
      }
    }

    // Compress images to disk
    const compressedFiles: { filename: string; outputPath: string; sizeBytes: number }[] = [];
    for (const file of files) {
      const compressed = `compressed_${file.filename}`;
      const outputPath = path.join(env.UPLOAD_DIR, compressed);
      await sharp(file.path)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(outputPath);
      const stat = await fs.stat(outputPath);
      compressedFiles.push({ filename: compressed, outputPath, sizeBytes: stat.size });
      await fs.unlink(file.path).catch(() => {});
    }

    // Concurrency-safe: lock the offer row in a transaction to serialize concurrent uploads
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<any[]>`
        SELECT id, merchant_id, shop_id, status FROM offers WHERE id = ${id} FOR UPDATE
      `;

      if (!locked || locked.length === 0) {
        return { kind: 'not_found' as const };
      }

      const offer = locked[0];
      if (!isOfferOwnedByMerchant(offer, req.user)) {
        return { kind: 'forbidden' as const };
      }
      if (offer.status !== OfferStatus.DRAFT && offer.status !== OfferStatus.REJECTED) {
        return { kind: 'ineligible_status' as const, status: offer.status };
      }

      const existingCount = await tx.offerPhoto.count({ where: { offer_id: id } });
      if (existingCount + compressedFiles.length > 5) {
        return { kind: 'limit_exceeded' as const, existingCount };
      }

      const maxSortResult = await tx.offerPhoto.aggregate({
        where: { offer_id: id },
        _max:  { sort_order: true },
      });
      const baseSortOrder = (maxSortResult._max.sort_order ?? -1) + 1;

      const createdPhotos = [];
      for (let i = 0; i < compressedFiles.length; i++) {
        const cf = compressedFiles[i];
        const url = `${env.MEDIA_BASE_URL}/${cf.filename}`;
        const photo = await tx.offerPhoto.create({
          data: {
            offer_id:   id,
            url,
            filename:   cf.filename,
            size_bytes: cf.sizeBytes,
            mime_type:  'image/jpeg',
            sort_order: baseSortOrder + i,
          },
        });
        createdPhotos.push({ id: photo.id, url: photo.url, sortOrder: photo.sort_order });
      }

      return { kind: 'success' as const, createdPhotos };
    });

    if (result.kind === 'not_found') {
      for (const cf of compressedFiles) await fs.unlink(cf.outputPath).catch(() => {});
      Errors.notFound(res, 'Offer not found.');
      return;
    }
    if (result.kind === 'forbidden') {
      for (const cf of compressedFiles) await fs.unlink(cf.outputPath).catch(() => {});
      Errors.forbidden(res, 'You do not own this offer.');
      return;
    }
    if (result.kind === 'ineligible_status') {
      for (const cf of compressedFiles) await fs.unlink(cf.outputPath).catch(() => {});
      Errors.badRequest(res, `Cannot upload photos for an offer with status '${result.status}'.`);
      return;
    }
    if (result.kind === 'limit_exceeded') {
      for (const cf of compressedFiles) await fs.unlink(cf.outputPath).catch(() => {});
      Errors.badRequest(
        res,
        `Maximum 5 product photos allowed per offer. This offer already has ${result.existingCount} photo(s).`
      );
      return;
    }

    res.status(201).json({ data: result.createdPhotos });
  } catch (error) {
    await cleanupFiles();
    logger.error('uploadOfferPhotos error', { error });
    Errors.internal(res);
  }
}
