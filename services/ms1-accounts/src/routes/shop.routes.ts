import { Router } from 'express';
import { requireRole } from '@forsa/common';
import { ShopController } from '../controllers/shop.controller';
import { authenticate } from '../middleware/auth.middleware';
import { documentUpload } from '../middleware/upload.middleware';

export const shopRouter = Router();

// Routes Commerçant (gestion de sa boutique)
shopRouter.post('/', authenticate, requireRole('MERCHANT'), ShopController.createShop);
shopRouter.get('/my', authenticate, ShopController.getMyShop);
shopRouter.put('/my', authenticate, ShopController.updateMyShop);

// Upload des 3 pièces obligatoires (Registre du commerce, NIF, Devanture)
shopRouter.post(
  '/my/documents',
  authenticate,
  requireRole('MERCHANT'),
  documentUpload.fields([
    { name: 'commercial_register', maxCount: 1 },
    { name: 'tax_id', maxCount: 1 },
    { name: 'storefront', maxCount: 1 },
  ]),
  ShopController.uploadDocuments
);

// Route publique pour afficher les coordonnées d'une boutique
shopRouter.get('/:id', ShopController.getPublicShopById);

// Routes d'administration sécurisées (Visualisation des justificatifs légaux et modération statut)
shopRouter.get('/:id/documents', authenticate, requireRole('ADMIN'), ShopController.getShopDocumentsForAdmin);
shopRouter.get('/:id/documents/:filename', authenticate, requireRole('ADMIN'), ShopController.downloadDocumentForAdmin);
shopRouter.patch('/:id/status', authenticate, requireRole('ADMIN'), ShopController.updateShopStatus);
