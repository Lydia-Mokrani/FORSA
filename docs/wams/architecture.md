# FORSA — Architecture Système & Déploiement Multi-Instances (WAMS)

> **Module :** Web Architectures & Microservices (WAMS) — UMBB ING4 GL (Semestre 7)  
> **Superviseur :** Dr. Yahiatene Youcef  
> **Composant :** MS1 Accounts & Shops, MS5 Notifications & Bot Telegram, `@forsa/common`, Infrastructure & Scripts  
> **Date :** 25 novembre 2026 (Mise à jour Lot 5B-2)  

---

## 1. Statut d'Exécution & Vérifications (Honnêteté Technique)

Conformément aux règles d'intégrité de la plateforme et aux contraintes d'environnement (tests unitaires et intégration sans conteneurs actifs ni jeton Telegram de production fourni) :

| Composant / Fonctionnalité | Statut | Méthode de validation |
|-----------------------------|--------|-----------------------|
| Compilation TypeScript (`packages/common`, `services/ms1-accounts`, `services/ms5-notifications`) | **EXÉCUTÉ & VALIDÉ** | `tsc --noEmit` (0 erreur sur l'ensemble des packages) |
| Tests Unitaires & d'Intégration Jest (140 tests passants) | **EXÉCUTÉ & VALIDÉ** | Mocks `amqplib`, `prisma`, `axios`, `express`, `supertest` |
| Déport du Bot Telegram dans MS5 (Singleton poller, long polling, deleteWebhook, exit sur 409) | **EXÉCUTÉ & VALIDÉ** | Suites Jest MS5 (`tests/telegram-bot.test.ts`, `tests/health.test.ts`) |
| Homogénéité stricte des instances MS1 (suppression de `TELEGRAM_BOT_ENABLED`) | **EXÉCUTÉ & VALIDÉ** | Fichiers `node-ms1.yml`, `env.ts`, `app.ts` |
| File partagée competing consumer (`q.ms1-accounts.telegram.contact.received`) | **EXÉCUTÉ & VALIDÉ** | Tests Jest MS1 (`tests/unit/broker-failover.test.ts`) |
| Comportement panne MS5 (message en attente dans la file, reprise au redémarrage avec TTL) | **EXÉCUTÉ & VALIDÉ** | Tests Jest MS1 & MS5 (`tests/unit/broker-failover.test.ts`) |
| Fail-fast Broker down sur `/api/auth/telegram/start` (HTTP 503 `BROKER_UNAVAILABLE`) | **EXÉCUTÉ & VALIDÉ** | Tests Jest MS1 (`tests/unit/broker-failover.test.ts`) |
| Zéro code Telegram/token résiduel dans `services/ms1-accounts/src` | **EXÉCUTÉ & VALIDÉ** | Grep statique strict (0 match) |
| Exécution réelle du script `infra/scripts/demo-bot-failover.sh` contre conteneurs réels | **NOT EXECUTED** | Requiert jeton de bot live et conteneurs démarrés (exécuté par Hyb) |

---

## 2. Vue d'Ensemble & Scalabilité Horizontale (MS1 & MS5)

Dans l'architecture cible WAMS du **Lot 5B-2**, le service **MS1 Accounts & Shops** est strictement découplé de tout protocole externe Telegram :
- **MS1 Accounts & Shops (2 instances) :** *Stateless workers* parfaitement symétriques et homogènes, équilibrés en round-robin par **Traefik v3** via **HashiCorp Consul**.
- **MS5 Notifications (1 instance singleton) :** Héberge l'unique poller Telegram officiel (`getUpdates`). Aucun conflit Telegram 409 n'est possible.
- **Bus RabbitMQ (`forsa.events`) :** Assure la liaison asynchrone totale entre MS1 et MS5.

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
     │  - GEOCODER_MIN_INTERVAL: 2000ms│                       │  - GEOCODER_MIN_INTERVAL: 2000ms│
     └───────┬─────────────────┬───────┘                       └───────┬─────────────────┬───────┘
             │                 │                                       │                 │
             │                 └───────────────────────┬───────────────┘                 │
             │                                         │                                 │
             ▼                                         ▼                                 ▼
 ┌──────────────────────┐                  ┌──────────────────────┐          ┌──────────────────────┐
 │ PostgreSQL 16 (DB1)  │                  │  RabbitMQ 3.13       │          │   HashiCorp Consul   │
 │  - Table users       │                  │  - forsa.events      │          │  - Healthchecks HTTP │
 │  - Table shop_docs   │                  │  - Files durables    │          │  - Tags Traefik MS1  │
 │  - auth_challenges   │                  │  - DLQ exchange      │          └──────────────────────┘
 └──────────────────────┘                  └───────────┬──────────┘
                                                       │
                                   Événements AMQP     │
                                                       ▼
                                           ┌─────────────────────────────────┐
                                           │  ms5-notifications (Port 3005)  │
                                           │  - Singleton Poller (replica: 1)│
                                           │  - Long Polling getUpdates      │
                                           │  - TELEGRAM_BOT_TOKEN           │
                                           └─────────────────┬───────────────┘
                                                             │ HTTPS (API Telegram)
                                                             ▼
                                                ┌─────────────────────────┐
                                                │ Serveurs Telegram Bot   │
                                                │ @forsa_auth_bot         │
                                                └─────────────────────────┘
```

---

## 3. Architecture Définitive du Bot Telegram (MS5 Singleton)

### Élimination Complète de la Dissymétrie MS1
Au Lot 5B-1b, une configuration transitoire dissymétrique (`TELEGRAM_BOT_ENABLED=true` sur l'instance 1, `false` sur l'instance 2) avait été mise en place pour contourner l'erreur Telegram 409 Conflict.  
**Au Lot 5B-2, cette dissymétrie est définitivement supprimée :**
- `TELEGRAM_BOT_ENABLED` et `TELEGRAM_BOT_TOKEN` sont entièrement retirés du code et de l'environnement de MS1.
- `ms1-accounts-1` et `ms1-accounts-2` ont désormais des variables et comportements 100% identiques.

### Événement `telegram.challenge.created` (MS1 → MS5)
- **Nom de l'événement :** `telegram.challenge.created`
- **Émetteur :** `ms1-accounts` (lors d'un appel à `POST /api/auth/telegram/start`)
- **Consommateur :** `ms5-notifications` (Singleton `telegram.service.ts`)
- **File d'attente :** `q.ms5-notifications.telegram.challenge.created` (file durable, DLQ `forsa.events.dlx`)
- **Champs du payload :**
  - `challengeId` (string, UUID du défi)
  - `nonceHash` (string, condensat SHA-256 du nonce - **le nonce brut ne transite JAMAIS sur le bus**)
  - `phone` (string, numéro normalisé E.164)
  - `expiresAt` (string ISO, date d'expiration du défi)
- **TTL Message & Durée :** 600 secondes (10 minutes, correspondant au TTL du défi dans PostgreSQL).
- **Règles de gestion en mémoire MS5 :**
  - Stocké dans `pendingChallengesByNonce` indexé par `nonceHash`.
  - Capacité bornée à 10 000 entrées pour prévenir toute fuite mémoire.
  - Minuteur périodique de nettoyage (toutes les 60s) purgeant les entrées dont `expiresAt <= Date.now()`.
  - Vérification d'expiration lors de la commande `/start <nonce>` : le nonce reçu est haché avec `hashString(nonce)` et rejeté s'il est expiré.

### Règles de Fonctionnement du Singleton MS5
1. **Singleton Garanti :** Déployé avec `replicas: 1` dans `infra/nodes/node-ms5.yml`.
2. **Nettoyage Préalable :** Appel systématique à `deleteWebhook` au démarrage pour purger tout webhook résiduel et forcer le mode long polling.
3. **Sécurité Conflit 409 :** Si une tentative concurrente est détectée (HTTP 409 Conflict retourné par Telegram), MS5 consigne un journal d'erreur explicite et s'arrête immédiatement avec un code de sortie non-zéro (`process.exit(1)`).
4. **Validation Sécurisée des Contacts :**
   - Contrôle 1 : `contact.user_id === from.id` (interdit le partage de contact tiers).
   - Contrôle 2 : `normalizeToE164(contact.phone_number) === expectedPhone` (concordance stricte avec le numéro saisi).
   - Succès : émission de `telegram.contact.received` sur `forsa.events`.
5. **Gestion des Erreurs 403 (Bot bloqué par l'utilisateur) :**
   - Journalisé en avertissement (`[TelegramBot] L'utilisateur a bloqué le bot (HTTP 403)`).
   - Aucun nouvel événement n'est inventé dans ce lot.

---

## 4. Tolérance aux Pannes & Reprise Asynchrone (Démo 5B-2)

### Scénario 1 : Panne de MS5 (Worker Bot Indisponible)
1. Un utilisateur demande à s'authentifier (`POST /api/auth/telegram/start`).
2. MS1 vérifie que le broker RabbitMQ est accessible, enregistre le défi dans PostgreSQL (`auth_challenges`), et publie `telegram.challenge.created` (et `telegram.send.otp` pour un returning user).
3. Comme MS5 est arrêté, le message reste stocké en sécurité dans la file d'attente durable de RabbitMQ (`q.ms5-notifications.*`).
4. MS1 renvoie immédiatement HTTP 200 avec le `challengeId` et le `deepLink`.
5. **Au redémarrage de MS5 :**
   - MS5 se reconnecte au broker et dépile les messages en attente.
   - Si le message est reçu dans la fenêtre de validité (`occurredAt + OTP_TTL`), le message Telegram est envoyé.
   - Si le message a expiré dans la file (`Date.now() > occurredAt + TTL`), il est automatiquement abandonné sans spammer l'utilisateur.

### Scénario 2 : Panne du Broker RabbitMQ
1. Si RabbitMQ est éteint ou inaccessible lors d'un appel à `POST /api/auth/telegram/start` :
2. MS1 détecte immédiatement la coupure (`isBrokerUp === false` ou rejet rapide `BROKER_UNAVAILABLE`).
3. MS1 renvoie immédiatement une réponse HTTP **503 Service Unavailable** avec le code d'erreur stable `{ "error": "BROKER_UNAVAILABLE", "message": "Le service de messagerie (broker) est indisponible." }`.
4. La requête ne bloque jamais et ne reste jamais suspendue indéfiniment.

---

## 5. File Partagée MS1 (Competing Consumers)

Pour la consommation de `telegram.contact.received` par les instances de MS1 :
- Les deux instances MS1 souscrivent avec le nom de file explicite partagé :
  ```
  q.ms1-accounts.telegram.contact.received
  ```
- RabbitMQ distribue chaque événement de contact à **une seule et unique instance MS1** (mode *competing consumers* en round-robin).
- Aucun risque de double traitement, de génération concurrente de code OTP ou de conflit de transaction Prisma.

---

## 6. Guide : Comment un Nouveau Microservice Rejoint l'Écosystème

Pour intégrer un nouveau microservice (ex. `ms2-catalogue`, `ms3-reservations`, `ms4-trust`) :
1. **Enregistrement Consul :** Utiliser `ConsulRegistry` de `@forsa/common` en fournissant `traefikPathPrefixes` si le service expose une API publique, ou `traefikPathPrefixes: []` s'il s'agit d'un worker interne (comme MS5).
2. **Consommation JWKS :** Valider les tokens JWT émis par MS1 via `GET /api/auth/jwks` avec les clés publiques RFC 7517 (`n`, `e`, `kid`).
3. **Bus d'Événements :** Échanger des messages via l'enveloppe standardisée `{ eventId, type, name, occurredAt, payload }`.

---

## 7. Architecture de Messagerie E-mail & Récupération de Compte (Lot E1)

### Événement `email.send` (MS1 → MS5)
- **Émetteur :** `ms1-accounts` (lors de l'inscription, changement d'e-mail dans `/users/me`, et flux de récupération de numéro).
- **Consommateur :** `ms5-notifications` (`email.consumer.ts`).
- **File d'attente :** `q.ms5-notifications.email.send` (durable, DLQ `forsa.events.dlx`).
- **Structure de l'enveloppe :**
  ```json
  {
    "eventId": "evt-email-verify-1732521600000-uuid",
    "type": "email.send",
    "name": "email.send",
    "occurredAt": "2026-11-25T07:00:00.000Z",
    "payload": {
      "eventId": "evt-email-verify-1732521600000-uuid",
      "to": "user@example.com",
      "template": "verify",
      "locale": "fr",
      "data": { "code": "123456" }
    }
  }
  ```

### Drivers d'Expédition MS5
1. **Driver SMTP (`smtp.sender.ts`) :**
   - Basé sur `nodemailer`.
   - Provider-agnostic (Gmail App Password, Brevo, Ethereal, serveurs SMTP d'entreprise).
   - En environnement de développement : bascule gracieuse sur `log-masked` si `SMTP_HOST` n'est pas renseigné (aucun crash, aucun mot de passe requis en local).
   - En production : fail-fast au démarrage si les informations d'authentification SMTP sont incomplètes.
2. **Driver Log-Masked (`log-masked.sender.ts`) :**
   - Conçu pour les tests unitaires et le développement déconnecté.
   - Format de journal : `[EMAIL] to=a***@g***.com template=verify subject=...`.
   - **Règle absolue :** Aucun code OTP, jeton ou adresse complète n'apparaît dans les flux de sortie stdout/stderr.

### Modèles d'E-mails Standardisés
- **`verify` :** Code de vérification à 6 chiffres valable 10 minutes (*« Ne partagez jamais ce code »*).
- **`recovery` :** Code de récupération de compte valable 15 minutes (*« Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail »*).
- **`phone-changed` :** Notification de sécurité confirmant l'attribution immédiate d'un nouveau numéro.
- **`phone-change-pending` :** Alerte de sécurité commerçant avec délai de grâce de 24h et adresse de contact de secours (`support@forsa.dz`).

### Tolérance aux Pannes & Reprise
- **MS5 indisponible :** Les messages restent stockés dans la file durable `q.ms5-notifications.email.send`. Au retour de MS5, les messages dont l'âge dépasse le TTL du code sont abandonnés silencieusement ; les autres sont délivrés.
- **Modèle inconnu :** Tout template non reconnu par le consommateur est immédiatement rejeté vers la Dead-Letter Queue (`forsa.events.dlx`) sans interrompre le service.
- **Anti-énumération & Rate Limiting :** `POST /api/auth/recovery/start` répond immédiatement en 202 Accepted. Le traitement asynchrone (`setImmediate`) neutralise les canaux auxiliaires d'analyse temporelle. Traefik applique une limite stricte par IP (`recovery-ratelimit`) en amont de MS1.
