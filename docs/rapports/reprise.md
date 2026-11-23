# Document de Reprise — LOT 1 Terminé & Passage au LOT 2

## 1. État de la Branche
* **Branche active** : `feat/ms1-telegram-auth`
* **Dernier commit Lot 0** : `5cce157` (*chore(ms1): LOT 0 - dual-mode event bus, localhost env, spec in docs*)
* **Commit Lot 1 en cours** : *WIP(ms1): lot 1 - schema Prisma Telegram + migration (testée sur base de test seulement, TS ne compile pas encore)*
* **Dépôt distant** : `origin/feat/ms1-telegram-auth`

---

## 2. Base de Données et Environnement de Test
* **Base de test active** : `neondb_lot1_test` (sur le cluster Neon).
* **IMPORTANT** : La vraie base principale (`neondb`) n'a **PAS** reçu la migration du Lot 1. Le code de cette branche ne fonctionne donc pas sur la vraie base tant que la migration n'y est pas formellement appliquée avec l'accord de l'équipe.
* **Fichiers `.env`** :
  * La variable `DATABASE_URL` et `DATABASE_URL_UNPOOLED` doivent impérativement être chargées depuis le fichier local `.env` (qui pointe vers `neondb_lot1_test`).
  * Les secrets ne sont jamais commités dans le dépôt.
* **Commandes de migration Prisma (unpooled)** :
  * Pour exécuter réellement les scripts SQL de migration en attente :
    ```powershell
    npx prisma migrate deploy --schema="services/ms1-accounts/prisma/schema.prisma"
    ```
  * Note : `prisma migrate resolve --applied <migration>` ne lance pas le SQL, il sert uniquement à marquer une migration déjà exécutée manuellement comme appliquée dans la table `_prisma_migrations`.
* **Commande pour démarrer le microservice MS1 en local (sur la base de test)** :
  ```powershell
  npm run dev:ms1
  ```

---

## 3. Liste des Erreurs TypeScript Attendues
Le code du serveur ne compile pas encore à ce stade (`npx tsc --noEmit` en échec) en raison de l'alignement du schéma Prisma (Lot 1) sur des contrôleurs existants qui utilisent encore l'ancien système email/mot de passe/OTP SMS :
1. `passwordHash`, `emailVerified`, `phoneVerified` : Supprimés du modèle `User` (utilisés dans `auth.controller.ts`, `account.controller.ts`, `user.controller.ts`).
2. `phoneOtp`, `emailToken` : Tables supprimées au profit de `auth_challenges` (utilisés dans `user.controller.ts`, `email-token.service.ts`).
3. `shop.status` : Renommé en `shop.verificationStatus` (utilisé dans `shop.controller.ts`, `rabbitmq.service.ts`).
4. `user.role` : Remplacé par `user.roles` (tableau) et `user.activeMode` (utilisé dans `auth.controller.ts`, `user.controller.ts`).
5. `user.phone` : Remplacé par `user.phoneE164` (utilisé dans `auth.controller.ts`, `telegram.service.ts`).

Ces erreurs seront résolues naturellement lors de la réécriture des contrôleurs au Lot 2 et du nettoyage legacy au Lot 4.

---

## 4. Prochaines Étapes : LOT 2 — Backend Telegram (Spec §3, §6, §8)
Au démarrage de la prochaine session (Lot 2) :
1. **Nouveaux endpoints à implémenter dans `auth.routes.ts` / `auth.controller.ts`** :
   * `POST /auth/telegram/start` : création d'un `AuthChallenge`, génération du deep link Telegram `https://t.me/forsa_auth_bot?start=<nonce>` et du QR code.
   * `GET /auth/telegram/challenges/:id` : interrogation du statut du défi (long polling / status check).
   * `POST /auth/telegram/verify` : validation du code à 6 chiffres, génération de la paire de tokens JWT RS256 (`access_token` 15 min, `refresh_token` 7 jours avec rotation).
   * `POST /auth/switch-mode` : changement de mode (client <-> commerçant) avec vérification `shops.verificationStatus = APPROVED`. Alias temporaire `/users/me/switch-mode`.
2. **Nouveaux endpoints dans `user.routes.ts` / `user.controller.ts`** :
   * `POST /users/me/phone/change/start` : step-up challenge sur l'ancien numéro.
   * `POST /users/me/phone/change/verify` : validation du nouveau numéro via Telegram.
3. **Mise à niveau de `telegram.service.ts`** :
   * Gestion du webhook / long polling sur `/start <nonce>` et envoi du clavier `request_contact`.
   * Vérification `contact.user_id === from.id` et concordance du numéro normalisé.
   * Publication de `telegram.contact.received` et consommation de `telegram.send.otp` via `eventBus`.
4. **Validation par tests** :
   * Tests curl de bout en bout du flux défi -> bot Telegram -> code OTP -> obtention des tokens JWT RS256.
