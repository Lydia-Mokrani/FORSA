# MS2 — Catalogue & Search Service 👤 @Lydia-Mokrani (Mokrani May Lydia)

**Responsable :** Mokrani May Lydia (Personne 2 — GitHub : `@Lydia-Mokrani`)  
**Serveur de déploiement :** S2 (`10.0.0.12`)  
**Port HTTP :** `3002`  
**Base de données :** `forsa_ms2_catalogue` (PostgreSQL 16 - Port 5432 sur S2)  
**Routage Traefik :** `/api/offers`, `/api/categories`  
**Branche Git dédiée :** `feature/ms2-catalogue`  

---

## 📌 Rôles et Responsabilités
- Gestion du catalogue des paniers et offres anti-gaspillage.
- Gestion des catégories de produits.
- Moteur de recherche et filtrage par géolocalisation (distance, rayon en km) et statut.
- **Gestion atomique du stock :** Exposition de l'endpoint synchrone interne `POST /internal/offers/:id/reserve` (sécurisé par `x-internal-api-key`) pour réserver immédiatement la quantité demandée par MS3.

---

## 📡 Événements RabbitMQ (Exchange `forsa.events`)
- **Émis :**
  - `offer.needs_verification` → Émis lorsqu'une offre avec photo de date de péremption est créée (traité par MS4).
  - `offer.published` → Émis quand l'offre est active et visible (notifie MS5).
  - `offer.expired` → Émis si la date limite de retrait est dépassée (notifie MS5).
- **Consommés :**
  - `offer.date_verified` (émis par MS4) → Si validé (`MATCH`), passer le statut de l'offre à `ACTIVE` et émettre `offer.published`.
  - `merchant.suspended` (émis par MS4) → Masquer immédiatement toutes les offres actives de la boutique suspendue.
  - `reservation.picked_up` (émis par MS3) → Incrémenter les compteurs de vente pour les statistiques.

---

## 📦 Bibliothèque partagée `@forsa/common`
Pour valider les tokens ou RabbitMQ, utilise directement :
```typescript
import { requireAuth, requireRole, RabbitMQClient, ConsulRegistry, errorHandler } from '@forsa/common';
```
*(Aucun appel HTTP vers MS1 pour vérifier un token, le middleware valide la signature RS256 localement !)*
