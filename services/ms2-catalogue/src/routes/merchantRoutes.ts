// src/routes/merchantRoutes.ts
import { Router } from 'express';
import { getMerchantDashboard } from '../controllers/merchantController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/authorize';
import { AuthenticatedRequest } from '../types';

const router = Router();

// GET /api/merchant/dashboard
router.get(
  '/dashboard',
  authenticate,
  requireRole('MERCHANT'),
  (req, res) => getMerchantDashboard(req as AuthenticatedRequest, res)
);

export { router as merchantRoutes };
