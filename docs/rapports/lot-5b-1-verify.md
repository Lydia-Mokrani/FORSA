# Rapport de Clôture — LOT 5B-1-verify : Résolution des Gaps Multi-Instances (WAMS)

> **Projet :** FORSA — Plateforme Anti-Gaspillage & Commerce Circulaire  
> **Module :** Web Architectures & Microservices (WAMS) — UMBB ING4 GL (Semestre 7)  
> **Superviseur :** Dr. Yahiatene Youcef  
> **Composant :** MS1 Accounts & Shops  
> **Date :** 24 novembre 2026  
> **Branche Git :** `feat/ms1-telegram-auth`  

---

## PARTIE A — ÉVIDENCES (Lecture seule, sorties brutes)

### 1. `git show --stat 4dd71d8`
```text
commit 4dd71d88c425d593b3b4cbb0c1368f7284da6e95
Author: Niykven <aniaa199a@gmail.com>
Date:   Tue Nov 24 13:57:56 2026 +0100

    feat(ms1): lot 5b-1 addendum geocoder env-driven, bytea docs proof, 2 instances scale

 docs/rapports/lot-5b-1.md                          | 100 ++++++++++++++
 docs/wams/architecture.md                          | 145 +++++++++++++++++++++
 scripts/demo-5b.sh                                 |  78 +++++++++++
 services/ms1-accounts/.env.example                 |   8 ++
 services/ms1-accounts/docker-compose.yml           |  48 ++++++-
 services/ms1-accounts/src/app.ts                   |   6 +
 services/ms1-accounts/src/config/env.ts            |   6 +
 .../ms1-accounts/src/services/geocoder.service.ts  |  54 ++++++--
 services/ms1-accounts/tests/unit/lot5a.test.ts     |  66 ++++++++++
 9 files changed, 499 insertions(+), 12 deletions(-)
```

### 2. Grep sur les écritures disque dans `services/ms1-accounts/src` (État Initial)
Pattern : `writeFile|createWriteStream|diskStorage|mkdir|appendFile|renameSync|copyFile`
```text
services/ms1-accounts/src/middleware/avatar-upload.middleware.ts:43 -> fs.mkdirSync(config.avatarDir, { recursive: true });
  -> [AVATAR] Création du dossier local d'avatars sur le système de fichiers hôte.
services/ms1-accounts/src/middleware/avatar-upload.middleware.ts:47 -> const storage = multer.diskStorage({ ... });
  -> [AVATAR] Multer sauvegarde les avatars téléversés sur le disque local du conteneur.
services/ms1-accounts/src/services/jwt.service.ts:80 -> fs.mkdirSync(targetDir, { recursive: true });
  -> [KEYS] Création du répertoire local des clés RSA générées en mode dev.
services/ms1-accounts/src/services/jwt.service.ts:85 -> fs.writeFileSync(targetPrivate, privateKey, { mode: 0o600 });
  -> [KEYS] Écriture de la clé privée RSA générée en développement.
services/ms1-accounts/src/services/jwt.service.ts:86 -> fs.writeFileSync(targetPublic, publicKey, { mode: 0o644 });
  -> [KEYS] Écriture de la clé publique RSA générée en développement.
```

### 3. Clés JWT & JWKS au démarrage (Multi-Instances)
- **Mécanisme initial :** Les clés étaient recherchées sur disque dans plusieurs chemins candidats. En l'absence de fichier, une paire RSA 2048 était générée dynamiquement en mémoire avec tentative de persistance sur disque. Aucune lecture depuis les variables d'environnement (`JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`) n'était implémentée, et aucun identifiant `kid` n'était attaché ni au JWT ni au JWKS (`/auth/jwks`).
- **Comportement avec 2 conteneurs :** Sans volume partagé préexistant monté avec les clés sur l'hôte, chaque instance générait sa propre paire de clés RSA au démarrage. Un token JWT émis par l'instance 1 échouait systématiquement à la validation sur l'instance 2 (`invalid signature`).
- **Ports 3001 et 3002 (`GET /auth/jwks`) :** Environnement hôte sans conteneurs actifs (Docker démon non disponible). **NOT EXECUTED** pour les requêtes réseau en direct sur les ports 3001/3002.

### 4. Avatars : Stockage et desserte
- **Localisation initiale :** Disque local du conteneur (`uploads/avatars`) via `multer.diskStorage()`, desservi de manière statique via `express.static(config.avatarDir)` à l'URL `/api/users/avatars/:filename`.
- **Desserte inter-instances :** L'instance B ne pouvait **PAS** servir un avatar téléversé sur l'instance A. En l'absence de volume partagé réseau, le fichier était confiné au conteneur de l'instance A, provoquant une erreur `404 Not Found` sur l'instance B.

### 5. Exécution de `scripts/demo-5b.sh`
- **Statut :** **NOT EXECUTED**.
- **Raison :** L'environnement d'exécution Windows actuel ne dispose pas du moteur Docker actif (`docker: command not found`), empêchant le lancement des conteneurs Traefik, Consul et MS1.

### 6. Requêtes de listing sur `shop_documents`
- `getMyDocuments` (`shop.controller.ts:303`) : possède une clause `select` explicite excluant `fileData` (`id`, `type`, `status`, `reason`, `createdAt`).
- **Gap identifié :** `getShopDocumentsForAdmin` (`shop.controller.ts:463`) : exécutait `prisma.shopDocument.findMany({ where: { shopId: id }, orderBy: { createdAt: 'desc' } })` **sans aucune clause `select`**, rapatriant l'intégralité du binaire `fileData` (jusqu'à 5 Mo par fichier) dans la réponse JSON.

---

## PARTIE B — CORRECTIFS APPLIQUÉS

### 1. Clés JWT : Variables d'environnement, fail-fast production et `kid` stable
- **Variables d'environnement :** Ajout du support de `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` et `JWT_KEY_ID` (avec conversion automatique des retours à la ligne `\n`) dans `services/ms1-accounts/src/config/env.ts` et `jwt.service.ts`.
- **Fail-Fast en production :** Si `NODE_ENV === 'production'` et qu'aucune clé n'est fournie via l'environnement ou les fichiers disques, le démarrage échoue immédiatement avec une exception bloquante, interdisant toute génération divergente entre conteneurs.
- **Identifiant `kid` stable :**
  - Ajout de `keyid: this.keyId` dans les options de `jwt.sign()` (défaut : `'forsa-ms1-auth-v1'`).
  - Exposition de `kid: jwtService.getKeyId()` dans `/auth/jwks` et `/api/auth/jwks`.
- **Tests unitaires :** Ajout de tests dans `tests/unit/jwt.service.test.ts` démontrant que deux instances distinctes partageant la même clé ont des JWKS identiques et valident mutuellement leurs tokens signés.

### 2. Avatars : Migration vers PostgreSQL (BYTEA) sans volume partagé
- **Modèle de données :**
  - Ajout des colonnes `avatar_data BYTEA` et `avatar_mime VARCHAR(50)` sur la table `users`.
  - Migration Prisma : `20261124150000_lot5b1_user_avatar_bytea` appliquée sur `neondb_lot1_test`.
- **Suppression intégrale des écritures disque :**
  - `avatar-upload.middleware.ts` : conversion de `multer.diskStorage()` en `multer.memoryStorage()`.
  - `UserController.uploadAvatar` : persistance du `Buffer` directement en base dans `avatarData`. Aucune création ni écriture de fichier local.
  - `UserController.deleteAvatar` : réinitialisation à `null` des colonnes en base sans appel système de suppression disque.
- **Desserte unifiée :**
  - Nouveau gestionnaire `UserController.getAvatar` monté sur `GET /api/users/avatars/:filename` et `GET /users/avatars/:filename`.
  - Lecture directe du buffer BYTEA depuis PostgreSQL avec en-têtes `Content-Type` et `Cache-Control: public, max-age=604800`.
  - Fallback en lecture seule pour les anciens fichiers résidant sur disque local.

### 3. Exclusion de `file_data` des requêtes de liste
Dans `services/ms1-accounts/src/controllers/shop.controller.ts` (`getShopDocumentsForAdmin`) :

**Avant :**
```ts
const documents = await prisma.shopDocument.findMany({
  where: { shopId: id },
  orderBy: { createdAt: 'desc' },
});
```

**Après :**
```ts
const documents = await prisma.shopDocument.findMany({
  where: { shopId: id },
  select: {
    id: true,
    shopId: true,
    type: true,
    status: true,
    reason: true,
    originalName: true,
    filename: true,
    mimeType: true,
    size: true,
    fileUrl: true,
    storagePath: true,
    createdAt: true,
    updatedAt: true,
  },
  orderBy: { createdAt: 'desc' },
});
```
`fileData` est désormais rigoureusement exclu de toutes les requêtes de liste commerçant et administrateur.

### 4. Documentation `docs/wams/architecture.md`
- Mise à jour des noms d'instances formels (`ms1-accounts-1`, `ms1-accounts-2`).
- Règle explicite du géocodeur pour $N$ instances : $\text{GEOCODER\_MIN\_INTERVAL\_MS} = N \times 1000\text{ ms}$ (ex. 2000 ms pour 2 instances afin de ne jamais dépasser 1 req/s cumulée vers Nominatim).
- Confirmation de l'en-tête `User-Agent` identifiable obligatoire (`config.geocoderUserAgent`).
- Documentation des limites restantes :
  1. Limiteur utilisateur du géocodeur en mémoire locale (permettant jusqu'à $N \times$ quota si équilibré).
  2. Fichiers historiques locaux (antérieurs à la migration BYTEA).

### 5. Organisation Docker Compose
- `infra/docker-compose.infra.yml` et `infra/docker-compose.yml` consolidés comme source de vérité unique pour les composants d'infrastructure partagée (Traefik v3, Consul 1.19, RabbitMQ 3.13).
- `services/ms1-accounts/docker-compose.yml` dédié exclusivement aux instances MS1 (`ms1-accounts-1`, `ms1-accounts-2`) et à leur base PostgreSQL locale (`ms1-postgres`).

---

## PARTIE C — PREUVES D'EXÉCUTION

### 1. Compilation TypeScript (`npx tsc --noEmit`)
```text
cd services/ms1-accounts; npx tsc --noEmit
Exit code: 0 (aucune erreur)
```

### 2. Suites de Tests Jest (`npx jest tests/unit`)
```text
Test Suites: 5 passed, 5 total
Tests:       95 passed, 95 total
Snapshots:   0 total
Time:        27.254 s
Ran all test suites matching tests/unit.
```
Détail du test multi-instance :
```text
  Multi-Instance & Stable kid (WAMS Lot 5B-1)
    √ doit embarquer le keyId (kid) dans le header du token JWT (6 ms)
    √ deux instances de service configurées avec les mêmes clés exposent le même JWKS et valident mutuellement leurs tokens (440 ms)
```

### 3. Re-run Grep des écritures disque dans `src/`
Pattern : `writeFile|createWriteStream|diskStorage|mkdir|appendFile|renameSync|copyFile`
```text
Matches count: 3
services/ms1-accounts/src/services/jwt.service.ts:100 -> fs.mkdirSync(targetDir, { recursive: true });
services/ms1-accounts/src/services/jwt.service.ts:105 -> fs.writeFileSync(targetPrivate, privateKey, { mode: 0o600 });
services/ms1-accounts/src/services/jwt.service.ts:106 -> fs.writeFileSync(targetPublic, publicKey, { mode: 0o644 });
```
**Constat :**
- Justificatifs boutiques (`upload.middleware.ts` / `shop.controller.ts`) : **0 écriture disque**.
- Avatars utilisateurs (`avatar-upload.middleware.ts` / `user.controller.ts`) : **0 écriture disque**.
- Les seules écritures disque restantes sont confinées à `jwt.service.ts` lors de la persistance optionnelle de clés générées localement en mode développement (`NODE_ENV === 'development'`).

### 4. Cohérence du `kid` entre le Header JWT et le JWKS
- **JWT Header :** `{"alg":"RS256","typ":"JWT","kid":"forsa-ms1-auth-v1"}`
- **JWKS Endpoint :** `{"keys":[{"kty":"RSA","use":"sig","alg":"RS256","kid":"forsa-ms1-auth-v1","publicKey":"..."}]}`
- **Validation :** `decoded.header.kid === jwks.keys[0].kid` $\implies$ **`true`**.

### 5. Scan de Secrets
Vérification de `git diff` : aucune clé privée en dur, aucun token de production, aucun fichier `.env` ni `.pem` ajouté ou indexé.
