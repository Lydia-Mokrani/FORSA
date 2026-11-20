-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('PACKAGED', 'FRESH');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'PENDING_VERIFICATION', 'ACTIVE', 'EXPIRED', 'SOLD_OUT', 'REJECTED', 'HIDDEN', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('RESERVE', 'RELEASE', 'ADJUSTMENT', 'PICKUP');

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_fr" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_snapshots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "ShopStatus" NOT NULL DEFAULT 'ACTIVE',
    "average_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sales_count" INTEGER NOT NULL DEFAULT 0,
    "merchant_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "product_type" "ProductType" NOT NULL,
    "same_day_expiry" BOOLEAN NOT NULL DEFAULT false,
    "original_price" DECIMAL(10,2) NOT NULL,
    "discounted_price" DECIMAL(10,2) NOT NULL,
    "discount_percent" INTEGER NOT NULL,
    "quantity_available" INTEGER NOT NULL DEFAULT 1,
    "quantity_initial" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "product_expiry_date" TIMESTAMP(3) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "previous_status" "OfferStatus",
    "date_photo_url" TEXT,
    "verification_event_id" TEXT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_photos" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "reservation_id" TEXT,
    "movement_type" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "offers_status_idx" ON "offers"("status");

-- CreateIndex
CREATE INDEX "offers_merchant_id_idx" ON "offers"("merchant_id");

-- CreateIndex
CREATE INDEX "offers_shop_id_idx" ON "offers"("shop_id");

-- CreateIndex
CREATE INDEX "offers_category_id_idx" ON "offers"("category_id");

-- CreateIndex
CREATE INDEX "offers_expires_at_idx" ON "offers"("expires_at");

-- CreateIndex
CREATE INDEX "offers_discounted_price_idx" ON "offers"("discounted_price");

-- CreateIndex
CREATE INDEX "offers_discount_percent_idx" ON "offers"("discount_percent");

-- CreateIndex
CREATE INDEX "offers_product_type_idx" ON "offers"("product_type");

-- CreateIndex
CREATE INDEX "offers_same_day_expiry_idx" ON "offers"("same_day_expiry");

-- CreateIndex
CREATE INDEX "offer_photos_offer_id_idx" ON "offer_photos"("offer_id");

-- CreateIndex
CREATE INDEX "stock_movements_offer_id_idx" ON "stock_movements"("offer_id");

-- CreateIndex
CREATE INDEX "stock_movements_reservation_id_idx" ON "stock_movements"("reservation_id");

-- CreateIndex
CREATE INDEX "stock_movements_movement_type_idx" ON "stock_movements"("movement_type");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_reservation_id_movement_type_key" ON "stock_movements"("reservation_id", "movement_type");

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_photos" ADD CONSTRAINT "offer_photos_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
