// src/routes/internalRoutes.ts
// Internal service-to-service endpoints.
// MUST NOT be exposed through Traefik (see traefik config — no labels for /internal).

import { Router } from 'express';
import { reserveStock, releaseStock, recordPickup } from '../controllers/stockController';
import { requireInternalKey } from '../middleware/internalAuth';

const router = Router();

// All internal routes require the shared API key
router.use(requireInternalKey);

// POST /internal/offers/:id/reserve  — called by MS3
router.post('/offers/:id/reserve', reserveStock);

// POST /internal/offers/:id/release  — called by MS3
router.post('/offers/:id/release', releaseStock);

// POST /internal/offers/:id/pickup   — called by MS3
router.post('/offers/:id/pickup', recordPickup);

export { router as internalRoutes };
