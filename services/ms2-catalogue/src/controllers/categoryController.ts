// src/controllers/categoryController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { Errors } from '../utils/apiError';
import { logger } from '../config/logger';

/**
 * GET /api/categories
 * Returns all categories, ordered by sort_order.
 * Public endpoint — no authentication required.
 */
export async function getCategories(req: Request, res: Response): Promise<void> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sort_order: 'asc' },
    });

    res.json({
      data: categories.map((c) => ({
        id:       c.id,
        slug:     c.slug,
        nameFr:   c.name_fr,
        nameAr:   c.name_ar,
        icon:     c.icon,
        sortOrder: c.sort_order,
      })),
    });
  } catch (error) {
    logger.error('getCategories error', { error });
    Errors.internal(res);
  }
}
