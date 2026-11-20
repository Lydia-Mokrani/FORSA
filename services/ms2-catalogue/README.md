# MS2 — Catalogue & Search

FORSA microservice responsible for the product catalogue, search, and stock management.

## Responsibilities

- Offer CRUD (create, read, update, delete)
- Category management
- Product photo upload and storage
- Full-text search, filtering, sorting, and pagination
- Atomic stock reservation and release (called by MS3)
- Offer expiration (automated cron job)
- Merchant dashboard statistics
- RabbitMQ event publishing and consumption
- Shop snapshot synchronization from MS1 events

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
| Testing     | Jest + Supertest        |
| Container   | Docker                  |

## Ports

| Service    | Port |
|------------|------|
| MS2 HTTP   | 3002 |
| MS2 DB     | 5433 |

## API Routes

### Public
| Method | Path                   | Description             |
|--------|------------------------|-------------------------|
| GET    | `/api/categories`      | List all categories     |
| GET    | `/api/offers`          | Search & filter offers  |
| GET    | `/api/offers/:id`      | Get offer details       |

### Merchant (JWT required)
| Method | Path                        | Description                |
|--------|-----------------------------|----------------------------|
| GET    | `/api/offers/mine`          | List my offers             |
| POST   | `/api/offers`               | Create offer               |
| PATCH  | `/api/offers/:id`           | Update offer               |
| DELETE | `/api/offers/:id`           | Delete offer               |
| POST   | `/api/offers/:id/photos`    | Upload product photos      |
| GET    | `/api/merchant/dashboard`   | Merchant statistics        |

### Internal (X-Internal-Api-Key required — NOT exposed via Traefik)
| Method | Path                            | Description             |
|--------|---------------------------------|-------------------------|
| POST   | `/internal/offers/:id/reserve`  | Reserve stock (MS3)     |
| POST   | `/internal/offers/:id/release`  | Release stock (MS3)     |

### System
| Method | Path      | Description    |
|--------|-----------|----------------|
| GET    | `/health` | Health check   |

## Getting Started (Local Development)

### 1. Prerequisites
- Node.js 22+
- PostgreSQL 16 (or use Docker Compose)
- RabbitMQ (or use Docker Compose)

### 2. Environment
```bash
cp .env.example .env
# Edit .env with your local values
```

### 3. Install dependencies
```bash
npm install
```

### 4. Database setup
```bash
# Run migrations
npm run db:migrate

# Seed categories and demo data
npm run db:seed
```

### 5. Start the service
```bash
npm run dev
```

### 6. Using Docker Compose (recommended)
From the repository root:
```bash
# Copy and configure environment variables
cp services/ms2-catalogue/.env.example services/ms2-catalogue/.env
# Edit the .env file

# Start all infrastructure + MS2
docker-compose up --build
```

## Running Tests
```bash
# All tests
npm test

# Unit tests only (no DB required)
npm run test:unit

# Integration tests (requires running DB)
npm run test:integration
```

## Database Schema

```
categories         → 9 initial categories (seeded)
offers             → core entity, owned by merchants
offer_photos       → product images (compressed via Sharp)
shop_snapshots     → local copy of shop info from MS1 (via RabbitMQ)
stock_movements    → audit log of all RESERVE/RELEASE operations
```

## RabbitMQ

### Events Published
- `offer.needs_verification` → MS4 (OCR date check)
- `offer.published` → MS5 (notifications)
- `offer.expired` → MS3 (cancel reservations), MS5
- `offer.sold_out` → MS5

### Events Consumed
- `offer.date_verified` / `offer.date_verified.rejected` / `offer.manual_review` ← MS4
- `merchant.suspended` / `merchant.reactivated` ← MS1
- `shop.rating_updated` ← MS4
- `reservation.picked_up` ← MS3

See [`docs/events.md`](../../docs/events.md) for full event contracts.

## Security Notes

- JWT tokens are verified using MS1's RS256 public key
- Internal endpoints are protected by `X-Internal-Api-Key` header
- Internal routes are **not** exposed via Traefik
- All file uploads are validated (type + size) before processing
- Stock operations use atomic SQL to prevent race conditions
- Parameterized queries via Prisma prevent SQL injection
