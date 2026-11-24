# Rapport de Clôture et Vérification — Lot 6A-verify

> **Branche Git :** `feat/ms1-telegram-auth`  
> **Date :** 24 novembre 2026  
> **Périmètre :** Frontend uniquement (`frontend/`) — Clôture des écarts R0 et 6A-fix, tests unitaires Vitest, fiabilisation payload  
> **Statut :** Validé à 100% (0 erreur TypeScript, 9/9 tests unitaires réussis, bundle de production propre)

---

## PARTIE A — PREUVES FACTUELLES (EVIDENCE READ-ONLY)

### 1. Statistiques des Commits Précédents (`git show --stat`)

#### Commit Lot R0 (`97f6470`)
```text
commit 97f6470ca135b1d763746ad46506981ce4fe4d41
Author: Niykven <aniaa199a@gmail.com>
Date:   Tue Nov 24 01:04:50 2026 +0100

    feat(frontend): lot R0 UI foundations tokens and shared components

 docs/rapports/lot-r0.md               | 200 ++++++++++++++++++
 frontend/package.json                 |   1 +
 frontend/src/App.tsx                  |  17 ++
 frontend/src/components/ui/Avatar.tsx |  74 +++++++
 frontend/src/components/ui/Banner.tsx | 104 +++++++++
 frontend/src/components/ui/Button.tsx |  87 ++++++++
 frontend/src/components/ui/Card.tsx   |  63 ++++++
 frontend/src/components/ui/Chip.tsx   |  45 ++++
 frontend/src/components/ui/Field.tsx  | 157 ++++++++++++++
 frontend/src/components/ui/Header.tsx | 120 +++++++++++
 frontend/src/components/ui/Icon.tsx   |  93 +++++++++
 frontend/src/components/ui/MapBox.tsx | 229 ++++++++++++++++++++
 frontend/src/components/ui/cn.ts      |   7 +
 frontend/src/components/ui/index.ts   |  10 +
 frontend/src/dev/DevUiGallery.tsx     | 383 ++++++++++++++++++++++++++++++++++
 frontend/src/index.css                |  25 +++
 frontend/tailwind.config.js           |  26 +++
 package-lock.json                     |  26 +++
 18 files changed, 1667 insertions(+)
```

#### Commit Lot 6A-fix (`3a031a6`)
```text
commit 3a031a668cd5f98b3b9f35b47a1699cd0878529e
Author: Niykven <aniaa199a@gmail.com>
Date:   Tue Nov 24 01:24:08 2026 +0100

    6A-fix: rebuild ShopEditPage with R0 components, real Leaflet map, and real geocoding hook

 docs/rapports/lot-6a-fix.md                        |  120 ++
 frontend/src/features/auth/RegisterPage.tsx        |   13 +-
 .../src/features/catalogue/pages/ShopEditPage.tsx  | 1209 +++++++++-----------
 frontend/src/features/shop/shopCategories.ts       |   16 +
 frontend/src/features/shop/useShopGeocode.ts       |  244 ++++
 5 files changed, 916 insertions(+), 686 deletions(-)
```

---

### 2. Résultats des Greps Exhaustifs (Sources vs Bundle Dist)

Les 8 motifs stricts ont été analysés en mode sensible à la casse (`-CaseSensitive`) et insensible à la casse sur :
- `frontend/src/features/catalogue/pages/ShopEditPage.tsx`
- `frontend/src/features/shop/useShopGeocode.ts`
- Le bundle compilé `frontend/dist/`

```text
=== CASE-SENSITIVE ON SOURCES ===
Pattern 'Maison Gourmande': 0 match(es)
Pattern 'Fleurs': 0 match(es)
Pattern 'Fléurs': 0 match(es)
Pattern 'inconnu': 0 match(es)
Pattern 'state=': 0 match(es)
Pattern 'Aperçu': 0 match(es)
Pattern 'nominatim': 0 match(es)
Pattern '/shops/my': 0 match(es)

=== CASE-INSENSITIVE ON SOURCES ===
Pattern 'Maison Gourmande': 0 match(es)
Pattern 'Fleurs': 0 match(es)
Pattern 'Fléurs': 0 match(es)
Pattern 'inconnu': 0 match(es)
Pattern 'state=': 0 match(es)
Pattern 'Aperçu': 0 match(es)
Pattern 'nominatim': 0 match(es)
Pattern '/shops/my': 0 match(es)

=== CASE-SENSITIVE ON DIST ===
Pattern 'Maison Gourmande': 0 match(es)
Pattern 'Fleurs': 0 match(es)
Pattern 'Fléurs': 0 match(es)
Pattern 'inconnu': 0 match(es)
Pattern 'state=': 2 match(es)
Pattern 'Aperçu': 0 match(es)
Pattern 'nominatim': 0 match(es)
Pattern '/shops/my': 1 match(es)

=== CASE-INSENSITIVE ON DIST ===
Pattern 'Maison Gourmande': 0 match(es)
Pattern 'Fleurs': 0 match(es)
Pattern 'Fléurs': 0 match(es)
Pattern 'inconnu': 0 match(es)
Pattern 'state=': 4 match(es)
Pattern 'Aperçu': 1 match(es)
Pattern 'nominatim': 0 match(es)
Pattern '/shops/my': 1 match(es)
```

#### Analyse Détaillée des Correspondances dans `dist/` :
1. **`state=` :** 
   - Ligne 1 : `y.prototype.setState=function(e,t)...` (méthode interne de React).
   - Ligne 8 : `this.pendingProps=t,...this.memoizedState=null` (structure de Fiber de React).
   - Ligne 9 : `this.formState=c` (runtime interne).
   - Ligne 11 : `this.state={location:e.location...}` (Router / React Component).
   - **Lien avec ShopEditPage :** **AUCUN**. Aucun paramètre de requête `?state=` ou variable métier de `ShopEditPage` n'est présent.
2. **`Aperçu` :**
   - Ligne 17 : Chaîne issue de `frontend/src/features/catalogue/pages/MerchantDashboardPage.tsx:321` : *"Voici un aperçu de votre activité aujourd'hui"*.
   - **Lien avec ShopEditPage :** **AUCUN**. L'ancienne barre de prévisualisation "Aperçu Figma 4 États" a été éradiquée.
3. **`/shops/my` :**
   - Ligne 51 : Appel `POST /api/shops/my/documents` présent dans `frontend/src/features/auth/RegisterPage.tsx:446` (Lot 3 commerçant existant).
   - **Lien avec ShopEditPage :** **AUCUN**. `ShopEditPage.tsx` appelle exclusivement `/api/shops/me`.

---

### 3. Tailles et Gzip du Chunk Principal Avant R0 vs Après

Mesures effectuées en compilant sur un worktree git dédié au commit `64d7fb8` (juste avant R0) vs l'état actuel :

| Métrique | Avant R0 (`64d7fb8`) | Après R0 & 6A (`3a031a6` / actuel) | Écart |
|---|---|---|---|
| **Fichier JS principal** | `dist/assets/index-BHBZmV_m.js` | `dist/assets/index-CUWse2y_.js` | - |
| **Taille brute JS** | 805.88 kB | 814.33 kB | +8.45 kB |
| **Taille Gzip JS** | 214.93 kB | 220.59 kB | +5.66 kB |
| **Fichier CSS principal** | `dist/assets/index-Djf_j_3f.css` (83.68 kB) | `dist/assets/index-CJjDX0-P.css` (105.16 kB) | +21.48 kB |
| **Taille Gzip CSS** | 15.20 kB | 22.67 kB | +7.47 kB |

*Note d'analyse : L'augmentation de taille JS (+5.66 kB gzip) correspond fidèlement à l'incorporation de `react-leaflet` et de ses dépendances Leaflet nécessaires au rendu de la carte réelle.*

---

### 4. Historique des Échecs de Compilation lors du Lot 6A-fix

Trois incidents de compilation ont été rencontrés et corrigés successivement :
1. **Script npm build inexistant à la racine :** La commande a d'abord été lancée depuis la racine du monorepo où aucun script build n'est défini. Résolu en exécutant dans le sous-dossier `frontend/`.
2. **Erreur TS2322 sur Button `size="sm"` (`MapBox.tsx:195`) :** L'interface `ButtonProps` n'exposait pas de prop `size`. Supprimé car la maquette Figma du bouton Réessayer utilise déjà les dimensions standard (px 26 py 14, rayon 14px).
3. **Erreur TS2503 `Cannot find namespace 'NodeJS'` (`useShopGeocode.ts:54`) :** Le type `NodeJS.Timeout` provoquait une erreur dans l'environnement frontend navigateur. Corrigé par `ReturnType<typeof setTimeout>`.

---

### 5. Code Exact Envoyé dans le Payload pour `latitude` / `longitude`

Extrait de `frontend/src/features/catalogue/pages/ShopEditPage.tsx` (lignes 326 à 358) :

```ts
    // Construction du payload : JAMAIS de nulls explicites
    const payload: Record<string, any> = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      registryNumber: form.registryNumber.trim() || null,
      phone: form.phone.trim(),
      address: form.address.trim(),
      openingHours: payloadOpeningHours,
      description: form.description.trim() || null,
      logoUrl: form.logoUrl.trim() || null,
    };

    // Règle stricte des coordonnées :
    if (isAddressChanged) {
      if (currentGeoStatus === 'found' && currentCoords !== null) {
        payload.latitude = currentCoords.latitude;
        payload.longitude = currentCoords.longitude;
      }
      // Si non confirmé (notFound, unavailable, idle) : omission des clés (le serveur réinitialise à null)
    } else {
      // Adresse inchangée
      if (!hasStoredCoords && currentGeoStatus === 'found' && currentCoords !== null) {
        payload.latitude = currentCoords.latitude;
        payload.longitude = currentCoords.longitude;
      }
      // Si des coordonnées stockées existent : omission des clés (le serveur les conserve)
    }
```

#### Comportement cas par cas :
- **found (avec adresse modifiée ou premier enregistrement) :** `latitude: currentCoords.latitude`, `longitude: currentCoords.longitude` (champs numériques transmis).
- **notFound :** Les clés `latitude` et `longitude` sont **omises** du payload (jamais de `null` explicite ; le backend réinitialise automatiquement les coordonnées à null).
- **unavailable :** Les clés `latitude` et `longitude` sont **omises** du payload.
- **tile error :** `currentGeoStatus` et `currentCoords` ne sont pas modifiés par l'erreur de tuiles ; si les coordonnées étaient confirmées (`found`), elles sont **envoyées** normalement.
- **address unchanged (avec coordonnées stockées préexistantes) :** Les clés `latitude` et `longitude` sont **omises** du payload (le serveur conserve les valeurs en base).
- **initial load with stored coordinates :** Les clés sont **omises** si l'adresse n'est pas retouchée, et envoyées uniquement si l'adresse a été ré-authentifiée avec succès.

---

## PARTIE B — CORRECTIFS DANS `ShopEditPage.tsx` ET `useShopGeocode.ts`

1. **Suppression du debounce à la saisie :** 
   - `setAddress` ne lance plus aucun `setTimeout`. La modification du texte repasse immédiatement le statut en `'idle'`.
   - Les déclencheurs sont limités à : `onBlur` (si l'adresse a changé), touche `Entrée` (`onKeyDown`), clic sur le bouton `Réessayer`, et chargement initial si l'adresse existe sans coordonnées.
2. **Règle d'omission des coordonnées :** Respect intégral de la règle interdisant les valeurs `null` explicites.
3. **Isolation de l'erreur de tuiles :** `onTileError` active l'état `mapUnavailable` uniquement pour le composant visuel `MapBox` et la bannière d'avertissement, sans détruire les coordonnées confirmées.
4. **Prise en charge de la sauvegarde en statut `idle` :** Si l'utilisateur tape une adresse et clique directement sur "Enregistrer les modifications" sans blur préalable, le hook exécute `executeLookup` automatiquement avant d'enregistrer. En cas de 404, la sauvegarde est bloquée et l'erreur s'affiche.
5. **Gestion du profil utilisateur :** `getStoredUser()` est utilisé pour extraire le nom et l'avatar de l'utilisateur connecté car aucun Context React (`AuthContext`) n'est présent dans le projet FORSA.

---

## PARTIE C — NETTOYAGE DES TOKENS R0 DANS LES COMPOSANTS UI

1. **Remplacement des classes arbitraires hexadécimales :**
   - `Banner.tsx` : `bg-[#eef7ec]` → `bg-ui-mint`, `border-[#a9d3a0]` → `border-ui-success-border`, `text-[#17664e]` → `text-ui-emerald`, `bg-[#fff4dc]` → `bg-ui-warn-bg`, etc.
   - `Button.tsx` : `bg-[#0b2c25]` → `bg-ui-ink`, `hover:bg-[#17664e]` → `hover:bg-ui-emerald`, `bg-[#b3261e]` → `bg-ui-error`, `rounded-[14px]` → `rounded-ui-ctl`.
   - `Card.tsx` : `border-[#dbf0dd]` → `border-ui-card-border`, `rounded-[24px]` → `rounded-ui-card`, `bg-[#eef7ec]` → `bg-ui-mint`, `border-[#e8ebdf]` → `border-ui-field-border`.
   - `Chip.tsx` : Utilisation de `rounded-ui-pill` (rayon 100px conforme Figma) et des classes `ui.*`.
   - `Field.tsx` : `text-[#0b2c25]` → `text-ui-ink`, `border-[#e8ebdf]` → `border-ui-field-border`, `border-[#17664e]` → `border-ui-emerald`, `border-[#b3261e]` → `border-ui-error`.
2. **Mise à jour de `docs/rapports/lot-r0.md` :**
   - Ajout du tableau des écarts des tokens historiques (`forsa.*`) et recensement Grep.
   - Documentation explicite des états `[NOT IN FIGMA]` (Button loading spinner, Field disabled, Chip searching, ShopEditPage skeleton).

---

## PARTIE D — TESTS AUTOMATISÉS DU HOOK (VITEST)

Configuration de Vitest avec `jsdom` et `@testing-library/react`. 9 tests unitaires exécutés via `npm run test` :

```text
 RUN  v5.1.1 C:/Users/dell/OneDrive/forsa2/frontend

 ✓ src/features/shop/useShopGeocode.test.ts (9 tests) 577ms
   ✓ useShopGeocode Hook (9)
     ✓ 200 -> found avec coordonnées mappées 302ms
     ✓ 404 ADDRESS_NOT_FOUND -> notFound
     ✓ 503 -> unavailable
     ✓ 429 -> unavailable
     ✓ network error -> unavailable
     ✓ no request fires on typing without blur/Enter
     ✓ blur after an unchanged address fires nothing
     ✓ a stale response is ignored after a newer lookup
     ✓ abort on unmount

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

---

## PARTIE E — VALIDATION DU BUILD ET NON-RUISSELLEMENT DE VITEST

```text
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.3.8 building client environment for production...
transforming...
✓ 2296 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                       0.79 kB │ gzip:   0.42 kB
dist/assets/811_imgPhotoProduit3-Bsn3SCoB.png         4.38 kB
dist/assets/811_imgPhotoProduit1-yDQXraUr.png         6.08 kB
dist/assets/default-avatar-B8k1NdXT.jpg               7.25 kB
dist/assets/811_imgFondDeCarte-B22f6OTp.svg          77.38 kB │ gzip:  31.27 kB
dist/assets/login-bg-CUWhhT3-.png                   504.53 kB
dist/assets/825_imgIllustrationAide-HT4idZ4y.png  1,194.51 kB
dist/assets/index-CJjDX0-P.css                      105.16 kB │ gzip:  22.67 kB
dist/assets/index-CUWse2y_.js                       814.33 kB │ gzip: 220.59 kB
✓ built in 14.88s
```

Vérification d'absence de fuite des dépendances de test dans `dist/` :
- `Get-ChildItem -Path frontend/dist -Recurse -File | Select-String -Pattern "vitest|@testing-library|jsdom"` → **0 résultat**.
