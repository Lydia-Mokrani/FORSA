# Rapport d'Exécution — LOT 5B-1b : Complétion du Socle WAMS de MS1

> **Projet :** FORSA — Plateforme Anti-Gaspillage & Commerce Circulaire  
> **Module :** Web Architectures & Microservices (WAMS) — UMBB ING4 GL (Semestre 7)  
> **Composant :** MS1 Accounts & Shops, `@forsa/common`, Infrastructure & Scripts  
> **Date :** 24 novembre 2026  
> **Branche Git :** `feat/ms1-telegram-auth`  

---

## 0. Sécurité du Package Partagé (`packages/common`)

### Grep des Services Importateurs
L'analyse de l'arborescence du monorepo (`grep -rnE "RabbitMQClient|ConsulRegistry|@forsa/common" services/`) montre :
- `services/ms1-accounts` : utilise activement `RabbitMQClient`, `ConsulRegistry`, et les interfaces associées.
- `services/ms2-catalogue`, `services/ms3-orders`, `services/ms4-loyalty`, `services/ms5-notifications` : mentionnent `@forsa/common` dans leurs documentations et spécifications de contrats d'interface.

### Garantie d'Additivité Stricte
Toutes les évolutions apportées à [`packages/common`](../../packages/common) sont **100% additives** :
- `EventEnvelope` : ajout du champ `name: string` (alias de `type`) sans altérer ni supprimer `type`, `data`, ni `payload` ([`packages/common/src/rabbitmq/event-bus.interface.ts:8-16`](../../packages/common/src/rabbitmq/event-bus.interface.ts#L8-L16)).
- `IEventBus` : ajout des méthodes optionnelles `isBrokerUp?(): boolean` et `getStatus?(): string` ([`packages/common/src/rabbitmq/event-bus.interface.ts:25-28`](../../packages/common/src/rabbitmq/event-bus.interface.ts#L25-L28)).
- `ConsulRegistry` : ajout de l'option `customTags?: string[]` dans `ConsulServiceConfig`, de la méthode de backoff `register()`, et du getter `registered` ([`packages/common/src/consul/index.ts:16-17,25-30,42-70`](../../packages/common/src/consul/index.ts#L16-L70)).
- Aucun export existant n'a été renommé ni supprimé.

---

## 1. Références Fichiers & Lignes (file:line)

### 1.1. Bus d'Événements (`EVENT_BUS_DRIVER`, Reconnect, Retries, Idempotence, TTL)
- **Driver Switch & Fallback :**
  [`services/ms1-accounts/src/services/event-bus.ts:16-33`](../../services/ms1-accounts/src/services/event-bus.ts#L16-L33)  
  Support de `EVENT_BUS_DRIVER=rabbitmq|memory`, conservation du fallback déprécié `RABBITMQ_ENABLED`, et *fail-fast* en production si le driver n'est pas spécifié.
- **Enveloppe (`name` + `type`) :**
  [`packages/common/src/rabbitmq/event-bus.interface.ts:8-16`](../../packages/common/src/rabbitmq/event-bus.interface.ts#L8-L16)  
  [`packages/common/src/rabbitmq/index.ts:133-140`](../../packages/common/src/rabbitmq/index.ts#L133-L140)  
  [`packages/common/src/rabbitmq/in-memory-event-bus.ts:31-38`](../../packages/common/src/rabbitmq/in-memory-event-bus.ts#L31-L38)  
  L'enveloppe émise contient systématiquement `eventId`, `type`, `name` (= `routingKey`), `occurredAt`, `payload`, et `data`. Les consommateurs acceptent `event.name || event.type`.
- **Reconnexion avec Backoff & Jitter :**
  [`packages/common/src/rabbitmq/index.ts:51-125`](../../packages/common/src/rabbitmq/index.ts#L51-L125)  
  Gestionnaires sur `connection.on('close')`, `connection.on('error')`, `channel.on('close')`, `channel.on('error')`. Calcul du délai avec jitter (`calculateBackoffDelay`), ré-assertion des exchanges/queues et ré-enregistrement de tous les consommateurs enregistrés.
- **Échec Rapide (`publish` fail-fast) :**
  [`packages/common/src/rabbitmq/index.ts:128-132`](../../packages/common/src/rabbitmq/index.ts#L128-L132)  
  Rejette immédiatement avec `new Error('BROKER_UNAVAILABLE: RabbitMQ channel is not connected')` en cas de déconnexion.
- **Retries avec En-tête & Envoi DLQ :**
  [`packages/common/src/rabbitmq/index.ts:187-217`](../../packages/common/src/rabbitmq/index.ts#L187-L217)  
  Comptage des tentatives via `x-retry-count` (et `x-attempt`). En cas d'échec consécutif dépassant `RABBITMQ_MAX_RETRIES` (défaut 3), rejet via `channel.nack(msg, false, false)` routant vers `forsa.dlq.queue`.
- **Idempotence Bounded LRU + TTL :**
  [`packages/common/src/rabbitmq/idempotency.ts:1-49`](../../packages/common/src/rabbitmq/idempotency.ts#L1-L49)  
  [`packages/common/src/rabbitmq/index.ts:167-176`](../../packages/common/src/rabbitmq/index.ts#L167-L176)  
  Classe `BoundedIdempotencyCache` bornée à 10 000 clés avec TTL 24h.
  *Empreinte mémoire :* Pour 10 000 UUID v4 (36 caractères = ~72 octets + overhead Map ~64 octets + timestamp number 8 octets $\approx$ 144 octets par entrée), la consommation mémoire maximale est d'environ **1.5 à 2.0 Mo de RAM par consommateur**.
- **Expiration OTP (TTL) :**
  [`packages/common/src/rabbitmq/index.ts:143-148`](../../packages/common/src/rabbitmq/index.ts#L143-L148)  
  Publication de `telegram.send.otp` avec propriété AMQP `expiration` (défaut `300000` ms).
  [`services/ms1-accounts/src/services/telegram.service.ts:303-311`](../../services/ms1-accounts/src/services/telegram.service.ts#L303-L311)  
  Le consommateur vérifie `occurredAt + OTP_TTL` et ignore silencieusement tout message périmé.

### 1.2. Journalisation Sécurisée (Masquage Strict OTP / Nonce)
- **Utilitaire de masquage de numéro :**
  [`services/ms1-accounts/src/utils/mask-phone.ts:1-12`](../../services/ms1-accounts/src/utils/mask-phone.ts#L1-L12)  
  Conserve l'indicatif (ex: `+213`) et les 2 derniers chiffres, masquant le reste avec des astérisques.
- **Suppression des logs secrets dans les contrôleurs et listeners :**
  [`services/ms1-accounts/src/controllers/user.controller.ts:291-294`](../../services/ms1-accounts/src/controllers/user.controller.ts#L291-L294)  
  Log masqué `[ChangePhone] OTP généré pour ${maskedPhone}` (aucun code en clair).  
  [`services/ms1-accounts/src/events/auth-events.listener.ts:151-154`](../../services/ms1-accounts/src/events/auth-events.listener.ts#L151-L154)  
  Log masqué `[AuthEventListener] Demande OTP transmise pour ${maskedPhone}` (aucun code en clair).  
  [`services/ms1-accounts/src/services/challenge.service.ts:71-74`](../../services/ms1-accounts/src/services/challenge.service.ts#L71-L74)  
  Log masqué `[Challenge] Challenge créé pour ${maskedPhone}` (aucun nonce, aucun deep-link URL complet).
- **Preuve par Test Spied :**
  [`services/ms1-accounts/tests/unit/no-secret-logs.test.ts:1-118`](../../services/ms1-accounts/tests/unit/no-secret-logs.test.ts#L1-L118)  
  Espionnage de `console.log`, `info`, `warn`, `error` sous `NODE_ENV=development` vérifiant qu'aucun code à 6 chiffres, aucun nonce UUID, ni aucun lien deep link Telegram n'apparaît.

### 1.3. Endpoint `/health` Enrichi
- **Implémentation :**
  [`services/ms1-accounts/src/app.ts:24-60`](../../services/ms1-accounts/src/app.ts#L24-L60)  
  Structure renvoyée : `{ status, service: 'ms1-accounts', instanceId, timestamp, broker, db, registered }`.
  - Sonde DB : `SELECT 1` avec timeout de 2000 ms via `Promise.race`.
  - Si DB down $\implies$ HTTP 503 (`status: 'DOWN'`).
  - Si Broker down $\implies$ HTTP 200 (`status: 'DEGRADED'`).
  - Si DB up et Broker up/disabled $\implies$ HTTP 200 (`status: 'UP'`).
- **Tests :**
  [`services/ms1-accounts/tests/integration/health.test.ts:1-74`](../../services/ms1-accounts/tests/integration/health.test.ts#L1-L74)  
  Validation des 3 scénarios (DB down -> 503, Broker down -> 200 DEGRADED, All up -> 200 UP).

### 1.4. Consul Registry Résilient
- **Implémentation :**
  [`packages/common/src/consul/index.ts:42-70`](../../packages/common/src/consul/index.ts#L42-L70)  
  Boucle de retry avec backoff exponentiel (1s à 30s) en arrière-plan sans bloquer ni crasher l'instance MS1.
  Exposition du getter `consul.registered` (booléen).
  [`services/ms1-accounts/src/services/consul.service.ts:1-48`](../../services/ms1-accounts/src/services/consul.service.ts#L1-L48)  
  Configuration centralisée avec tags Traefik sans strip-prefix et désenregistrement propre sur `SIGTERM`/`SIGINT`.

### 1.5. Rate Limiting par Téléphone PostgreSQL
- **Implémentation :**
  [`services/ms1-accounts/src/middlewares/rate-limit.middleware.ts:48-93`](../../services/ms1-accounts/src/middlewares/rate-limit.middleware.ts#L48-L93)  
  Requête PostgreSQL `prisma.authChallenge.count` filtrant sur `phoneE164` et `createdAt >= now - 10 minutes`.
  Si le nombre atteint ou dépasse `RATE_LIMIT_START_MAX` (défaut 3) : renvoie HTTP 429 `{ error: 'RATE_LIMITED', message: ... }` avec en-tête `Retry-After: <secondes>`.
  Le limiteur en mémoire par IP n'est actif qu'en `NODE_ENV=development`.
- **Tests :**
  [`services/ms1-accounts/tests/unit/rate-limit-db.test.ts:1-75`](../../services/ms1-accounts/tests/unit/rate-limit-db.test.ts#L1-L75)  
  Mock Prisma vérifiant 3 requêtes acceptées et la 4ème rejetée avec HTTP 429 et en-tête `Retry-After`.

### 1.6. Configuration `TELEGRAM_BOT_ENABLED`
- **Implémentation :**
  [`services/ms1-accounts/src/config/env.ts:18-27,51-53,101-105`](../../services/ms1-accounts/src/config/env.ts#L18-L105)  
  Fonction `parseTelegramBotEnabled()` : `true` par défaut en développement/test, `false` si spécifié, et *fail-fast* immédiat en production si la variable est absente.
  [`services/ms1-accounts/src/services/telegram.service.ts:326-335`](../../services/ms1-accounts/src/services/telegram.service.ts#L326-L335)  
  Si `config.telegramBotEnabled === false`, log explicite `[TelegramService] Bot polling disabled by configuration` : le bot Telegram n'interroge pas l'API Telegram mais consomme et traite les événements du bus.
- **Tests :**
  [`services/ms1-accounts/tests/unit/telegram-bot-enabled.test.ts:1-48`](../../services/ms1-accounts/tests/unit/telegram-bot-enabled.test.ts#L1-L48)

### 1.7. Fichiers d'Infrastructure & Démonstration
- **Fichiers créés / mis à jour :**
  - [`infra/nodes/node-infra.yml`](../../infra/nodes/node-infra.yml) : Consul, RabbitMQ, Traefik v3 avec UIs exposées sur `127.0.0.1` et identifiants par variables d'environnement.
  - [`infra/nodes/node-ms1.yml`](../../infra/nodes/node-ms1.yml) : Déploiement 2 instances de MS1 (`ms1-accounts-1` avec `TELEGRAM_BOT_ENABLED=true`, `ms1-accounts-2` avec `TELEGRAM_BOT_ENABLED=false`).
  - [`infra/nodes/node-ms5.yml`](../../infra/nodes/node-ms5.yml) : Nœud documenté réservé pour Lot 5B-2 (bot poller singleton).
  - [`infra/.env.example`](../../infra/.env.example) : Modèle documenté de toutes les variables d'environnement requises.
  - [`scripts/demo-5b.sh`](../../scripts/demo-5b.sh) : Script de démonstration actualisé montrant l'alternance de `X-Instance-Id` sur `GET /api/auth/jwks` via Traefik.

### 1.8. Nettoyage de Code Legacy
- **`tests/integration/auth.endpoints.test.ts` :**
  [`services/ms1-accounts/tests/integration/auth.endpoints.test.ts:1-74`](../../services/ms1-accounts/tests/integration/auth.endpoints.test.ts#L1-L74)  
  *Décision :* Réécriture complète pour tester les vrais endpoints actuels (/api/auth/telegram/start validation 400, JWKS RFC 7517, clé publique PEM, et protection des routes 401/403).
- **Suppression du lookup d'avatar par `avatarUrl` :**
  [`services/ms1-accounts/src/controllers/user.controller.ts:400-412`](../../services/ms1-accounts/src/controllers/user.controller.ts#L400-L412)  
  Lookup effectué strictement par `avatarId` UUID. Suppression de toute recherche par nom de fichier devinable.
  [`services/ms1-accounts/tests/unit/avatar.test.ts:14-25`](../../services/ms1-accounts/tests/unit/avatar.test.ts#L14-L25) assertion mise à jour.

---

## 2. Résultats des Tests & Compilation

### `packages/common`
```text
> @forsa/common@1.0.0 build
> tsc

> @forsa/common@1.0.0 test
> jest

 PASS  tests/consul.test.ts
 PASS  tests/event-bus.test.ts

Test Suites: 2 passed, 2 total
Tests:       12 passed, 12 total
Snapshots:   0 total
Time:        3.421 s
```

### `services/ms1-accounts`
```text
> ms1-accounts@1.0.0 build
> tsc

> ms1-accounts@1.0.0 test
> jest

 PASS  tests/unit/rate-limit-db.test.ts
 PASS  tests/unit/no-secret-logs.test.ts
 PASS  tests/unit/telegram-bot-enabled.test.ts
 PASS  tests/integration/health.test.ts
 PASS  tests/integration/auth.endpoints.test.ts
 PASS  tests/unit/lot5a.test.ts
 PASS  tests/unit/avatar.test.ts
 PASS  tests/unit/lot2b.test.ts
 PASS  tests/unit/auth.service.test.ts
 PASS  tests/unit/challenge.service.test.ts
 PASS  tests/unit/shop.controller.test.ts

Test Suites: 11 passed, 11 total
Tests:       123 passed, 123 total
Snapshots:   0 total
Time:        14.739 s
```

**Total combiné : 13 suites, 135 tests passants, 0 échec.**

---

## 3. Questions & Points d'Attention
1. **Migration du Bot vers MS5 (Lot 5B-2) :**
   La configuration asymétrique (`TELEGRAM_BOT_ENABLED=true` sur instance 1, `false` sur instance 2) fonctionne pour 2 instances statiques. Dès le passage à l'autoscaling ou à plus de 2 réplicas, la centralisation du polling Telegram dans un worker dédié MS5 sera indispensable.
2. **Élimination de la table des tokens révoqués :**
   Actuellement les tokens révoqués sont validés en base via la date `passwordChangedAt` ou `tokenVersion`. Si d'autres microservices vérifient les JWT sans interroger MS1, le TTL court de l'access token (15 min) protège la fenêtre de validité.

---

## 4. Liste de ce qui reste manquant (Still-missing list)
- Déplacement effectif du bot Telegram vers le microservice `ms5-notifications` (prévu Lot 5B-2).
- Authentification Google OAuth et Email (exclus explicitement du périmètre 5B-1b).
- Procédure de désactivation / suppression de compte utilisateur (exclue du périmètre 5B-1b).
- Exécution réelle des conteneurs Docker (dépend de la mise à disposition d'un environnement d'exécution avec moteur Docker / Compose).
