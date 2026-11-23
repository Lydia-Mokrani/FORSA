# Rapport Lot 2A — Final

**Date** : 2026-11-23  
**Branche** : `feat/ms1-telegram-auth`  
**Dernier commit** : `9cef4b2` — *fix(ms1): null-guard for normalizeToE164 in auth controller and telegram service*  
**Base de test** : `neondb_lot1_test` uniquement — base prod `neondb` non touchée.

---

## ✅ État final

| Vérification | Résultat |
|---|---|
| `npx tsc --noEmit` | **0 erreur** |
| Tests unitaires (17) | **17/17 ✅** |
| Secrets dans le commit | **Aucun** |
| Push `feat/ms1-telegram-auth` | **OK** (`2faa76e` → `9cef4b2`) |

---

## Ce qui a été livré dans le Lot 2A

### Endpoints implémentés

| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/telegram/start` | Crée un `AuthChallenge` (nonce 128 bits haché, TTL 10 min). Réponse identique si le numéro existe ou non. |
| GET | `/auth/telegram/challenges/:id` | Retourne uniquement le statut (`PENDING`, `VERIFIED`, `EXPIRED`, `FAILED`) + indicateur `codeSent`. |
| POST | `/auth/telegram/verify` | Code 6 chiffres haché, TTL 5 min, 5 essais max, comparaison à temps constant, défi usage unique. Crée ou charge l'utilisateur, émet JWT RS256 (15 min) + refresh token (7 j). |
| POST | `/auth/refresh` | Rotation avec détection de rejeu — révoque toutes les sessions si un token révoqué est rejoué. |
| POST | `/auth/logout` | Révocation de la session courante. |
| GET | `/auth/sessions` | Liste les sessions actives de l'utilisateur. |
| DELETE | `/auth/sessions/:id` | Révocation d'une session spécifique. |
| POST | `/auth/switch-mode` | Refusé si l'utilisateur n'est pas `MERCHANT` ou si sa boutique n'est pas `APPROVED`. |

### Fichiers créés / réécrits

| Fichier | Rôle |
|---|---|
| `src/utils/phone.ts` | `normalizeToE164` → `string \| null`, `isValidE164Algerian`, schemas Zod |
| `src/middlewares/rate-limit.middleware.ts` | `startRateLimiter` (3 démarrages / 10 min par IP+numéro), `verifyRateLimiter` |
| `src/services/audit.service.ts` | `logAudit` — connexion, échec code, changement de mode |
| `src/services/challenge.service.ts` | `createAuthChallenge`, `getChallengeStatus`, `verifyAuthChallenge`, `hashString`, `constantTimeCompare` |
| `src/services/session.service.ts` | `createSession`, `rotateRefreshToken` (replay detection), `revokeRefreshToken`, `listUserSessions`, `revokeSessionById` |
| `src/controllers/auth.controller.ts` | Tous les endpoints Lot 2A, null-guard `normalizeToE164` |
| `src/routes/auth.routes.ts` | Câblage avec rate limiters + JWKS |
| `src/controllers/user.controller.ts` | Réécrit : `profileSelect` → `phoneE164`, `roles`, `verificationStatus` |
| `src/services/telegram.service.ts` | Null-guard `contactPhone` après normalisation |
| `packages/common/src/auth/index.ts` | `UserPayload` avec `roles: UserRole[]`, `mode` |
| `src/services/jwt.service.ts` | `TokenPayload` mis à jour, `generateRefreshToken()` retourne `{ token, hash }` |
| `tests/unit/telegram-auth.test.ts` | 17 tests unitaires |

### Fichiers supprimés

- `src/controllers/account.controller.ts`
- `src/services/email-token.service.ts`
- `src/services/sms.service.ts`

---

## Sécurité

- Nonce et code jamais en clair dans les logs
- Comparaison à temps constant (pas de timing attack)
- Défi à usage unique
- Réponse identique numéro existant / inexistant (pas de user enumeration)
- Rejeu de refresh token → révocation de **toutes** les sessions de l'utilisateur + `console.warn` sécurité
- Rate limit par IP et par numéro sur `/start` et `/verify`
- `audit_logs` pour connexion, échec code, changement de mode

---

## Prochaines étapes — Lot 2B (attente du "go")

1. `GET /users/me` — retourne `phoneE164`, `roles`, `preferences` (`preferredLocation`, `searchRadiusKm`)
2. `PUT /users/me` — mise à jour `preferredLocation` / `searchRadiusKm` via `prisma.userPreferences.upsert`
3. Bot Telegram long polling — test end-to-end avec vrai `TELEGRAM_BOT_TOKEN`
4. `POST /auth/telegram/verify` — flux complet de création utilisateur si inexistant
5. Nettoyage final `social.controller.ts` (align schéma : pas de `passwordHash`, vérif `phoneE164`)
6. Décision `openingHours` (JSON field) pour compatibilité MS2
7. Rapport `docs/rapports/lot-2b.md` + commit

---

## Commandes de test

```bash
# TypeScript
npx tsc --noEmit --project services/ms1-accounts/tsconfig.json

# Tests unitaires
npx jest --config services/ms1-accounts/jest.config.json tests/unit/telegram-auth.test.ts --no-coverage

# Lancer le service (base de test uniquement — DATABASE_URL depuis .env local)
npm run dev:ms1
```

> [!IMPORTANT]
> `DATABASE_URL` doit pointer sur `neondb_lot1_test`. Ne jamais utiliser la vraie base `neondb` tant que la migration n'est pas validée et approuvée par écrit.
