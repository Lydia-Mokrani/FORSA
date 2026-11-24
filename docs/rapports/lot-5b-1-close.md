# Rapport de Clôture — LOT 5B-1-close : Audit 5B-1, JWKS RFC 7517 & Durcissement Avatars

> **Projet :** FORSA — Plateforme Anti-Gaspillage & Commerce Circulaire  
> **Module :** Web Architectures & Microservices (WAMS) — UMBB ING4 GL (Semestre 7)  
> **Composant :** MS1 Accounts & Shops (`services/ms1-accounts`, `infra`, `scripts`)  
> **Date :** 24 novembre 2026  
> **Branche Git :** `feat/ms1-telegram-auth`  

---

## PARTIE A — ÉVIDENCES (Lecture seule, état avant correctifs)

### 1. État final 5B-1 avant ce lot (`git log --oneline -6`)
```text
888d1ac 5B-1-verify: multi-instance keys from env, stable kid, db bytea avatars, exclude file_data from lists
4dd71d8 feat(ms1): lot 5b-1 addendum geocoder env-driven, bytea docs proof, 2 instances scale
ecb8179 6A-patch: extract buildShopPayload pure function, fix optional fields and coordinates omission
88d8769 6A-verify: close gaps of R0 and 6A-fix, unit test geocode hook, and enforce coordinates payload rules
3a031a6 6A-fix: rebuild ShopEditPage with R0 components, real Leaflet map, and real geocoding hook
97f6470 feat(frontend): lot R0 UI foundations tokens and shared components
```
Commit de référence 5B-1 : **`888d1ac`**.

### 2. RabbitMQ & Event Bus
- **Fichier driver :** [`packages/common/src/rabbitmq/index.ts`](../../packages/common/src/rabbitmq/index.ts) (`RabbitMQClient`), [`packages/common/src/rabbitmq/in-memory-event-bus.ts`](../../packages/common/src/rabbitmq/in-memory-event-bus.ts) (`InMemoryEventBus`), factory [`services/ms1-accounts/src/services/event-bus.ts`](../../services/ms1-accounts/src/services/event-bus.ts), consommateurs [`services/ms1-accounts/src/services/rabbitmq.service.ts`](../../services/ms1-accounts/src/services/rabbitmq.service.ts).
- **Switch `EVENT_BUS_DRIVER` :** **not implemented** sous ce nom ; utilise `RABBITMQ_ENABLED !== 'false'` (`services/ms1-accounts/src/services/event-bus.ts:14-24`).
- **Exchange `forsa.events` :** `packages/common/src/rabbitmq/index.ts:19,38` (`assertExchange('forsa.events', 'topic', { durable: true })`).
- **Files durables :** `packages/common/src/rabbitmq/index.ts:94` (`assertQueue(resolvedQueue, { durable: true, arguments: { 'x-dead-letter-exchange': this.dlqExchange } })`).
- **Ack manuel :** `packages/common/src/rabbitmq/index.ts:105,113,117` (`prefetch(1)`, `ack(msg)` après succès, `nack(msg, false, false)` sur erreur).
- **Dead-letter exchange :** `packages/common/src/rabbitmq/index.ts:20-21,41-43,97` (`forsa.dlq.exchange` fanout -> `forsa.dlq.queue`).
- **Retry limit :** **not implemented** (`nack(msg, false, false)` envoie directement en DLQ sans compteur `x-death` ni plafond de tentatives).
- **Reconnect :** **not implemented** (aucun gestionnaire `connection.on('close'|'error')` ni boucle de reconnexion).
- **Enveloppe `{eventId, name, occurredAt, payload}` :** partiellement différent — `packages/common/src/rabbitmq/index.ts:8-14,60-66` utilise `{ eventId, type, occurredAt, data, payload }` (`type` au lieu de `name`, avec `data` + `payload`).
- **Déduplication par `eventId` :** **not implemented**.
- **TTL file OTP (`telegram.send.otp`) :** **not implemented** (`services/ms1-accounts/src/services/telegram.service.ts:288`, aucun `x-message-ttl` ni `expiration`).

### 3. Preuve que le code OTP et le nonce ne sont jamais journalisés
- **Constat grep sur `services/ms1-accounts/src/` :**
  - `services/ms1-accounts/src/controllers/user.controller.ts:292-294` : `if (process.env.NODE_ENV === 'development') { console.log(\`[ChangePhoneDev] 🔑 Code confirmation étape 1 pour ${user.phoneE164}: ${code}\`); }` (**journalise l'OTP en clair en mode dev**).
  - `services/ms1-accounts/src/events/auth-events.listener.ts:151-153` : `if (process.env.NODE_ENV === 'development') { console.log(\`[AuthEventListener] 🔑 Code OTP généré pour ${payload.phone}: ${code}\`); }` (**journalise l'OTP en clair en mode dev**).
  - `services/ms1-accounts/src/services/challenge.service.ts:69,71-74` : `if (process.env.NODE_ENV === 'development') { ... console.log(\`[ChallengeDev] 🔗 DeepLink Telegram: ${deepLink}\`); }` où `deepLink` contient `${nonce}` (**journalise le nonce en clair en mode dev**).
  - Hors mode `development` (`production`, `test`), ces blocs ne s'exécutent pas.
- **Test dédié prouvant l'absence de log OTP/nonce :** **not implemented**.

### 4. `/health` — champs de réponse
- `services/ms1-accounts/src/app.ts:24-30` renvoie uniquement :
  ```json
  { "status": "UP", "service": "ms1-accounts", "timestamp": "..." }
  ```
- `instanceId` est présent uniquement dans l'en-tête HTTP `X-Instance-Id` (`app.ts:18-21`), pas dans le corps JSON.
- Champs `broker`, `db`, `registered` dans `/health` : **not implemented**.

### 5. Consul & Découverte Traefik
- **Enregistrement :** `services/ms1-accounts/src/index.ts:9-17,30` et `packages/common/src/consul/index.ts:13-80` :
  - `serviceName` : `'ms1-accounts'` (`index.ts:11`)
  - `serviceId` par instance : `ms1-accounts-${sanitizedHost}-${port}` (`index.ts:12`, `consul/index.ts:17-20`)
  - `Address` depuis env : `config.serviceHost` (`env.ts:34`, `index.ts:13`, `consul/index.ts:36`)
  - Check HTTP : `http://${serviceHost}:${servicePort}/health`, `Interval: '10s'`, `Timeout: '3s'`, `DeregisterCriticalServiceAfter: '1m'` (`consul/index.ts:27,43-48`)
- **Tags Traefik :** `packages/common/src/consul/index.ts:30-42` :
  - `traefik.enable=true`
  - `traefik.http.routers.ms1-accounts.rule=PathPrefix(\`/api/auth\`, \`/api/users\`, \`/api/shops\`)`
  - `traefik.http.routers.ms1-accounts.entrypoints=web`
  - **Sans strip de préfixe :** aucun tag `stripprefix` émis.
- **Retry / backoff quand Consul est indisponible :** **not implemented** (`consul/index.ts:51-68` effectue un seul `axios.put` puis log l'erreur).
- **Désenregistrement sur `SIGTERM` :** implémenté (`index.ts:37-49` -> `await consul.deregister()`, ainsi que `consul/index.ts:59-65`).

### 6. Rate limit par téléphone lu depuis `auth_challenges`
- **not implemented** : `services/ms1-accounts/src/middlewares/rate-limit.middleware.ts:10,64-77` utilise une `Map` en mémoire locale (`rateLimitStore`) avec la clé `phone:${normalized}` au lieu d'interroger la table `auth_challenges` en PostgreSQL. Aucun test DB n'existe.

### 7. Flag `TELEGRAM_BOT_ENABLED`
- **not implemented** : absent du code source et de `docker-compose.yml`. Le service vérifie uniquement `config.telegramBotToken` (`services/ms1-accounts/src/services/telegram.service.ts:316-320`).

### 8. Arborescence `infra/` (`ls -R infra`)
```text
infra/
├── docker-compose.infra.yml
└── docker-compose.yml
```
- `node-infra.yml` : **not implemented**
- `node-ms1.yml` : **not implemented**
- `node-ms5.yml` : **not implemented**
- `infra/.env.example` : **not implemented** (présent uniquement dans `services/ms1-accounts/.env.example`)
- Middleware Traefik `rateLimit` sur `/api/auth/telegram/start` : **not implemented**

### 9. Avatars (état avant 5B-1-close)
- `:filename` était construit à partir du `userId` (`services/ms1-accounts/src/controllers/user.controller.ts:396` : `/api/users/avatars/${userId}${ext}`) et `getAvatar` requêtait aussi `{ id: userId }` -> **devinable et énumérable**.
- Contrôle magic-bytes présent (`avatar-upload.middleware.ts:18-37`) pour JPEG, PNG, WebP (RIFF), limite 2 Mo (`MAX_SIZE = 2 * 1024 * 1024`).

### 10. `.gitignore` (`git check-ignore -v`)
```text
.gitignore:15:**/keys/	services/ms1-accounts/keys/
.gitignore:15:**/keys/	services/ms1-accounts/keys/private.pem
.gitignore:7:.env	.env
.gitignore:7:.env	services/ms1-accounts/.env
.gitignore:12:*.pem	test.pem
```

---

## Missing from 5B-1

Éléments manquants identifiés lors de l'audit (non implémentés silencieusement dans ce lot, soumis à décision) :
1. **Variable `EVENT_BUS_DRIVER`** (remplacée actuellement par `RABBITMQ_ENABLED`).
2. **Politique de retry avec plafond** côté consommateur RabbitMQ avant envoi en DLQ.
3. **Reconnexion automatique RabbitMQ** avec backoff sur perte de connexion/canal.
4. **Champ `name` dans l'enveloppe d'événement** (l'enveloppe utilise actuellement `type` + `data`/`payload`).
5. **Déduplication / idempotence des événements** par `eventId`.
6. **TTL sur la file / les messages OTP** (`telegram.send.otp`).
7. **Suppression des `console.log` d'OTP et de nonce en mode `development`** (`user.controller.ts:293`, `auth-events.listener.ts:152`, `challenge.service.ts:73`) + test automatisé garantissant l'absence de fuite dans les logs.
8. **Champs `instanceId`, `broker`, `db`, `registered`** dans le JSON de `GET /health`.
9. **Retry/backoff lors de l'enregistrement Consul** si Consul démarre après MS1.
10. **Rate limit par numéro de téléphone persisté via `auth_challenges`** (au lieu de `Map` en mémoire) + test associé.
11. **Variable `TELEGRAM_BOT_ENABLED`** dans `env.ts`, `telegram.service.ts` et `docker-compose.yml`.
12. **Fichiers `infra/node-infra.yml`, `infra/node-ms1.yml`, `infra/node-ms5.yml`, `infra/.env.example`** et **middleware Traefik `rateLimit`** sur `/api/auth/telegram/start`.

---

## PARTIE B — CORRECTIFS IMPLÉMENTÉS

### 1. JWKS standard RFC 7517 (`n`, `e`, `kty`, `kid`, `use`, `alg`)
- Ajout de `JwtService.getJwks()` dans `services/ms1-accounts/src/services/jwt.service.ts` utilisant `crypto.createPublicKey(this.publicKey).export({ format: 'jwk' })` pour produire `kty`, `n`, `e`, complétés par `kid`, `use: "sig"`, `alg: "RS256"`, tout en conservant `publicKey` pour compatibilité ascendante.
- Appliqué sur `GET /auth/jwks` et `GET /api/auth/jwks` (`auth.routes.ts:32-34`). `GET /auth/public-key` reste inchangé (`text/plain`).
- **Exemple de sortie JWKS (`n` et `publicKey` tronqués) :**
  ```json
  {
    "keys": [
      {
        "kty": "RSA",
        "n": "33E8mGTO7L0q-II6-Ot7g_J6...",
        "e": "AQAB",
        "kid": "forsa-ms1-auth-v1",
        "use": "sig",
        "alg": "RS256",
        "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBI..."
      }
    ]
  }
  ```
- **Test ajouté (`tests/unit/jwt.service.test.ts`) :** construit un vérificateur `crypto.createPublicKey({ key: { kty, n, e }, format: 'jwk' })` sans utiliser le champ `publicKey` PEM, et valide la signature RS256 d'un JWT émis par `jwtService`.

### 2. Avatars : Magic-Bytes stricts & ID aléatoire non devinable en base
- **Magic bytes & taille (`avatar-upload.middleware.ts`) :** validation stricte JPEG (`FF D8 FF`), PNG (8 octets `89 50 4E 47 0D 0A 1A 0A`), WebP (`RIFF` à l'offset 0 **et** `WEBP` à l'offset 8), limite **2 Mo**, stockage mémoire pure (`multer.memoryStorage()`).
- **Identifiant non devinable en base (`schema.prisma`, migration `20261124210000_lot5b1_close_avatar_id` appliquée sur `neondb_lot1_test`) :**
  - Ajout de `avatar_id TEXT UNIQUE` sur `users`.
  - `uploadAvatar` génère `crypto.randomBytes(16).toString('hex')` (128 bits), enregistre `avatarId` et expose `/api/users/avatars/<avatarId><ext>`.
  - `getAvatar` recherche uniquement par `avatarId` ou par `avatarUrl` exacte courante (jamais par `user.id`), protège contre le path traversal, et conserve l'ancienne URL fonctionnelle **uniquement** tant qu'elle reste l'`avatarUrl` active de son propriétaire.
  - Suppression du middleware `express.static` sur `/api/users/avatars` dans `app.ts` afin d'empêcher tout contournement.
- **Tests ajoutés (`tests/unit/avatar.test.ts`) :** 7 tests couvrant magic bytes valides/falsifiés, limite 2 Mo, génération d'`avatarId` 128-bit et non-énumérabilité.

### 3. `scripts/demo-5b.sh` — Durcissement de l'outil JWT hors-ligne (dev-only)
- Commentaire explicite `# DEV-ONLY TOOL`.
- Refus d'exécution si `NODE_ENV=production` (côté shell et côté Node.js).
- Lecture du chemin de clé privée depuis `JWT_PRIVATE_KEY_PATH` (défaut `services/ms1-accounts/keys/private.pem`).
- Masquage du token dans les logs (`${TOKEN_PREFIX}...[REDACTED]`), jamais affiché en entier.
- `.gitignore` vérifié (`keys/` et `**/keys/` ignorés).

---

## PARTIE C — PREUVES

- **TypeScript (`cd services/ms1-accounts && npx tsc --noEmit`) :** exit code `0` (`TSC_OK`, 0 erreur).
- **Tests unitaires Jest (`cd services/ms1-accounts && npx jest --config jest.config.json tests/unit --no-coverage`) :**
  - `Test Suites: 6 passed, 6 total`
  - `Tests: 104 passed, 104 total`
  - `0 failing`
  - *(Note : `tests/integration/auth.endpoints.test.ts` contient d'anciennes assertions `/api/auth/login` non exécutées ici.)*
- **Preuves runtime Docker (`scripts/demo-5b.sh`, Traefik/Consul/RabbitMQ, ports 3001/3002 en direct) :** **NOT EXECUTED** (Docker non disponible sur cette machine).
- **`git show --stat` du commit de clôture :** vérifié après commit sur `feat/ms1-telegram-auth`.
