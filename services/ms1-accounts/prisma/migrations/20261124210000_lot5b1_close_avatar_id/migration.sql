-- Migration Lot 5B-1-close: Identifiant aleatoire non devinable (avatar_id) pour les avatars utilisateurs
-- Auteur: FORSA MS1 Team
-- Date: 2026-11-24

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_avatar_id_key" ON "users"("avatar_id");
