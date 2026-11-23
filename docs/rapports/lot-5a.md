# LOT 5A & 5A-fix — MS1 Backend : Contrat Boutique, Géocodage, Documents BYTEA & Sécurisation

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
| `GET` | `/api/shops/geocode` | Oui (Bearer JWT) | Authentifié | Géocodage d'adresse Nominatim via backend | Query string : `?q=...` | `200 OK` : `{ lat, lng, displayName, city, wilaya }`<br>`400` / `404` / `429` / `503 Service Unavailable` |
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
  > Les anciens fichiers locaux précédemment enregistrés sur le disque ne sont **PAS migrés**. Les nouveaux téléversements sont persistés directement dans PostgreSQL sous forme de données binaires `BYTEA` (`file_data`) via `StorageService`. L'endpoint de téléchargement administrateur supporte le fallback en lecture sécurisée vers le système de fichiers pour les documents historiques.

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

## 4. Contrat de Géocodage (Geocode Contract)

### Endpoint : `GET /api/shops/geocode?q=...`
- **Authentification requise :** Bearer JWT valide.
- **Limitation d'accès & Sécurité :**
  - Le frontend FORSA n'appelle jamais Nominatim directement.
  - Throttling strict : 1 requête par seconde globale.
  - File d'attente bornée : **20 requêtes maximum** en attente. Si la file est saturée, réponse immédiate `503 Service Unavailable`.
  - Limitation par utilisateur : **10 recherches par minute maximum** par utilisateur authentifié. À la 11ème requête, réponse immédiate `429 Too Many Requests`.
  - Timeout réseau de 5 secondes : s'applique **strictement à l'appel HTTP Nominatim** et non au temps d'attente dans la file.
  - Masquage des adresses dans les journaux applicatifs (`Bab*** (longueur: 17)`).
  - Cache en mémoire LRU/Map avec TTL de 24 heures (clé normalisée en minuscules, espaces condensés).

### Corps de Réponse Exact (Succès 200 OK)
```json
{
  "lat": 36.7525,
  "lng": 3.042,
  "displayName": "Bab El Oued, Alger, Algérie",
  "city": "Alger",
  "wilaya": "Alger"
}
```

### Corps de Réponse Exacts (Erreurs)

#### 1. Paramètre `q` manquant ou vide (`400 Bad Request`)
```json
{
  "message": "Le paramètre de recherche q est requis",
  "code": "BAD_REQUEST"
}
```

#### 2. Adresse introuvable (`404 Not Found`)
```json
{
  "message": "Adresse introuvable.",
  "code": "ADDRESS_NOT_FOUND"
}
```

#### 3. Taux limite dépassé par utilisateur (`429 Too Many Requests`)
```json
{
  "message": "Limite de requêtes atteinte (10 recherches par minute). Veuillez patienter.",
  "code": "RATE_LIMITED"
}
```

#### 4. Service indisponible / timeout / queue saturée (`503 Service Unavailable`)
```json
{
  "message": "Service de géocodage temporairement indisponible",
  "code": "GEOCODER_UNAVAILABLE"
}
```

---

## 5. Gestion des Coordonnées GPS & Contrat Boutique

### Réinitialisation des Coordonnées GPS (`PUT /shops/me`)
- **Changement d'adresse sans coordonnées :** Si `address` est modifiée et que la requête ne contient ni `latitude` ni `longitude`, les coordonnées `latitude` et `longitude` sont automatiquement réinitialisées à `null` en base de données (position non confirmée).
- **Adresse inchangée sans coordonnées :** Si l'adresse reste identique et qu'aucune coordonnée n'est fournie, les coordonnées existantes sont conservées inchangées.
- **Paire explicite fournie :** Si `{ latitude, longitude }` sont transmises, elles sont sauvegardées.
- **Effacement explicite :** La transmission de `{ latitude: null, longitude: null }` efface les coordonnées en base.
- **Règle de paire indissociable :** Toute requête ne fournissant qu'une seule des deux coordonnées (ou une seule non-nulle) est immédiatement rejetée avec `400 Bad Request`.

### Attribution du rôle MERCHANT & Garde Anti-Escalade
- Lors de la création d'une boutique (`POST /shops` ou `/shops/me`) :
  - L'utilisateur reçoit automatiquement le rôle `MERCHANT` dans son tableau `roles[]`.
  - Protection absolue : interdiction formelle d'ajouter `ADMIN` lors de la création d'une boutique.
  - Un enregistrement d'audit `SHOP_CREATED` est inséré dans `audit_logs`.

---

## 6. Stockage Sécurisé des Documents & Anti-Path Traversal

### Stockage Binaire via `StorageService`
- Interface abstraite `StorageService` (`put`, `get`, `delete`) implémentée par le driver `DatabaseStorageService` adossé à la colonne PostgreSQL `file_data` (`BYTEA`).
- `multer.memoryStorage()` utilisé exclusivement : suppression intégrale du stockage sur disque local pour les nouveaux uploads.
- Validation binaire par magic bytes (`detectMagicBytes`) : seuls PDF (`%PDF-`), PNG (`\x89PNG`), JPEG (`\xFF\xD8\xFF`) sont autorisés. Fichiers WebP et autres formats rejetés avec `400 Bad Request`.
- Limite de taille stricte : **5 Mo maximum** par fichier.
- Sanitisation des réponses commerçant (`GET /shops/me/documents` et `POST /shops/my/documents`) : aucun chemin interne (`storagePath`), URL publique ni octet binaire n'est retourné.

### Sécurisation de l'accès Administrateur aux Justificatifs
- Endpoint `GET /api/shops/:id/documents/:filename` réservé au rôle `ADMIN`.
- Validation stricte anti-traversal :
  - `:id` restreint à `/^[a-zA-Z0-9_-]+$/`.
  - `:filename` restreint à `/^[a-zA-Z0-9_.-]+$/` et rejet explicite de `..`, `/`, `\`, `%2e`, `%2f`, `%5c`, et chemins absolus.
  - Les fichiers sont servis en priorité depuis PostgreSQL (`file_data`).
  - Pour le repli sur les fichiers disques existants non migrés, le chemin est résolu via `path.resolve(config.uploadDir, path.basename(doc.filename))` et confiné strictement à `config.uploadDir`.

---

## 7. Liste des Comptes avec Téléphone Nullifié (`PHONE_DUPLICATE_NULLIFIED`)

Requête exécutée sur la base de test `neondb_lot1_test` (audit logs pour déduplication de numéro) :

| ID Utilisateur | Email Masqué | Date d'Événement (UTC) | ID Entrée Audit Log |
| :--- | :--- | :--- | :--- |
| `b1e579ac-f3bb-4bec-9350-2e8568ff45d6` | `c***************7@forsa.dz` | 2026-11-22T23:45:23.163Z | `272b2203-0c4e-4f01-9034-75ebfebeae61` |
| `1be14f32-1eb3-4df9-9fce-5b793710d71d` | `b********************1@forsa.dz` | 2026-11-22T23:45:21.954Z | `1f5313a9-e2b8-450f-a3c3-32204bf239f6` |
| `ead22bf8-1178-437c-9112-ab03a557056b` | `c***************1@forsa.dz` | 2026-11-22T23:10:48.810Z | `3b3eb725-d91d-4076-a077-4a0b4112e4df` |
| `aaabae65-e69a-4479-a644-2ea1e8a67db4` | `n*******u@gmail.com` | 2026-11-22T23:10:48.295Z | `06f4ee5d-0078-43ff-beea-2ebfd6b0cf92` |

---

## 8. Résultats des Tests & Compilation (Preuves Formelles)

- **Vérification TypeScript :** `npx tsc --noEmit` exécuté avec **0 erreur**.
- **Tests Unitaires Jest :**
  - Suites de tests : **5 / 5 réussies** (`jwt.service.test.ts`, `telegram-auth.test.ts`, `validation.test.ts`, `lot2b.test.ts`, `lot5a.test.ts`).
  - Tests unitaires : **89 passés / 89 au total (100% succès, 0 échec)**.
  - Couverture complète des points de contrôle Lot 5A-fix :
    * Rejet de WebP et limite 5 Mo (magic bytes + fileFilter).
    * Fail-fast en production si `TELEGRAM_BOT_USERNAME` ou `GEOCODER_USER_AGENT` manquant ou factice.
    * Réinitialisation de latitude/longitude à null sur modification d'adresse sans coordonnées.
    * Préservation des coordonnées si l'adresse est inchangée.
    * Rejet strict des paires coordonnées partielles (400 Bad Request).
    * Rejet de path traversal (`../../etc/passwd`, encodé `%2e%2e`, chemins absolus).
    * Limitation par utilisateur (10 req/min -> 429 `RATE_LIMITED`).
    * File d'attente Nominatim bornée à 20 -> 503 `GEOCODER_UNAVAILABLE`.
    * Timeout réseau de 5 secondes strictement appliqué à l'appel Nominatim.
