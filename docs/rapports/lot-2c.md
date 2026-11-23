# Rapport Lot 2C / Lots 3 & 4 — Frontend Authentification Telegram & Suppression du Legacy

**Date** : 2026-11-23  
**Branche** : `feat/ms1-telegram-auth`  
**Base de données** : `neondb_lot1_test` uniquement — base de production `neondb` strictement intacte.

---

## 1. Synthèse des Réalisations

Le Lot 2C (couvrant les Lots 3 et 4) remplace intégralement l'ancien système d'authentification (e-mail, mot de passe, SMS) par le nouveau flux unifié d'authentification sans mot de passe via Telegram OTP (Numéro E.164 algérien → Bot Telegram → Code OTP à 6 chiffres).

### A. Nouveau Service d'Authentification (`frontend/src/features/auth/services/authService.ts`)
- **Gestion sécurisée des tokens** :
  - Access Token JWT (RS256) conservé **strictement en mémoire vive** (`let inMemoryAccessToken`), jamais dans `localStorage` ni `sessionStorage` (protection XSS).
  - Refresh Token stocké dans `localStorage` sous la clé `forsa_refresh_token` (durée de validité 7 jours).
  - Profil utilisateur mis en cache sous `forsa_user`.
- **Wrapper `authFetch` avec auto-refresh transparent** :
  - Intercepte les réponses `401 Unauthorized`.
  - Tente automatiquement une rotation de token via `/api/auth/refresh`.
  - Rejoue la requête initiale avec le nouvel access token en cas de succès.
  - Déconnecte proprement et redirige vers `/login` en cas d'échec ou de rejeu détecté.
- **Méthodes Telegram complètes** :
  - `startTelegramAuth(phone)` : normalisation E.164, appel `POST /api/auth/telegram/start`, retour de `{ challengeId, deepLink, expiresAt }`.
  - `getTelegramChallengeStatus(challengeId)` : interrogation régulière `GET /api/auth/telegram/challenges/:id`.
  - `verifyTelegramAuth(challengeId, code, role?)` : validation OTP `POST /api/auth/telegram/verify`, stockage tokens, redirection appropriée.
  - `startPhoneChange()` & `verifyPhoneChange(challengeId, code, newPhone)` : endpoints de changement de numéro en 2 étapes.
  - `getPostLoginRedirect(user, preferredRole)` : calcul intelligent de redirection selon rôles (`CUSTOMER` → `/`, `MERCHANT` avec statut `PENDING`/`REJECTED`/`SUSPENDED` → `/merchant/status`, `APPROVED` → `/dashboard/merchant`, compte suspendu → `/account/suspended`).

---

### B. Pages et Composants Frontend Refondus

| Page / Composant | Fichier | Rôle & Fonctionnalités |
| :--- | :--- | :--- |
| **Connexion Telegram** | `frontend/src/features/auth/LoginPage.tsx` | - Étape 1 : Saisie numéro algérien (+213, formats `05`, `06`, `07`).<br>- Étape 2 : Deep link Telegram + **QR Code dynamique** (via `qrcode.react` `QRCodeSVG`) + polling actif (2s).<br>- Étape 3 : Saisie du code à 6 cases avec navigation clavier automatique, compte à rebours 5 min, cooldown renvoi 60s.<br>- Étape 4 : Écran de blocage (5 tentatives épuisées). |
| **Inscription Client & Commerçant** | `frontend/src/features/auth/RegisterPage.tsx` | - **Client** : 3 sous-étapes (Formulaire nom/prénom → Connexion Telegram QR/Lien → Code OTP).<br>- **Commerçant** : Processus complet en 3 étapes :<br>&nbsp;&nbsp;1. *Compte* : Validation Telegram du gérant avec rôle `MERCHANT`.<br>&nbsp;&nbsp;2. *Commerce* : Nom, catégorie, adresse, horaires d'ouverture structurés (format JSON `openingHours`).<br>&nbsp;&nbsp;3. *Documents* : Upload des pièces justificatives (RC, NIF, pièce d'identité) via `authFetch`. |
| **Statut Boutique Commerçant** | `frontend/src/features/auth/MerchantStatusPage.tsx` | Gère les 4 statuts de la boutique du commerçant :<br>- `PENDING` : Dossier en cours de revue, rappels des pièces fournies, bouton actualiser le statut.<br>- `APPROVED` : Validation confirmée, bouton d'accès au tableau de bord commerçant.<br>- `REJECTED` : Affichage du motif de refus et formulaire de correction.<br>- `SUSPENDED` : Notification de suspension temporaire et lien vers le support. |
| **Compte Utilisateur Suspendu** | `frontend/src/features/auth/AccountSuspendedPage.tsx` | Écran dédié pour tout utilisateur dont `status === 'SUSPENDED'`, empêchant l'accès à la plateforme avec contact support. |
| **Changement de Numéro (Profil)** | `frontend/src/features/profile/ProfilePage.tsx` | Remplacement de l'ancien modal par le flux Telegram en 2 étapes :<br>- Étape 1 : Saisie de l'OTP reçu sur le compte Telegram actuel.<br>- Étape 2 : Saisie du nouveau numéro de téléphone.<br>- Étape 3 : Lien Telegram + QR Code vers le bot pour valider le nouveau numéro avec le nouveau compte Telegram. |

---

### C. Éléments Nouveau Design marqués [NOUVEAU]

Les écrans suivants ne disposaient pas de maquette Figma dédiée et ont été réalisés dans le strict respect de la charte graphique FORSA (glassmorphism, teintes `#0B2C25` et `#17664E`, typographie Poppins, rayons de courbure 24px) :
- **[NOUVEAU] Écran d'attente Telegram & QR Code** : Présentation du bouton « Ouvrir Telegram », du QR Code SVG centré pour connexion desktop-to-mobile, du minuteur d'expiration (10 min) et de l'indicateur de statut temps réel (« En attente du partage de contact... »).
- **[NOUVEAU] Écran de saisie du code OTP 6 chiffres** : 6 cases individuelles avec autofocus automatique, gestion des touches retour/flèches, collage direct de codes à 6 chiffres, et bouton de renvoi avec cooldown de 60 secondes.
- **[NOUVEAU] Écran de défi verrouillé (5 échecs)** : Alerte visuelle claire avec indication de sécurité et bouton pour réinitialiser le processus.
- **[NOUVEAU] Page Statut Commerçant multi-états** : Interface d'attente dynamique permettant au commerçant de suivre l'avancement de la validation de sa boutique.
- **[NOUVEAU] Modale 2 étapes de changement de numéro dans le profil** : Flux guidé garantissant qu'un numéro ne peut être modifié sans validation sur l'ancien appareil puis sur le nouveau.

---

### D. Suppression Complète du Legacy

1. **Fichiers supprimés définitivement** :
   - `frontend/src/features/auth/ForgotPasswordPage.tsx` ❌
   - `frontend/src/features/auth/EmailVerificationPage.tsx` ❌
   - `frontend/src/features/auth/VerifyPhonePage.tsx` ❌
2. **Routage nettoyé (`frontend/src/App.tsx`)** :
   - Suppression des routes `/forgot-password`, `/verify-email`, `/verify-phone`.
   - Ajout des routes `/merchant/status` et `/account/suspended`.
3. **Mise à jour de `services/ms1-accounts`** :
   - Ajout du paramètre optionnel `role: 'CUSTOMER' | 'MERCHANT'` dans `verifySchema` (`auth.controller.ts`) pour attribuer automatiquement le rôle commerçant lors de la première inscription.

---

## 2. Vérifications & Tests

### A. Compilation Frontend
Exécution de la commande :
```powershell
npm run build --prefix frontend
```
- **Résultat** : **Exit code 0** (succès complet).
- **TypeScript** : 0 erreur (`tsc -b` validé).
- **Vite** : 2 228 modules transformés, bundle de production généré dans `frontend/dist/`.

### B. Compilation & Tests Backend
Exécution des commandes :
```powershell
npx tsc --noEmit --project services/ms1-accounts/tsconfig.json
npx jest --config services/ms1-accounts/jest.config.json tests/unit/lot2b.test.ts tests/unit/telegram-auth.test.ts --no-coverage
```
- **TypeScript Backend** : 0 erreur.
- **Tests Unitaires** : **29 tests passés sur 29 (100% de succès)** :
  - Normalisation E.164, SHA-256 temps constant, expiration TTL défi.
  - Verrouillage 5 tentatives, usage unique du défi.
  - Détection du rejeu de refresh token et révocation en cascade.
  - Sécurité des contacts Telegram (vérification ID + numéro).
  - Transaction atomique de changement de numéro (conflits numéros et ID Telegram).
  - Détection de blocage du bot (`telegramBlocked = true`).
  - Validation et persistance JSON des horaires d'ouverture (`openingHours`).
  - Test de bout en bout complet.

---

## 3. Précautions de Sécurité & Environnement
- **Base de données de production (`neondb`)** : Aucune écriture, aucune migration appliquée. Seule la base `neondb_lot1_test` a été utilisée.
- **Aucun secret** : Aucun mot de passe, token Telegram ou clé privée RSA n'est présent dans le code committé ou les logs.
- **Variables d'environnement** : `TELEGRAM_BOT_USERNAME` documenté dans `.env.example`.
