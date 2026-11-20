# MS3 — Reservations Service 👤 @Itshannahh (Rebahi Doua)

**Responsable :** Rebahi Doua (Personne 3 — GitHub : `@Itshannahh`)  
**Serveur de déploiement :** S3 (`10.0.0.13`)  
**Port HTTP :** `3003`  
**Base de données :** `forsa_ms3_reservations` (PostgreSQL 16 - Port 5432 sur S3)  
**Routage Traefik :** `/api/reservations`  
**Branche Git dédiée :** `feature/ms3-reservations`  

---

## 📌 Rôles et Responsabilités
- Gestion du cycle de vie des réservations (`PENDING`, `PICKED_UP`, `CANCELLED`, `EXPIRED`).
- **Interaction synchrone avec MS2 :** Lors de la réservation, appeler d'abord `POST http://10.0.0.12:3002/internal/offers/:id/reserve` avec `x-internal-api-key` pour garantir l'atomicité du stock.
- Génération d'un **QR Code** et d'un code de retrait textuel unique (ex: `FRS-7492`).
- Validation physique du retrait par le commerçant en magasin (`POST /api/reservations/:id/pickup`).
- Détection des abandons / no-shows.

---

## 📡 Événements RabbitMQ (Exchange `forsa.events`)
- **Émis :**
  - `reservation.created` → Notifie MS4 (éligibilité future avis) et MS5 (e-mail de confirmation avec QR code).
  - `reservation.picked_up` → Déclenche le déblocage de l'avis client sur MS4, notifie MS5, met à jour les ventes sur MS1 et MS2.
  - `reservation.expired` → Émis si l'heure limite est dépassée sans retrait (No-Show).
- **Consommés :**
  - `merchant.suspended` (émis par MS4) → Bloque la création de toute nouvelle réservation chez ce commerçant.

---

## 📦 Bibliothèque partagée `@forsa/common`
```typescript
import { requireAuth, requireRole, RabbitMQClient, ConsulRegistry, BadRequestError } from '@forsa/common';
```
*(Utiliser `requireAuth` pour s'assurer que seul le client connecté peut réserver, ou seul le commerçant peut valider le retrait).*
