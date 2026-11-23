# LOT 5A — MS1 Backend : Contrat Boutique, Géocodage, Documents BYTEA & Alias

**Projet :** FORSA | Plateforme e-commerce Algérie  
**Microservice :** `services/ms1-accounts`  
**Base de données cible :** `neondb_lot1_test` (environnement de test uniquement)  
**Branche Git :** `feat/ms1-telegram-auth`  
**Date :** 24 Novembre 2026  

---

## 1. Tableau des Endpoints

| Méthode | Route | Authentification | Rôle requis | Description | Entrée / Paramètres | Sortie / Codes HTTP |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/shops` | Oui (Bearer JWT) | Authentifié | Création de boutique commerçant | `{ name, address, phone, category?, registryNumber?, latitude?, longitude?, openingHours?, logoUrl? }` | `201 Created` : `{ shop }`<br>`400 Bad Request`<br>`409 Conflict` |
| `POST` | `/api/shops/me` | Oui (Bearer JWT) | Authentifié | Alias de création de boutique | Même payload que `POST /shops` | `201 Created` / `400` / `409` |
| `POST` | `/api/shops/my` | Oui (Bearer JWT) | Authentifié | Alias de création de boutique | Même payload que `POST /shops` | `201 Created` / `400` / `409` |
| `GET` | `/api/shops/me` | Oui (Bearer JWT) | Authentifié | Consultation de sa propre boutique | Aucun | `200 OK` : `{ shop }`<br>`404 Not Found` si pas de boutique |
| `GET` | `/api/shops/my` | Oui (Bearer JWT) | Authentifié | Alias historique consultation boutique | Aucun | `200 OK` / `404 Not Found` |
| `PUT` | `/api/shops/me` | Oui (Bearer JWT) | Authentifié | Modification de sa propre boutique | `{ name?, description?, category?, registryNumber?, address?, latitude?, longitude?, phone?, openingHours?, logoUrl? }` | `200 OK` : `{ shop }`<br>`400 Bad Request`<br>`404 Not Found` |
| `PUT` | `/api/shops/my` | Oui (Bearer JWT) | Authentifié | Alias historique modification boutique | Même payload que `PUT /shops/me` | `200 OK` / `400` / `404` |
| `GET` | `/api/shops/me/verification` | Oui (Bearer JWT) | Authentifié | Statut de validation de la boutique | Aucun | `200 OK` : `{ status, rejectReason, submittedAt }`<br>`404 Not Found` |
| `GET` | `/api/shops/my/verification` | Oui (Bearer JWT) | Authentifié | Alias statut de vérification | Aucun | `200 OK` / `404 Not Found` |
| `GET` | `/api/shops/me/documents` | Oui (Bearer JWT) | Authentifié | Consultation de ses pièces justificatives | Aucun | `200 OK` : `{ documents: [{ id, type, status, reason, uploadedAt }] }` *(sans URLs ni bytes)* |
| `GET` | `/api/shops/my/documents` | Oui (Bearer JWT) | Authentifié | Alias pièces justificatives | Aucun | `200 OK` |
| `POST` | `/api/shops/my/documents` | Oui (Bearer JWT) | Authentifié | Téléversement des justificatifs (PDF/PNG/JPG max 5 Mo) | `multipart/form-data` : `commercial_register`, `tax_id`, `storefront` | `201 Created` : `{ message, documents: [{ id, type, status, uploadedAt }] }`<br>`400 Bad Request` |
| `POST` | `/api/shops/me/documents` | Oui (Bearer JWT) | Authentifié | Alias téléversement des justificatifs | Même payload multipart | `201 Created` / `400 Bad Request` |
| `GET` | `/api/shops/geocode` | Oui (Bearer JWT) | Authentifié | Géocodage d'adresse Nominatim via backend | Query string : `?q=...` | `200 OK` : `{ lat, lng, displayName, city, wilaya }`<br>`400` / `404` / `503 Service Unavailable` |
| `POST` | `/api/users/me/photo` | Oui (Bearer JWT) | Authentifié | Alias téléversement photo / avatar profil | `multipart/form-data` : `avatar` | `200 OK` : `{ user, message }`<br>`400 Bad Request` |
| `DELETE`| `/api/users/me/photo` | Oui (Bearer JWT) | Authentifié | Alias suppression photo / avatar profil | Aucun | `200 OK` : `{ user, message }` |
| `GET` | `/api/shops/:id` | Non | Public | Consultation publique d'une boutique | Paramètre d'URL `:id` | `200 OK` : `{ shop }`<br>`404 Not Found` |
| `GET` | `/api/shops/:id/documents/:filename` | Oui (Bearer JWT) | `ADMIN` | Téléchargement sécurisé document par admin | `:id` (shopId), `:filename` (id ou nom fichier) | Fichier binaire servi depuis `file_data` (ou disque legacy) avec `Content-Type` et `Content-Disposition: inline` |

---

## 2. Migration de Base de Données

### Migration appliquée : `20261123230000_lot5a_shop_documents_bytea`
- **Fichier :** `services/ms1-accounts/prisma/migrations/20261123230000_lot5a_shop_documents_bytea/migration.sql`
- **Cible :** `neondb_lot1_test` uniquement.
- **SQL exécuté :**
  ```sql
  -- Migration Lot 5A : Stockage binaire BYTEA pour shop_documents et file_url nullable
  ALTER TABLE "shop_documents" ADD COLUMN IF NOT EXISTS "file_data" BYTEA;
  ALTER TABLE "shop_documents" ALTER COLUMN "file_url" DROP NOT NULL;
  ```
- **Colonnes vérifiées sur la table `shops` :**
  - `category` : déjà présente (`VARCHAR / TEXT NULL`)
  - `registry_number` : déjà présente (`VARCHAR / TEXT NULL`)
  - `opening_hours` : déjà présente (`JSONB NULL`)
  - `latitude` / `longitude` : déjà présentes (`DOUBLE PRECISION NULL`)
- **Note importante sur les fichiers locaux :**
  > [!NOTE]
  > Les anciens fichiers locaux précédemment enregistrés sur le disque ne sont **PAS migrés**. Les nouveaux téléversements sont persistés directement dans PostgreSQL sous forme de données binaires `BYTEA` (`file_data`). L'endpoint de téléchargement administrateur supporte le fallback en lecture vers le système de fichiers pour les documents historiques.

---

## 3. Variables d'Environnement & Règle Production Fail-Fast

### Configuration (`services/ms1-accounts/src/config/env.ts`)
- `NOMINATIM_URL` : URL du service Nominatim OpenStreetMap.
  - *Valeur par défaut :* `https://nominatim.openstreetmap.org/search`
- `GEOCODER_USER_AGENT` : User-Agent d'identification pour la conformité avec la politique d'utilisation Nominatim.
  - *Valeur en développement :* `forsa-dev`
  - *En production (`NODE_ENV === 'production'`) :* **Obligatoire et strict**. Le serveur refuse de démarrer si manquant, vide, ou s'il contient des valeurs factices (`forsa-dev`, `default`, `dummy`).
- `TELEGRAM_BOT_USERNAME` :
  - *En production (`NODE_ENV === 'production'`) :* **Obligatoire**. Le serveur lève une exception immédiate au démarrage si la variable n'est pas configurée.

---

## 4. Géocodage Nominatim (Serveur Backend Uniquement)

- **Sécurité & Confidentialité :**
  - Le frontend n'appelle jamais Nominatim directement.
  - Les requêtes d'adresse sont masquées dans les journaux applicatifs (`Bab*** (longueur: 17)`).
- **Règles de limitation & Cache :**
  - Throttling strict : maximum 1 requête par seconde globale via file d'attente asynchrone (`throttleQueue`).
  - Cache en mémoire LRU/Map avec TTL de 24 heures (clé normalisée en minuscules, espaces condensés).
  - Paramètres d'appel Nominatim : `format=json`, `countrycodes=dz`, `limit=5`, `addressdetails=1`.
- **Format de Réponse :**
  ```json
  {
    "lat": 36.7525,
    "lng": 3.042,
    "displayName": "Bab El Oued, Alger, Algérie",
    "city": "Alger",
    "wilaya": "Alger"
  }
  ```
- **Gestion des Erreurs :**
  - Requête vide ou invalide : `400 Bad Request` (`BAD_REQUEST`).
  - Aucun résultat pour l'adresse : `404 Not Found` (`ADDRESS_NOT_FOUND`).
  - Timeout > 5s, 5xx, ou HTTP 429 : `503 Service Unavailable` (`GEOCODER_UNAVAILABLE`) avec le message exact : `"Service de géocodage temporairement indisponible"`. L'application ne plante jamais.

---

## 5. Validation des Pièces & Règle Lat/Lng

### Validation Binaire (Magic Bytes)
- Validation effectuée via `detectMagicBytes` et `validateDocumentFile` (`src/utils/file-validator.ts`).
- Types autorisés strictement :
  - PDF (`%PDF-`, hex `0x25 0x50 0x44 0x46`)
  - PNG (`\x89PNG\r\n\x1a\n`, hex `0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A`)
  - JPEG (`\xFF\xD8\xFF`, hex `0xFF 0xD8 0xFF`)
- Taille maximale par fichier : **5 Mo**.
- Toute extension maquillée ou fichier corrompu est rejeté avec `400 Bad Request` (`INVALID_FILE_TYPE`).

### Règle d'association Latitude / Longitude
- Dans les schémas Zod `createShopSchema` et `updateShopSchema` :
  - `latitude` et `longitude` doivent être **toutes deux présentes** ou **toutes deux absentes** (`null` ou `undefined`).
  - Si l'une est fournie sans l'autre, la validation échoue avec le message : *"Latitude et longitude doivent être toutes deux renseignées ou toutes deux absentes."*

### Attribution du rôle MERCHANT & Garde Anti-Escalade
- Lors de la création d'une boutique :
  - L'utilisateur reçoit automatiquement le rôle `MERCHANT` dans son tableau `roles[]`.
  - Protection absolue : interdiction formelle d'ajouter `ADMIN` lors de la création d'une boutique.
  - Un enregistrement d'audit `SHOP_CREATED` est inséré dans `audit_logs`.

---

## 6. Liste des Comptes avec Téléphone Nullifié (`PHONE_DUPLICATE_NULLIFIED`)

Requête exécutée sur la base de test `neondb_lot1_test` (audit logs pour déduplication de numéro) :

| ID Utilisateur | Email Masqué | Date d'Événement (UTC) | ID Entrée Audit Log |
| :--- | :--- | :--- | :--- |
| `b1e579ac-f3bb-4bec-9350-2e8568ff45d6` | `c***************7@forsa.dz` | 2026-11-22T23:45:23.163Z | `272b2203-0c4e-4f01-9034-75ebfebeae61` |
| `1be14f32-1eb3-4df9-9fce-5b793710d71d` | `b********************1@forsa.dz` | 2026-11-22T23:45:21.954Z | `1f5313a9-e2b8-450f-a3c3-32204bf239f6` |
| `ead22bf8-1178-437c-9112-ab03a557056b` | `c***************1@forsa.dz` | 2026-11-22T23:10:48.810Z | `3b3eb725-d91d-4076-a077-4a0b4112e4df` |
| `aaabae65-e69a-4479-a644-2ea1e8a67db4` | `n*******u@gmail.com` | 2026-11-22T23:10:48.295Z | `06f4ee5d-0078-43ff-beea-2ebfd6b0cf92` |

---

## 7. Questions & Clarifications

1. **Persistance des formats d'horaires (`openingHours`) :**  
   Le schéma actuel persiste les horaires au format JSONB libre (`Record<string, any>`). Un schéma de validation strict par jour (ex: `monday: { open: "08:00", close: "18:00", closed: false }`) pourra être formalisé si nécessaire lors de l'intégration avec le frontend du Lot 6A.
2. **Quota Nominatim en production :**  
   Pour un trafic élevé en production en Algérie, l'hébergement d'une instance Nominatim dédiée ou l'utilisation d'une passerelle mise en cache (Redis) est recommandée par rapport au serveur public OpenStreetMap qui applique une limite de 1 requête par seconde.

---

## 8. Résultats des Tests & Compilation

- **Vérification TypeScript :** `npx tsc --noEmit` exécuté avec **0 erreur**.
- **Tests Unitaires Jest :**
  - Suites de tests : **5 / 5 réussies** (`jwt.service.test.ts`, `telegram-auth.test.ts`, `validation.test.ts`, `lot2b.test.ts`, `lot5a.test.ts`).
  - Tests unitaires : **79 passés / 79 au total (100% succès, 0 échec)**.
  - Nouveaux tests ajoutés dans `lot5a.test.ts` : 18 tests dédiés couvrant les magic bytes, le mapping d'état géocodage, la règle de paire lat/lng, la garde anti-escalade ADMIN, et la sanitisation des documents.
