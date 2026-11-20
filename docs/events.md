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
Triggered when a merchant submits a packaged product offer requiring OCR date verification.
Consumed by: MS4

```json
{
  "offerId":           "uuid",
  "merchantId":        "uuid",
  "productExpiryDate": "2026-12-31T00:00:00.000Z",
  "datePhotoUrl":      "http://ms2/media/filename.jpg"
}
```

### offer.published
Triggered when an offer becomes ACTIVE (immediately or after MS4 verification).
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
Triggered when the cron job expires an offer.
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

---

## Events Consumed by MS2

### offer.date_verified
Published by: MS4
MS2 action: Set offer status → ACTIVE, publish offer.published

```json
{
  "offerId":  "uuid",
  "verified": true
}
```

### offer.date_verified.rejected
Published by: MS4
MS2 action: Set offer status → REJECTED

```json
{
  "offerId":         "uuid",
  "verified":        false,
  "rejectionReason": "Expiry date too close / unreadable"
}
```

### offer.manual_review
Published by: MS4
MS2 action: Keep offer in PENDING_VERIFICATION

```json
{
  "offerId": "uuid",
  "reason":  "Low confidence OCR result"
}
```

### merchant.approved
Published by: MS1
MS2 action: (No immediate action — merchant can now create offers)

```json
{
  "merchantId": "uuid",
  "shopId":     "uuid"
}
```

### merchant.rejected
Published by: MS1
MS2 action: (No immediate action needed)

```json
{
  "merchantId": "uuid"
}
```

### merchant.suspended
Published by: MS1
MS2 action: Hide all ACTIVE/PENDING_VERIFICATION offers

```json
{
  "merchantId": "uuid",
  "reason":     "Terms of service violation"
}
```

### merchant.reactivated
Published by: MS1
MS2 action: Restore eligible HIDDEN offers to ACTIVE

```json
{
  "merchantId": "uuid"
}
```

### shop.rating_updated
Published by: MS4
MS2 action: Update shop_snapshots.average_rating and sales_count

```json
{
  "shopId":        "uuid",
  "averageRating": 4.5,
  "salesCount":    120
}
```

### reservation.picked_up
Published by: MS3
MS2 action: Increment shop_snapshots.sales_count

```json
{
  "shopId":        "uuid",
  "offerId":       "uuid",
  "reservationId": "uuid"
}
```
