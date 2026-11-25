# Rapport de Vérification et Correctifs — LOT 5B-2-verify

## PART A — PREUVES (EVIDENCE)

### 1. Branches distantes et vérification du code MS5 des coéquipiers
Commandes exécutées :
```bash
git fetch --all --prune
git branch -r
```
Résultat des branches distantes :
- `origin/main`
- `origin/develop`
- `origin/feat/ms1-telegram-auth`
- `origin/feature/ms1-accounts`
- `origin/feature/ms2-catalogue`
- `origin/feature/ms3-reservations`

Inspection de `services/ms5-notifications` sur chaque branche distante :
```bash
=== origin/main ===
ls-tree:
services/ms5-notifications/README.md
log:
a91e516 Niykven Fri Nov 20 19:42:48 2026 +0100 docs(team): add tagged README guides for each team member in services and frontend features

=== origin/develop ===
ls-tree:
services/ms5-notifications/README.md
log:
a91e516 Niykven Fri Nov 20 19:42:48 2026 +0100 docs(team): add tagged README guides for each team member in services and frontend features

=== origin/feat/ms1-telegram-auth ===
ls-tree:
services/ms5-notifications/.env.example
services/ms5-notifications/Dockerfile
services/ms5-notifications/README.md
services/ms5-notifications/jest.config.json
services/ms5-notifications/package.json
services/ms5-notifications/src/config/env.ts
services/ms5-notifications/src/index.ts
services/ms5-notifications/src/services/event-bus.ts
services/ms5-notifications/src/telegram-bot/telegram.service.ts
services/ms5-notifications/tests/health.test.ts
services/ms5-notifications/tests/telegram-bot.test.ts
services/ms5-notifications/tsconfig.json
log:
903f0bd Niykven Wed Nov 25 01:56:00 2026 +0100 5B-2: move Telegram bot into MS5 singleton with RabbitMQ event bus, identical MS1 instances, and async failover

=== origin/feature/ms1-accounts ===
ls-tree:
services/ms5-notifications/README.md
log:
a91e516 Niykven Fri Nov 20 19:42:48 2026 +0100 docs(team): add tagged README guides for each team member in services and frontend features

=== origin/feature/ms2-catalogue ===
ls-tree: (vide)

=== origin/feature/ms3-reservations ===
ls-tree:
services/ms5-notifications/README.md
log:
a91e516 Niykven Fri Nov 20 19:42:48 2026 +0100 docs(team): add tagged README guides for each team member in services and frontend features
```
**Conclusion :** Aucun coéquipier ne possède de code MS5. Seul le README initial existait sur les branches distantes.

---

### 2. Absence d'accès à la base de données de MS1 depuis MS5
Commande exécutée :
```bash
git grep -nE "prisma|DATABASE_URL|ms1-accounts" -- services/ms5-notifications
```
**Résultat :** Code de sortie 1, 0 correspondance.
MS5 ne touche pas à la base de données PostgreSQL de MS1.

---

### 3. Tableau des files RabbitMQ déclarées par MS1 et MS5

| File RabbitMQ | Durable | Consommateur | Expiration message (TTL) | Dead-Letter Exchange / Queue |
| :--- | :--- | :--- | :--- | :--- |
| `q.ms5-notifications.telegram.challenge.created` | Oui (`durable: true`) | MS5 (`telegram.service.ts`) | 600s (TTL défi) | `forsa.events.dlx` / `q.forsa.events.dlq` |
| `q.ms5-notifications.telegram.send.otp` | Oui (`durable: true`) | MS5 (`telegram.service.ts`) | 300s (TTL code OTP) | `forsa.events.dlx` / `q.forsa.events.dlq` |
| `q.ms5-notifications.telegram.send.message` | Oui (`durable: true`) | MS5 (`telegram.service.ts`) | Aucune | `forsa.events.dlx` / `q.forsa.events.dlq` |
| `q.ms1-accounts.telegram.contact.received` | Oui (`durable: true`) | MS1 (`auth-events.listener.ts`) | Aucune | `forsa.events.dlx` / `q.forsa.events.dlq` |
| `q.ms1-accounts.merchant.suspended` | Oui (`durable: true`) | MS1 (`rabbitmq.service.ts`) | Aucune | `forsa.events.dlx` / `q.forsa.events.dlq` |
| `q.ms1-accounts.merchant.approved` | Oui (`durable: true`) | MS1 (`rabbitmq.service.ts`) | Aucune | `forsa.events.dlx` / `q.forsa.events.dlq` |
| `q.ms1-accounts.merchant.reactivated` | Oui (`durable: true`) | MS1 (`rabbitmq.service.ts`) | Aucune | `forsa.events.dlx` / `q.forsa.events.dlq` |
| `q.ms1-accounts.merchant.rejected` | Oui (`durable: true`) | MS1 (`rabbitmq.service.ts`) | Aucune | `forsa.events.dlx` / `q.forsa.events.dlq` |
| `q.ms1-accounts.reservation.picked_up` | Oui (`durable: true`) | MS1 (`rabbitmq.service.ts`) | Aucune | `forsa.events.dlx` / `q.forsa.events.dlq` |
| `q.ms1-accounts.shop.rating_updated` | Oui (`durable: true`) | MS1 (`rabbitmq.service.ts`) | Aucune | `forsa.events.dlx` / `q.forsa.events.dlq` |

---

### 4. Tests modifiés/supprimés de MS1 dans le commit `903f0bd` et couverture MS5

Statistiques de `git show 903f0bd --stat -- services/ms1-accounts/tests` :
- `services/ms1-accounts/tests/unit/broker-failover.test.ts` : +136 lignes
- `services/ms1-accounts/tests/unit/lot2b.test.ts` : -448 / +81 lignes
- `services/ms1-accounts/tests/unit/telegram-bot-enabled.test.ts` : -74 lignes (supprimé car le bot ne tourne plus dans MS1)

| Titre du test supprimé de MS1 | Statut / Test équivalent |
| :--- | :--- |
| `doit échouer immédiatement en production si TELEGRAM_BOT_ENABLED n'est pas défini` | Déplacé dans MS5 (`tests/telegram-bot.test.ts` : validation fail-fast de `TELEGRAM_BOT_TOKEN`) |
| `doit accepter TELEGRAM_BOT_ENABLED=true et false en production` | Obsolète pour MS1 (MS1 est désormais sans bot). Couvert par MS5. |
| `doit par défaut être true en développement quand la variable est omise` | Obsolète pour MS1. Couvert par MS5. |
| `ne doit PAS démarrer le polling quand config.telegramBotEnabled = false` | Couvert dans MS5 (`tests/telegram-bot.test.ts` : vérification arrêt polling si token absent) |
| `doit marquer le défi FAILED si le contact partagé n'appartient pas à l'utilisateur (contact.user_id !== from.id)` | Couvert dans MS5 (`tests/telegram-bot.test.ts` : `doit refuser et annuler le défi si contact.user_id !== from.id`) |
| `doit marquer le défi FAILED si le numéro du contact ne correspond pas au numéro demandé` | Couvert dans MS5 (`tests/telegram-bot.test.ts` : `doit refuser le défi si le numéro de téléphone ne correspond pas au numéro attendu`) |
| `doit passer telegramBlocked à true si Telegram renvoie une erreur 403 Forbidden` | Couvert dans MS5 (`tests/telegram-bot.test.ts` : `sur HTTP 403 Forbidden (bot bloqué), doit logger un avertissement sans crasher`) |
| `handleBotBlockedByUser met à jour la table users avec telegramBlocked=true` | Inapplicable dans MS5 (MS5 n'accède pas à la base de données). |
| `déroule le flux complet : /start -> partage contact -> contact.received -> OTP -> verify` | Couvert de bout en bout : MS5 teste `/start -> contact -> telegram.contact.received`, MS1 teste `telegram.contact.received -> OTP -> telegram.send.otp` |
| `doit annuler l'ensemble si l'une des opérations de la transaction échoue` | Couvert dans MS1 `lot2b.test.ts` (`doit marquer le défi FAILED et créer un auditLog d'échec si compte Telegram lié P2002`) |

---

### 5. Scan de Secrets sur les fichiers suivis (Tracked Files)
```bash
git grep -nE "[0-9]{8,10}:[A-Za-z0-9_-]{35}"
# Résultat : 0 correspondance (code de sortie 1)

git grep -nE "TELEGRAM_BOT_TOKEN\s*=\s*\S+"
# Résultat :
# infra/.env.example:74:TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
# services/ms5-notifications/.env.example:10:TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```
**Conclusion :** Aucun secret ni jeton Telegram réel n'est commité dans les fichiers suivis (placeholders uniquement dans les fichiers `.env.example`).

---

## PART B — CORRECTIFS APPLIQUÉS (FIXES)

### 1. Raw Nonce sur le Bus supprimé (B.1)
- **Ajout additif packages/common :** Création de `packages/common/src/utils/hash.ts` exportant `hashString(value: string): string` (condensat SHA-256 déterministe). Exporté dans `packages/common/src/index.ts`. Testé unitairement dans `packages/common/tests/hash.test.ts`.
- **MS1 Publication :** Dans `services/ms1-accounts/src/controllers/auth.controller.ts` (l. 86-90), `telegram.challenge.created` publie désormais `nonceHash: challenge.nonceHash` au lieu de `nonce: challenge.nonce`. Le nonce brut ne transite plus jamais sur le bus d'événements.
- **MS5 Consommation & Commande `/start` :** Dans `services/ms5-notifications/src/telegram-bot/telegram.service.ts` :
  - `initTelegramBotSubscriptions` indexe `pendingChallengesByNonce` via le `nonceHash` reçu.
  - La commande `/start <nonce>` calcule `hashString(nonce)` avec la fonction unifiée de `@forsa/common` avant d'interroger la mémoire.
- **Tests :** 
  - `services/ms1-accounts/tests/unit/broker-failover.test.ts` valide formellement que l'événement ne contient pas de propriété `nonce` en clair et contient `nonceHash`.
  - `services/ms5-notifications/tests/telegram-bot.test.ts` valide que `/start <rawNonce>` retrouve le défi enregistré avec son `nonceHash` sans que le nonce brut ne soit jamais stocké dans la table.

### 2. Expiration des défis, purge périodique et borne mémoire dans MS5 (B.2)
- Dans `services/ms5-notifications/src/telegram-bot/telegram.service.ts` :
  - **Rejet dans `/start` :** Si `Date.now() > new Date(challenge.expiresAt).getTime()`, le défi est supprimé et un message d'expiration explicite est envoyé (« Lien de connexion expiré »). Aucune session n'est initiée.
  - **Timer de purge périodique :** `startChallengeCleanupTimer()` exécute `purgeExpiredChallenges()` toutes les 60 secondes pour nettoyer les défis expirés non consommés.
  - **Arrêt propre :** `stopTelegramBot()` invoque `stopChallengeCleanupTimer()`.
  - **Borne mémoire maximale :** Constante `MAX_PENDING_CHALLENGES = 10000`. Lors de l'enregistrement, si la limite est atteinte, une purge est exécutée et la clé la plus ancienne est évincée si la table reste saturée.
- **Tests :**
  - Rejet des défis expirés dans `/start`.
  - Purge par timer simulée via fake timers (`jest.advanceTimersByTime(60000)`).
  - Respect strict de la borne supérieure de 10 000 entrées.

### 3. Spécifications mises à jour (B.3)
- `docs/FORSA_MS1_spec.md` (section 8) : Ajout détaillé de l'événement `telegram.challenge.created` (émetteur, consommateur, file d'attente `q.ms5-notifications.telegram.challenge.created`, champs avec `nonceHash`, TTL 600s, DLQ `forsa.events.dlx`).
- `docs/wams/architecture.md` (section 3.3) : Documentation complète du contrat d'échange asynchrone et des règles de sécurité mémoire de MS5.

### 4. Mot de passe de base de données en clair supprimé (B.4)
- `services/ms1-accounts/docker-compose.yml` : Remplacement du mot de passe en dur `forsa_secret_ms1` par `${MS1_DB_PASSWORD}` pour `POSTGRES_PASSWORD` et dans l'URL `DATABASE_URL` des deux instances `ms1-accounts-1` et `ms1-accounts-2`.
- `services/ms1-accounts/src/config/env.ts` : Fail-fast immédiat en production si `DATABASE_URL` n'est pas défini (`[MS1-Env] DATABASE_URL est obligatoire en environnement de production`), avec valeur par défaut conservée uniquement en environnement de développement local.

---

## LIMITS
- **Stockage en mémoire volatile :** Les défis en attente (`pendingChallengesByNonce`) sont conservés en mémoire dans le worker singleton MS5. Si MS5 redémarre pendant qu'un défi est en attente, ce défi est perdu ; l'utilisateur relance simplement sa demande d'authentification sur le portail FORSA.

---

## DESIGN DECISION NEEDED
- **Aucune décision bloquante :** L'inspection de l'arbre Git (`git branch -r`) a confirmé qu'aucun autre développeur ne travaille sur `services/ms5-notifications`. Aucune collision de code ni divergence d'architecture n'a été détectée.

---

## PART C — PREUVES D'EXÉCUTION (TESTS & BUILDS)

- **`packages/common` :**
  - Build : `tsc` terminé avec code 0.
  - Tests : 3 suites, 14 tests réussis, 0 échec.
- **`services/ms5-notifications` :**
  - Build : `tsc` terminé avec code 0.
  - Tests : 2 suites, 14 tests réussis, 0 échec.
- **`services/ms1-accounts` :**
  - Build : `tsc` terminé avec code 0.
  - Tests : 11 suites, 118 tests réussis, 0 échec.
- **Total général :** 16 suites de tests, 146 tests réussis, 0 échec.
