# Rapport Lot 2A — Cœur de l'authentification Telegram

**Branche** : `feat/ms1-telegram-auth`
**Commit** : `4bc4d68`
**Base de test** : `neondb_lot1_test` (la vraie base `neondb` n'a PAS été touchée)
**Date** : 2026-11-23

---

## ✅ FAIT

### Endpoints implémentés (spec §3, §6)

| Endpoint | Statut | Notes |
|---|---|---|
| `POST /auth/telegram/start` | ✅ | Nonce 128 bits SHA-256, TTL 10 min, deepLink `t.me/forsa_auth_bot?start=<nonce>`, réponse identique existant/nouveau |
| `GET /auth/telegram/challenges/:id` | ✅ | Statut PENDING/VERIFIED/EXPIRED/FAILED + indicateur `codeSent` |
| `POST /auth/telegram/verify` | ✅ | Code 6 chiffres haché, TTL 5 min, 5 essais max, comparaison `timingSafeEqual`, usage unique |
| `POST /auth/refresh` | ✅ | Rotation + révocation de TOUTES les sessions si token rejoué |
| `POST /auth/logout` | ✅ | Révocation du refresh token |
| `GET /auth/sessions` | ✅ | Liste des sessions actives |
| `DELETE /auth/sessions/:id` | ✅ | Révocation d'une session par ID |
| `POST /auth/switch-mode` | ✅ | Refuse si pas rôle MERCHANT ou boutique non APPROVED |
| `POST /users/me/switch-mode` | ✅ | Alias vers `AuthController.switchMode` |

### Nouveaux fichiers créés

| Fichier | Rôle |
|---|---|
| `src/utils/phone.ts` | `normalizeToE164`, `isValidE164Algerian`, `phoneE164Schema` (retourne `null` si invalide) |
| `src/middlewares/rate-limit.middleware.ts` | `startRateLimiter` (3/10min par phone+IP), `verifyRateLimiter` (10/5min par IP) |
| `src/services/audit.service.ts` | `logAudit` pour `audit_logs` — ne bloque pas la requête en cas d'erreur |
| `src/services/challenge.service.ts` | Création/vérification des défis Telegram, `hashString`, `constantTimeCompare` |
| `src/services/session.service.ts` | `createSession`, `rotateRefreshToken` (replay detection), `revokeRefreshToken`, `listUserSessions`, `revokeSessionById` |
| `src/controllers/auth.controller.ts` | Tous les endpoints ci-dessus |
| `src/routes/auth.routes.ts` | Routage + rate limiters + JWKS/public-key |
| `tests/unit/telegram-auth.test.ts` | 17 tests unitaires |

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `packages/common/src/auth/index.ts` | `UserPayload` avec `roles: UserRole[]` et `mode`, `requireRole` vérifie `roles[]` |
| `src/services/jwt.service.ts` | `TokenPayload` (sub, roles, mode, shopStatus), `generateRefreshToken()` retourne `{ token, hash }` |
| `src/services/telegram.service.ts` | Gestion `/start <nonce>`, vérification contact Telegram, émission OTP 6 chiffres |
| `src/controllers/user.controller.ts` | **Réécrit** : suppression des méthodes legacy, `profileSelect` avec `phoneE164`/`roles`/`verificationStatus` |
| `src/controllers/shop.controller.ts` | `status` → `verificationStatus`, `role` → `roles[]` |
| `src/controllers/social.controller.ts` | `role` → `roles`/`activeMode`, `passwordHash` → `phoneE164` |
| `src/services/rabbitmq.service.ts` | `status` → `verificationStatus` sur tous les handlers |
| `src/routes/user.routes.ts` | Suppression routes legacy (password, verify-phone) |
| `docs/rapports/reprise.md` | Correction : `prisma migrate deploy` ≠ `prisma migrate resolve --applied` |

### Fichiers supprimés (legacy)

- `src/controllers/account.controller.ts` — register/login email, forgot/reset password
- `src/services/email-token.service.ts` — `prisma.emailToken` supprimé du schéma
- `src/services/sms.service.ts` — Twilio supprimé, SMS non utilisé

---

## ✅ TypeScript

```
npx tsc --noEmit --project services/ms1-accounts/tsconfig.json
# → 0 erreur
```

---

## ✅ Tests unitaires

```
npx jest tests/unit/telegram-auth.test.ts
# → Tests: 17 passed, 17 total
```

Couverture :
1. Normalisation E.164 (formats 05/06/07, nettoyage, international, rejet invalides)
2. Hachage SHA-256 et `timingSafeEqual`
3. Expiration du défi (TTL)
4. Limite d'essais (max 5, verrouillage FAILED)
5. Usage unique du défi (VERIFIED, rejet si déjà consommé)
6. Rotation refresh token (rotation propre + détection rejeu → révocation globale)

---

## ❌ NON FAIT / HYPOTHÈSES

| Point | Statut |
|---|---|
| Bot Telegram réel (long polling) | Non testé sur bot live — les mocks couvrent la logique, mais le bot `forsa_auth_bot` doit exister avec le token `TELEGRAM_BOT_TOKEN` dans `.env` |
| `social.controller.ts` — devDb fallback | Simplifié : le code Google/Apple reste présent mais non exposé dans l'UI (décision équipe) |
| `openingHours` sur Shop | Champ JSON retiré du `createShopSchema` car Prisma ne l'accepte pas directement sans cast — à confirmer si MS2 en a besoin |

---

## 🔒 Sécurité

- Aucun mot de passe, aucune chaîne de connexion dans le commit (`git log --all -S"neon"` → 0 résultat)
- Nonces et codes jamais loggés en production (`process.env.NODE_ENV !== 'production'` requis pour les logs de debug)
- `timingSafeEqual` pour toutes les comparaisons de hashes

---

## 🧪 Commandes de test

```bash
# Compiler sans erreur
npx tsc --noEmit --project services/ms1-accounts/tsconfig.json

# Tests unitaires Lot 2A
npx jest --config services/ms1-accounts/jest.config.json tests/unit/telegram-auth.test.ts

# Lancer le service (base de test uniquement)
# DATABASE_URL=<valeur depuis .env local>
npm run dev --workspace=services/ms1-accounts
```

---

## 🔜 Prochaines étapes — Lot 2B

1. `GET /users/me` — vérifier que le profil retourne bien `phoneE164`, `roles`, `preferences`
2. `PUT /users/me` — tester la mise à jour `preferredLocation` / `searchRadiusKm`
3. Bot Telegram long polling — test end-to-end avec un vrai numéro
4. `POST /auth/telegram/verify` — créer l'utilisateur si inexistant (chemin `register`)
5. Nettoyage de `social.controller.ts` — aligner complètement sur le nouveau schéma
