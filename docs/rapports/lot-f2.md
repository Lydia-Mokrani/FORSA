# Rapport d'Exécution — Lot F2 : Profil + Paramètres + Bascule de mode

**Date :** 25 Novembre 2026  
**Branche :** `feat/ms1-telegram-auth`  
**Statut :** TERMINE ET VALIDE  

---

## 1. Inventaire des Écrans & État d'audit Figma (Statut honnête)

> [!NOTE] Précision d'audit Figma
> Les écrans ci-dessous ont été construits à partir des tokens design R0/R0b, des spécifications textuelles et du code existant. Les frames Figma correspondantes n'ont pas été inspectées directement via l'API Figma (aucun Node ID non confirmé).

| Section / Écran | Statut d'audit Figma | Implémentation / Justification |
| :--- | :--- | :--- |
| **Bascule de Mode** | NOT READ (construit à partir des tokens, specs et du code existant, frame Figma non inspectée via API) | 4 états réels conformes (`/settings/mode`) |
| **Bascule - Dialogue de confirmation** | NOT READ (construit à partir des tokens, specs et du code existant, frame Figma non inspectée via API) | `ResponsiveDialog` avec actions Annuler / Confirmer |
| **Bascule - Mode restreint** | NOT READ (construit à partir des tokens, specs et du code existant, frame Figma non inspectée via API) | `Banner variant="warn"` + redirection `/merchant/status` |
| **Profil Client** | NOT READ (construit à partir des tokens, specs et du code existant, frame Figma non inspectée via API) | Restylé sur tokens R0/R0b, zéro `#B22222`, zéro `rounded-[20px]` |
| **Profil - Pastille commerçant vérifié** | NOT READ (construit à partir des tokens, specs et du code existant, frame Figma non inspectée via API) | `Chip` "Commerçant vérifié" conditionnel (MERCHANT & APPROVED) |
| **Profil - Changement de numéro** | NOT READ (construit à partir des tokens, specs et du code existant, frame Figma non inspectée via API) | Remplacé par `ResponsiveDialog`, correction défaut UX |
| **Paramètres Généraux & Sessions** | NOT READ (construit à partir des tokens, specs et du code existant, frame Figma non inspectée via API) | `/settings` avec Telegram lié, sessions réelles, déconnexion |
| **Zone Sensible du Compte** | NOT READ (construit à partir des tokens, specs et du code existant, frame Figma non inspectée via API) | Shell UI `/settings/account` avec boutons `[NOT WIRED]` |

---

## 2. Synthèse des Implémentations Réalisées

### A. Profil Client (`ProfilePage.tsx`)
1. **Composants R0/R0b :** Intégration de `ResponsiveDialog`, `Button`, `Banner`, `Chip` issus de `components/ui`.
2. **Éradication `#B22222` & `rounded-[20px]` :** Remplacement strict par les tokens `ui.error`, `ui-error-bg` et le rayon carte standard `rounded-ui-card` (24px).
3. **Pastille "Commerçant vérifié" :** Affichée uniquement si l'utilisateur possède le rôle `MERCHANT` **ET** que la boutique a le statut `APPROVED` dans le payload du profil.
4. **Bannière E-mail non vérifié :** Affichée uniquement lorsque `emailVerified === false` et qu'une adresse e-mail existe.
5. **Raccourcis de navigation :** Boutons d'accès direct vers `/settings` (Paramètres) et `/settings/mode` (Changer de mode) dans l'en-tête du profil.
6. **Correction du défaut UX Changement de téléphone :** Lors d'un code OTP erroné ou expiré, l'utilisateur est maintenu à l'étape 1 (étape de vérification du code) avec l'erreur affichée directement au-dessus des champs OTP, au lieu de perdre l'erreur.
7. **Correction du défaut Modifications non enregistrées :** Lors d'une tentative d'annulation ou de sortie du mode édition alors que des champs ont été modifiés (`hasUnsavedChanges === true`), un dialogue `ResponsiveDialog` invite à confirmer l'abandon des modifications.

### B. Paramètres du Compte (`SettingsPage.tsx` — `/settings`)
1. **Compte Telegram associé :** Affichage du numéro lié (`phoneE164`), badge d'état vérifié et lien direct vers le changement de mobile.
2. **Sessions actives :** Consommation de l'endpoint réel `GET /api/auth/sessions` (via `getActiveSessions()`). Affichage de l'appareil, de l'adresse IP et de la date de dernière activité. En absence d'autres sessions, affichage propre de la "Session actuelle sur cet appareil".
3. **Déconnexion sécurisée :** Dialogue de confirmation `ResponsiveDialog` appelant `logout()` d'`authService` et redirection propre vers `/login`.
4. **Cartes de redirection :** Raccourcis vers la bascule de mode (`/settings/mode`) et la gestion sensible du compte (`/settings/account`).

### C. Bascule de Mode (`ModeSwitchPage.tsx` — `/settings/mode`)
Implémentation des **4 états Figma** :
- **État 1 (Client vers Commerçant) :** Utilisateur actif en mode Client souhaitant passer en Commerçant (actif si boutique validée).
- **État 2 (Commerçant vers Client) :** Utilisateur actif en mode Commerçant basculant en Client pour naviguer dans les offres.
- **État 3 (Dialogue de confirmation) :** `ResponsiveDialog` validant l'action avant d'exécuter `switchUserMode(targetRole)`.
- **État 4 (Boutique non validée / restreinte) :** Affichage d'un `Banner variant="warn"` explicitant le statut (`PENDING`, `REJECTED` ou boutique inexistante) et désactivation du bouton avec lien vers `/merchant/status` ou `/register`.

### D. Zone Sensible du Compte (`AccountDangerPage.tsx` — `/settings/account`)
- Shell UI accessible comprenant la désactivation temporaire et la suppression définitive du compte.
- Boutons désactivés avec mention explicite `"Bientôt disponible" [NOT WIRED]`.

---

## 3. Audit des Liens de Navigation extrait du CODE

Conformément à la consigne, les composants de navigation du coéquipier MS2 n'ont pas été modifiés. L'audit ci-dessous est extrait directement du code source (`MerchantSidebar.tsx`, `Navbar.tsx`, `Footer.tsx`).

### A. Navigation Commerçant (`MerchantSidebar.tsx` — `variant="merchant"`)
Le tableau constant `MERCHANT_ITEMS` dans le code source déclare exactement 5 éléments :

| Libellé | Propriété `to` dans le code | Route Cible `App.tsx` | Statut réel dans le code |
| :--- | :--- | :--- | :--- |
| **Tableau de bord** | `'/merchant/dashboard'` | `/merchant/dashboard` | **Actif** (`NavLink`) |
| **Ajouter une offre** | `'/merchant/create-offer'` | `/merchant/create-offer` | **Actif** (`NavLink`) |
| **Avis** | *non définie* | *Aucune route* | **Sans lien** (`<div>` inerte sans `to` ni `href`, page MS2/MS3 non construite) |
| **Compte** | `'/merchant/shop'` | `/merchant/shop` | **Actif** (`NavLink`) |
| **Réservations** | *non définie* | *Aucune route* | **Sans lien** (`<div>` inerte sans `to` ni `href`, page MS2/MS3 non construite) |

> [!WARNING] Statut des liens commerçant
> Dans la sidebar commerçant, **"Avis"** et **"Réservations"** ne disposent d'aucun lien ni de route cible dans `App.tsx` (les pages métier associées n'ont pas encore été développées par les équipes MS2/MS3). Ils sont rendus sous forme d'éléments `<div>` inertes sans `to`.

---

### B. Navigation Client (`MerchantSidebar.tsx` — `variant="client"`)
Lorsque la sidebar est utilisée en variante client, les liens déclarés sont :

| Libellé | Route Cible (`to`) | Route déclarée dans `App.tsx` ? | Statut réel |
| :--- | :--- | :--- | :--- |
| **Accueil** | `/` | OUI (`HomePage`) | Actif (`NavLink`) |
| **Carte** | `/map` | OUI (`ShopsMapViewPage`) | Actif (`NavLink`) |
| **Mes réservations** | `/reservations` | OUI (route protégée) | Actif (`NavLink`) |
| **Notifications** | `/notifications` | OUI (route protégée) | Actif (`NavLink`) |
| **Profil** | `/profile` | OUI (`ProfilePage`) | Actif (`NavLink`) |

---

### C. Navigation `Navbar.tsx` (En-tête)
- Logo FORSA : `/`
- Liens Client : `/` (Accueil), `/explore` (Paniers), `/map` (Carte), `/profile` (Profil)
- Liens Commerçant : `/merchant/dashboard`, `/merchant/my-offers`, `/merchant/create-offer`

---

### D. Navigation `Footer.tsx` (Pied de page)
- Liens Découverte : `/explore`, `/map`, `/explore?category=bakeries`, `/explore?category=restaurants`
- Liens Commerçant : `/merchant/dashboard`, `/merchant/create-offer`, `/merchant/my-offers`

---

## 4. Questions & Remarques d'Architecture

> [!NOTE] Documentation du défaut UX sur le changement de téléphone (Backend)
> **Problème identifié :** Le backend actuel expose un endpoint unique `POST /api/users/me/phone/change/verify` qui exige simultanément le `challengeId`, le `code` à 6 chiffres et le `newPhone`.
> En conséquence, si l'utilisateur saisit un code invalide ou expiré, la vérification ne peut se faire qu'après avoir également saisi le nouveau numéro à l'étape 2. Dans l'ancien code, cela renvoyait l'utilisateur à l'étape 1 en réinitialisant les états, perdant le message d'erreur.
> **Correction frontend apportée :** En cas d'erreur sur le code (400 / invalid code), le frontend bascule explicitement l'affichage sur l'étape 1 (`setPhoneChangeStep(1)`) tout en conservant le message d'erreur `phoneChangeError` affiché sous les cases de code.
> **Recommandation Backend :** Il est recommandé que l'API expose une route séparée `POST /api/users/me/phone/change/verify-code` `{ challengeId, code }` validant le code de l'ancien Telegram avant de demander la saisie du nouveau numéro.

---

## 5. Preuves de Validation

1. **TypeScript (`tsc -b`) :** SUCCÈS (0 erreur).
2. **Vite Production Build (`vite build`) :** SUCCÈS (taille du bundle JS : 814.39 kB / CSS : 108.80 kB).
3. **Tests Unitaires Vitest :** 34 tests passés avec succès (5 fichiers de tests).
4. **Vérification `git grep` :**
   - 0 occurrence de `#b22222` ou `#B22222` dans `frontend/src/features/profile/ProfilePage.tsx`.
   - 0 occurrence de `rounded-[20px]` dans `frontend/src/features/profile/ProfilePage.tsx`.
