-- Migration Lot 1: Schéma Telegram-first MS1 (Accounts & Shops)
-- Auteur: FORSA MS1 Team
-- Date: 2026-11-22

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'MERCHANT', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DEACTIVATED', 'SUSPENDED', 'DELETED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ChallengePurpose" AS ENUM ('LOGIN', 'REGISTER', 'CHANGE_PHONE', 'CONFIRM_SENSITIVE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ChallengeStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ShopStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "DocumentType" AS ENUM ('COMMERCIAL_REGISTER', 'TAX_ID', 'STOREFRONT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "DocumentStatus" AS ENUM ('SUBMITTED', 'VALIDATED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "SocialProvider" AS ENUM ('GOOGLE', 'APPLE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TABLE USERS
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "phone_e164" TEXT,
    "telegram_user_id" TEXT,
    "telegram_chat_id" TEXT,
    "telegram_blocked" BOOLEAN NOT NULL DEFAULT false,
    "roles" "Role"[] NOT NULL DEFAULT ARRAY['CUSTOMER']::"Role"[],
    "active_mode" TEXT NOT NULL DEFAULT 'customer',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "email" TEXT,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Si la table users existe déjà (migration depuis l'ancien schéma)
DO $$ BEGIN
    -- phone -> phone_e164
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE "users" RENAME COLUMN "phone" TO "phone_e164";
    END IF;
    -- fullName -> full_name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'fullName') THEN
        ALTER TABLE "users" RENAME COLUMN "fullName" TO "full_name";
    END IF;
    -- avatarUrl -> avatar_url
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatarUrl') THEN
        ALTER TABLE "users" RENAME COLUMN "avatarUrl" TO "avatar_url";
    END IF;
    -- createdAt -> created_at
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'createdAt') THEN
        ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    -- updatedAt -> updated_at
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updatedAt') THEN
        ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;
    -- deleted_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'deleted_at') THEN
        ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3);
    END IF;
    -- telegram_user_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'telegram_user_id') THEN
        ALTER TABLE "users" ADD COLUMN "telegram_user_id" TEXT;
    END IF;
    -- telegram_chat_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'telegram_chat_id') THEN
        ALTER TABLE "users" ADD COLUMN "telegram_chat_id" TEXT;
    END IF;
    -- telegram_blocked
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'telegram_blocked') THEN
        ALTER TABLE "users" ADD COLUMN "telegram_blocked" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    -- active_mode
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'active_mode') THEN
        ALTER TABLE "users" ADD COLUMN "active_mode" TEXT NOT NULL DEFAULT 'customer';
    END IF;
    -- email nullable
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email' AND is_nullable = 'NO') THEN
        ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
    END IF;
    -- roles array
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'roles') THEN
        ALTER TABLE "users" ADD COLUMN "roles" "Role"[] NOT NULL DEFAULT ARRAY['CUSTOMER']::"Role"[];
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
            UPDATE "users" 
            SET "roles" = ARRAY["role"]::"Role"[],
                "active_mode" = CASE WHEN "role" = 'MERCHANT' THEN 'merchant' ELSE 'customer' END
            WHERE "role" IS NOT NULL;
            ALTER TABLE "users" DROP COLUMN "role";
        END IF;
    END IF;
    -- passwordHash drop
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'passwordHash') THEN
        ALTER TABLE "users" DROP COLUMN "passwordHash";
    END IF;
    -- legacy booleans
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'emailVerified') THEN
        ALTER TABLE "users" DROP COLUMN "emailVerified";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phoneVerified') THEN
        ALTER TABLE "users" DROP COLUMN "phoneVerified";
    END IF;

    -- Supprimer temporairement l'index unique s'il existe pour permettre la normalisation propre
    DROP INDEX IF EXISTS "users_phone_e164_key";

    -- Normalisation E.164 des numéros algériens (05/06/07 -> +213)
    UPDATE "users" 
    SET "phone_e164" = '+213' || SUBSTRING("phone_e164" FROM 2)
    WHERE "phone_e164" ~ '^0[567][0-9]{8}$';

    -- Création préalable de la table audit_logs si nécessaire pour archiver les anciens numéros
    CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" TEXT NOT NULL,
        "user_id" TEXT,
        "action" TEXT NOT NULL,
        "ip_address" TEXT,
        "user_agent" TEXT,
        "metadata" JSONB,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );

    -- Déduplication sécurisée : conserver le numéro sur le compte le plus récent,
    -- passer à NULL sur les doublons antérieurs et tracer l'ancien numéro dans audit_logs
    WITH duplicates AS (
        SELECT "id", "phone_e164",
               ROW_NUMBER() OVER (PARTITION BY "phone_e164" ORDER BY "created_at" DESC) as rn
        FROM "users"
        WHERE "phone_e164" IS NOT NULL
    )
    INSERT INTO "audit_logs" ("id", "user_id", "action", "metadata", "created_at")
    SELECT gen_random_uuid()::text, d."id", 'PHONE_DUPLICATE_NULLIFIED',
           jsonb_build_object('former_phone', d."phone_e164", 'reason', 'deduplication_migration_lot1'),
           CURRENT_TIMESTAMP
    FROM duplicates d
    WHERE d.rn > 1;

    WITH duplicates AS (
        SELECT "id", "phone_e164",
               ROW_NUMBER() OVER (PARTITION BY "phone_e164" ORDER BY "created_at" DESC) as rn
        FROM "users"
        WHERE "phone_e164" IS NOT NULL
    )
    UPDATE "users" u
    SET "phone_e164" = NULL
    FROM duplicates d
    WHERE u."id" = d."id" AND d.rn > 1;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_e164_key" ON "users"("phone_e164");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_telegram_user_id_key" ON "users"("telegram_user_id");

-- 3. USER_PREFERENCES (Conservation de preferredLocation et radiusKm)
CREATE TABLE IF NOT EXISTS "user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "preferred_location" TEXT,
    "search_radius_km" INTEGER NOT NULL DEFAULT 10,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "telegram_notifications" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Migration des données vers user_preferences
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'preferredLocation') THEN
        INSERT INTO "user_preferences" ("id", "user_id", "preferred_location", "search_radius_km", "created_at", "updated_at")
        SELECT 
            md5(random()::text || clock_timestamp()::text)::uuid::text,
            "id",
            "preferredLocation",
            COALESCE("radiusKm", 10),
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM "users"
        ON CONFLICT ("user_id") DO UPDATE SET
            "preferred_location" = EXCLUDED."preferred_location",
            "search_radius_km" = EXCLUDED."search_radius_km";

        -- Suppression sécurisée après copie vérifiée
        ALTER TABLE "users" DROP COLUMN "preferredLocation";
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'radiusKm') THEN
            ALTER TABLE "users" DROP COLUMN "radiusKm";
        END IF;
    END IF;
END $$;

-- 4. AUTH_CHALLENGES
CREATE TABLE IF NOT EXISTS "auth_challenges" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "purpose" "ChallengePurpose" NOT NULL,
    "nonce_hash" TEXT NOT NULL,
    "code_hash" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "user_id" TEXT,
    "new_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "auth_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "auth_challenges_phone_purpose_idx" ON "auth_challenges"("phone", "purpose");
CREATE INDEX IF NOT EXISTS "auth_challenges_nonce_hash_idx" ON "auth_challenges"("nonce_hash");

-- 5. AUDIT_LOGS
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");

-- 6. SHOPS
CREATE TABLE IF NOT EXISTS "shops" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "registry_number" TEXT,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT NOT NULL,
    "opening_hours" JSONB,
    "logo_url" TEXT,
    "verification_status" "ShopStatus" NOT NULL DEFAULT 'PENDING',
    "reject_reason" TEXT,
    "suspension_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shops_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shops_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "shops_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'userId') THEN
        ALTER TABLE "shops" RENAME COLUMN "userId" TO "user_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'status') THEN
        ALTER TABLE "shops" RENAME COLUMN "status" TO "verification_status";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'openingHours') THEN
        ALTER TABLE "shops" RENAME COLUMN "openingHours" TO "opening_hours";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'logoUrl') THEN
        ALTER TABLE "shops" RENAME COLUMN "logoUrl" TO "logo_url";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'createdAt') THEN
        ALTER TABLE "shops" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'updatedAt') THEN
        ALTER TABLE "shops" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'suspensionReason') THEN
        ALTER TABLE "shops" RENAME COLUMN "suspensionReason" TO "suspension_reason";
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'category') THEN
        ALTER TABLE "shops" ADD COLUMN "category" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'registry_number') THEN
        ALTER TABLE "shops" ADD COLUMN "registry_number" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'reject_reason') THEN
        ALTER TABLE "shops" ADD COLUMN "reject_reason" TEXT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'latitude' AND is_nullable = 'NO') THEN
        ALTER TABLE "shops" ALTER COLUMN "latitude" DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'longitude' AND is_nullable = 'NO') THEN
        ALTER TABLE "shops" ALTER COLUMN "longitude" DROP NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "shops_latitude_longitude_idx" ON "shops"("latitude", "longitude");

-- 7. SHOP_DOCUMENTS
CREATE TABLE IF NOT EXISTS "shop_documents" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "storage_path" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shop_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shop_documents_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_documents' AND column_name = 'shopId') THEN
        ALTER TABLE "shop_documents" RENAME COLUMN "shopId" TO "shop_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_documents' AND column_name = 'originalName') THEN
        ALTER TABLE "shop_documents" RENAME COLUMN "originalName" TO "original_name";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_documents' AND column_name = 'mimeType') THEN
        ALTER TABLE "shop_documents" RENAME COLUMN "mimeType" TO "mime_type";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_documents' AND column_name = 'fileUrl') THEN
        ALTER TABLE "shop_documents" RENAME COLUMN "fileUrl" TO "file_url";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_documents' AND column_name = 'createdAt') THEN
        ALTER TABLE "shop_documents" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_documents' AND column_name = 'updated_at') THEN
        ALTER TABLE "shop_documents" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_documents' AND column_name = 'storage_path') THEN
        ALTER TABLE "shop_documents" ADD COLUMN "storage_path" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_documents' AND column_name = 'reason') THEN
        ALTER TABLE "shop_documents" ADD COLUMN "reason" TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "shop_documents_shop_id_idx" ON "shop_documents"("shop_id");

-- 8. REFRESH_TOKENS (Sessions)
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refresh_tokens_token_hash_key" UNIQUE ("token_hash"),
    CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refresh_tokens' AND column_name = 'tokenHash') THEN
        ALTER TABLE "refresh_tokens" RENAME COLUMN "tokenHash" TO "token_hash";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refresh_tokens' AND column_name = 'userId') THEN
        ALTER TABLE "refresh_tokens" RENAME COLUMN "userId" TO "user_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refresh_tokens' AND column_name = 'expiresAt') THEN
        ALTER TABLE "refresh_tokens" RENAME COLUMN "expiresAt" TO "expires_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refresh_tokens' AND column_name = 'createdAt') THEN
        ALTER TABLE "refresh_tokens" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refresh_tokens' AND column_name = 'device') THEN
        ALTER TABLE "refresh_tokens" ADD COLUMN "device" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refresh_tokens' AND column_name = 'user_agent') THEN
        ALTER TABLE "refresh_tokens" ADD COLUMN "user_agent" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refresh_tokens' AND column_name = 'ip_address') THEN
        ALTER TABLE "refresh_tokens" ADD COLUMN "ip_address" TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- 9. SOCIAL_ACCOUNTS
CREATE TABLE IF NOT EXISTS "social_accounts" (
    "id" TEXT NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "social_accounts_provider_provider_user_id_key" UNIQUE ("provider", "provider_user_id"),
    CONSTRAINT "social_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_accounts' AND column_name = 'providerUserId') THEN
        ALTER TABLE "social_accounts" RENAME COLUMN "providerUserId" TO "provider_user_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_accounts' AND column_name = 'userId') THEN
        ALTER TABLE "social_accounts" RENAME COLUMN "userId" TO "user_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_accounts' AND column_name = 'createdAt') THEN
        ALTER TABLE "social_accounts" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "social_accounts_user_id_idx" ON "social_accounts"("user_id");

-- 10. NETTOYAGE DES TABLES OBSOLETES
DROP TABLE IF EXISTS "phone_otps" CASCADE;
DROP TABLE IF EXISTS "email_tokens" CASCADE;
DROP TYPE IF EXISTS "EmailTokenType" CASCADE;
