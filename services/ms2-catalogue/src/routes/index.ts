// src/routes/index.ts
// Central route registration for MS2

import { Router } from 'express';
import { categoryRoutes }  from './categoryRoutes';
import { offerRoutes }     from './offerRoutes';
import { merchantRoutes }  from './merchantRoutes';
import { internalRoutes }  from './internalRoutes';

const router = Router();

router.use('/api/categories', categoryRoutes);
router.use('/api/offers',     offerRoutes);
router.use('/api/merchant',   merchantRoutes);
router.use('/internal',       internalRoutes);

export { router };
