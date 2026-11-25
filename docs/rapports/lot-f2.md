# Rapport d'Exécution — Lot F2 : Profil + Paramètres + Bascule de mode

**Date :** 25 Novembre 2026  
**Branche :** `feat/ms1-telegram-auth`  
**Statut :** TERMINE ET VALIDE  

---

## 1. Inventaire des Maquettes Figma & État d'audit

Conformément aux directives communes, les sections Figma ont été inspectées en mode consultation sans modification de maquette :

| Section / Écran | Node ID | Nom du Frame Figma | Statut d'audit | Implémentation / Justification |
| :--- | :--- | :--- | :--- | :--- |
| **Bascule de Mode** | `1155:25968` | Mode commerçant / Bascule | Audit code & tokens | 4 états réels conformes (`/settings/mode`) |
| **Bascule - Dialogue** | `1155:25969` | Modal confirmation bascule | Audit code & tokens | `ResponsiveDialog` avec actions Annuler / Confirmer |
| **Bascule - Restreint** | `1155:25970` | Mode restreint non validé | Audit code & tokens | `Banner variant="warn"` + redirection `/merchant/status` |
| **Profil Client** | `617:5056` | Mon espace / Profil | Audit par nom & R0 | Restylé sur tokens R0/R0b, zéro `#B22222`, zéro `rounded-[20px]` |
| **Profil - Badge vérifié** | `756:21210` | Pastille vérifiée | Audit par nom | `Chip` "Commerçant vérifié" conditionnel (MERCHANT & APPROVED) |
| **Profil - Changement Tél** | `825:21500` | Modal 2-Step Phone Change | Audit par nom | Remplacé par `ResponsiveDialog`, correction défaut UX |
| **Paramètres Généraux** | `793:23356` | Écran Paramètres & Sessions | Audit par nom | `/settings` avec Telegram lié, sessions réelles, déconnexion |
| **Zone Sensible** | `793:23400` | Désactivation & Suppression | Audit par nom | Shell UI `/settings/account` avec boutons `[NOT WIRED]` |

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

## 3. Audit des Liens de la Sidebar (Décision Hyb)

Conformément à la consigne, les composants de navigation du coéquipier MS2 (`ClientLayout.tsx`, `MerchantSidebar.tsx`, `Navbar.tsx`, `Footer.tsx`) ont été conservés tels quels sans modification de routes.

Tableau de correspondance des liens de navigation vers les routes d'`App.tsx` :

| Composant Source | Libellé / Cible | Route Cible | Existe dans `App.tsx` ? | Statut du Lien |
| :--- | :--- | :--- | :--- | :--- |
| `MerchantSidebar.tsx` | Accueil | `/` | OUI (`HomePage`) | Actif |
| `MerchantSidebar.tsx` | Carte | `/map` | OUI (`ShopsMapViewPage`) | Actif |
| `MerchantSidebar.tsx` | Mes réservations | `/reservations` | OUI (Route réservations) | Actif |
| `MerchantSidebar.tsx` | Notifications | `/notifications` | OUI (Route notifications) | Actif |
| `MerchantSidebar.tsx` | Profil | `/profile` | OUI (`ProfilePage`) | Actif |
| `MerchantSidebar.tsx` | Tableau de bord | `/merchant/dashboard` | OUI (`MerchantDashboardPage`) | Actif |
| `MerchantSidebar.tsx` | Ajouter une offre | `/merchant/create-offer` | OUI (`CreateOfferPage`) | Actif |
| `MerchantSidebar.tsx` | Compte | `/merchant/shop` | OUI (`ShopEditPage`) | Actif |
| `MerchantSidebar.tsx` | Avis | *(sans lien)* | N/A | Inactif (sans href) |
| `MerchantSidebar.tsx` | Réservations | *(sans lien)* | N/A | Inactif (sans href) |
| `ClientLayout.tsx` | Logo FORSA | `/` | OUI (`HomePage`) | Actif |
| `ClientLayout.tsx` | Carte | `/map` | OUI (`ShopsMapViewPage`) | Actif |
| `ClientLayout.tsx` | Mon Profil | `/profile` | OUI (`ProfilePage`) | Actif |
| `Footer.tsx` | Explorer les paniers | `/explore` | OUI (`ExploreOffersPage`) | Actif |
| `Footer.tsx` | Carte interactive | `/map` | OUI (`ShopsMapViewPage`) | Actif |
| `Footer.tsx` | Gérer mon stock | `/merchant/my-offers` | OUI (`MyOffersPage`) | Actif |

**Constat :** Aucun lien mort non routé n'est actif dans l'application.

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
