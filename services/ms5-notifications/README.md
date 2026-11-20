# MS5 — Notifications & Worker Service 👤 @Khoumeri-Asma

**Responsable :** Khoumeri Asma (Personne 5)  
**Serveur de déploiement :** S5 (`10.0.0.15`)  
**Port HTTP :** `3005`  
**Base de données :** `forsa_ms5_notifications` (PostgreSQL 16 - Port 5432 sur S5)  
**Routage Traefik :** `/api/notifications`  

---

## 📌 Rôles et Responsabilités
- **Centre de notifications in-app :** Stockage des alertes utilisateurs en base, historique, et statut lu/non-lu (`GET /api/notifications`, `PUT /api/notifications/:id/read`).
- **Worker d'envoi d'e-mails (`Nodemailer`) :** Traitement en tâche de fond des e-mails transactionnels (confirmation de compte, confirmation de réservation avec QR code, alerte d'expiration).
- **Communication temps réel :** Diffusion des notifications au frontend via Server-Sent Events (SSE) ou WebSockets.

---

## 📡 Événements RabbitMQ Consommés (Exchange `forsa.events`)
MS5 est le plus gros consommateur d'événements du projet :
- `user.registered` (MS1) → Envoi de l'e-mail de bienvenue et validation d'adresse.
- `offer.published` (MS2) → Envoi d'alertes aux clients ayant mis cette boutique en favoris.
- `reservation.created` (MS3) → Envoi de l'e-mail de confirmation de commande avec les instructions de retrait.
- `reservation.picked_up` (MS3) → Notification client invitant à déposer un avis sur son panier.
- `reservation.expired` (MS3) → Alerte client sur le créneau manqué.
- `merchant.approved` (MS4) → E-mail de félicitations au commerçant lui annonçant l'activation de son compte.
- `merchant.suspended` (MS4) → E-mail urgent au commerçant l'informant du blocage de son compte suite aux signalements.

---

## 📦 Bibliothèque partagée `@forsa/common`
```typescript
import { requireAuth, RabbitMQClient, ConsulRegistry, errorHandler } from '@forsa/common';
```
*(Utiliser le client RabbitMQ pour écouter les files avec routage automatique vers la Dead-Letter Queue en cas d'erreur).*
