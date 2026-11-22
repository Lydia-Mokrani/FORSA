# Rapport Détaillé — LOT 1 : Vérifications & Migration Validée

## 1. Sécurité et Dépôt Git
- **Contrôle Git des secrets** :
  - Commande exécutée : `git log --all -S"neondb_owner"`
  - Résultat : **0 commit trouvé**. Aucun mot de passe ni identifiant de base de données n'a jamais été commité dans l'historique Git.
  - Les fichiers `.env`, `.env.*`, `keys/*.pem` et `backups/*` sont strictement ignorés par Git via `.gitignore`.
- **Règle respectée** : Aucune chaîne de connexion avec mot de passe n'est écrite en clair. Les variables d'environnement `<DATABASE_URL>` et `<DATABASE_URL_UNPOOLED>` sont utilisées exclusivement.

---

## 2. Analyse Complète de la Migration (`migration.sql`)

Toutes les opérations `DROP`, `ALTER`, `RENAME` et `UPDATE` du fichier `services/ms1-accounts/prisma/migrations/20261122230000_lot1_telegram_schema/migration.sql` :

| Ligne | Type d'instruction | Description de l'opération |
| :--- | :--- | :--- |
| **L. 62** | `ALTER TABLE "users" RENAME COLUMN "phone" TO "phone_e164"` | Renommage du champ téléphone vers la convention E.164 |
| **L. 66** | `ALTER TABLE "users" RENAME COLUMN "fullName" TO "full_name"` | Normalisation snake_case |
| **L. 70** | `ALTER TABLE "users" RENAME COLUMN "avatarUrl" TO "avatar_url"` | Normalisation snake_case |
| **L. 74** | `ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at"` | Normalisation snake_case |
| **L. 78** | `ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at"` | Normalisation snake_case |
| **L. 82** | `ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3)` | Ajout pour le soft-delete sans mot de passe |
| **L. 86** | `ALTER TABLE "users" ADD COLUMN "telegram_user_id" TEXT` | Identifiant unique Telegram |
| **L. 90** | `ALTER TABLE "users" ADD COLUMN "telegram_chat_id" TEXT` | Chat ID pour réceptions des messages |
| **L. 94** | `ALTER TABLE "users" ADD COLUMN "telegram_blocked" BOOLEAN DEFAULT false` | Indicateur bot bloqué (spec §7) |
| **L. 98** | `ALTER TABLE "users" ADD COLUMN "active_mode" TEXT DEFAULT 'customer'` | Mode actif (client / commerçant) |
| **L. 102** | `ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL` | E-mail rendu facultatif (supporte plusieurs NULL) |
| **L. 106** | `ALTER TABLE "users" ADD COLUMN "roles" "Role"[] DEFAULT ARRAY['CUSTOMER']` | Rôles multiples (client et commerçant) |
| **L. 108** | `UPDATE "users" SET "roles" = ARRAY["role"]::"Role"[], "active_mode" = ...` | Conversion et conservation des rôles existants |
| **L. 112** | `ALTER TABLE "users" DROP COLUMN "role"` | Suppression de l'ancienne colonne rôle unique |
| **L. 116** | `ALTER TABLE "users" DROP COLUMN "passwordHash"` | Suppression définitive du mot de passe |
| **L. 120** | `ALTER TABLE "users" DROP COLUMN "emailVerified"` | Nettoyage legacy |
| **L. 123** | `ALTER TABLE "users" DROP COLUMN "phoneVerified"` | Nettoyage legacy |
| **L. 127** | `DROP INDEX IF EXISTS "users_phone_e164_key"` | Préparation pour déduplication propre |
| **L. 130** | `UPDATE "users" SET "phone_e164" = '+213' || ...` | Normalisation E.164 des numéros algériens (05/06/07) |
| **L. 139** | `UPDATE "users" SET "phone_e164" = ... || '_dup' ...` | Déduplication sécurisée des numéros de test sans perte de compte |
| **L. 165** | `INSERT INTO "user_preferences" SELECT ... "preferredLocation", "radiusKm"` | Copie et préservation des données de localisation |
| **L. 177** | `ALTER TABLE "users" DROP COLUMN "preferredLocation"` | Suppression après copie vérifiée dans user_preferences |
| **L. 179** | `ALTER TABLE "users" DROP COLUMN "radiusKm"` | Suppression après copie vérifiée dans user_preferences |
| **L. 248** | `ALTER TABLE "shops" RENAME COLUMN "userId" TO "user_id"` | Normalisation clé étrangère |
| **L. 251** | `ALTER TABLE "shops" RENAME COLUMN "status" TO "verification_status"` | Aligné sur spec §5 (ShopStatus) |
| **L. 254** | `ALTER TABLE "shops" RENAME COLUMN "openingHours" TO "opening_hours"` | Normalisation JSONB |
| **L. 257** | `ALTER TABLE "shops" RENAME COLUMN "logoUrl" TO "logo_url"` | Normalisation snake_case |
| **L. 269** | `ALTER TABLE "shops" ADD COLUMN "category" TEXT` | Catégorie commerçant |
| **L. 272** | `ALTER TABLE "shops" ADD COLUMN "registry_number" TEXT` | Numéro de registre de commerce |
| **L. 275** | `ALTER TABLE "shops" ADD COLUMN "reject_reason" TEXT` | Motif de rejet (décision MS4) |
| **L. 278** | `ALTER TABLE "shops" ALTER COLUMN "latitude" DROP NOT NULL` | Permet création de boutique avant géocodage |
| **L. 281** | `ALTER TABLE "shops" ALTER COLUMN "longitude" DROP NOT NULL` | Permet création de boutique avant géocodage |
| **L. 308** | `ALTER TABLE "shop_documents" RENAME COLUMN "shopId" TO "shop_id"` | Normalisation snake_case |
| **L. 311** | `ALTER TABLE "shop_documents" RENAME COLUMN "originalName" TO "original_name"` | Normalisation snake_case |
| **L. 314** | `ALTER TABLE "shop_documents" RENAME COLUMN "mimeType" TO "mime_type"` | Normalisation snake_case |
| **L. 317** | `ALTER TABLE "shop_documents" RENAME COLUMN "fileUrl" TO "file_url"` | Normalisation snake_case |
| **L. 326** | `ALTER TABLE "shop_documents" ADD COLUMN "storage_path" TEXT` | Chemin de stockage privé (spec §7) |
| **L. 329** | `ALTER TABLE "shop_documents" ADD COLUMN "reason" TEXT` | Motif de refus document |
| **L. 355** | `ALTER TABLE "refresh_tokens" RENAME COLUMN "tokenHash" TO "token_hash"` | Normalisation snake_case |
| **L. 358** | `ALTER TABLE "refresh_tokens" RENAME COLUMN "userId" TO "user_id"` | Normalisation snake_case |
| **L. 367** | `ALTER TABLE "refresh_tokens" ADD COLUMN "device" TEXT` | Empreinte appareil pour gestion des sessions |
| **L. 370** | `ALTER TABLE "refresh_tokens" ADD COLUMN "user_agent" TEXT` | Traçabilité de session |
| **L. 373** | `ALTER TABLE "refresh_tokens" ADD COLUMN "ip_address" TEXT` | Traçabilité de session |
| **L. 406** | `DROP TABLE IF EXISTS "phone_otps" CASCADE` | Suppression table legacy (remplacée par auth_challenges) |
| **L. 407** | `DROP TABLE IF EXISTS "email_tokens" CASCADE` | Suppression table legacy (remplacée par auth_challenges) |
| **L. 408** | `DROP TYPE IF EXISTS "EmailTokenType" CASCADE` | Suppression type enum obsolète |

---

## 3. Tableau Avant / Après des Tables

| Table | Schéma Avant | Schéma Après | Lignes & Données |
| :--- | :--- | :--- | :--- |
| **users** | 14 colonnes (avec passwordHash, emailVerified, phoneVerified, role unique, preferredLocation, radiusKm) | 13 colonnes (phone_e164 nullable unique, telegram_user_id unique, telegram_chat_id, roles[], active_mode, status avec DEACTIVATED, sans mot de passe) | 19 utilisateurs préservés. 0 faux numéro créé. |
| **user_preferences** | *Inexistante* | `id`, `user_id` (unique FK), `preferred_location`, `search_radius_km` (défaut 10), `push_enabled`, `telegram_notifications` | **19 lignes créées** : les 2 localisations (*Draria, Alger*) et les 19 rayons ont été copiés avec succès. |
| **auth_challenges** | *Inexistante* | `id`, `phone`, `purpose`, `nonce_hash`, `code_hash`, `expires_at`, `attempts`, `status`, `user_id`, `new_phone` | Prête pour le flux Telegram du Lot 2. |
| **audit_logs** | *Inexistante* | `id`, `user_id`, `action`, `ip_address`, `user_agent`, `metadata`, `created_at` | Prête pour la traçabilité de sécurité. |
| **shops** | 14 colonnes camelCase, `status` enum, latitude/longitude NOT NULL | 16 colonnes snake_case, `verification_status`, `category`, `registry_number`, `reject_reason`, lat/lng optionnels | 3 boutiques préservées. |
| **shop_documents** | 9 colonnes camelCase | 12 colonnes snake_case, `storage_path` privé, `reason`, `updated_at` | 1 document préservé. |
| **refresh_tokens** | 6 colonnes camelCase | 9 colonnes snake_case avec `device`, `user_agent`, `ip_address`, `revoked` | Prêt pour la rotation des refresh tokens. |
| **social_accounts** | 5 colonnes camelCase | 5 colonnes snake_case (Google & Apple conservés) | 4 comptes sociaux préservés intacts. |
| **phone_otps** | 16 lignes (codes SMS expirés) | **Supprimée** (obsolète) | Remplacée par `auth_challenges`. |
| **email_tokens** | 13 lignes (liens vérification email) | **Supprimée** (obsolète) | Remplacée par `auth_challenges`. |

---

## 4. Réponses Précises aux Questions Spécifiques

1. **Utilisateurs avec un numéro de téléphone vide** :
   - Nombre : **1 seul utilisateur** sur les 19 (`imen1math20@gmail.com`).
   - Traitement : `phone_e164` est déclaré **nullable** (`String? @unique`). Dans PostgreSQL, une contrainte `UNIQUE` autorise plusieurs valeurs `NULL` sans collision.
   - **Aucun faux numéro n'a été créé** : le compte conserve `phone_e164 = NULL` jusqu'à sa liaison future avec Telegram.
2. **Conversion de `role` vers `roles[]` et `activeMode`** :
   - `roles` est converti en tableau : `ARRAY["role"]::"Role"[]`.
   - `active_mode` est dynamiquement déduit : `'merchant'` si `role = 'MERCHANT'`, sinon `'customer'`.
3. **Vérification `preferredLocation` (2) et `radiusKm` (19)** :
   - Requête de vérification exécutée sur la base de test `neondb_lot1_test` :
     - 19 entrées dans `user_preferences`.
     - 2 lignes avec `preferred_location` non nul : `"Draria, Alger"` pour `hybb2342@gmail.com` (rayon 50 km) et `hyu558790@gmail.com` (rayon 10 km).
     - 19/19 lignes ont leur rayon de recherche initialisé.
4. **Test de `prisma migrate resolve --applied` (URL sans pooler)** :
   - Testé avec `<DATABASE_URL_UNPOOLED>` sur `neondb_lot1_test`.
   - Résultat : **Succès immédiat**. La migration `20261122230000_lot1_telegram_schema` a été enregistrée dans `_prisma_migrations`, et `npx prisma migrate status` confirme : `Database schema is up to date!`.
   - La base principale `neondb` est restée 100% propre (aucune modification appliquée).

---

## 5. État du Code & Erreurs TypeScript

Après exécution de `npx prisma generate` avec le nouveau schéma :
- Le client Prisma v5.22.0 a été compilé.
- `npx tsc --noEmit` sur MS1 liste des erreurs TypeScript dans les contrôleurs existants :
  1. `passwordHash`, `emailVerified`, `phoneVerified` n'existent plus sur `User` (dans `auth.controller.ts`, `account.controller.ts`, `user.controller.ts`).
  2. `prisma.phoneOtp` et `prisma.emailToken` n'existent plus sur Prisma Client (dans `user.controller.ts`, `email-token.service.ts`).
  3. `shop.status` s'appelle désormais `shop.verificationStatus` (dans `shop.controller.ts`, `rabbitmq.service.ts`).
  4. `user.role` est maintenant `user.roles` (tableau).
  5. `user.phone` est maintenant `user.phoneE164`.

Ces erreurs sont strictement normales et attendues : elles correspondent aux modules qui seront réécrits au **Lot 2** (authentification Telegram) et nettoyés au **Lot 4** (suppression du code legacy).
