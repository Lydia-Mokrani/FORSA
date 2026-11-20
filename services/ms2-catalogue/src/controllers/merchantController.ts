// src/controllers/merchantController.ts
// Merchant dashboard statistics endpoint

import { Response } from 'express';
import { prisma } from '../config/prisma';
import { Errors } from '../utils/apiError';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../types';
import { OfferStatus, MovementType } from '@prisma/client';

/**
 * GET /api/merchant/dashboard
 * Returns real statistics for the authenticated merchant from MS2's own database.
 */
export async function getMerchantDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const merchantId = req.user.merchantId;

    const [
      totalOffers,
      activeOffers,
      expiredOffers,
      pendingVerification,
      soldOutOffers,
      hiddenOffers,
      withdrawnOffers,
    ] = await Promise.all([
      prisma.offer.count({ where: { merchant_id: merchantId } }),
      prisma.offer.count({ where: { merchant_id: merchantId, status: OfferStatus.ACTIVE } }),
      prisma.offer.count({ where: { merchant_id: merchantId, status: OfferStatus.EXPIRED } }),
      prisma.offer.count({ where: { merchant_id: merchantId, status: OfferStatus.PENDING_VERIFICATION } }),
      prisma.offer.count({ where: { merchant_id: merchantId, status: OfferStatus.SOLD_OUT } }),
      prisma.offer.count({ where: { merchant_id: merchantId, status: OfferStatus.HIDDEN } }),
      prisma.offer.count({ where: { merchant_id: merchantId, status: OfferStatus.WITHDRAWN } }),
    ]);

    // Calculate outstanding reserved quantity:
    // (Total items reserved) - (Total items released + Total items picked up)
    const [reserveAgg, releaseAgg, pickupAgg] = await Promise.all([
      prisma.stockMovement.aggregate({
        where: {
          offer:         { merchant_id: merchantId },
          movement_type: MovementType.RESERVE,
        },
        _sum: { quantity: true },
      }),
      prisma.stockMovement.aggregate({
        where: {
          offer:         { merchant_id: merchantId },
          movement_type: MovementType.RELEASE,
        },
        _sum: { quantity: true },
      }),
      prisma.stockMovement.aggregate({
        where: {
          offer:         { merchant_id: merchantId },
          movement_type: MovementType.PICKUP,
        },
        _sum: { quantity: true },
      }),
    ]);

    const totalReservedQty = reserveAgg._sum.quantity ?? 0;
    const totalReleasedQty = releaseAgg._sum.quantity ?? 0;
    const totalPickedUpQty = pickupAgg._sum.quantity ?? 0;

    const outstandingReservedProducts = Math.max(0, totalReservedQty - totalReleasedQty - totalPickedUpQty);

    // Number of confirmed customer pickup movements
    const pickupCount = await prisma.stockMovement.count({
      where: {
        offer:         { merchant_id: merchantId },
        movement_type: MovementType.PICKUP,
      },
    });

    // Recent offers for activity feed
    const recentOffers = await prisma.offer.findMany({
      where:   { merchant_id: merchantId },
      orderBy: [{ updated_at: 'desc' }],
      take:    5,
      include: { category: true, photos: { take: 1 } },
    });

    // Shop snapshot info for this merchant
    const shops = await prisma.shopSnapshot.findMany({
      where: { merchant_id: merchantId },
    });

    res.json({
      data: {
        stats: {
          totalOffers,
          activeOffers,
          expiredOffers,
          pendingVerification,
          soldOutOffers,
          hiddenOffers,
          withdrawnOffers,
          reservedProducts: outstandingReservedProducts,
          pickups:          pickupCount,
          // Reviews are managed by MS4 — return 0 until MS4 provides them
          reviews:          0,
        },
        recentOffers: recentOffers.map((o) => ({
          id:              o.id,
          name:            o.name,
          status:          o.status,
          productType:     o.product_type,
          sameDayExpiry:   o.same_day_expiry,
          discountedPrice: Number(o.discounted_price),
          discountPercent: o.discount_percent,
          expiresAt:       o.expires_at,
          updatedAt:       o.updated_at,
          category: {
            nameFr: o.category.name_fr,
            icon:   o.category.icon,
          },
          thumbnailUrl: o.photos[0]?.url ?? null,
        })),
        shops: shops.map((s) => ({
          id:            s.id,
          name:          s.name,
          address:       s.address,
          averageRating: s.average_rating,
          salesCount:    s.sales_count,
          status:        s.status,
        })),
      },
    });
  } catch (error) {
    logger.error('getMerchantDashboard error', { error });
    Errors.internal(res);
  }
}
