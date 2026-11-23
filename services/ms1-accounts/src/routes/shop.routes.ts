import { Router } from 'express';
import { requireRole } from '@forsa/common';
import { ShopController } from '../controllers/shop.controller';
import { authenticate } from '../middleware/auth.middleware';
import { documentUpload } from '../middleware/upload.middleware';

export const shopRouter = Router();

// 1. Routes Commerçant - Création & Consultation & Modification
shopRouter.post('/', authenticate, ShopController.createShop);
shopRouter.post('/me', authenticate, ShopController.createShop);
shopRouter.post('/my', authenticate, ShopController.createShop);

shopRouter.get('/me', authenticate, ShopController.getMyShop);
shopRouter.get('/my', authenticate, ShopController.getMyShop);

shopRouter.put('/me', authenticate, ShopController.updateMyShop);
shopRouter.put('/my', authenticate, ShopController.updateMyShop);

// 2. Statut de vérification & consultation de ses propres pièces justificatives
shopRouter.get('/me/verification', authenticate, ShopController.getShopVerification);
shopRouter.get('/my/verification', authenticate, ShopController.getShopVerification);

shopRouter.get('/me/documents', authenticate, ShopController.getMyDocuments);
shopRouter.get('/my/documents', authenticate, ShopController.getMyDocuments);

// 3. Téléversement des 3 pièces justificatives (Registre du commerce, NIF, Devanture)
const uploadFields = documentUpload.fields([
  { name: 'commercial_register', maxCount: 1 },
  { name: 'tax_id', maxCount: 1 },
  { name: 'storefront', maxCount: 1 },
]);

shopRouter.post('/my/documents', authenticate, uploadFields, ShopController.uploadDocuments);
shopRouter.post('/me/documents', authenticate, uploadFields, ShopController.uploadDocuments);

// 4. Géocodage d'adresse Nominatim (serveur backend uniquement)
shopRouter.get('/geocode', authenticate, ShopController.geocode);

// 5. Route publique pour afficher les coordonnées d'une boutique (doit être après /me, /my, /geocode)
shopRouter.get('/:id', ShopController.getPublicShopById);

// 6. Routes d'administration sécurisées (Visualisation des justificatifs légaux et modération statut)
shopRouter.get('/:id/documents', authenticate, requireRole('ADMIN'), ShopController.getShopDocumentsForAdmin);
shopRouter.get('/:id/documents/:filename', authenticate, requireRole('ADMIN'), ShopController.downloadDocumentForAdmin);
shopRouter.patch('/:id/status', authenticate, requireRole('ADMIN'), ShopController.updateShopStatus);
