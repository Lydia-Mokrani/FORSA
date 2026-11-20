# MS4 — Trust & Moderation Service 👤 @Rafes-Maroua

**Responsable :** Rafes Maroua (Personne 4)  
**Serveur de déploiement :** S4 (`10.0.0.14`)  
**Port HTTP :** `3004`  
**Base de données :** `forsa_ms4_trust` (PostgreSQL 16 - Port 5432 sur S4)  
**Routage Traefik :** `/api/reviews`, `/api/reports`, `/api/admin`  

---

## 📌 Rôles et Responsabilités
- **Analyse OCR (`Tesseract.js`) :** Consomme l'image de la date de péremption envoyée par MS2, extrait la date et publie le résultat `offer.date_verified`.
- **Gestion des avis vérifiés :** Permet au client de laisser une note (1 à 5 étoiles) et un commentaire **uniquement** s'il a réellement retiré son panier (`reservation.picked_up`).
- **Gestion des signalements :** Enregistre les signalements clients avec motif et preuves.
- **Règle critique d'automatisation :** Dès qu'une boutique cumule **5 signalements distincts**, MS4 déclenche automatiquement l'événement `merchant.suspended` sur RabbitMQ.
- **Validation des pièces légales :** Endpoints réservés à l'admin pour approuver ou rejeter les commerçants (`merchant.approved` ou `merchant.rejected`).

---

## 📡 Événements RabbitMQ (Exchange `forsa.events`)
- **Émis :**
  - `offer.date_verified` → Renvoie le statut OCR (`MATCH`, `MISMATCH`, `UNCERTAIN`) à MS2.
  - `merchant.approved` → Notifie MS1 (statut boutique), MS2 (droit de publier) et MS5 (email).
  - `merchant.suspended` → Émis au **5ᵉ signalement** (ordonne le masquage des offres à MS2 et la suspension à MS1).
  - `shop.rating_updated` → Calcule et diffuse la nouvelle note moyenne à MS1 et MS2.
- **Consommés :**
  - `offer.needs_verification` (émis par MS2) → Déclenche le worker d'analyse OCR en tâche de fond.
  - `reservation.picked_up` (émis par MS3) → Marque le client comme éligible pour donner un avis sur cette boutique.
  - `shop.documents_uploaded` (émis par MS1) → Notifie l'admin qu'un dossier commerçant est complet et prêt pour modération.

---

## 📦 Bibliothèque partagée `@forsa/common`
```typescript
import { requireAuth, requireRole, RabbitMQClient, ConsulRegistry, errorHandler } from '@forsa/common';
```
*(Utiliser `requireRole('ADMIN')` pour protéger les routes de validation des pièces justificatives).*
