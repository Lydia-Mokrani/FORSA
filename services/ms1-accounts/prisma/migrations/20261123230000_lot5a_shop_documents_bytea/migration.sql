-- Migration Lot 5A: Stockage database-backed bytea pour shop_documents et file_url nullable
-- Auteur: FORSA MS1 Team
-- Date: 2026-11-23

ALTER TABLE "shop_documents" ADD COLUMN IF NOT EXISTS "file_data" BYTEA;
ALTER TABLE "shop_documents" ALTER COLUMN "file_url" DROP NOT NULL;
