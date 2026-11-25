# Rapport d'Exécution — LOT 5B-2 : Déport du Bot Telegram dans MS5 (Singleton) sur le Bus RabbitMQ

> **Projet :** FORSA — Plateforme Anti-Gaspillage & Commerce Circulaire  
> **Module :** Web Architectures & Microservices (WAMS) — UMBB ING4 GL (Semestre 7)  
> **Composant :** MS1 Accounts & Shops, MS5 Notifications & Bot Telegram, `@forsa/common`, Infrastructure & Scripts  
> **Date :** 25 novembre 2026  
> **Branche Git :** `feat/ms1-telegram-auth`  

---

## 0. Découverte (Read-Only)

### 0.1. Arborescence `services/` & Branches Git
- **Sortie de `Get-ChildItem services/` :**
  - `ms1-accounts` (actif, 118 tests unitaires/intégration)
  - `ms2-catalogue` (catalogue et boutiques)
  - `ms3-reservations` (et non `ms3-orders`)
  - `ms4-trust` (et non `ms4-loyalty`)
  - `ms5-notifications` (contenait uniquement `README.md` avant ce lot)
- **Sortie de `git branch -a` :**
  - `* feat/ms1-telegram-auth`
  - `feature/ms1-accounts`
  - `remotes/origin/feat/ms1-telegram-auth`
- **Contenu initial de `services/ms5-notifications` :**
  Uniquement [`README.md`](../../services/ms5-notifications/README.md) (attribué à Khoumeri Asma, rôle notifications in-app et e-mails). Aucun code source, package.json, ni configuration n'existait.

### 0.2. Emplacement initial du bot dans MS1 et dépendances Telegram
- **Fichier d'origine :** `services/ms1-accounts/src/services/telegram.service.ts`
  - Importait : `config` (`env.ts`), `prisma` (`config/prisma.ts`), `eventBus` (`services/event-bus.ts`), `normalizeToE164` (`utils/phone.ts`), `hashString` (`services/challenge.service.ts`).
  - Établissait les appels HTTP directs vers `https://api.telegram.org/bot<TOKEN>/...` (`getUpdates`, `sendMessage`, `deleteWebhook`).
  - Était démarré et arrêté dans `services/ms1-accounts/src/index.ts:5,17,23,29`.
  - Contrôlé par les variables `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, et le flag temporaire `TELEGRAM_BOT_ENABLED`.

### 0.3. Noms des files et consommation (Shared competing consumers vs per-instance)
- **`telegram.contact.received` :**
  - Consommateur : [`services/ms1-accounts/src/events/auth-events.listener.ts:9-12`](../../services/ms1-accounts/src/events/auth-events.listener.ts#L9-L12).
  - Nom de file explicite partagé : `'q.ms1-accounts.telegram.contact.received'`.
  - Mode : **Competing consumers**. Les instances `ms1-accounts-1` et `ms1-accounts-2` se partagent cette même file durable ; chaque contact reçu n'est traité qu'une seule fois par une seule instance.
- **`telegram.send.otp` :**
  - Consommateur : [`services/ms5-notifications/src/telegram-bot/telegram.service.ts:285-300`](../../services/ms5-notifications/src/telegram-bot/telegram.service.ts#L285-L300).
  - Nom de file : `'q.ms5-notifications.telegram.send.otp'`.
  - Mode : Consommé exclusivement par l'instance unique de MS5 (singleton poller).

### 0.4. Implémentation du délai de retry du bus 5B-1b
- Dans [`packages/common/src/rabbitmq/index.ts:270-290`](../../packages/common/src/rabbitmq/index.ts#L270-L290), le délai de retry utilise un `setTimeout(..., retryDelay)` non bloquant avant de republier le message sur la file avec un en-tête `x-retry-count` incrémenté, et acquitte immédiatement le message d'origine (`channel.ack(msg)`).
- **Constat :** Il ne bloque pas le canal avec un `sleep` synchrone sous `prefetch(1)`. En revanche, le message en attente de réessai réside temporairement dans la mémoire du processus. (Voir section *Questions*).

---

## 1. Déplacement du Bot vers MS5 (`git mv`) & Nettoyage MS1

### 1.1. Déplacement préservant l'historique Git
```bash
git mv services/ms1-accounts/src/services/telegram.service.ts services/ms5-notifications/src/telegram-bot/telegram.service.ts
```

### 1.2. Fonctionnalités du Bot dans MS5
- **Long Polling (`getUpdates`) :** Boucle avec `timeout=20` et gestion du décalage d'offset.
- **Suppression du Webhook au démarrage :** Appel à `deleteWebhook` avant d'initier le long polling.
- **Gestion du Conflit HTTP 409 :** En cas d'erreur 409 Conflict, le bot consigne :
  `[TelegramBot] ❌ ERREUR 409 CONFLICT: Une autre instance du bot Telegram tourne déjà avec ce token. Arrêt immédiat.`
  et s'arrête avec `process.exit(1)`.
- **Validation stricte des contacts partagés :**
  - Contrôle 1 : `contact.user_id === from.id` (rejet si contact d'un tiers partagé).
  - Contrôle 2 : `normalizeToE164(contact.phone_number) === expectedPhone` (rejet si non concordant).
  - Succès : émission de `telegram.contact.received` sur le bus.
- **Consommation de `telegram.send.otp` :**
  - Vérifie le TTL du message (`occurredAt + OTP_TTL`) et drop silencieusement si expiré.
  - Formate le message avec `<pre><code>` et bouton `copy_text`.
- **Masquage des informations sensibles :**
  - `maskPhone` déplacé dans `@forsa/common` de manière additive. Aucun code à 6 chiffres, nonce ou deep link n'apparaît dans les journaux.

### 1.3. Nettoyage Total de MS1
- Suppression de tout appel aux API Telegram et de toute boucle de polling dans MS1.
- Suppression définitive du flag de dissymétrie `TELEGRAM_BOT_ENABLED` dans `services/ms1-accounts/src/config/env.ts` et `infra/nodes/node-ms1.yml`. Les deux instances MS1 sont désormais strictement identiques.
- Suppression du fichier de test `telegram-bot-enabled.test.ts` (remplacé par `broker-failover.test.ts`).

### 1.4. Preuve Statique : Zéro Code Telegram Restant dans MS1
```bash
$ git grep -E "getUpdates|TELEGRAM_BOT_TOKEN|node-telegram-bot-api|api\.telegram\.org" services/ms1-accounts/src/
(0 match, code de sortie 1)
```

---

## 2. Service MS5 Minimal (`services/ms5-notifications`)

### 2.1. Fichiers créés pour le squelette MS5
- [`services/ms5-notifications/package.json`](../../services/ms5-notifications/package.json)
- [`services/ms5-notifications/tsconfig.json`](../../services/ms5-notifications/tsconfig.json)
- [`services/ms5-notifications/jest.config.json`](../../services/ms5-notifications/jest.config.json)
- [`services/ms5-notifications/.env.example`](../../services/ms5-notifications/.env.example)
- [`services/ms5-notifications/Dockerfile`](../../services/ms5-notifications/Dockerfile)
- [`services/ms5-notifications/src/config/env.ts`](../../services/ms5-notifications/src/config/env.ts)
- [`services/ms5-notifications/src/services/event-bus.ts`](../../services/ms5-notifications/src/services/event-bus.ts)
- [`services/ms5-notifications/src/telegram-bot/telegram.service.ts`](../../services/ms5-notifications/src/telegram-bot/telegram.service.ts)
- [`services/ms5-notifications/src/index.ts`](../../services/ms5-notifications/src/index.ts)
- [`services/ms5-notifications/tests/telegram-bot.test.ts`](../../services/ms5-notifications/tests/telegram-bot.test.ts)
- [`services/ms5-notifications/tests/health.test.ts`](../../services/ms5-notifications/tests/health.test.ts)

### 2.2. Fichiers que la coéquipière MS5 (Asma) devra fusionner
Puisque le dossier ne contenait aucun code préalable, l'intégration est sans conflit. Si elle a développé sur sa branche locale :
1. `package.json` : fusionner les dépendances (`express`, `@forsa/common`) avec ses outils (ex: `nodemailer`).
2. `src/index.ts` : conserver les appels à `startTelegramBot()` et `initTelegramBotSubscriptions()` aux côtés de ses écouteurs de notifications.
3. Conserver le dossier `src/telegram-bot/` intact.

### 2.3. Script d'Exécution Conjointe en Développement Local
Ajout du script cross-platform [`scripts/dev-auth.js`](../../scripts/dev-auth.js) exécutable via :
```bash
npm run dev:auth
```
Il démarre en parallèle `services/ms1-accounts` (port 3001) et `services/ms5-notifications` (port 3005) et gère l'arrêt propre des deux sous-processus sur `Ctrl+C`.

---

## 3. Comportements en Cas de Panne (Tolérance & Reprise Asynchrone)

### 3.1. Panne de MS5 (Worker Bot éteint)
- Test validé dans [`services/ms1-accounts/tests/unit/broker-failover.test.ts`](../../services/ms1-accounts/tests/unit/broker-failover.test.ts) :
  `POST /api/auth/telegram/start` renvoie HTTP 200 `{ challengeId, deepLink }`. Le défi est créé en base et publié sur RabbitMQ (`q.ms5-notifications.telegram.challenge.created` et `q.ms5-notifications.telegram.send.otp`).
- Le message attend dans la file RabbitMQ durable.
- Au redémarrage de MS5, le message est consommé : envoyé si dans la fenêtre TTL, abandonné si expiré.

### 3.2. Panne du Broker RabbitMQ
- Test validé dans [`services/ms1-accounts/tests/unit/broker-failover.test.ts`](../../services/ms1-accounts/tests/unit/broker-failover.test.ts) :
  Si le broker est indisponible ou déconnecté, `POST /api/auth/telegram/start` échoue immédiatement avec un code HTTP 503 stable :
  ```json
  {
    "error": "BROKER_UNAVAILABLE",
    "message": "Le service de messagerie (broker) est indisponible."
  }
  ```
  La requête ne reste jamais suspendue.

---

## 4. Infrastructure & Démonstrations

- [`infra/nodes/node-ms5.yml`](../../infra/nodes/node-ms5.yml) : service opérationnel configuré en `replicas: 1`.
- [`infra/nodes/node-ms1.yml`](../../infra/nodes/node-ms1.yml) : instances `ms1-accounts-1` et `ms1-accounts-2` devenues 100% identiques.
- [`infra/.env.example`](../../infra/.env.example) : documentation des ports et variables MS5.
- [`infra/scripts/demo-bot-failover.sh`](../../infra/scripts/demo-bot-failover.sh) : script de démonstration de panne / reprise asynchrone.

---

## 5. Résultats des Tests & Compilation

### `packages/common`
- Compilation `tsc` : **0 erreur**.
- Tests Jest : **2 suites, 12 tests passants, 0 échec**.

### `services/ms1-accounts`
- Compilation `tsc` : **0 erreur**.
- Tests Jest : **11 suites, 118 tests passants, 0 échec**.

### `services/ms5-notifications`
- Compilation `tsc` : **0 erreur**.
- Tests Jest : **2 suites, 10 tests passants, 0 échec**.

**Total Général : 15 suites, 140 tests passés avec succès.**

---

## 6. Questions & Remarques Architecturales

1. **Gestion de `telegram_blocked` (Erreur 403) :**
   Dans MS5, la détection de l'erreur 403 consigne un log d'avertissement. Conformément aux consignes ("do not invent new events"), aucun nouvel événement n'a été émis. À terme, un événement formel `telegram.user.blocked` pourra être publié pour que MS1 mette à jour la colonne `telegramBlocked` en base sans couplage direct.
2. **Durabilité du délai de réessai RabbitMQ :**
   Le mécanisme de retry actuel utilise `setTimeout` en mémoire avant ré-émission sur la file. En production haute disponibilité, une file d'attente à TTL avec Dead-Letter Exchange (DLX retry delay pattern) permettrait de persister le message dans RabbitMQ pendant le délai d'attente sans dépendre de la mémoire vive du conteneur.
