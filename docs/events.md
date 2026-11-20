# FORSA (فرصة) — Catalogue Officiel des Événements RabbitMQ
**Version :** 1.0  
**Exchange :** `forsa.events` (Type : `topic`, Durable)  
**Convention de routage :** `<entité>.<action>` (ex: `user.registered`, `offer.published`)  
**Dead-Letter Queue :** `forsa.dlq` (après 3 tentatives infructueuses)

---

## 1. Structure de l'Enveloppe Standard
Tous les messages publiés sur `forsa.events` doivent impérativement respecter cette structure JSON :

```typescript
interface EventEnvelope<T> {
  eventId: string;       // UUID v4 unique pour garantir l'idempotence
  type: string;          // Ex: "reservation.created"
  occurredAt: string;    // Date ISO 8601 UTC (ex: "2026-11-20T17:30:00.000Z")
  payload: T;            // Données métier typées
}
```

---

## 2. Événements émis par MS1 (Accounts & Shops)

### `user.registered`
* **Rôle :** Informe MS5 pour l'envoi de l'e-mail de confirmation et la mise à jour du carnet de contacts.
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
* **Rôle :** Déclenche l'envoi de l'e-mail contenant le lien de réinitialisation sécurisé.
* **Consommateurs :** MS5 (Notifications)
* **Payload :**
```json
{
  "userId": "uuid",
  "email": "client@example.com",
  "resetToken": "token-reset-xyz",
  "expiresAt": "2026-11-20T18:00:00.000Z"
}
```

### `merchant.submitted`
* **Rôle :** Notifie MS4 qu'un nouveau commerçant a complété sa boutique et téléversé ses 3 justificatifs pour examen.
* **Consommateurs :** MS4 (Trust & Moderation)
* **Payload :**
```json
{
  "userId": "uuid",
  "shopId": "uuid",
  "shopName": "Boulangerie La Rose",
  "address": "12 Rue des Frères, Boumerdès",
  "latitude": 36.7588,
  "longitude": 3.4756,
  "documents": [
    { "type": "COMMERCIAL_REGISTER", "fileUrl": "/uploads/documents/doc1.pdf" },
    { "type": "TAX_ID", "fileUrl": "/uploads/documents/doc2.pdf" },
    { "type": "STOREFRONT", "fileUrl": "/uploads/documents/doc3.jpg" }
  ]
}
```

---

## 3. Événements émis par MS2 (Catalogue & Search)

### `offer.needs_verification`
* **Rôle :** Envoie l'image de la date de péremption d'un produit emballé à MS4 pour analyse OCR.
* **Consommateurs :** MS4 (Trust & Moderation)
* **Payload :**
```json
{
  "offerId": "uuid",
  "shopId": "uuid",
  "title": "Lot de yaourts aux fruits",
  "typedExpiryDate": "2026-11-25",
  "photoUrl": "/uploads/offers/date-photo-789.jpg"
}
```

### `offer.published`
* **Rôle :** Notifie qu'une offre est désormais active et visible sur le catalogue public.
* **Consommateurs :** MS5 (Notifications)
* **Payload :**
```json
{
  "offerId": "uuid",
  "shopId": "uuid",
  "shopName": "Boulangerie La Rose",
  "title": "Panier viennoiseries du soir",
  "originalPrice": 1200,
  "discountedPrice": 450,
  "discountPercentage": 62,
  "quantityAvailable": 5,
  "pickupStart": "2026-11-20T18:00:00.000Z",
  "pickupEnd": "2026-11-20T19:30:00.000Z"
}
```

### `offer.expired`
* **Rôle :** Informe que l'offre a dépassé sa date/heure de validité et a été retirée du catalogue.
* **Consommateurs :** MS5 (Notifications)
* **Payload :**
```json
{
  "offerId": "uuid",
  "shopId": "uuid"
}
```

---

## 4. Événements émis par MS3 (Reservations)

### `reservation.created`
* **Rôle :** Informe MS4 (pour l'éligibilité future d'avis/signalement) et MS5 (envoi e-mail de confirmation + notification commerçant).
* **Consommateurs :** MS4 (Trust), MS5 (Notifications)
* **Payload :**
```json
{
  "reservationId": "uuid",
  "customerId": "uuid",
  "customerEmail": "client@example.com",
  "customerName": "Karim Benali",
  "shopId": "uuid",
  "offerId": "uuid",
  "quantity": 2,
  "totalPrice": 900,
  "pickupCode": "FRS-8492",
  "pickupDeadline": "2026-11-20T20:00:00.000Z"
}
```

### `reservation.picked_up`
* **Rôle :** **Événement clé du cycle de vie** : confirme la transaction physique, débloque l'avis client, incrémente les ventes.
* **Consommateurs :** MS1 (comptage ventes shop), MS2 (statistiques dashboard), MS4 (déblocage avis), MS5 (notification client).
* **Payload :**
```json
{
  "reservationId": "uuid",
  "customerId": "uuid",
  "shopId": "uuid",
  "offerId": "uuid",
  "quantity": 2,
  "completedAt": "2026-11-20T18:45:00.000Z"
}
```

### `reservation.expired` / `reservation.cancelled` / `reservation.refused`
* **Rôle :** Notifie l'annulation ou l'échéance non honorée (libère le stock et trace le no-show).
* **Consommateurs :** MS5 (Notifications)
* **Payload :**
```json
{
  "reservationId": "uuid",
  "customerId": "uuid",
  "shopId": "uuid",
  "offerId": "uuid",
  "reason": "DEADLINE_PASSED"
}
```

---

## 5. Événements émis par MS4 (Trust & Moderation)

### `merchant.approved`
* **Rôle :** Autorise le commerçant à créer et publier des offres.
* **Consommateurs :** MS1 (mise à jour statut), MS2 (activation droits), MS5 (e-mail d'approbation).
* **Payload :**
```json
{
  "shopId": "uuid",
  "userId": "uuid",
  "adminId": "uuid",
  "decidedAt": "2026-11-20T17:00:00.000Z"
}
```

### `merchant.suspended`
* **Rôle :** **Déclenché automatiquement au 5ᵉ signalement distinct**. Bloque le commerce et masque instantanément ses offres.
* **Consommateurs :** MS1 (statut SUSPENDED), MS2 (masquage offres actives), MS3 (blocage nouvelles réservations), MS5 (notification d'urgence).
* **Payload :**
```json
{
  "shopId": "uuid",
  "userId": "uuid",
  "reason": "THRESHOLD_EXCEEDED_5_REPORTS",
  "totalReports": 5,
  "suspendedAt": "2026-11-20T17:15:00.000Z"
}
```

### `offer.date_verified`
* **Rôle :** Résultat de l'analyse OCR effectuée sur l'emballage.
* **Consommateurs :** MS2 (Catalogue), MS5 (Notification commerçant si refus ou incertitude).
* **Payload :**
```json
{
  "offerId": "uuid",
  "shopId": "uuid",
  "result": "MATCH",
  "confidence": 0.92,
  "extractedDate": "2026-11-25",
  "typedDate": "2026-11-25"
}
```
*(Valeurs possibles pour `result` : `MATCH`, `MISMATCH`, `UNCERTAIN`, `EXPIRED_DATE`)*

### `shop.rating_updated`
* **Rôle :** Diffuse la nouvelle note moyenne calculée après la publication d'un avis client.
* **Consommateurs :** MS1 (profil shop), MS2 (snapshot catalogue).
* **Payload :**
```json
{
  "shopId": "uuid",
  "averageRating": 4.65,
  "totalReviews": 38
}
```
