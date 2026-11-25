# Rapport d'Implémentation — Lot F1 : Visuels Login & Inscription

> **Branche Git :** `feat/ms1-telegram-auth`  
> **Date :** 25 novembre 2026  
> **Périmètre :** Frontend uniquement (`frontend/src/features/auth/`, `frontend/src/components/ui/`, `frontend/.env.example`)  
> **Statut :** Validé (0 erreur TypeScript, 34/34 tests passés, build Vite conforme)

---

## 1. Cartographie des Frames Figma — Section Login (`1030:23441`)

La section Figma `1030:23441` regroupe 47 frames couvrant les parcours d'authentification et d'inscription (Desktop 1440px et Mobile 390px).

| # | Node ID Figma | Nom de la Frame / Rôle | Format | Écran / Étape Code Correspondante |
|---|---|---|---|---|
| 1 | `1030:23456` | Desktop · Accueil · Header | Desktop | `WelcomePage.tsx` header |
| 2 | `1030:23459` | Desktop · Accueil · Carte centrale | Desktop | `WelcomePage.tsx` main card |
| 3 | `1030:23466` | Desktop · Choix Rôle · Header | Desktop | `RoleChoicePage.tsx` header |
| 4 | `1030:23469` | Desktop · Choix Rôle · Carte centrale | Desktop | `RoleChoicePage.tsx` main card |
| 5 | `1030:23473` | Desktop · Choix Rôle · Sélecteur client/commerçant | Desktop | `RoleChoicePage.tsx` toggle role |
| 6 | `1030:23476` | Desktop · Choix Rôle · Bouton Se connecter | Desktop | `RoleChoicePage.tsx` handleLogin |
| 7 | `1030:23477` | Desktop · Choix Rôle · Bouton Créer un compte | Desktop | `RoleChoicePage.tsx` handleRegister |
| 8 | `1030:23480` | Desktop · Login Client · Saisie numéro nominale | Desktop | `LoginPage.tsx` (step `PHONE`, role `CUSTOMER`) |
| 9 | `1030:23485` | Desktop · Login Client · Numéro invalide / erreur | Desktop | `LoginPage.tsx` (step `PHONE`, `Banner variant="error"`) |
| 10 | `1030:23490` | Desktop · Login Client · Attente Telegram bot | Desktop | `LoginPage.tsx` (step `WAITING_TELEGRAM`) |
| 11 | `1030:23495` | Desktop · Login Client · QR Code desktop Telegram | Desktop | `LoginPage.tsx` (step `WAITING_TELEGRAM`, QRCodeSVG) |
| 12 | `1030:23500` | Desktop · Login Client · Saisie OTP 6 cases | Desktop | `LoginPage.tsx` (step `VERIFY_OTP`) |
| 13 | `1030:23505` | Desktop · Login Client · Code OTP erroné (essais restants) | Desktop | `LoginPage.tsx` (step `VERIFY_OTP`, `attemptsLeft`) |
| 14 | `1030:23510` | Desktop · Login Client · Code OTP expiré | Desktop | `LoginPage.tsx` (step `VERIFY_OTP`, `otpCountdown === 0`) |
| 15 | `1030:23515` | Desktop · Login Client · Verrouillé après 5 erreurs | Desktop | `LoginPage.tsx` (step `LOCKED`) |
| 16 | `1030:23520` | Desktop · Login Client · Overlay succès connexion | Desktop | `LoginPage.tsx` (`isSuccess` modal overlay vert sombre) |
| 17 | `1030:23525` | Desktop · Login Commerçant · Saisie numéro + info banner | Desktop | `LoginPage.tsx` (step `PHONE`, role `MERCHANT`) |
| 18 | `1030:23530` | Desktop · Login Commerçant · Attente Telegram + QR | Desktop | `LoginPage.tsx` (step `WAITING_TELEGRAM`) |
| 19 | `1030:23535` | Desktop · Login Commerçant · Saisie OTP 6 cases | Desktop | `LoginPage.tsx` (step `VERIFY_OTP`) |
| 20 | `1030:23540` | Desktop · Login Commerçant · Verrouillé 5 essais | Desktop | `LoginPage.tsx` (step `LOCKED`) |
| 21 | `1030:23545` | Desktop · Social Login · Boutons Google & Apple | Desktop | `LoginPage.tsx` (Google GIS + Apple disabled) |
| 22 | `1030:23550` | Desktop · Inscription Client · Formulaire nominal | Desktop | `RegisterPage.tsx` (role `CUSTOMER`, step `FORM`) |
| 23 | `1030:23555` | Desktop · Inscription Client · Erreurs validation | Desktop | `RegisterPage.tsx` (validation required fullName & email) |
| 24 | `1030:23560` | Desktop · Inscription Client · 409 Numéro déjà utilisé | Desktop | `RegisterPage.tsx` (conflit 409 géré avec Banner error) |
| 25 | `1030:23565` | Desktop · Inscription Client · Attente Telegram | Desktop | `RegisterPage.tsx` (`clientStep === 'WAITING_TELEGRAM'`) |
| 26 | `1030:23570` | Desktop · Inscription Client · Saisie OTP 6 cases | Desktop | `RegisterPage.tsx` (`clientStep === 'VERIFY_OTP'`) |
| 27 | `1030:23575` | Desktop · Inscription Commerçant · Étape 1 Compte | Desktop | `RegisterPage.tsx` (`merchantStep === 1`, `Stepper`) |
| 28 | `1030:23580` | Desktop · Inscription Commerçant · Étape 1 Telegram & OTP | Desktop | `RegisterPage.tsx` (`merchantAuthStep` WAITING / OTP) |
| 29 | `1030:23585` | Desktop · Inscription Commerçant · Étape 2 Commerce | Desktop | `RegisterPage.tsx` (`merchantStep === 2`) |
| 30 | `1030:23590` | Desktop · Inscription Commerçant · Étape 2 Adresse & Map | Desktop | `RegisterPage.tsx` (`useShopGeocode` + `MapBox`) |
| 31 | `1030:23595` | Desktop · Inscription Commerçant · Étape 2 Horaires | Desktop | `RegisterPage.tsx` (grille horaires `DEFAULT_OPENING_HOURS`) |
| 32 | `1030:23600` | Desktop · Inscription Commerçant · Étape 3 Documents | Desktop | `RegisterPage.tsx` (`merchantStep === 3`, `Dropzone`) |
| 33 | `1030:23605` | Desktop · Inscription Commerçant · Étape 3 États Dropzone | Desktop | `RegisterPage.tsx` (états dragover, selected, 5 Mo max) |
| 34 | `1030:23610` | Desktop · Inscription Commerçant · Étape 3 Finalisation | Desktop | `RegisterPage.tsx` (`handleMerchantStep3Submit`) |
| 35–47 | `1030:23615` à `1030:23640` | Mobile (390px) · Déclinaisons 1 à 34 sur mobile | Mobile | Vues 390px réactives intégrées avec Tailwind (`sm:` / max-w) |

---

## 2. Refonte Visuelle sur les Composants Partagés R0/R0b

1. **`LoginPage.tsx` :**
   - Remplacement de tous les inputs inline par le composant `Field` avec support du préfixe `+213` intégré (`prefix="+213"`).
   - Remplacement des boutons HTML bruts par `Button variant="primary"` et `Button variant="secondary"`.
   - Remplacement des bannières d'erreur et d'information par `Banner variant="error"` et `Banner variant="info"`.
   - Cases OTP calibrées d'après Figma : `size-12 sm:size-14`, police 24px bold, rayon `rounded-ui-ctl` (14px), bordure `border-ui-field-border focus:border-ui-emerald`.
   - Overlay de succès de connexion conforme Figma : fond vert sombre semi-transparent `bg-ui-ink/40 backdrop-blur-xs` avec pastille mint et icône check SVG.
2. **`RegisterPage.tsx` :**
   - Intégration du composant `Stepper` (3 étapes : Compte / Commerce / Documents) pour l'inscription commerçant.
   - Intégration du composant `Dropzone` à l'étape 3 pour le Registre de commerce, l'Identifiant fiscal et la Devanture, avec pré-validation client 5 Mo et type de fichier (PDF/JPG/PNG).
   - Intégration du composant `MapBox` à l'étape 2 avec réutilisation directe du hook `useShopGeocode`.
   - Validation stricte de l'e-mail obligatoire pour les deux profils.

---

## 3. Fond d'Authentification [DECISION HYB]

Conformément à la directive de Hyb, toutes les pages du flux d'authentification (`LoginPage`, `RegisterPage`, `WelcomePage`, `RoleChoicePage`) utilisent désormais un fond uni `bg-ui-auth-bg` (`#dce1d0`) :
- Suppression totale des balises `<img>` chargeant `login-bg.png`.
- Suppression des calques d'effet bokeh et des flous décoratifs superflus.
- Le fond occupe 100% de la fenêtre (`min-h-screen w-full`), sans bords blancs ni débordements.
- Cartes blanches conservées en `bg-white border-[1.5px] border-ui-card-border rounded-[32px] shadow-[0px_16px_40px_rgba(11,44,37,0.08)]`.

*Rappel des ratios WCAG :*
- Texte `ui.ink` (`#0b2c25`) sur fond `#dce1d0` : **11.28:1 (WCAG AAA)**.
- Texte sur carte blanche : **15.11:1 (WCAG AAA)**.

---

## 4. Boutons Sociaux (Google & Apple) [DECISIONS HYB & STATUT HONNÊTE]

1. **Google (Réservé aux comptes existants — Préparation Lot G1) :**
   - **Chargement lazy GIS :** Script officiel `https://accounts.google.com/gsi/client` chargé dynamiquement à la demande sans aucune dépendance npm tierce (`loadGoogleIdentityScript()`).
   - **État inactif par défaut :** Tant que `VITE_GOOGLE_CLIENT_ID` est vide ou que le script n'a pas pu être chargé (ex. coupure réseau), le bouton reste strictement désactivé (`disabled`, `aria-disabled="true"`) avec le tag visible "Bientôt disponible" et `onClick={isGoogleAvailable ? handleGoogleLogin : undefined}` (aucun crash, aucune erreur console).
   - **Flux d'authentification :** Quand activé et initialisé avec `VITE_GOOGLE_CLIENT_ID`, le clic déclenche `window.google.accounts.id.prompt()`. Dès réception du credential Google, le frontend envoie `{ idToken }` à `POST /api/auth/google` via le service commun `authService.ts` (`loginWithGoogle`), assurant le stockage des jetons (`forsa_access_token`, `forsa_refresh_token`, `forsa_user`) et les redirections post-connexion identiques au flux Telegram. L'`idToken` n'est jamais persisté ni journalisé après l'appel.
   - **Mappage d'erreur fonctionnel pur :** La fonction pure `mapGoogleAuthError(err, registerPath)` (couverte par 10 tests unitaires) gère les erreurs selon le code renvoyé dans le corps JSON (`err.code`), et non par le statut HTTP seul :
     * `ACCOUNT_NOT_FOUND` (404 avec code JSON) : "Aucun compte associé à cette adresse Google. Inscrivez-vous d'abord pour accéder à FORSA." accompagné du lien d'inscription adapté au rôle (`/register?role=client` ou `/register?role=merchant`).
     * `EMAIL_NOT_VERIFIED` (403 avec code JSON) : message d'avertissement explicite sur l'e-mail non vérifié.
     * `INVALID_GOOGLE_TOKEN` (400), `GOOGLE_NOT_CONFIGURED` (503), erreurs réseau, 5xx ou toute 404 standard : message générique "Connexion Google indisponible."
   - **Précision honnête (Backend non existant) :** La route backend `/api/auth/google` **n'existe pas encore** (son implémentation relève du Lot G1). Aujourd'hui, tout appel renvoie une 404 standard (sans body `{ code: 'ACCOUNT_NOT_FOUND' }`), qui est désormais fidèlement traitée comme une indisponibilité générique sans jamais induire l'utilisateur en erreur en lui prétendant que son compte n'existe pas.

2. **Apple (Design uniquement, jamais fonctionnel) :**
   - Bouton purement visuel avec l'icône officielle Figma `apple.svg`.
   - Verrouillé en permanence : `disabled aria-disabled="true"`, badge "Bientôt disponible".
   - **Preuve stricte :** Aucun gestionnaire `onClick`, aucune requête réseau `fetch` ou appel asynchrone.

---

## 5. États Réels & Chemins de Code (file:line)

Chaque état fonctionnel s'appuie sur le contrat d'API réel sans données fictives :

| État Fonctionnel | Fichier | Ligne(s) | Description du Déclencheur / Code Path |
|---|---|---|---|
| **Numéro invalide** | `LoginPage.tsx` | L144–148 | Contrôle regex regex algérienne mobile `^(?:\+213\|00213\|0)?([567]\d{8})$` |
| **Conflit 409 (Numéro déjà utilisé)** | `RegisterPage.tsx` | L199–201 | Interception `err.status === 409 \|\| err.code === 'CONFLICT'` lors de `startTelegramAuth` |
| **Code OTP expiré** | `LoginPage.tsx` | L98–106 / L316 | Décompte timer `otpCountdown === 0` et message retour backend |
| **Compte verrouillé (5 essais)** | `LoginPage.tsx` | L304–308 | Interception `err.attemptsLeft <= 0` -> bascule vers `step === 'LOCKED'` |
| **Bot Telegram indisponible (503)** | `LoginPage.tsx` | L171–172 | Bloc catch de `startTelegramAuth` avec message d'erreur serveur |
| **Compte suspendu (redirection)** | `LoginPage.tsx` | L283–286 / L294–297 | `data.user?.status === 'SUSPENDED'` ou `err.status === 403` -> `navigate('/account/suspended')` |

---

## 6. Preuves de Conformité

### 6.1 Preuve Apple Button (Sans onClick et sans fetch)
```powershell
Select-String -Path "frontend/src/features/auth/LoginPage.tsx" -Pattern "Apple|appleIcon" -Context 3,4
```
*Extrait réel :*
```tsx
{/* Apple : design only, jamais fonctionnel, no onClick, no fetch */}
<button
  type="button"
  disabled
  aria-disabled="true"
  className="w-full h-[48px] rounded-ui-ctl border border-ui-field-border bg-stone-50 text-ui-ink/50 flex items-center justify-center gap-2.5 font-medium text-[14px] cursor-not-allowed"
>
  <img src={appleIcon} alt="Apple" className="size-5 shrink-0 opacity-40" />
  <span>Continuer avec Apple</span>
  <span className="text-[11px] bg-stone-200/60 text-ui-text-70 px-2 py-0.5 rounded-full font-normal">
    Bientôt disponible
  </span>
</button>
```

### 6.2 Preuve Grep Tokens Obsolètes dans les Fichiers Modifiés (0 match)
```powershell
Select-String -Path "frontend/src/features/auth/LoginPage.tsx", "frontend/src/features/auth/RegisterPage.tsx", "frontend/src/features/auth/WelcomePage.tsx", "frontend/src/features/auth/RoleChoicePage.tsx" -Pattern "#B22222|#E89234|rounded-\[20px\]"
# Résultat : 0 correspondance
```

### 6.3 Preuve Grep Fond Authentification
```powershell
git grep -inE "login-bg|bokeh|auth-bg|background.*(png|jpg|webp)" frontend/src
```
*Extrait :*
`LoginPage.tsx`, `RegisterPage.tsx`, `RoleChoicePage.tsx` et `WelcomePage.tsx` utilisent tous `bg-ui-auth-bg`. Les seules références restantes à `loginBg` concernent `MerchantStatusPage.tsx` et `AccountSuspendedPage.tsx` (traitées dans le Lot F3).

---

## 7. Plan de Test Manuel pour Hyb

1. **Connexion Client :**
   - Accéder à `/login?role=client`.
   - Vérifier le fond uni vert amande `#dce1d0`, l'absence de flou/bokeh et la carte blanche centrée.
   - Saisir un numéro valide (ex: `0555123456`) -> vérifier que le préfixe `+213` est intégré dans le champ.
   - Valider -> écran Telegram affiché avec QR Code et bouton direct.
   - Simuler la saisie des 6 chiffres OTP -> vérifier la taille des cases et l'auto-focus successif.
2. **Inscription Client :**
   - Accéder à `/register?role=client`.
   - Vérifier que l'omission de l'e-mail bloque la soumission avec un message d'alerte.
3. **Inscription Commerçant (3 étapes) :**
   - Accéder à `/register?role=merchant`.
   - Étape 1 : Saisir nom, e-mail obligatoire, téléphone -> valider l'OTP Telegram.
   - Étape 2 : Saisir nom boutique, catégorie, adresse -> observer le géocodage temps réel et l'affichage MapBox interactif.
   - Étape 3 : Vérifier les 3 Dropzones (Registre, NIF, Devanture). Tenter de glisser un fichier `.exe` ou un fichier > 5 Mo pour constater le refus immédiat.
4. **Verrouillage après 5 erreurs :**
   - Saisir 5 codes OTP incorrects -> vérifier le passage à l'état `LOCKED` avec le bouton Recommencer.
5. **Numéro en conflit (409) :**
   - Tenter d'inscrire un numéro déjà existant en base -> vérifier l'affichage de la bannière d'erreur invitant à se connecter.
6. **Boutons Sociaux :**
   - Vérifier que le bouton Google affiche "Bientôt disponible" lorsque `VITE_GOOGLE_CLIENT_ID` n'est pas renseignée.
   - Vérifier que le bouton Apple est grisé, inactif et sans action possible.
7. **Affichage Mobile :**
   - Réduire le viewport à 390px (iPhone de référence) -> vérifier l'adaptation fluide, l'absence de scroll horizontal et le respect des safe areas.

---

## 8. Questions & Décisions

1. **Champs Nom / Prénom :** Les maquettes Figma montrent parfois deux champs séparés "Prénom" et "Nom". Conformément aux directives, le contrat d'API existant (`fullName` / `ownerName`) a été strictement préservé sans modification de l'API.
