# MS2 — Catalogue & Search

FORSA microservice responsible for the product catalogue, search, and stock management.

## Responsibilities

- Offer lifecycle (`DRAFT` → `PENDING_VERIFICATION` → `ACTIVE` / `REJECTED`, `EXPIRED`, `SOLD_OUT`, `WITHDRAWN`, `HIDDEN`)
- Product Type (`PACKAGED` vs `FRESH`) and mandatory expiry date enforcement
- Same-day expiry calculation in `Africa/Algiers` (UTC+1) timezone
- Food-only category management (8 seeded food categories)
- Product photo upload (max 5 photos per offer, Sharp compression) and package date label photo
- Full-text search, Haversine geospatial distance calculation, filtering, sorting, and pagination
- Atomic stock reservation, release, and pickup (called by MS3)
- Concurrency-safe stock adjustments with mandatory reason and movement audit logging
- Offer expiration (automated cron job with Africa/Algiers timezone support)
- Real merchant dashboard statistics
- RabbitMQ domain event publishing and consumption
- Shop snapshot synchronization from MS1/MS4 events

## Technology Stack

| Layer       | Technology              |
|-------------|-------------------------|
| Runtime     | Node.js 22 + TypeScript |
| Framework   | Express.js              |
| ORM         | Prisma                  |
| Database    | PostgreSQL 16           |
| Messaging   | RabbitMQ (amqplib)      |
| Auth        | JWT RS256 (verify only) |
| Upload      | Multer + Sharp          |
| Testing     | Jest                    |
| Container   | Docker                  |

## Ports

| Service    | Port |
|-------------|------|
| MS2 HTTP   | 3002 |
| MS2 DB     | 5433 |

## API Routes

### Public
| Method | Path              | Description                                             |
|--------|-------------------|---------------------------------------------------------|
| GET    | `/api/categories` | List all 8 active food categories                       |
| GET    | `/api/offers`     | Search & filter active offers (with distance & filters) |
| GET    | `/api/offers/:id` | Get offer public details                                |

### Merchant (JWT required: approved merchant, verified email)
| Method | Path                              | Description                                                |
|--------|-----------------------------------|------------------------------------------------------------|
| GET    | `/api/offers/mine`                | List authenticated merchant's offers                       |
| POST   | `/api/offers`                     | Create new offer in `DRAFT` status                         |
| PATCH  | `/api/offers/:id`                 | Update offer details                                       |
| DELETE | `/api/offers/:id`                 | Soft-withdraw offer                                        |
| POST   | `/api/offers/:id/photos`          | Upload product photos (max 5 per offer total)              |
| POST   | `/api/offers/:id/date-photo`      | Upload package expiry label photo (required for PACKAGED)  |
| POST   | `/api/offers/:id/submit`          | Submit offer for verification (`PENDING_VERIFICATION`)     |
| POST   | `/api/offers/:id/withdraw`        | Withdraw offer from marketplace                            |
| POST   | `/api/offers/:id/stock-adjustment`| Adjust available stock with mandatory audit reason          |
| GET    | `/api/merchant/dashboard`         | Merchant statistics (outstanding reserved items, pickups)   |

### Internal (X-Internal-Api-Key required — NOT exposed via Traefik)
| Method | Path                             | Description                                      |
|--------|----------------------------------|--------------------------------------------------|
| POST   | `/internal/offers/:id/reserve`   | Atomically reserve stock for reservation (MS3)   |
| POST   | `/internal/offers/:id/release`   | Release previously reserved stock (MS3)          |
| POST   | `/internal/offers/:id/pickup`    | Record confirmed customer pickup (MS3)           |

### System
| Method | Path      | Description    |
|--------|-----------|----------------|
| GET    | `/health` | Health check   |

## Offer Lifecycle

```
[DRAFT]
   │
   ├─ Upload product photos (1 to 5)
   ├─ Upload date label photo (if PACKAGED)
   ▼
[Submit] ──────► [PENDING_VERIFICATION]
                        │
         ┌──────────────┴──────────────┐
   (Verification OK)            (Verification Failed)
         │                             │
         ▼                             ▼
     [ACTIVE] ◄─── (Reactivate) ─── [REJECTED]
         │
   ┌─────┼───────────────┐
(Stock=0)│        (Deadline/Expiry)
   │     │               │
   ▼     ▼               ▼
[SOLD_OUT] [WITHDRAWN] [EXPIRED]
```

## Database Schema

```
categories         → 8 food-only categories (seeded)
offers             → core offer entity, owned by merchants
offer_photos       → product images (max 5 per offer, compressed via Sharp)
shop_snapshots     → local read-only copy of shop info from MS1/MS4
stock_movements    → audit log of all RESERVE, RELEASE, ADJUSTMENT, and PICKUP operations
```

## RabbitMQ

### Events Published
- `offer.needs_verification` → MS4 (OCR date check / freshness inspection)
- `offer.published` → MS5 (notifications)
- `offer.expired` → MS3 (cancel pending reservations), MS5
- `offer.sold_out` → MS5
- `offer.withdrawn` → MS3, MS5

### Events Consumed
- `offer.date_verified` / `offer.date_verified.rejected` / `offer.manual_review` ← MS4
- `merchant.suspended` / `merchant.reactivated` ← MS1
- `shop.rating_updated` / `shop.created` / `shop.updated` / `shop.status_changed` ← MS1, MS4
- `reservation.picked_up` ← MS3

See [`docs/events.md`](../../docs/events.md) for full event contracts.

## Local Development & Testing

```bash
# Run tests
npm test

# Type check
npx tsc --noEmit
```
