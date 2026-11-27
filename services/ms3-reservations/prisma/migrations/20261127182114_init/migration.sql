-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED', 'PICKED_UP', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerName" TEXT,
    "shopId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "pickupCode" TEXT NOT NULL,
    "qrCodeData" TEXT,
    "pickupStart" TIMESTAMP(3) NOT NULL,
    "pickupEnd" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "refusedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "refusalReason" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_status_history" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "fromStatus" "ReservationStatus",
    "toStatus" "ReservationStatus" NOT NULL,
    "reason" TEXT,
    "actorId" TEXT,
    "actorRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_no_shows" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "totalNoShows" INTEGER NOT NULL DEFAULT 0,
    "lastNoShowAt" TIMESTAMP(3),
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_no_shows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reservations_pickupCode_key" ON "reservations"("pickupCode");

-- CreateIndex
CREATE INDEX "reservations_customerId_createdAt_idx" ON "reservations"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "reservations_shopId_status_idx" ON "reservations"("shopId", "status");

-- CreateIndex
CREATE INDEX "reservations_offerId_idx" ON "reservations"("offerId");

-- CreateIndex
CREATE INDEX "reservations_status_pickupEnd_idx" ON "reservations"("status", "pickupEnd");

-- CreateIndex
CREATE INDEX "reservation_status_history_reservationId_createdAt_idx" ON "reservation_status_history"("reservationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_no_shows_customerId_key" ON "customer_no_shows"("customerId");

-- AddForeignKey
ALTER TABLE "reservation_status_history" ADD CONSTRAINT "reservation_status_history_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
