# Rapport d'Exécution : LOT E1 — E-mail Obligatoire Vérifié & Récupération de Compte par E-mail

> **Date :** 25 Novembre 2026  
> **Branche :** `feat/ms1-telegram-auth`  
> **Périmètre :** BACKEND uniquement (`services/ms1-accounts`, `services/ms5-notifications`, `packages/common`, `infra/`, `docs/`)  
> **Base de données :** Test DB uniquement (`neondb_lot1_test`)  
> **Conformité Sécurité :** Aucun secret consigné, masquage strict des e-mails (`a***@g***.com`), zéro code OTP ou nonce en clair dans les logs.

---

## 0. Discovery (État Initial)

1. **Colonnes `users` relatives à l'e-mail :**
   - Initialement : `email String? @unique`.
   - Aucun horodatage de vérification ni champ de transition.
2. **Usage de l'e-mail dans l'authentification :**
   - Conformément aux décisions architecturales Hyb/WAMS, l'authentification principale repose sur le numéro de téléphone et le bot Telegram officiel. L'e-mail ne permet JAMAIS de se connecter directement ; il est obligatoire et sert uniquement à la vérification d'identité et à la procédure sécurisée de récupération de compte.
3. **Purposes existants dans `auth_challenges` :**
   - `LOGIN`, `REGISTER`, `UPDATE_PHONE`, `CONFIRM_SENSITIVE`.
   - Nouveaux purposes nécessaires : `EMAIL_VERIFY`, `RECOVER_PHONE`.
4. **Hébergement dans MS5 :**
   - Le bot Telegram singleton réside dans `services/ms5-notifications/src/telegram-bot/`.
   - L'expéditeur e-mail est placé à côté dans `services/ms5-notifications/src/email-sender/` avec son propre consommateur RabbitMQ sur `q.ms5-notifications.email.send`.
5. **Claims JWT :**
   - `sub`, `roles`, `mode`, `shopStatus`, `role`, `email`, `phone`, `fullName`, `shopId`, `merchantId`.
   - Ajout du claim `emailVerified: boolean` (synchrone avec `email_verified_at`).

---

## 1. Données & Schéma Prisma (Migration `20261125070000_lot_e1_email_verification`)

### Modifications du schéma `schema.prisma`
- **Enum `ChallengePurpose` :**
  - Ajout de `EMAIL_VERIFY` et `RECOVER_PHONE`.
- **Modèle `User` :**
  - `emailVerifiedAt DateTime? @map("email_verified_at")`
  - `pendingPhone String? @map("pending_phone")`
  - `pendingPhoneActivateAt DateTime? @map("pending_phone_activate_at")`
  - `pendingEmail String? @map("pending_email")`
  - Relation `recoveryTokens RecoveryToken[]`
- **Modèle `AuthChallenge` :**
  - `phone` et `nonceHash` rendus optionnels (permettant les défis e-mail purs).
  - Ajout de `email String?` et `emailHash String? @map("email_hash")`.
  - Ajout de `maxAttempts Int @default(5) @map("max_attempts")`.
  - Index `@@index([emailHash, purpose])`.
- **Nouveau Modèle `RecoveryAttempt` :**
  - `id String @id @default(uuid())`
  - `emailHash String @map("email_hash")`
  - `createdAt DateTime @default(now()) @map("created_at")`
  - Index `@@index([emailHash, createdAt])` (utilisé pour le rate limiting DB anti-énumération sur 24h pour e-mails connus et inconnus).
- **Nouveau Modèle `RecoveryToken` :**
  - `id String @id @default(uuid())`
  - `tokenHash String @unique @map("token_hash")`
  - `userId String @map("user_id")`
  - `email String`
  - `scope String @default("phone_recovery")`
  - `expiresAt DateTime @map("expires_at")`
  - `usedAt DateTime? @map("used_at")`
  - `createdAt DateTime @default(now()) @map("created_at")`

---

## 2. Expéditeur E-mail dans MS5 (`services/ms5-notifications/src/email-sender/`)

1. **Interface `IEmailSender` & Méthodes :**
   - `send(options: SendEmailOptions): Promise<boolean>`
   - `sendEmail(options: SendEmailOptions): Promise<void>`
   - Options : `{ to, template, locale, data: { code, delayHours } }`.
2. **Drivers d'Expédition :**
   - **`SmtpEmailSender` (`smtp.sender.ts`) :**
     - Basé sur `nodemailer`.
     - Configuration via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.
     - En développement : si `SMTP_HOST` est absent, bascule gracieusement sur `LogMaskedEmailSender` sans crasher.
     - En production : fail-fast si les variables SMTP sont absentes.
   - **`LogMaskedEmailSender` (`log-masked.sender.ts`) :**
     - Journalise les e-mails sous le format : `[EMAIL] to=a***@g***.com template=verify subject=...`.
     - **Conformité stricte :** Aucun code OTP, aucun token, aucune adresse non masquée dans stdout.
3. **Modèles (`email.templates.ts`) :**
   - `verify` : code 6 chiffres, TTL 10 min, mentions de sécurité FR & AR.
   - `recovery` : code 6 chiffres, TTL 15 min, mentions de sécurité FR & AR.
   - `phone-changed` : confirmation de modification immédiate.
   - `phone-change-pending` : avertissement commerçant avec délai (24h) et contact de sécurité (`support@forsa.dz`).
4. **Consommateur RabbitMQ (`email.consumer.ts`) :**
   - Écoute active sur `q.ms5-notifications.email.send` (exchange `forsa.events`, routing key `email.send`).
   - Déduplication idempotente sur `eventId` (cache borné LRU).
   - Filtrage des messages expirés selon le TTL (10 min pour verify, 15 min pour recovery).
   - Rejet automatique des modèles inconnus vers la Dead-Letter Queue (`forsa.events.dlx`).

---

## 3. Services & Contrôleurs MS1 (`services/ms1-accounts`)

1. **`EmailVerificationService` :**
   - `initiateEmailVerification(userId, email, locale)` : génère un code à 6 chiffres haché en SHA-256 (TTL 10 min, max 5 tentatives) et émet `email.send`.
   - `verifyEmail(userId, code)` : valide le code, incrémente les tentatives, met à jour `email_verified_at`, et bascule atomiquement `pendingEmail` vers `email` si applicable.
   - `resendVerification(userId, locale)` : limite stricte en base de données de max 3 renvois par heure (renvoie HTTP 429 `RATE_LIMITED`).
2. **`RecoveryService` :**
   - `startRecovery(email, locale)` :
     - Anti-énumération absolue : réponse synchrone immédiate HTTP 202 Accepted `{ message: "Si un compte actif existe avec cet e-mail, un code de récupération a été envoyé." }`.
     - Rate-limit DB max 3 demandes / 24h par condensat SHA-256 (`recovery_attempts`), appliqué de manière identique que l'e-mail appartienne à un compte existant ou non.
     - Traitement asynchrone (`setImmediate`) de la recherche utilisateur et de l'envoi de l'événement pour neutraliser toute analyse temporelle.
   - `verifyRecovery(email, code)` : vérifie le code et émet un `recoveryToken` temporaire (15 min) à usage unique (condensat hexadécimal 256 bits).
   - `startRebindPhone(recoveryToken, newPhone)` : valide le token de récupération, valide le format E.164 algérien, vérifie l'absence de conflit (409 `PHONE_ALREADY_IN_USE`), fail-fast si broker down (503 `BROKER_UNAVAILABLE`), génère le défi Telegram et publie `telegram.challenge.created` avec `nonceHash` (aucun nonce brut).
   - `completePhoneRecovery(userId, newPhone, telegramUserId, chatId)` :
     - Commerçant avec boutique approuvée : applique un délai de grâce de 24h (`RECOVERY_MERCHANT_DELAY_HOURS`), enregistre dans `pending_phone` et émet `phone-change-pending`.
     - Client / commerçant sans boutique : applique le changement immédiatement et émet `phone-changed`.
     - Révoque immédiatement toutes les sessions actives existantes de l'utilisateur.
   - `checkAndApplyPendingPhone(userId)` : appliqué paresseusement à la connexion et dans `GET /users/me` ; bascule `pending_phone` dès expiration du délai de 24h.
3. **Contrôleur Utilisateur (`UserController`) :**
   - `GET /users/me` : exécute `checkAndApplyPendingPhone` et renvoie `emailVerified: Boolean(user.emailVerifiedAt)`.
   - `PUT /users/me` : si l'e-mail est modifié, l'ancien e-mail vérifié reste actif et le nouvel e-mail est placé dans `pendingEmail` en attente de validation via `POST /auth/email/verify`.
4. **Sessions & JWT (`SessionService` & `JwtService`) :**
   - Le claim `emailVerified` est inclus dans le JWT 15 min et actualisé lors du refresh et du switch-mode.

---

## 4. Infrastructure & Documentation

1. **Traefik v3 (`infra/traefik/dynamic.yml`) & Tags Consul :**
   - Déclaration du middleware `recovery-ratelimit` (average: 5 req/min, burst: 10, IP strategy) pour `/api/auth/recovery/start`.
   - Tags dynamiques enregistrés via `consul.service.ts`.
2. **OpenAPI (`services/ms1-accounts/openapi.yaml`) :**
   - Ajout des routes `/api/auth/email/verify`, `/api/auth/email/resend`, `/api/auth/recovery/start`, `/api/auth/recovery/verify`, `/api/auth/recovery/rebind-phone/start`.
3. **Variables d'Environnement (`.env.example`) :**
   - Documentation de `RECOVERY_MERCHANT_DELAY_HOURS`, `EMAIL_DRIVER`, `SMTP_HOST`, etc.
4. **Spécification & Architecture :**
   - Mise à jour de `docs/FORSA_MS1_spec.md` (§3.4, §8, §9).
   - Mise à jour de `docs/wams/architecture.md` (§7 Architecture E-mail & Récupération).

---

## 5. Synthèse des Résultats des Tests

### A. `packages/common`
- **Build TypeScript :** 0 erreur
- **Tests Jest :** 4 suites passées, 17/17 tests réussis
  - `maskEmail` : standard, sous-domaines, entrées invalides (3/3)
  - `hashString` : SHA-256 déterministe (2/2)
  - `EventBus` : enveloppe événementielle, idempotence, retries DLQ, expiration TTL (8/8)
  - `ConsulRegistry` : backoff exponentiel, gigue, enregistrement et résilience (4/4)

### B. `services/ms5-notifications`
- **Build TypeScript :** 0 erreur
- **Tests Jest :** 3 suites passées, 25/25 tests réussis
  - `email-sender.test.ts` : rendu templates FR & AR, driver log-masked confidentialité, fallback SMTP en dev, consommation RabbitMQ, idempotence par eventId, abandon OTP expiré, routage DLQ template inconnu (11/11)
  - `telegram-bot.test.ts` : validation du contact émetteur, TTL, gestion erreurs 409 & 403, nonceHash sur le bus, purge périodique (12/12)
  - `health.test.ts` : statuts UP / DEGRADED (2/2)

### C. `services/ms1-accounts`
- **Build TypeScript :** 0 erreur
- **Tests Jest :** 12 suites passées, 133/133 tests réussis
  - `email-recovery.test.ts` : cycle de vie complet de vérification et récupération (15/15)
  - `telegram-auth.test.ts` : authentification Telegram, unicité, rotation JWT (21/21)
  - `broker-failover.test.ts` : tolérance aux pannes broker & MS5 (4/4)
  - `no-secret-logs.test.ts` : audit de confidentialité des logs (3/3)
  - `lot5a.test.ts` & `avatar.test.ts` & `validation.test.ts` & `rate-limit-db.test.ts` & `health.test.ts` : validés à 100%

**Total cumulé :** 19 suites de tests passées, **175 tests réussis**, 0 échec.
