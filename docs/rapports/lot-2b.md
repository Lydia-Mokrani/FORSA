# Rapport Lot 2B — Bot Telegram Isolé, Changement de Numéro & Profil

**Date** : 2026-11-23  
**Branche** : `feat/ms1-telegram-auth`  
**Base de données** : `neondb_lot1_test` uniquement — base de production `neondb` strictement intacte.

---

## 1. Réponses précises aux points A1 à A6

1. **reprise.md corrigé ?**  
   Oui (`docs/rapports/reprise.md#L21-L26`) : `npx prisma migrate deploy` exécute les scripts SQL, tandis que `prisma migrate resolve --applied` marque uniquement comme appliqué sans lancer de SQL.
2. **migration.sql lignes 125-165 (doublons de numéros) :**  
   Lignes 134-145 de `services/ms1-accounts/prisma/migrations/20261122230000_lot1_telegram_schema/migration.sql` : la requête fenêtrée `ROW_NUMBER() OVER (PARTITION BY phone_e164 ORDER BY created_at DESC)` conserve le compte le plus récent avec le numéro d'origine et suffixe les comptes antérieurs avec `_dup1`, `_dup2` sans supprimer aucune ligne ni perdre de données utilisateur. Alternative proposée : passer les doublons antérieurs à `NULL` (car `phone_e164` est nullable) et archiver leur numéro précédent dans `audit_logs` avec leur `user_id`.
3. **Ligne de phoneE164 dans schema.prisma :**  
   Oui, `services/ms1-accounts/prisma/schema.prisma#L64` : `phoneE164 String? @unique @map("phone_e164")` (nullable et contrainte unique).
4. **Vérifications de sécurité Lot 2A (Oui/Non) :**  
   - Rate limit par numéro et par IP sur `/start` et `/verify` : **Oui** (`services/ms1-accounts/src/middlewares/rate-limit.middleware.ts#L64-L87`).
   - `audit_logs` (connexion, échec de code, changement de mode, replay) : **Oui** (`services/ms1-accounts/src/controllers/auth.controller.ts#L113, L169, L361`, `session.service.ts#L110`).
   - Révocation de toutes les sessions si un refresh token est rejoué (+ test) : **Oui** (`services/ms1-accounts/src/services/session.service.ts#L102-L117`, testé dans `telegram-auth.test.ts#L346`).
   - Réponse de `/start` identique que le numéro existe ou non : **Oui** (`services/ms1-accounts/src/controllers/auth.controller.ts#L60-L84`).
   - `/auth/switch-mode` refusé sans rôle MERCHANT ou boutique non APPROVED : **Oui** (`services/ms1-accounts/src/controllers/auth.controller.ts#L335-L347`).
   - Comparaison du code à temps constant : **Oui** (`services/ms1-accounts/src/services/challenge.service.ts#L24-L38`).
   - Aucun code ni nonce dans les logs hors développement : **Oui** (`challenge.service.ts#L70, L88`, `auth.controller.ts#L77` sous condition `process.env.NODE_ENV !== 'production'`).
5. **openingHours dans createShopSchema et updateShopSchema :**  
   **Oui**, réintégré dans les schémas Zod et typé avec `Prisma.InputJsonValue` dans `services/ms1-accounts/src/controllers/shop.controller.ts#L63, L140`, validé par 2 tests unitaires dédiés.
6. **Variables Telegram dans `.env` :**  
   - `TELEGRAM_BOT_TOKEN` : **Présente**
   - `TELEGRAM_BOT_USERNAME` : **Absente** (remplacée par `TELEGRAM_CHAT_ID`)

---

## 2. Réalisations du Lot 2B

### A. Bot Telegram Isolé (`telegram.service.ts` & `auth-events.listener.ts`)
- **Découplage architectural strict** : Le bot Telegram ne fait plus aucune mutation directe en base ni génération d'OTP. Il communique avec MS1 exclusivement via le bus d'événements :
  1. `/start <nonce>` : retrouve le défi et affiche le bouton `request_contact` (« 📱 Partager mon contact »).
  2. Réception du contact :
     - Vérification `contact.user_id === from.id` (empêche le partage de fiches contact tierces).
     - Vérification `normalizeToE164(contact.phone_number) === expectedPhone` (défi ou `newPhone`).
     - En cas d'incohérence : défi marqué `FAILED`, message clair envoyé, suppression du clavier.
     - En cas de succès : émission de `telegram.contact.received` sur le bus.
  3. Consommation par MS1 (`auth-events.listener.ts`) :
     - Cas `CHANGE_PHONE` : exécution de la transaction atomique (voir ci-dessous).
     - Cas `LOGIN` / `REGISTER` : génération du code OTP 6 chiffres, hachage SHA-256, TTL 5 min, mise à jour du défi et émission de `telegram.send.otp`.
  4. Consommation par le Bot (`telegram.send.otp` et `telegram.send.message`) : envoi du message avec bloc `<pre><code>` et bouton « Copier le code ».
  5. Détection du blocage du bot : en cas d'erreur 403 Forbidden (« bot was blocked by the user »), mise à jour automatique `telegramBlocked = true` en base de données.

### B. Changement de Numéro Sécurisé en 2 Étapes
- **POST `/api/users/me/phone/change/start`** :
  - Authentifié (`req.user.sub`).
  - Vérifie que l'utilisateur a un compte Telegram lié.
  - Génère un défi `CONFIRM_SENSITIVE` et envoie un code 6 chiffres sur le Telegram actuel via `telegram.send.otp`.
  - Journalise l'audit `PHONE_CHANGE_INITIATED`.
- **POST `/api/users/me/phone/change/verify`** :
  - Vérifie le code d'étape 1 (comparaison à temps constant, 5 essais max, TTL 5 min).
  - Contrôle le nouveau numéro (format mobile algérien E.164 strict, différent de l'actuel).
  - Vérifie qu'aucun autre compte n'utilise déjà ce nouveau numéro (sinon `ConflictError 409`).
  - Génère le défi d'étape 2 `CHANGE_PHONE` avec nonce 128 bits et renvoie le `deepLink` Telegram.
- **Transaction Atomique Prisma** :
  - Dès confirmation du contact sur Telegram avec le nouveau numéro :
    ```typescript
    await prisma.$transaction([
      prisma.user.update({
        where: { id: challenge.userId },
        data: {
          phoneE164: newPhone,
          telegramUserId: String(telegramUserId),
          telegramChatId: String(chatId),
          telegramBlocked: false,
        },
      }),
      prisma.authChallenge.update({
        where: { id: challenge.id },
        data: { status: ChallengeStatus.VERIFIED },
      }),
      prisma.auditLog.create({
        data: {
          userId: challenge.userId,
          action: 'USER_PHONE_CHANGED',
          metadata: { oldPhone, newPhone, oldTelegramUserId, newTelegramUserId, chatId },
        },
      }),
    ]);
    ```
  - Gère les 2 cas : même compte Telegram ayant changé de numéro ou nouveau compte Telegram distinct.

### C. Profil Utilisateur & Préférences (`user.controller.ts`)
- **GET `/api/users/me`** : retourne `preferences` (`preferredLocation`, `searchRadiusKm`, `pushEnabled`, `telegramNotifications`), `phoneE164`, `roles`, `activeMode`, et `shop` avec `verificationStatus`.
- **PUT `/api/users/me`** : met à jour `fullName`, `email` (nullable si vide), et effectue un `upsert` dans `user_preferences` pour `preferredLocation`, `searchRadiusKm`, `pushEnabled`, `telegramNotifications`.

### D. Horaires Boutique (`shop.controller.ts`)
- Typage JSON Prisma via `Prisma.InputJsonValue` pour `openingHours` dans `createShop` et `updateMyShop`.

---

## 3. Résultats des Tests

| Suite de tests | Statut | Détails |
|---|---|---|
| `npx tsc --noEmit` | **0 erreur** | Compilation TypeScript stricte validée |
| `tests/unit/lot2b.test.ts` | **10/10 ✅** | Mismatches contact, numéro déjà pris, transaction atomique, bot bloqué 403, openingHours JSON, flux e2e simulé |
| `tests/unit/telegram-auth.test.ts` | **17/17 ✅** | E.164, SHA-256, comparaison constante, TTL, 5 essais, anti-rejeu sessions |
| `tests/unit/validation.test.ts` | **19/19 ✅** | Validation Zod des schémas |
| **Total tests Lot 2A + 2B** | **27/27 ✅** | **100% verts** |

---

## 4. Commandes d'Exécution & Test

```bash
# Vérification TypeScript
npx tsc --noEmit --project services/ms1-accounts/tsconfig.json

# Exécution des tests unitaires Lot 2A et 2B
npx jest --config services/ms1-accounts/jest.config.json tests/unit/lot2b.test.ts tests/unit/telegram-auth.test.ts --no-coverage

# Lancement du service MS1 en local (sur neondb_lot1_test uniquement)
npm run dev:ms1
```
