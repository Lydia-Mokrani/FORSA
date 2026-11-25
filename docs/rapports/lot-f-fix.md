# Rapport d'Exécution — Lot F-fix : Rétablissement de l'intégrité du bouton Google & Rectification des rapports F1, F2, F3

**Date :** 25 Novembre 2026  
**Branche :** `feat/ms1-telegram-auth`  
**Périmètre :** `frontend/` et `docs/rapports/` UNIQUEMENT  
**Statut :** TERMINE ET VALIDE  

---

## 1. Contexte & Problèmes Résolus

### A. Défauts identifiés sur le bouton Google
1. **Appel réseau invalide :** La méthode `handleGoogleLogin` effectuait un `POST /api/auth/google` sans aucun corps (`body: undefined`, aucun `idToken` transmis).
2. **Absence de chargement GIS :** Le script officiel Google Identity Services (`https://accounts.google.com/gsi/client`) n'était jamais chargé dynamiquement.
3. **Mappage d'erreur fallacieux :** Tout code HTTP 404 était aveuglément interprété comme "Compte introuvable. Veuillez créer votre compte FORSA", induisant l'utilisateur en erreur avant même l'implémentation de la route backend.

### B. Sur-revendications (Overclaims) dans les rapports précédents
1. **`lot-f1.md` (Section 4) :** Revendiquait un bouton "Google câblé" sans expliciter l'absence de la route backend côté serveur.
2. **`lot-f2.md` (Sections 1 et 3) :**
   - Section 1 : Attribuait des Node IDs et des statuts d'audit Figma sans vérification effective par API.
   - Section 3 : Affirmait à tort "Aucun lien mort non routé n'est actif dans l'application" alors que la sidebar commerçant déclare 5 éléments dont 2 sans lien ("Avis" et "Réservations").
3. **`lot-f3.md` (Section 1) :** Attribuait des Node IDs et des statuts d'audit Figma non confirmés par API.

---

## 2. Corrections Apportées

### A. Intégration Google honnête & robuste (`frontend/src/features/auth/`)
1. **Chargeur paresseux GIS (`utils/googleIdentity.ts`) :**
   - Fonction `loadGoogleIdentityScript()` chargeant `https://accounts.google.com/gsi/client` de manière asynchrone sans aucune dépendance npm.
   - Gestion d'erreur silencieuse en cas d'échec réseau (pas de crash, pas de pollution console).
2. **Service d'authentification unifié (`services/authService.ts`) :**
   - Méthode `loginWithGoogle(idToken)` transmettant `{ idToken }` à `POST /api/auth/google`.
   - Utilisation du même stockage de session (`forsa_access_token`, `forsa_refresh_token`, `forsa_user`) et de la même fonction de redirection `getPostLoginRedirect`.
   - **Protection des données sensibles :** L'`idToken` n'est jamais persisté dans le `localStorage` / `sessionStorage`, ni affiché dans les logs.
3. **Mappage d'erreur fonctionnel pur (`utils/googleAuthError.ts`) :**
   - Fonction pure `mapGoogleAuthError(err, registerPath)` analysant le code d'erreur JSON :
     - `ACCOUNT_NOT_FOUND` (404 avec code) : message explicite + lien d'inscription adapté (`/register?role=client` ou `/register?role=merchant`).
     - `EMAIL_NOT_VERIFIED` (403 avec code) : message ciblé sur l'e-mail non vérifié.
     - `INVALID_GOOGLE_TOKEN` (400), `GOOGLE_NOT_CONFIGURED` (503) : message générique.
     - Toute 5xx, erreur réseau ou 404 standard (route absente) : message générique "Connexion Google indisponible." (aucun faux message de compte inexistant).
   - Couverture complète par 10 tests unitaires dans `utils/googleAuthError.test.ts`.
4. **Comportement dans `LoginPage.tsx` :**
   - Bouton désactivé (`disabled`, `aria-disabled="true"`) avec le tag "Bientôt disponible" tant que `VITE_GOOGLE_CLIENT_ID` est vide ou que GIS n'est pas chargé.
   - Bouton Apple inchangé : purement visuel, désactivé en permanence, sans `onClick` ni `fetch`.

### B. Rectification des Rapports (`docs/rapports/`)
1. **`lot-f1.md` :** Section 4 réécrite pour décrire le chargement lazy GIS, la désactivation par défaut, la fonction pure `mapGoogleAuthError`, et l'avertissement formel que la route backend `/api/auth/google` n'existe pas encore (Lot G1).
2. **`lot-f2.md` :**
   - Section 1 : Remplacement des Node IDs par la mention honnête "NOT READ (construit à partir des tokens, specs et du code existant, frame Figma non inspectée via API)".
   - Section 3 : Reconstruction du tableau depuis le code source de `MerchantSidebar.tsx` (5 éléments : Tableau de bord, Ajouter une offre, Avis, Compte, Réservations). Retrait de la mention "Aucun lien mort non routé" et explication explicite de l'absence de route pour "Avis" et "Réservations". Séparation des navigations Client (variante client, `Navbar.tsx`, `Footer.tsx`).
3. **`lot-f3.md` :** Section 1 alignée avec la mention "NOT READ (construit à partir des tokens, specs et du code existant, frame Figma non inspectée via API)" et suppression des Node IDs non confirmés.

---

## 3. Preuves d'Exécution & Greps de Vérification

### A. Tests Unitaires Vitest (44/44 réussis)
```
> frontend@0.0.0 test
> vitest run

 ✓ src/components/ui/Modal.test.tsx (4 tests) 752ms
 ✓ src/components/ui/Dropzone.test.tsx (3 tests) 168ms
 ✓ src/components/ui/Stepper.test.tsx (2 tests) 153ms
 ✓ src/features/shop/useShopGeocode.test.ts (9 tests) 136ms
 ✓ src/features/shop/buildShopPayload.test.ts (16 tests) 17ms
 ✓ src/features/auth/utils/googleAuthError.test.ts (10 tests) 6ms

 Test Files  6 passed (6)
      Tests  44 passed (44)
   Start at  07:50:47
   Duration  14.02s
```

### B. Build TypeScript & Vite (0 erreur)
```
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.3.8 building client environment for production...
transforming...
✓ 2305 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                       0.79 kB │ gzip:   0.42 kB
dist/assets/index-Cxv8DLMP.css                      104.69 kB │ gzip:  22.61 kB
dist/assets/index-b_lAE8Nk.js                       820.73 kB │ gzip: 227.73 kB
✓ built in 8.91s
```

### C. Preuve d'absence de stockage ou de log d'idToken
```powershell
git grep -rnE "idToken" frontend/src
```
*Sortie brute :*
```
frontend/src/features/auth/services/authService.ts:279: * Authentifie l'utilisateur via le jeton Google idToken émis par GIS.
frontend/src/features/auth/services/authService.ts:282: * L'idToken n'est jamais stocké ni consigné dans les logs.
frontend/src/features/auth/services/authService.ts:284:export async function loginWithGoogle(idToken: string): Promise<GoogleAuthResponse> {
frontend/src/features/auth/services/authService.ts:288:    body: JSON.stringify({ idToken }),
```
*Constat :* L'argument `idToken` est uniquement sérialisé dans la requête HTTP `POST /api/auth/google`. Il n'est jamais stocké dans le `localStorage`, `sessionStorage`, ou dans `console.log`.

### D. Preuve Apple Button (Inactif, sans onClick ni fetch)
```powershell
git grep -n -C 5 "Continuer avec Apple" frontend/src/features/auth/LoginPage.tsx
```
*Sortie brute :*
```
frontend/src/features/auth/LoginPage.tsx-588-                disabled
frontend/src/features/auth/LoginPage.tsx-589-                aria-disabled="true"
frontend/src/features/auth/LoginPage.tsx-590-                className="w-full h-[48px] rounded-ui-ctl border border-ui-field-border bg-stone-50 text-ui-ink/50 flex items-center justify-center gap-2.5 font-medium text-[14px] cursor-not-allowed"
frontend/src/features/auth/LoginPage.tsx-591-              >
frontend/src/features/auth/LoginPage.tsx-592-                <img src={appleIcon} alt="Apple" className="size-5 shrink-0 opacity-40" />
frontend/src/features/auth/LoginPage.tsx:593:                <span>Continuer avec Apple</span>
frontend/src/features/auth/LoginPage.tsx-594-                <span className="text-[11px] bg-stone-200/60 text-ui-text-70 px-2 py-0.5 rounded-full font-normal">
frontend/src/features/auth/LoginPage.tsx-595-                  Bientôt disponible
frontend/src/features/auth/LoginPage.tsx-596-                </span>
frontend/src/features/auth/LoginPage.tsx-597-              </button>
```

### E. Preuve Google Button (Gestion GIS et inactivité conditionnelle)
```powershell
git grep -n -C 8 "Continuer avec Google" frontend/src/features/auth/LoginPage.tsx
```
*Sortie brute :*
```
frontend/src/features/auth/LoginPage.tsx-569-              <button
frontend/src/features/auth/LoginPage.tsx-570-                type="button"
frontend/src/features/auth/LoginPage.tsx-571-                disabled={!isGoogleAvailable || googleLoading}
frontend/src/features/auth/LoginPage.tsx-572-                onClick={isGoogleAvailable ? handleGoogleLogin : undefined}
frontend/src/features/auth/LoginPage.tsx-573-                aria-disabled={!isGoogleAvailable}
frontend/src/features/auth/LoginPage.tsx-574-                className="w-full h-[48px] rounded-ui-ctl border border-ui-field-border bg-white hover:bg-ui-mint/30 text-ui-ink flex items-center justify-center gap-2.5 font-medium text-[14px] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
frontend/src/features/auth/LoginPage.tsx-575-              >
frontend/src/features/auth/LoginPage.tsx-576-                <img src={googleIcon} alt="Google" className="size-5 shrink-0" />
frontend/src/features/auth/LoginPage.tsx:577:                <span>Continuer avec Google</span>
frontend/src/features/auth/LoginPage.tsx-578-                {!isGoogleAvailable && (
frontend/src/features/auth/LoginPage.tsx-579-                  <span className="text-[11px] bg-stone-100 text-ui-text-70 px-2 py-0.5 rounded-full font-normal">
frontend/src/features/auth/LoginPage.tsx-580-                    Bientôt disponible
frontend/src/features/auth/LoginPage.tsx-581-                  </span>
frontend/src/features/auth/LoginPage.tsx-582-                )}
frontend/src/features/auth/LoginPage.tsx-583-              </button>
```
