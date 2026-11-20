// src/routes/offerRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import {
  getOffers,
  getOfferById,
  getMyOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  uploadOfferPhotos,
} from '../controllers/offerController';
import { authenticate } from '../middleware/auth';
import { requireRole, requireEmailVerified, requireApprovedMerchant } from '../middleware/authorize';
import { uploadMiddleware } from '../middleware/upload';
import { AuthenticatedRequest } from '../types';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
// GET /api/offers
router.get('/', getOffers);

// GET /api/offers/mine — must come BEFORE /:id to avoid conflict
router.get(
  '/mine',
  authenticate,
  requireRole('MERCHANT'),
  (req, res, next) => getMyOffers(req as AuthenticatedRequest, res).catch(next)
);

// GET /api/offers/:id
router.get('/:id', getOfferById);

// ─── Merchant ─────────────────────────────────────────────────────────────────
// Middleware chain for all merchant-write operations
const merchantGuard = [
  authenticate,
  requireRole('MERCHANT'),
  requireEmailVerified,
  requireApprovedMerchant,
];

// POST /api/offers
router.post(
  '/',
  ...merchantGuard,
  (req, res) => createOffer(req as AuthenticatedRequest, res)
);

// PATCH /api/offers/:id
router.patch(
  '/:id',
  ...merchantGuard,
  (req, res) => updateOffer(req as AuthenticatedRequest, res)
);

// DELETE /api/offers/:id
router.delete(
  '/:id',
  ...merchantGuard,
  (req, res) => deleteOffer(req as AuthenticatedRequest, res)
);

// POST /api/offers/:id/photos
router.post(
  '/:id/photos',
  ...merchantGuard,
  uploadMiddleware.array('photos', 5),
  (req, res) => uploadOfferPhotos(req as AuthenticatedRequest, res)
);

export { router as offerRoutes };
