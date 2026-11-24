# FORSA — Architecture Système & Déploiement Multi-Instances (WAMS)

> **Module :** Web Architectures & Microservices (WAMS) — UMBB ING4 GL (Semestre 7)  
> **Superviseur :** Dr. Yahiatene Youcef  
> **Composant :** MS1 Accounts & Shops — Scalabilité Horizontale, Justificatifs & Avatars PostgreSQL, Bus d'Événements & Découverte Consul  
> **Date :** 24 novembre 2026 (Mise à jour Lot 5B-1b)  

---

## 1. Statut d'Exécution & Vérifications (Honnêteté Technique)

Conformément aux règles d'intégrité de la plateforme et aux contraintes d'environnement (daemon Docker non disponible sur l'hôte d'exécution) :

| Composant / Fonctionnalité | Statut | Méthode de validation |
|-----------------------------|--------|-----------------------|
| Compilation TypeScript (`packages/common` & `services/ms1-accounts`) | **EXÉCUTÉ & VALIDÉ** | `tsc --noEmit` (0 erreur) |
| Tests Unitaires & d'Intégration Jest (135 tests) | **EXÉCUTÉ & VALIDÉ** | Mocks `amqplib`, `prisma`, `axios`, `express` |
| Driver Event Bus (RabbitMQ + Reconnect Backoff + Retries + DLQ + Idempotence LRU + TTL OTP) | **EXÉCUTÉ & VALIDÉ** | Suites Jest `@forsa/common` & `ms1-accounts` |
| Masquage strict OTP, nonces et deep links dans tous les environnements | **EXÉCUTÉ & VALIDÉ** | Spies Jest sur `console.*` en `NODE_ENV=development` |
| Endpoint `/health` (DB 503, Broker DEGRADED 200, UP 200, statut Consul) | **EXÉCUTÉ & VALIDÉ** | Tests Supertest Jest |
| Rate limiting par téléphone PostgreSQL (`auth_challenges`) | **EXÉCUTÉ & VALIDÉ** | Tests Jest avec mock Prisma |
| Détection & fail-fast de `TELEGRAM_BOT_ENABLED` en production | **EXÉCUTÉ & VALIDÉ** | Tests Jest d'environnement |
| Déploiement multi-nœuds Docker (`node-infra.yml`, `node-ms1.yml`, `node-ms5.yml`) | **NOT EXECUTED** | Daemon Docker non disponible sur l'environnement de test |
| Exécution réelle du script `scripts/demo-5b.sh` contre des conteneurs réels | **NOT EXECUTED** | Requiert Docker & Traefik en cours d'exécution |

---

## 2. Vue d'Ensemble & Scalabilité Horizontale (MS1)

Dans le cadre du cahier des charges WAMS, le service **MS1 Accounts & Shops** est conçu pour un déploiement multi-instances sans état (*stateless worker*), supervisé par le reverse-proxy et load-balancer **Traefik v3** via la découverte de service dynamique **HashiCorp Consul**.

```
                                ┌────────────────────────┐
                                │   Client Web / Tests   │
                                └───────────┬────────────┘
                                            │ Port 80 (HTTP)
                                            ▼
                          ┌───────────────────────────────────┐
                          │            Traefik v3             │
                          │  (Load Balancer Round-Robin S0)   │
                          └───────┬───────────────────┬───────┘
               Découverte Consul  │                   │
              ┌───────────────────┘                   └──────────────────┐
              ▼                                                          ▼
     ┌─────────────────────────────────┐                       ┌─────────────────────────────────┐
     │  ms1-accounts-1 (Port 3001)     │                       │  ms1-accounts-2 (Port 3002)     │
     │  - X-Instance-Id: ms1-accounts-1│                       │  - X-Instance-Id: ms1-accounts-2│
     │  - TELEGRAM_BOT_ENABLED: true   │                       │  - TELEGRAM_BOT_ENABLED: false  │
     │  - GEOCODER_MIN_INTERVAL: 2000ms│                       │  - GEOCODER_MIN_INTERVAL: 2000ms│
     └────────────────┬────────────────┘                       └────────────────┬────────────────┘
                      │                                                         │
                      └─────────────────────────┬───────────────────────────────┘
                                                │
                                                ▼
                                    ┌──────────────────────┐
                                    │ PostgreSQL 16 (DB1)  │
                                    │  - Colonne BYTEA     │
                                    │  - file_data         │
                                    │  - avatar_data       │
                                    │  - auth_challenges   │
                                    └──────────────────────┘
```

### Identification des Instances (`X-Instance-Id`)
Chaque instance MS1 injecte automatiquement dans toutes les réponses HTTP l'en-tête `X-Instance-Id: <INSTANCE_ID>` via son middleware Express :
- `ms1-accounts-1` (port 3001) renvoie `X-Instance-Id: ms1-accounts-1`
- `ms1-accounts-2` (port 3002) renvoie `X-Instance-Id: ms1-accounts-2`

Cet en-tête est relayé fidèlement par Traefik au client, attestant de la répartition effective de la charge entre les instances.

---

## 3. Limitation Temporaire Multi-Instances du Bot Telegram

### Problème Technique : Telegram HTTP 409 Conflict
L'API Telegram Bot en mode *long polling* (`getUpdates`) interdit formellement d'avoir deux processus simultanés interrogeant le même bot token. Dès qu'une seconde instance émet un `getUpdates`, Telegram interrompt la première et renvoie une erreur :
```
409 Conflict: terminated by other getUpdates request; make sure that only one bot instance is running
```

### Solution Actuelle (Lot 5B-1b)
Dans la configuration multi-instances (`infra/nodes/node-ms1.yml` et `docker-compose.yml`) :
- `ms1-accounts-1` : `TELEGRAM_BOT_ENABLED=true` (agit comme poller actif et consommateur d'événements).
- `ms1-accounts-2` : `TELEGRAM_BOT_ENABLED=false` (ne démarre pas le polling Telegram, mais conserve l'API HTTP complète, publie sur le bus RabbitMQ et consomme les événements).

> [!IMPORTANT]
> **Statut Temporaire :** Cette séparation `poller=true / poller=false` est une mesure transitoire avant le **Lot 5B-2**, où le polling Telegram sera déporté dans un microservice dédié singleton (**MS5 Notifications & Bot**), rendant toutes les instances de MS1 strictement homogènes et interchangeables.

---

## 4. Découverte de Service Consul & Routage Traefik

### Pourquoi Traefik ne route PAS `/health`
Traefik est configuré par tags Consul pour router exclusivement le trafic applicatif public :
- Règle Traefik : `PathPrefix('/api/auth', '/api/users', '/api/shops')`
- Le endpoint `/health` n'a volontairement **aucun routeur public Traefik**.

**Raisons architecturales :**
1. **Sécurité & Masquage de topologie :** Ne pas exposer publiquement l'état interne des nœuds d'infrastructure (connectivité RabbitMQ, temps de réponse base de données, etc.).
2. **Surveillance Consul directe :** Consul sonde chaque instance directement sur son IP et port physiques (`http://${SERVICE_ADDRESS}:${SERVICE_PORT}/health`). Si `/health` renvoie HTTP 503 (base inaccessible), Consul bascule l'instance en `critical` et Traefik la retire dynamiquement du pool en moins de 10 secondes.

### Routage Traefik & Démonstration `/api/auth/jwks`
Pour valider l'alternance de charge (Load Balancing Round-Robin) via Traefik :
- L'appel `GET http://localhost/api/auth/jwks` traverse Traefik.
- Traefik distribue les requêtes alternativement vers `ms1-accounts-1` et `ms1-accounts-2`.
- La réponse contient l'en-tête `X-Instance-Id` alternant entre `ms1-accounts-1` et `ms1-accounts-2`.

### Protection Traefik du Endpoint Sensible `/api/auth/telegram/start`
Un routeur Traefik dédié avec priorité plus élevée (100) est configuré via tags Consul pour `/api/auth/telegram/start` avec le middleware `ms1-rate-limit-start` :
- `traefik.http.middlewares.ms1-rate-limit-start.ratelimit.average=5`
- `traefik.http.middlewares.ms1-rate-limit-start.ratelimit.burst=10`
- `traefik.http.middlewares.ms1-rate-limit-start.ratelimit.period=1m`

---

## 5. Bus d'Événements RabbitMQ & Fiabilité (Lot 5B-1b)

### Enveloppe Standardisée & Compatibilité
L'enveloppe d'événement transporte à la fois `type` et `name` pour garantir la compatibilité ascendante :
```typescript
interface EventEnvelope<T = any> {
  eventId: string;     // UUID unique du message
  type: string;        // ex: 'telegram.send.otp'
  name: string;        // alias conforme au standard WAMS (= routingKey)
  occurredAt: string;  // Horodatage ISO-8601
  payload: T;          // Données applicatives
  data?: T;            // Alias rétro-compatible
}
```

### Reconnexion avec Backoff Exponentiel & Jitter
En cas de déconnexion du broker RabbitMQ :
- Les appels `publish()` échouent immédiatement avec l'erreur `BROKER_UNAVAILABLE` (pas de blocage synchrone ni de suspension de requête).
- Une boucle de reconnexion tente de rétablir la connexion toutes les $T = \min(\text{base} \times 2^{\text{attempt}}, \text{max}) \pm \text{jitter}$ (1s à 30s).
- À la reconnexion, l'exchange, la DLQ et l'ensemble des consommateurs enregistrés sont ré-enregistrés automatiquement.

### Retry avec En-tête & Dead-Letter Queue (DLQ)
- Chaque échec d'un consommateur incrémente l'en-tête `x-retry-count` (et `x-attempt`).
- Tant que `retryCount < RABBITMQ_MAX_RETRIES` (défaut 3), le message est renvoyé avec délai.
- Dès que le plafond est atteint, le message est rejeté avec `nack(msg, false, false)` et routé vers `forsa.dlq.queue` via `forsa.dlq.exchange`.

### Idempotence Bounded LRU avec TTL
- Chaque consommateur dispose d'un cache mémoire LRU (`BoundedIdempotencyCache`) de taille bornée (10 000 entrées, TTL 24h).
- **Empreinte mémoire :** 10 000 clés UUID v4 en mémoire vive représentent environ **2 Mo de RAM par consommateur**, respectant les contraintes de mémoire des conteneurs.

### Expiration des Messages OTP
- Lors de la publication de `telegram.send.otp`, la propriété AMQP `expiration` est configurée avec le TTL de l'OTP (défaut 300 000 ms / 5 minutes).
- Le consommateur inspecte également `occurredAt + OTP_TTL` et abandonne sans traitement tout message périmé.

---

## 6. Guide : Comment un Autre Microservice Rejoint le Système

Pour intégrer un nouveau microservice (ex. `ms2-catalogue`, `ms3-orders`, `ms4-loyalty`, `ms5-notifications`) à l'écosystème FORSA :

### Étape 1 : Enregistrement Consul & Exposition Traefik
Utiliser le helper `@forsa/common` (`ConsulRegistry`) :
```typescript
import { ConsulRegistry } from '@forsa/common';

const consul = new ConsulRegistry({
  consulHost: process.env.CONSUL_HOST || '127.0.0.1',
  serviceName: 'ms2-catalogue',
  servicePort: Number(process.env.PORT) || 3003,
  serviceHost: process.env.SERVICE_ADDRESS || '192.168.1.50',
  healthCheckPath: '/health',
  customTags: [
    'traefik.enable=true',
    'traefik.http.routers.ms2.rule=PathPrefix(`/api/catalog`)',
    'traefik.http.routers.ms2.entrypoints=web'
  ]
});
await consul.register();
```

### Étape 2 : Validation des Tokens JWT via JWKS RFC 7517
Les autres services ne possèdent pas la clé privée de signature. Ils valident les JWT émis par MS1 en consommant les clés publiques :
1. Récupérer le JWKS sur `http://traefik/api/auth/jwks` ou directement sur MS1 `http://ms1:3001/auth/jwks`.
2. Extraire la clé correspondant au `header.kid` du JWT (contenant le modulus `n` et l'exponent `e` en base64url).
3. Convertir en clé publique PEM ou utiliser une bibliothèque standard (`jwks-rsa`, `jose` ou `jsonwebtoken`).

### Étape 3 : Connexion au Bus d'Événements
Utiliser le client `RabbitMQClient` ou `InMemoryEventBus` via `EVENT_BUS_DRIVER` :
```typescript
import { RabbitMQClient } from '@forsa/common';

const bus = new RabbitMQClient({
  url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  exchange: 'forsa.events'
});
await bus.connect();

// Souscription idempotente
await bus.consume('catalogue.shop.sync', 'ms2.shop-sync', async (event) => {
  console.log(`Boutique mise à jour: ${event.payload.shopId}`);
});
```

---

## 7. Stockage des Documents et Avatars en Base PostgreSQL (BYTEA)

### Preuve Formelle : Aucun Volume Partagé Requis
1. **Documents justificatifs :** Stockés dans la table `shop_documents` via la colonne `file_data` (BYTEA).
2. **Avatars utilisateurs :** Stockés dans la table `users` via la colonne `avatar_data` (BYTEA) avec `avatar_mime` (VARCHAR).
3. **Lookup unifié :** La recherche d'avatar s'effectue strictement par `avatarId` UUID univoque, évitant tout risque d'énumération par identifiant séquentiel ou nom de fichier prévisible.
4. Aucun volume disque partagé (NFS, bind-mount inter-conteneurs) n'est nécessaire.
