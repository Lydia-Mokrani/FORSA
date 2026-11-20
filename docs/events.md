# FORSA — Domain Events Contract
# This file defines all RabbitMQ events used across microservices.
# All teams must follow these contracts exactly.
# Exchange: forsa.events (topic)
# Format: routing key = event type

---

## Event Envelope (all events)

```json
{
  "eventId":    "uuid-v4",
  "type":       "event.type.name",
  "occurredAt": "2026-11-20T14:00:00.000Z",
  "payload":    {}
}
```

---

## Events Published by MS2 (Catalogue & Search)

### offer.needs_verification
Triggered when a merchant submits an offer in DRAFT/REJECTED status.
Consumed by: MS4 (Verification & AI / Quality inspection)

Behavior:
- For `PACKAGED`: MS4 performs OCR on `datePhotoUrl` to detect the expiry date label and validates against `productExpiryDate`.
- For `FRESH`: MS4 performs freshness inspection on uploaded product photos (`freshnessInspectionNeeded: true`).

```json
{
  "verificationEventId": "uuid-v4",
  "offerId":                   "uuid",
  "merchantId":                "uuid",
  "productType":               "PACKAGED | FRESH",
  "productExpiryDate":         "2026-12-31T00:00:00.000Z",
  "datePhotoUrl":              "http://ms2/media/compressed_date_label.jpg",
  "freshnessInspectionNeeded": false
}
```

### offer.published
Triggered when an offer becomes ACTIVE (after successful verification).
Consumed by: MS5 (notifications)

```json
{
  "offerId":    "uuid",
  "merchantId": "uuid",
  "shopId":     "uuid",
  "categoryId": "uuid"
}
```

### offer.expired
Triggered when the cron job expires an offer (past deadline or past product expiry date).
Consumed by: MS3 (cancel pending reservations), MS5 (notifications)

```json
{
  "offerId":    "uuid",
  "merchantId": "uuid"
}
```

### offer.sold_out
Triggered when quantity_available reaches 0.
Consumed by: MS5 (notifications)

```json
{
  "offerId":    "uuid",
  "merchantId": "uuid"
}
```

### offer.withdrawn
Triggered when a merchant withdraws an offer from marketplace.
Consumed by: MS3, MS5

```json
{
  "offerId":    "uuid",
  "merchantId": "uuid"
}
```

---

## Events Consumed by MS2

### offer.date_verified
Published by: MS4
MS2 action: Validates correlation via `verificationEventId`, confirms Algerian calendar date matches for PACKAGED products, sets offer status → `ACTIVE`, and publishes `offer.published`.

```json
{
  "offerId":             "uuid",
  "verificationEventId": "uuid-v4",
  "verified":            true,
  "verifiedDate":        "2026-12-31T00:00:00.000Z"
}
```

### offer.date_verified.rejected
Published by: MS4
MS2 action: Confirms offer is in `PENDING_VERIFICATION` with matching `verificationEventId`, sets offer status → `REJECTED`, stores `rejectionReason`.

```json
{
  "offerId":             "uuid",
  "verificationEventId": "uuid-v4",
  "verified":            false,
  "rejectionReason":     "Expiry date on package label does not match or is unreadable."
}
```

### offer.manual_review
Published by: MS4
MS2 action: Keeps offer in `PENDING_VERIFICATION` for operator review.

```json
{
  "offerId":             "uuid",
  "verificationEventId": "uuid-v4",
  "reason":              "Low confidence OCR result"
}
```

### merchant.approved
Published by: MS1
MS2 action: Merchant can now submit offers.

```json
{
  "merchantId": "uuid",
  "shopId":     "uuid"
}
```

### merchant.suspended
Published by: MS1
MS2 action: Automatically hides all active/pending offers (`status = HIDDEN`, preserves `previous_status`).

```json
{
  "merchantId": "uuid",
  "reason":     "Terms of service violation"
}
```

### merchant.reactivated
Published by: MS1
MS2 action: Restores eligible `HIDDEN` offers back to their `previous_status` if pickup deadline and product expiry date are still valid and shop is ACTIVE.

```json
{
  "merchantId": "uuid"
}
```

### shop.created
Published by: MS1
MS2 action: Upserts `ShopSnapshot` immediately in MS2 database so merchant can create offers without foreign key constraint errors.

```json
{
  "shopId":     "uuid",
  "merchantId": "uuid",
  "name":       "Boulangerie Benali",
  "address":    "12 Rue Didouche Mourad, Alger",
  "latitude":   36.7725,
  "longitude":  3.0588,
  "phone":      "0555123456",
  "status":     "ACTIVE"
}
```

### shop.updated
Published by: MS1
MS2 action: Updates local `ShopSnapshot` details.

```json
{
  "shopId":     "uuid",
  "merchantId": "uuid",
  "name":       "Boulangerie Benali & Fils",
  "address":    "14 Rue Didouche Mourad, Alger",
  "latitude":   36.7725,
  "longitude":  3.0588,
  "status":     "ACTIVE"
}
```

### shop.status_changed
Published by: MS1
MS2 action: Updates local `ShopSnapshot.status`.

```json
{
  "shopId": "uuid",
  "status": "SUSPENDED | ACTIVE | CLOSED"
}
```

### shop.rating_updated
Published by: MS4
MS2 action: Updates `ShopSnapshot.average_rating` and `sales_count`.

```json
{
  "shopId":        "uuid",
  "averageRating": 4.5,
  "salesCount":    120
}
```

### reservation.picked_up
Published by: MS3
MS2 action: Validates that reservation was not released, matches original RESERVE movement, checks shop ID matches offer shop_id, records PICKUP movement and increments `ShopSnapshot.sales_count` inside a single transaction.

```json
{
  "shopId":        "uuid",
  "offerId":       "uuid",
  "reservationId": "uuid",
  "quantity":      2
}
```
