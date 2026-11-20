# FORSA (فرصة) — Anti-Waste Marketplace

FORSA is a university engineering project implementing a microservices-based web application connecting customers with local businesses selling unsold products at reduced prices.

---

## Architecture Overview

FORSA follows a distributed microservices architecture:
- **MS1**: Accounts, Authentication & Shops (JWT RS256 authority)
- **MS2**: Catalogue, Search & Stock Management (**Implemented here**)
- **MS3**: Reservations & Orders
- **MS4**: Trust, OCR DLUO Verification & Moderation
- **MS5**: Notifications & Infrastructure
- **Infrastructure**: Traefik (Reverse Proxy), RabbitMQ (Async Events), Consul (Service Discovery), PostgreSQL, Docker

---

## MS2 — Catalogue & Search

MS2 is responsible for:
1. **Offer CRUD & Business Rules**: Discount calculation, strict price validation ($discountedPrice < originalPrice$), merchant ownership verification.
2. **Search & Geo-filtering**: Haversine distance calculation, price range, categories, minimum discounts, pagination and sorting.
3. **Atomic Stock Management**: Safe decrementing and incrementing (`/internal/offers/:id/reserve` & `/internal/offers/:id/release`) to prevent overselling.
4. **Offer Expiration**: Automated UTC cron job expiring past offers and same-day bakery products.
5. **RabbitMQ Messaging**: Event-driven communication (`offer.needs_verification`, `offer.published`, `offer.expired`, `merchant.suspended`, etc.).
6. **All Assigned Frontend Pages**: 10 screens covering Customer & Merchant workflows with interactive OpenStreetMap/Leaflet location picker.

---

## Directory Structure

```
FORSA/
├── services/
│   └── ms2-catalogue/             ← MS2 Backend Microservice (Node.js, Express, Prisma, TS)
│       ├── src/
│       │   ├── config/            ← Environment, Prisma client, Winston logger
│       │   ├── controllers/       ← Offer, category, merchant, and stock controllers
│       │   ├── middleware/        ← JWT RS256, role guards, internal API key, multer
│       │   ├── messaging/         ← RabbitMQ publisher & idempotent consumers
│       │   ├── jobs/              ← Automated offer expiration cron
│       │   └── routes/            ← Public, merchant, and internal endpoints
│       ├── prisma/                ← Schema (5 tables), migrations & seed script
│       ├── tests/                 ← Unit & integration tests
│       ├── Dockerfile             ← Multi-stage production container
│       ├── openapi.yaml           ← Complete API documentation
│       └── README.md
│
├── frontend/                      ← Shared React + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── features/catalogue/
│   │   │   ├── components/        ← Navbar, Footer, OfferCard, CategorySlider, FilterSidebar, LocationModal
│   │   │   ├── context/           ← LocationContext with map & geolocation persistence
│   │   │   ├── pages/             ← All 10 customer & merchant pages
│   │   │   ├── services/          ← CatalogueApi client with fallback mock
│   │   │   └── types/             ← Strict TypeScript domain models
│   │   └── App.tsx                ← Full client & merchant route mapping
│   ├── package.json
│   └── vite.config.ts
│
├── docs/
│   └── events.md                  ← Inter-service event contracts (RabbitMQ)
│
├── docker-compose.yml             ← Full infrastructure stack (Postgres, RabbitMQ, Consul, Traefik, MS2)
└── README.md
```

---

## Quick Start Guide

### 1. Run MS2 Backend Locally

```bash
cd services/ms2-catalogue
cp .env.example .env
npm install
npx prisma generate
npm run test:unit
npm run dev
```

### 2. Run Frontend Locally

```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Run Everything with Docker Compose

```bash
docker-compose up --build
```
- Traefik API Gateway: [http://localhost](http://localhost)
- MS2 Health check: [http://localhost:3002/health](http://localhost:3002/health)
- RabbitMQ Management UI: [http://localhost:15672](http://localhost:15672) (User: `forsa`, Pass: `forsa_password`)
- Consul UI: [http://localhost:8500](http://localhost:8500)
