-- Migration Lot E1 : Mandatory verified email + account recovery by email

-- 1. Ajout des nouvelles valeurs à l'énumération ChallengePurpose
ALTER TYPE "ChallengePurpose" ADD VALUE IF NOT EXISTS 'EMAIL_VERIFY';
ALTER TYPE "ChallengePurpose" ADD VALUE IF NOT EXISTS 'RECOVER_PHONE';

-- 2. Colonnes relatives à l'e-mail vérifié et au délai de récupération commerçant sur users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pending_phone" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pending_phone_activate_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pending_email" TEXT;

-- Index unique insensible à la casse sur lower(email)
CREATE UNIQUE INDEX IF NOT EXISTS "users_lower_email_idx" ON "users" (LOWER("email"));

-- 3. Adaptation de auth_challenges pour les défis e-mail
ALTER TABLE "auth_challenges" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "auth_challenges" ALTER COLUMN "nonce_hash" DROP NOT NULL;
ALTER TABLE "auth_challenges" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "auth_challenges" ADD COLUMN IF NOT EXISTS "email_hash" TEXT;
ALTER TABLE "auth_challenges" ADD COLUMN IF NOT EXISTS "max_attempts" INTEGER NOT NULL DEFAULT 5;
CREATE INDEX IF NOT EXISTS "auth_challenges_email_hash_purpose_idx" ON "auth_challenges"("email_hash", "purpose");

-- 4. Table des tentatives de récupération (comptage anti-énumération par email_hash)
CREATE TABLE IF NOT EXISTS "recovery_attempts" (
    "id" TEXT NOT NULL,
    "email_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recovery_attempts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "recovery_attempts_email_hash_created_at_idx" ON "recovery_attempts"("email_hash", "created_at");

-- 5. Table des tokens de récupération (usage unique, 15 min, stocké haché)
CREATE TABLE IF NOT EXISTS "recovery_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'rebind-phone',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recovery_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "recovery_tokens_token_hash_key" ON "recovery_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "recovery_tokens_token_hash_idx" ON "recovery_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "recovery_tokens_user_id_idx" ON "recovery_tokens"("user_id");

-- Clé étrangère vers users
ALTER TABLE "recovery_tokens" ADD CONSTRAINT "recovery_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
