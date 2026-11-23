# Rapport d'Audit Technique Post-Lot 2C — MS1 (Comptes & Boutiques)

**Date** : 2026-11-23  
**Branche** : `feat/ms1-telegram-auth`  
**Base de données de production (`neondb`)** : strictement consultée en **LECTURE SEULE** (aucun write, aucune migration).  
**Base de test (`neondb_lot1_test`)** : base de travail pour validation des migrations et tests.

---

## 1. Résumé Exécutif de l'Audit

L'audit technique réalisé sur le code réel du dépôt après le Lot 2C confirme que le cœur de l'authentification sans mot de passe par bot Telegram (start, challenges, verify, rotation JWT RS256) et le frontend (LoginPage, RegisterPage, authService, ProfilePage, statuts commerçant) sont fonctionnels et compilent sans erreur (**exit code 0**).

Cependant, l'audit a mis en lumière des écarts stricts par rapport aux spécifications FORSA (§4 à §9) :
1. **Accès Figma** : Le lien Figma fourni n'est pas public et est protégé par un mur d'authentification (HTTP 403) ; les frames Figma n'ont pas pu être inspectées directement par le navigateur.
2. **Dépendance `lucide-react`** : Absente du module d'authentification (`features/auth` et `features/profile`), mais toujours importée dans `features/catalogue` (MS2).
3. **Sécurité des Rôles** : L'attribution implicite du rôle `MERCHANT` lors d'un simple login sur `/verify` a été identifiée comme une anomalie et corrigée pour protéger l'étanchéité des privilèges.
4. **Migration des Doublons** : La requête réelle en lecture seule sur `neondb` a identifié exactement **2 numéros dupliqués impliquant 6 comptes**. La migration sur `neondb_lot1_test` a nettoyé ces doublons vers `NULL` avec traçabilité dans `audit_logs` (4 comptes nullifiés).
5. **Documents Commerçant** : Le stockage actuel utilise le système de fichiers local (`multer.diskStorage`), ce qui est incompatible avec un déploiement multi-serveurs WAMS sans stockage objet partagé (S3/MinIO). De plus, la limite est de 10 Mo au lieu des 5 Mo prescrits par la spécification §7.
6. **Endpoints MS1 (§6)** : Plusieurs endpoints exigés par la spécification §6 ne sont pas encore créés (`/shops/me/verification`, `POST /users/me/deactivate`, `DELETE /users/me`), et des divergences de nommage existent (`/shops/my` vs `/shops/me`, `/users/me/avatar` vs `/users/me/photo`).

---

## 2. État Détaillé des Points Audités

### 1. Figma et Conformité Visuelle
- **Statut** : **NON VÉRIFIABLE DIRECTEMENT (MUR D'AUTHENTIFICATION FIGMA)**
- **Preuve technique** :
  - Tentative de navigation sur l'URL `https://www.figma.com/design/yX4WMqraIaBSVKibnrCeat/forsa?node-id=6-9&m=dev` par le sous-agent navigateur (`conversationId: 57d1ce0e-e792-49fc-84bf-36f2a686092f`).
  - Résultat : **HTTP 403 Forbidden** avec écran de connexion Figma (« *Inscrivez-vous ou connectez-vous pour voir « forsa »* »).
  - Capture d'écran enregistrée : `browser_evidence/57d1ce0e-e792-49fc-84bf-36f2a686092f/final_step_2.png`.
- **Analyse du Frontend implémenté** :
  - Les styles ont été appliqués en conformité avec la charte Figma présente dans le code source :
    - Couleurs : `#0B2C25` (vert sombre), `#17664E` (émeraude), `#FFFAF0` (crème), `#B13B3B` (erreur).
    - Rayons de courbure : `rounded-2xl` (16px), `rounded-3xl` (24px).
    - Typographie : Police Poppins configurée dans Tailwind (`font-sans`).
    - Glassmorphism : `bg-white/90 backdrop-blur-md border border-[#0B2C25]/10 shadow-2xl`.
  - Écrans marqués `[NOUVEAU]` (QR code SVG, attente Telegram, saisie 6 cases OTP, verrouillage 5 essais) conçus dans le strict respect de cette charte.

---

### 2. Icônes et Dépendances Frontend
- **Statut** : **CONFIRMÉ (PARTIELLEMENT CONFORME PAR PÉRIMÈTRE)**
- **Preuves techniques** :
  - **Dans MS1 Auth & Profile** (`frontend/src/features/auth`, `frontend/src/features/profile`) : **0 utilisation de `lucide-react`**. Toutes les icônes proviennent des SVG Figma officiels situés dans `frontend/src/assets/icons/figma/` (`icone-smart-phone-01.svg`, `icone-clock-01.svg`, `icone-alert-circle.svg`, `icone-refresh.svg`, `figmaAlertCircle`, `figmaCrossPill`, etc.).
  - **Dans l'ensemble du frontend** : `lucide-react` est présent dans `frontend/package.json#L14` et est utilisé dans 15 fichiers appartenant au catalogue MS2 (`features/catalogue/components/*` et `features/catalogue/pages/*`).
- **Icônes manquantes / remplacements** : Aucune icône arbitraire n'a été créée. Les composants auth utilisent strictement les assets SVG Figma existants.

---

### 3. Sécurité de l'Authentification Telegram

#### A. Logs du nonce et du code
- **Statut** : **CONFIRMÉ**
- **Preuves techniques** :
  - `services/ms1-accounts/src/services/challenge.service.ts#L71-L74` : conditionné par `process.env.NODE_ENV === 'development'`.
  - `services/ms1-accounts/src/controllers/user.controller.ts#L291-L293` : conditionné par `process.env.NODE_ENV === 'development'`.
  - `services/ms1-accounts/src/events/auth-events.listener.ts#L151-L153` : conditionné par `process.env.NODE_ENV === 'development'`.
  - `services/ms1-accounts/src/services/telegram.service.ts#L255` : log de mismatch numéro enveloppé dans `process.env.NODE_ENV === 'development'`.
  - Aucun code OTP, nonce brut ou token n'est loggué en environnement test, staging ou production.

#### B. Changement de numéro (Conflits Scénario 1 et Scénario 2)
- **Statut** : **CONFIRMÉ**
- **Preuves techniques** :
  - **Scénario 1 (Telegram déjà associé à un autre compte)** :
    - Détecté lors de la transaction Prisma dans `services/ms1-accounts/src/events/auth-events.listener.ts#L84-L87`.
    - Défi marqué `FAILED` (`#L95-L98`).
    - Message explicite envoyé par le bot Telegram : « *❌ Action refusée : Ce compte Telegram est déjà lié à un autre compte FORSA.* » (`#L90, L115-L118`).
    - Entrée `audit_logs` créée avec `action: 'PHONE_CHANGE_FAILED'` et `reason: 'TELEGRAM_ACCOUNT_ALREADY_LINKED'` (`#L101-L112`).
    - Validé par le test unitaire : `lot2b.test.ts#L340` (*Cas A — doit marquer FAILED, avertir et logger en audit si telegramUserId est déjà lié à un autre compte*).
  - **Scénario 2 (Numéro déjà associé à un autre compte)** :
    - En phase HTTP `/change/verify` : rejet immédiat avec `ConflictError` (**HTTP 409**) : `user.controller.ts#L351` (`Ce numéro de téléphone est déjà associé à un autre compte.`), testé dans `lot2b.test.ts#L206`.
    - En phase finale transactionnelle Telegram : détecté dans `auth-events.listener.ts#L88`, défi marqué `FAILED`, entrée `audit_logs` avec `reason: 'PHONE_ALREADY_IN_USE'`, message d'erreur Telegram envoyé. Validé par le test unitaire `lot2b.test.ts#L400`.

#### C. Autorisation du rôle (/verify)
- **Statut** : **CONFIRMÉ APRÈS CORRECTION**
- **Preuves techniques & analyse** :
  - **Rôle ADMIN** : Strictement impossible à demander. Le schéma Zod `verifySchema` dans `auth.controller.ts#L35` n'autorise que `role: z.enum(['CUSTOMER', 'MERCHANT']).optional()`. Toute valeur différente (dont `ADMIN`) est rejetée avec `400 Bad Request`. Validé par test unitaire dédié.
  - **Escalade de privilège commerçant (Anomalie identifiée)** : Auparavant, un utilisateur existant pouvait s'auto-attribuer `Role.MERCHANT` en envoyant `role: 'MERCHANT'` à `/verify`.
  - **Correction effectuée** : Suppression de l'auto-attribution sur utilisateur existant dans `auth.controller.ts#L145-L150`. L'attribution `[CUSTOMER, MERCHANT]` n'a lieu qu'à la création initiale d'un nouveau compte (`isNewUser`). Pour un compte existant, l'accès au rôle commerçant doit obligatoirement passer par la soumission et validation d'une boutique (`POST /shops`).
  - **Protection switch-mode** : Même si un compte possédait le rôle `MERCHANT`, `/auth/switch-mode` refuse le passage en mode commerçant tant que la boutique n'est pas `APPROVED` (`auth.controller.ts#L344`).

---

### 4. Migration des Numéros en Doublon

#### A. Vérification de la vraie base de production (`neondb` en lecture seule)
- **Requête exécutée** :
  ```sql
  SELECT phone, COUNT(*)::int as count 
  FROM users 
  WHERE phone IS NOT NULL AND phone != ''
  GROUP BY phone 
  HAVING COUNT(*) > 1;
  ```
- **Résultats réels constatés** :
  - Nombre total d'utilisateurs sur `neondb` : **19**
  - Nombre d'utilisateurs avec un numéro renseigné : **18**
  - **Nombre réel de numéros dupliqués** : **2 numéros**
  - **Nombre total de comptes concernés par un doublon** : **6 comptes**
    - Premier numéro en doublon : 2 comptes associés.
    - Second numéro en doublon : 4 comptes associés.
  - Schéma de la table `users` sur `neondb` : colonnes camelCase (`radiusKm`, `role`, `emailVerified`, `phoneVerified`, `passwordHash`, `phone`, etc.). Aucune migration Lot 1 n'y a été appliquée.

#### B. Vérification de la base de test (`neondb_lot1_test`)
- **Résultats après exécution du script de migration sécurisé** :
  - Aucun numéro n'est suffixé artificiellement par `_dup1` ou `_dup2`.
  - Le compte le plus récent pour chaque numéro a conservé son numéro E.164 valide.
  - Les comptes antérieurs en doublon ont été passés à `phone_e164 = NULL` (conformément à la nullabilité `String? @unique`).
  - Nombre d'utilisateurs avec téléphone après déduplication : **14** ($18 - 4 = 14$).
  - **Entrées dans `audit_logs`** : exactement **4 entrées** avec l'action `PHONE_DUPLICATE_NULLIFIED`, traçant l'identifiant du compte et l'ancien numéro dans `metadata.former_phone`.

---

### 5. Configuration Telegram
- **Statut** : **CONFIRMÉ**
- **Preuves techniques** :
  - Construction du `deepLink` : `services/ms1-accounts/src/services/challenge.service.ts#L68-L69` :
    ```ts
    const botUsername = config.telegramBotUsername || 'forsa_auth_bot';
    const deepLink = `https://t.me/${botUsername}?start=${nonce}`;
    ```
  - `config.telegramBotUsername` est alimenté par `process.env.TELEGRAM_BOT_USERNAME` (`env.ts#L49`).
  - Présent dans `.env.example#L40` : `TELEGRAM_BOT_USERNAME=forsa_auth_bot`.
  - Le frontend ne génère jamais le lien lui-même : il consomme directement le `deepLink` renvoyé par l'API backend (`authService.ts#L47`, `LoginPage.tsx#L156`, `RegisterPage.tsx#L206`).
  - **Examen de `TELEGRAM_CHAT_ID`** :
    - Variable obsolète provenant d'un concept pré-Lot 1 d'envoi à un canal unique.
    - Dans la spécification Telegram OTP §3, chaque utilisateur possède son propre identifiant dynamique `telegramChatId` et `telegramUserId` stocké en base de données.
    - `TELEGRAM_CHAT_ID` a été complètement retiré de `.env.example` et de `env.ts`.

---

### 6. Refresh Token et Stockage
- **Statut** : **CONFIRMÉ**
- **Preuves techniques** :
  - **Access token** : Stocké exclusivement en mémoire vive (`authService.ts#L23` : `let inMemoryAccessToken: string | null = null;`), garantissant qu'il n'est jamais accessible via le stockage persistant du navigateur.
  - **Refresh token** : Stocké dans `localStorage` sous la clé `forsa_refresh_token` (`authService.ts#L20, L246, L269`).
  - **Mécanisme de renouvellement** : `refreshAuthTokens()` dans `authService.ts#L104-L141` appelle `POST /api/auth/refresh`. En cas de réponse 401, le wrapper `authFetch` tente automatiquement le rafraîchissement et rejoue la requête initiale.
  - **Déconnexion** : `logout()` (`authService.ts#L267`) révoque la session côté serveur via `POST /api/auth/logout`, puis efface le token en mémoire et supprime les clés `forsa_refresh_token` et `forsa_user` du `localStorage`.
  - **Détection de rejeu (Replay Attack)** : `services/ms1-accounts/src/services/session.service.ts#L102-L117` : si une session porte déjà `revoked: true`, une alerte de sécurité est journalisée, **toutes les sessions de l'utilisateur sont immédiatement révoquées en cascade**, et l'accès est bloqué avec `UnauthorizedError`. Testé dans `telegram-auth.test.ts#L348`.
  - **Documentation** : Recommandation détaillée ajoutée dans `docs/rapports/questions.md` pour migrer le stockage du refresh token vers un cookie `HttpOnly`, `Secure`, `SameSite=Strict` afin d'éliminer le risque d'exfiltration en cas de XSS.

---

### 7. Documents Commerçant
- **Statut** : **NON CONFORME (ÉCARTS SPÉCIFICATION IDENTIFIÉS)**
- **Preuves techniques** :
  - **Emplacement réel** : Système de fichiers local du serveur (`services/ms1-accounts/src/middleware/upload.middleware.ts#L14` : `config.uploadDir` `./uploads/documents`).
  - **Multi-serveurs** : **Incompatible** sans système de fichiers partagé ou stockage objet (MinIO / S3). Si une requête arrive sur un autre conteneur MS1, le fichier sera manquant (erreur 404).
  - **Accessibilité** : **Privée et sécurisée**. Accessible uniquement via `GET /api/shops/:id/documents/:filename` protégé par `authenticate` ET `requireRole('ADMIN')` (`shop.routes.ts#L32`).
  - **Taille maximale** : `fileSize: 10 * 1024 * 1024` (10 Mo) dans `upload.middleware.ts#L40`. **Écart** : la spécification §4.5 et §7 impose **5 Mo maximum**.
  - **Formats acceptés** : `upload.middleware.ts#L28` accepte `['application/pdf', 'image/jpeg', 'image/png', 'image/webp']`. **Écart mineur** : `webp` est accepté en plus de PDF, JPG et PNG.
  - **Contrôle MIME** : Effectué uniquement via le header client `file.mimetype`. Aucun contrôle par magic bytes (inspection binaire du buffer) côté serveur.

---

### 8. Endpoints Manquants de MS1 (Comparaison Spec §6)

| Endpoint Spécifié (§6) | Méthode | Route Implémentée | Fichier | Statut Réel | Tests Disponibles |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /shops/me` | GET | `/shops/my` *(écart nom)* | `shop.controller.ts:107` | **CONFIRMÉ** (renvoie boutique + statut) | Oui |
| `PUT /shops/me` | PUT | `/shops/my` *(écart nom)* | `shop.controller.ts:133` | **CONFIRMÉ** (mise à jour + openingHours) | Oui |
| `GET /shops/me/verification` | GET | *Non implémenté* | — | **NON IMPLÉMENTÉ** (inclus dans `/shops/my`) | Non |
| `GET /shops/me/documents` | GET | *Non implémenté (client)* | — | **NON IMPLÉMENTÉ** (existe pour ADMIN) | Non |
| `POST /shops/me/documents` | POST | `/shops/my/documents` *(écart)* | `shop.controller.ts:198` | **CONFIRMÉ** (upload 3 pièces requises) | Non |
| `GET /shops/{id}` | GET | `/shops/:id` | `shop.controller.ts:182` | **CONFIRMÉ** (fiche publique boutique) | Non |
| `POST /users/me/photo` | POST | `/users/me/avatar` *(écart)* | `user.controller.ts:380` | **CONFIRMÉ** (upload avatar 5 Mo) | Non |
| `POST /users/me/deactivate` | POST | *Non implémenté* | — | **NON IMPLÉMENTÉ** | Non |
| `DELETE /users/me` | DELETE | *Non implémenté* | — | **NON IMPLÉMENTÉ** | Non |
| `GET /health` | GET | `/health` | `app.ts:18` | **CONFIRMÉ** (statut UP, service ms1) | Non |
| JWKS / Clé publique | GET | `/auth/public-key`, `/auth/jwks` | `auth.routes.ts:27-43` | **CONFIRMÉ** (RS256 inter-services) | Oui |

---

## 3. Corrections Autorisées Réalisées (Phase 2)

1. **Sécurisation de l'attribution des rôles (`auth.controller.ts`)** :
   - Suppression du bloc d'auto-attribution de `Role.MERCHANT` sur utilisateur existant lors de `/auth/telegram/verify`.
   - L'attribution du rôle commerçant est restreinte à la création d'un nouveau compte (`isNewUser`), protégeant l'étanchéité des rôles.
2. **Protection des logs de mismatch Telegram (`telegram.service.ts`)** :
   - Le message `[TelegramSecurity] Mismatch : Contact != Attendu` est désormais protégé par `if (process.env.NODE_ENV === 'development')` afin d'éviter toute fuite de numéro de téléphone en production ou staging.
3. **Tests unitaires de sécurité des rôles (`telegram-auth.test.ts`)** :
   - Ajout de 3 tests automatisés couvrant :
     - Le rejet strict de la demande du rôle `ADMIN` (400 Bad Request).
     - Le refus d'auto-attribution du rôle `MERCHANT` pour un utilisateur existant.
     - L'attribution initiale `[CUSTOMER, MERCHANT]` lors d'une première inscription commerçant.
4. **Mise à jour du document de questions d'architecture (`questions.md`)** :
   - Ajout des recommandations pour le stockage du refresh token dans un cookie `HttpOnly` / `Secure` / `SameSite`.
   - Ajout de l'analyse du stockage objet (MinIO / S3) pour les documents justificatifs commerçant en environnement multi-serveurs.
   - Proposition d'alias d'endpoints (`/shops/me` et `/users/me/photo`) pour une stricte conformité §6.

---

## 4. Résultats des Tests et Validations

- **Tests Backend Unitaires** :
  ```powershell
  npx jest --config services/ms1-accounts/jest.config.json tests/unit/telegram-auth.test.ts tests/unit/lot2b.test.ts --no-coverage
  ```
  - **Résultat** : **32 tests passés sur 32 (100% de réussite)**.
  - TypeScript backend (`npx tsc --noEmit --project services/ms1-accounts/tsconfig.json`) : **0 erreur**.
- **Compilation Frontend** :
  ```powershell
  npm run build --prefix frontend
  ```
  - **Résultat** : **Exit code 0**.
  - TypeScript frontend (`tsc -b`) : **0 erreur**.
  - Bundle de production généré avec succès par Vite.

---

## 5. Traçabilité Git

- **Branche active** : `feat/ms1-telegram-auth`
- **Dernier commit** : `cd33f1c`
- **Secrets et fichiers sensibles** : Aucun fichier `.env`, clé privée RSA, certificat ou backup n'est suivi par Git.
