# FORSA (فرصة) — Catalogue Officiel des Événements RabbitMQ
**Version :** 2.0 (Contrat d'intégration unifié MS1, MS2, MS3, MS4, MS5)  
**Exchange :** `forsa.events` (Type : `topic`, Durable)  
**Convention de routage :** `<entité>.<action>` (ex: `user.registered`, `shop.created`, `offer.published`)  
**Dead-Letter Queue :** `forsa.dlq` (après échec de traitement)  
**Broker unifié (S0 - 10.0.0.10:5672) :** `amqp://forsa_user:forsa_password@10.0.0.10:5672`

---

## 1. Structure de l'Enveloppe Standard (DomainEvent)
Tous les messages publiés sur `forsa.events` respectent obligatoirement cette enveloppe standard JSON :

```typescript
interface EventEnvelope<T> {
  eventId: string;       // UUID v4 unique pour garantir l'idempotence des consommateurs
  type: string;          // Routing key (ex: "shop.created", "offer.published")
  occurredAt: string;    // Horodatage ISO 8601 UTC (ex: "2026-11-21T12:00:00.000Z")
  payload: T;            // Données métier typées (alias standard accessible via event.payload ou event.data)
}
```

---

## 2. Événements émis par MS1 (Accounts & Shops — Hambli Hiba)

### `user.registered`
* **Rôle :** Informe MS5 pour l'envoi de l'e-mail de confirmation et la création du compte.
* **Consommateurs :** MS5 (Notifications)
* **Payload :**
```json
{
  "userId": "uuid",
  "email": "client@example.com",
  "fullName": "Karim Benali",
  "role": "CUSTOMER",
  "verificationToken": "token-hash-12345"
}
```

### `password.reset_requested`
* **Rôle :** Déclenche l'envoi de l'e-mail de réinitialisation de mot de passe.
* **Consommateurs :** MS5 (Notifications)
* **Payload :**
```json
{
  "userId": "uuid",
  "email": "client@example.com",
  "resetToken": "token-reset-xyz",
  "expiresAt": "2026-11-21T13:00:00.000Z"
}
```

### `shop.created`
* **Rôle :** Informe MS2 pour l'initialisation du snapshot de la boutique (`shop_snapshots`), ainsi que MS4/MS5.
* **Consommateurs :** MS2 (Catalogue - initialisation snapshot), MS4, MS5
* **Payload :**
```json
{
  "shopId": "uuid-boutique",
  "merchantId": "uuid-utilisateur-commercant",
  "userId": "uuid-utilisateur-commercant",
  "name": "Boulangerie La Rose",
  "address": "12 Rue des Frères, Boumerdès",
  "latitude": 36.7588,
  "longitude": 3.4756,
  "phone": "+213555123456",
  "status": "PENDING"
}
```

### `shop.updated`
* **Rôle :** Notifie MS2 d'une modification des informations de la boutique (nom, coordonnées GPS, adresse).
* **Consommateurs :** MS2 (Catalogue - mise à jour `shop_snapshots`)
* **Payload :**
```json
{
  "shopId": "uuid-boutique",
  "merchantId": "uuid-utilisateur-commercant",
  "userId": "uuid-utilisateur-commercant",
  "name": "Boulangerie La Rose Gourmande",
  "address": "14 Rue des Frères, Boumerdès",
  "latitude": 36.7590,
  "longitude": 3.4760,
  "phone": "+213555123456",
  "status": "APPROVED"
}
```

### `shop.status_changed`
* **Rôle :** Notifie MS2 du changement de statut d'une boutique (`APPROVED`, `SUSPENDED`, `PENDING`).
* **Consommateurs :** MS2 (Catalogue - mise à jour du statut `shop_snapshots`)
* **Payload :**
```json
{
  "shopId": "uuid-boutique",
  "merchantId": "uuid-utilisateur-commercant",
  "userId": "uuid-utilisateur-commercant",
  "status": "APPROVED",
  "reason": "Documents validés"
}
```

### `merchant.submitted`
* **Rôle :** Notifie MS4 qu'un commerçant a téléversé ses pièces légales pour examen.
* **Consommateurs :** MS4 (Trust & Moderation)
* **Payload :**
```json
{
  "shopId": "uuid-boutique",
  "merchantId": "uuid-utilisateur-commercant",
  "userId": "uuid-utilisateur-commercant",
  "name": "Boulangerie La Rose",
  "documentsCount": 3
}
```

### `merchant.suspended`
* **Rôle :** Émis lors de la suspension d'un commerçant (depuis MS1 ou MS4).
* **Consommateurs :** MS2 (masquage de toutes les offres actives), MS3 (blocage réservations), MS5 (notification)
* **Payload :**
```json
{
  "merchantId": "uuid-utilisateur-commercant",
  "shopId": "uuid-boutique",
  "userId": "uuid-utilisateur-commercant",
  "reason": "Suspension pour non-conformité ou signalements répétés",
  "suspendedAt": "2026-11-21T12:00:00.000Z"
}
```

### `merchant.reactivated`
* **Rôle :** Émis lors de la réactivation d'un commerçant préalablement suspendu.
* **Consommateurs :** MS2 (restauration des offres non expirées vers l'état ACTIVE), MS5 (notification)
* **Payload :**
```json
{
  "merchantId": "uuid-utilisateur-commercant",
  "shopId": "uuid-boutique",
  "userId": "uuid-utilisateur-commercant"
}
```

---

## 3. Événements émis par MS2 (Catalogue & Search — Mokrani May Lydia)

### `offer.needs_verification`
* **Rôle :** Déclenché lors de la création d'un panier emballé nécessitant une vérification OCR de date.
* **Consommateurs :** MS4 (Trust & Moderation)
* **Payload :**
```json
{
  "offerId": "uuid-offre",
  "merchantId": "uuid-commercant",
  "shopId": "uuid-boutique",
  "productExpiryDate": "2026-12-31T00:00:00.000Z",
  "typedExpiryDate": "2026-12-31T00:00:00.000Z",
  "photoUrl": "http://10.0.0.12:3002/media/photo.jpg",
  "datePhotoUrl": "http://10.0.0.12:3002/media/photo.jpg"
}
```

### `offer.published`
* **Rôle :** Offre active et visible sur le catalogue public.
* **Consommateurs :** MS5 (Notifications)
* **Payload :**
```json
{
  "offerId": "uuid-offre",
  "merchantId": "uuid-commercant",
  "shopId": "uuid-boutique",
  "categoryId": "uuid-categorie",
  "name": "Panier viennoiseries du soir",
  "originalPrice": 1200,
  "discountedPrice": 450,
  "quantityAvailable": 5
}
```

### `offer.expired`
* **Rôle :** Retrait de l'offre expirée par cron job / dépassement de la date/heure de validité et retrait du catalogue.
* **Consommateurs :** MS3 (annule réservations en attente), MS5 (Notifications)
* **Payload :**
```json
{
  "offerId": "uuid-offre",
  "merchantId": "uuid-commercant",
  "shopId": "uuid-boutique"
}
```

### `offer.sold_out`
* **Rôle :** Quantité disponible tombée à 0.
* **Consommateurs :** MS5 (Notifications)
* **Payload :**
```json
{
  "offerId": "uuid-offre",
  "merchantId": "uuid-commercant",
  "shopId": "uuid-boutique"
}
```

---

## 4. Événements émis par MS3 (Reservations — Rebahi Doua)

### `reservation.created`
* **Rôle :** Confirmation de commande client, traçabilité et alerte commerçant.
* **Consommateurs :** MS4 (éligibilité future d'avis), MS5 (e-mail & notification push commerçant)
* **Payload :**
```json
{
  "reservationId": "uuid-reservation",
  "customerId": "uuid-client",
  "customerEmail": "client@example.com",
  "customerName": "Karim Benali",
  "shopId": "uuid-boutique",
  "offerId": "uuid-offre",
  "quantity": 2,
  "totalPrice": 900,
  "pickupCode": "FRS-8492",
  "pickupDeadline": "2026-11-21T20:00:00.000Z"
}
```

### `reservation.picked_up`
* **Rôle :** **Confirmation du retrait physique** : incrémente les compteurs de vente et ouvre le droit à l'avis client.
* **Consommateurs :** MS1 (compteur profil boutique), MS2 (incrémentation `shop_snapshots.sales_count`), MS4 (déblocage avis), MS5 (notification)
* **Payload :**
```json
{
  "reservationId": "uuid-reservation",
  "customerId": "uuid-client",
  "shopId": "uuid-boutique",
  "offerId": "uuid-offre",
  "quantity": 2,
  "completedAt": "2026-11-21T18:45:00.000Z"
}
```

### `reservation.expired` / `reservation.cancelled` / `reservation.refused`
* **Rôle :** Notifie l'annulation, l'expiration ou le refus d'une réservation (libère le stock via remise en stock / restitution et trace le no-show).
* **Consommateurs :** MS2 (remise en stock via appel synchrone /internal ou événement), MS5 (Notifications)
* **Payload :**
```json
{
  "reservationId": "uuid-reservation",
  "customerId": "uuid-client",
  "shopId": "uuid-boutique",
  "offerId": "uuid-offre",
  "reason": "DEADLINE_PASSED"
}
```

---

## 5. Événements émis par MS4 (Trust & Moderation — Rafes Maroua)

### `merchant.approved`
* **Rôle :** Validation administrative des justificatifs légaux d'un commerce.
* **Consommateurs :** MS1 (mise à jour statut), MS2 (activation des droits commerçant), MS5 (e-mail de félicitations)
* **Payload :**
```json
{
  "merchantId": "uuid-commercant",
  "shopId": "uuid-boutique",
  "userId": "uuid-commercant",
  "adminId": "uuid-admin",
  "decidedAt": "2026-11-21T12:00:00.000Z"
}
```

### `merchant.suspended`
* **Rôle :** Déclenché automatiquement suite à 5 signalements vérifiés ou par un administrateur.
* **Consommateurs :** MS1 (statut SUSPENDED), MS2 (masquage offres actives), MS3 (blocage commandes), MS5 (alerte)
* **Payload :**
```json
{
  "merchantId": "uuid-commercant",
  "shopId": "uuid-boutique",
  "userId": "uuid-commercant",
  "reason": "THRESHOLD_EXCEEDED_5_REPORTS",
  "totalReports": 5,
  "suspendedAt": "2026-11-21T12:00:00.000Z"
}
```

### `offer.date_verified`
* **Rôle :** Date OCR validée avec succès.
* **Consommateurs :** MS2 (activation de l'offre `ACTIVE`), MS5 (notification)
* **Payload :**
```json
{
  "offerId": "uuid-offre",
  "shopId": "uuid-boutique",
  "verified": true,
  "result": "MATCH",
  "confidence": 0.94
}
```

### `offer.date_verified.rejected`
* **Rôle :** Date OCR rejetée ou illisible.
* **Consommateurs :** MS2 (passage statut à `REJECTED`), MS5 (notification refus avec motif)
* **Payload :**
```json
{
  "offerId": "uuid-offre",
  "verified": false,
  "rejectionReason": "Date de péremption dépassée ou étiquette illisible"
}
```

### `offer.manual_review`
* **Rôle :** Indique que l'offre nécessite une revue visuelle humaine (confiance OCR moyenne).
* **Consommateurs :** MS2 (maintien dans l'état `PENDING_VERIFICATION`)
* **Payload :**
```json
{
  "offerId": "uuid-offre",
  "reason": "Faible indice de confiance OCR"
}
```

### `shop.rating_updated`
* **Rôle :** Diffusion de la note moyenne recalculée suite à un avis client vérifié.
* **Consommateurs :** MS1 (profil boutique), MS2 (mise à jour `shop_snapshots.average_rating`)
* **Payload :**
```json
{
  "shopId": "uuid-boutique",
  "averageRating": 4.65,
  "salesCount": 38,
  "totalReviews": 38
}
```

---

## 6. Événements Telegram & Notifications (MS1 <-> MS5)

### `telegram.send.otp`
* **Rôle :** Demande à MS5 d'envoyer un code OTP à un utilisateur Telegram via le bot.
* **Émetteur :** MS1 (Accounts & Auth)
* **Consommateurs :** MS5 (Notifications / Telegram Bot)
* **Payload :**
```json
{
  "telegramId": "123456789",
  "phone": "+213555123456",
  "code": "123456",
  "ttlSeconds": 300
}
```

### `telegram.contact.received`
* **Rôle :** Transmet à MS1 les coordonnées vérifiées (numéro de téléphone + ID Telegram) partagées par l'utilisateur avec le bot Telegram.
* **Émetteur :** MS5 (Telegram Bot)
* **Consommateurs :** MS1 (Accounts & Auth)
* **Payload :**
```json
{
  "telegramId": "123456789",
  "phoneNumber": "+213555123456",
  "authNonce": "uuid-nonce"
}
```
