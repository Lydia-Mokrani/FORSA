# MS2 — Catalogue & Search Service 👤 @Lydia-Mokrani (Mokrani May Lydia)

**Responsable :** Mokrani May Lydia (Personne 2 — GitHub : `@Lydia-Mokrani`)  
**Serveur de déploiement :** S2 (`10.0.0.12`)  
**Port HTTP :** `3002`  
**Base de données :** `forsa_ms2_catalogue` (PostgreSQL 16 - Port 5432 sur S2 / 5433 local)  
**Routage Traefik :** `/api/offers`, `/api/categories`  
**Branche Git dédiée :** `feature/ms2-catalogue`  

---

## 📌 Rôles et Responsabilités
- Gestion du catalogue des paniers et offres anti-gaspillage.
- Gestion des catégories de produits.
- Moteur de recherche et filtrage par géolocalisation (distance, rayon en km) et statut.
- **Gestion atomique du stock :** Exposition de l'endpoint synchrone interne `POST /internal/offers/:id/reserve` (sécurisé par `x-internal-api-key`) pour réserver immédiatement la quantité demandée par MS3.
- Expiration automatique des offres via tâche cron (`expirationJob.ts`).
- Téléversement et compression d'images produits (Sharp + Multer).

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

## 🛠 Routes de l'API (MS2)

### Publiques
* `GET /api/categories` : Liste de toutes les catégories
* `GET /api/offers` : Recherche et filtres des offres
* `GET /api/offers/:id` : Détails d'une offre

### Commerçant (Authentification requise)
* `GET /api/offers/mine` : Mes offres publiées
* `POST /api/offers` : Créer une offre
* `PATCH /api/offers/:id` : Mettre à jour une offre
* `DELETE /api/offers/:id` : Supprimer une offre
* `POST /api/offers/:id/photos` : Téléverser les photos produits
* `GET /api/merchant/dashboard` : Statistiques de ventes commerçant

### Internes (Sécurisé par `X-Internal-Api-Key` — Non exposé par Traefik)
* `POST /internal/offers/:id/reserve` : Réserver du stock (appelé par MS3)
* `POST /internal/offers/:id/release` : Libérer du stock (appelé par MS3)

---

## 🚀 Démarrage Rapide

```bash
cd services/ms2-catalogue
cp .env.example .env
npm install
npx prisma generate
npm run dev
```
