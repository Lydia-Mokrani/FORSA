// src/routes/categoryRoutes.ts
import { Router } from 'express';
import { getCategories } from '../controllers/categoryController';

const router = Router();

// GET /api/categories — public
router.get('/', getCategories);

export { router as categoryRoutes };
