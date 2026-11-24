-- Migration Lot 5B-1: Stockage database-backed bytea pour avatars utilisateurs
-- Auteur: FORSA MS1 Team
-- Date: 2026-11-24

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_data" BYTEA;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_mime" VARCHAR(50);
