# Rapport d'Implémentation — Lot R0 : Fondations UI, Tokens & Composants Partagés

> **Branche Git :** `feat/ms1-telegram-auth`  
> **Date :** 24 novembre 2026  
> **Périmètre :** Frontend uniquement (`frontend/`) — Fondations UI conformes aux maquettes Figma MS1  
> **Statut :** Terminé & Validé (Build 100% propre, 0 erreur TypeScript, exclusion stricte prod vérifiée)

---

## 1. Inventaire et Alignement des Tokens de Design

Afin de préserver l'intégrité des écrans existants (pages d'authentification du Lot 3, catalogue MS2), aucun token existant n'a été altéré ou supprimé. Les tokens corrigés et validés d'après Figma (`docs/rapports/figma-ma-boutique-inspection.md`) ont été isolés sous le namespace dédié `ui` dans `frontend/tailwind.config.js` ainsi que sous `@theme` dans `frontend/src/index.css`.

### 1.1 Tableau Comparatif & Recensement Grep des Tokens

| Token `ui.*` | Variable CSS `@theme` | Valeur Implémentée | Valeur Figma | Ancien Token / Valeur erronée | Occurrences Codebase (Grep) |
|---|---|---|---|---|---|
| `ui.page` | `--color-ui-page` | `#fffaf0` | `#fffaf0` | Non défini (arbitraire `#fffaf0` ou `#f5f6f4`) | 36 occurrences |
| `ui.ink` | `--color-ui-ink` | `#0b2c25` | `#0b2c25` | `forsa-dark` (`#0B2C25`) | 416 occurrences brutes |
| `ui.emerald` | `--color-ui-emerald` | `#17664e` | `#17664e` | `forsa-emerald` (`#17664E`) | 126 occurrences brutes |
| `ui.mint` | `--color-ui-mint` | `#eef7ec` | `#eef7ec` | Non standardisé (`#EEF7EC` / `#E8EAE6`) | 14 occurrences |
| `ui.card-border` | `--color-ui-card-border` | `#dbf0dd` | `#dbf0dd` | Erreur audit (`#D9DDD0`) | 31 occurrences |
| `ui.field-border` | `--color-ui-field-border` | `#e8ebdf` | `#e8ebdf` | Erreur audit (`#E2E8F0` / `#D9DDD0`) | 15 occurrences |
| `ui.success-border` | `--color-ui-success-border` | `#a9d3a0` | `#a9d3a0` | Non défini | 3 occurrences |
| `ui.error` | `--color-ui-error` | `#b3261e` | `#b3261e` | `forsa-danger` (`#EF4444`) | 6 occurrences |
| `ui.error-bg` | `--color-ui-error-bg` | `#fdecea` | `#fdecea` | Non standardisé (`#FEF2F2`) | 2 occurrences |
| `ui.warn` | `--color-ui-warn` | `#8a5a00` | `#8a5a00` | `forsa-warning` (`#F59E0B`) | 4 occurrences |
| `ui.warn-bg` | `--color-ui-warn-bg` | `#fff4dc` | `#fff4dc` | Non standardisé (`#FFFBEB`) | 3 occurrences |
| `ui.warn-border` | `--color-ui-warn-border` | `#f0cf8f` | `#f0cf8f` | Non défini | 3 occurrences |
| `ui.map-ok` | `--color-ui-map-ok` | `#dfeadb` | `#dfeadb` | Non défini | 2 occurrences |
| `ui.map-down` | `--color-ui-map-down` | `#ecebe6` | `#ecebe6` | Non défini | 2 occurrences |
| `ui.text-70` | `--color-ui-text-70` | `rgba(11,44,37,0.7)` | `rgba(11,44,37,0.7)` | `text-stone-500` / arbitraire | 8 occurrences |
| `ui.text-80` | `--color-ui-text-80` | `rgba(11,44,37,0.8)` | `rgba(11,44,37,0.8)` | Non défini | 3 occurrences |
| `ui.info` | `--color-ui-info` | `#026aa7` | `#026aa7` (1155:25969) | `forsa-info` (`#3B82F6`) | 2 occurrences |
| `ui.info-bg` | `--color-ui-info-bg` | `#f0f9ff` | `#f0f9ff` (1155:25969) | Non défini | 1 occurrence |
| `ui.info-border` | `--color-ui-info-border` | `#b9e6fe` | `#b9e6fe` (1155:25969) | Non défini | 1 occurrence |
| `rounded-ui-card` | `--radius-ui-card` | `24px` | `24px` | Erreur audit (`20px`) | Cartes boutiques |
| `rounded-ui-ctl` | `--radius-ui-ctl` | `14px` | `14px` | Non standardisé (`rounded-xl` 12px) | Inputs, Boutons |
| `rounded-ui-panel` | `--radius-ui-panel` | `16px` | `16px` | Non standardisé | Cadre carte, Bannières |
| `rounded-ui-pill` | `--radius-ui-pill` | `100px` | `100px` | `rounded-full` (9999px) | Badges, Chips, Avatar |

---

## 2. Bibliothèque de Composants Partagés (`frontend/src/components/ui/`)

Tous les composants ont été écrits de manière modulaire, typée TypeScript, et accessibles (WAI-ARIA).

| Composant | Fichier | Props Clés | Variantes & États | Accessibilité & Rôles |
|---|---|---|---|---|
| **cn** | `cn.ts` | `...inputs: ClassValue[]` | Utilitaire sans dépendance externe | N/A |
| **Icon** | `Icon.tsx` | `name: IconName`, `size?: number \| string`, `className?: string`, `alt?: string` | 22 icônes vectorielles SVG Figma locales (`building`, `pin`, `pin-empty`, `clock`, `phone`, `file`, `down`, `back`, `check`, `alert`, `alertc`, `refresh`, `wifioff`, `bell`, `info`, etc.) | `aria-hidden={!alt}`, `role="img"` si alt |
| **Button** | `Button.tsx` | `variant`, `loading`, `disabled`, `leftIcon`, `fullWidth`, standard `<button>` HTML props | `primary`, `secondary`, `danger`, `dangerOutline`. États : default, hover, active, focus-visible (ring 2px), loading (spinner SVG accessible), disabled (`opacity-45 cursor-not-allowed`). Dimensions : 15px Medium, px 26 py 14, rayon 14px. | `type="button"` par défaut, `aria-busy={loading}`, `disabled={isDisabled}` |
| **Field** | `Field.tsx` | `label`, `helperText`, `error`, `leftIcon`, `rightSlot`, `as="input" \| "select"`, `options` | États : default (`border-[#e8ebdf]`), focus (`border-2 border-[#17664e]`), error (`border-2 border-[#b3261e]` + icône `alertc` + message 13px), disabled (`bg-stone-50 opacity-60`). Select natif stylisé avec chevron bas. | Id unique généré, `aria-invalid`, `aria-describedby` relié à l'erreur ou au helper |
| **Card** | `Card.tsx` | `title`, `icon`, `children`, `className` | Fond blanc pur, bordure 1.5px `#dbf0dd`, rayon 24px, padding 28px desktop / 20px mobile. En-tête avec pastille ronde mint (`#eef7ec`, bordure `#e8ebdf`) + titre 20px Medium / 18px SemiBold. | Balise `<section>`, titre avec heading structuré |
| **Banner** | `Banner.tsx` | `variant`, `title`, `description`, `icon`, `className` | `success` (fond `#eef7ec`, bordure `#a9d3a0`, icône `check-success`), `warn` (fond `#fff4dc`, bordure `#f0cf8f`, icône `alert-warn`), `error` (fond `#fdecea`, bordure `#b3261e`), `info` (fond `#f0f9ff`, bordure `#b9e6fe`, icône `info`). Rayon 16px, padding 18px. | `role="alert"` (erreur/avertissement) ou `role="status"` (succès/info) |
| **Chip** | `Chip.tsx` | `variant`, `children`, `className` | `success` ("Position détectée"), `error` ("Position non détectée"), `warn` ("Position à confirmer"), `neutral`. 12px Medium, pill shape (`rounded-full`). | `role="status"` |
| **Avatar** | `Avatar.tsx` | `name`, `src`, `size` (défaut 48px), `alt` + utilitaire `getInitials(name)` | Monogramme 15px SemiBold `#17664e` sur fond mint `#eef7ec` bordure 1px `#dbf0dd`. Fallback automatique '?' si vide. Support image avec fallback erreur. | `role="img"`, `aria-label` |
| **Header** | `Header.tsx` | `breadcrumb`, `title`, `subtitle`, `mobileSubtitle`, `onBack`, `actions`, `userAvatar`, `hasNotifications` | Responsive unifié : Desktop (Fil d'Ariane 11px, H1 48px SemiBold `#0b2c25`, sous-titre 20px Regular, cloche + avatar) et Mobile (bouton rond retour 40px, titre 20px Medium, sous-titre 13px Regular). | Balise `<header>`, `<nav aria-label="Fil d'Ariane">` |
| **MapBox** | `MapBox.tsx` | `status` (`'ok' \| 'empty' \| 'down'`), `position`, `address`, `zoom`, `onRetry`, `onTileError`, `showFooter` | Interactive Leaflet (`react-leaflet@^5.0.0`). Marker custom `L.divIcon` rond `#0b2c25` avec épingle blanche + étiquette adresse flottante pill blanche. États vides gérés (empty, down avec bouton Réessayer). Détection des tuiles défaillantes (>= 3 en 10s -> `onTileError`). | Dégradation gracieuse, `scrollWheelZoom={false}`, étiquette adresse lisible |

---

## 3. Matrice de Conformité avec les Maquettes Figma

Toutes les propriétés implémentées ont été validées contre les frames et calques réels de la section Figma `1154:25531` ("MS1 — Ma boutique") :

| Frame Figma Node ID | Élément / Composant | Propriétés Vérifiées | Valeur Figma | Valeur Implémentée | Statut |
|---|---|---|---|---|---|
| `1154:25532` | Fond de page | Fill background | `#fffaf0` | `bg-ui-page` (`#fffaf0`) | Conforme |
| `1154:25532` | En-tête H1 Desktop | Font, Size, Weight, Color | Poppins SemiBold 48px `#0b2c25` | `text-[48px] font-semibold text-ui-ink` | Conforme |
| `1154:25532` | Sous-titre Desktop | Font, Size, Weight, Color | Poppins Regular 20px rgba(11,44,37,0.8) | `text-[20px] font-normal text-ui-text-80` | Conforme |
| `1154:25532` | Avatar Profil | Size, Radius, Bg, Border, Text | 48×48px, circle, `#eef7ec`, 1px `#dbf0dd`, 15px SemiBold `#17664e` | `Avatar.tsx` (48px, rounded-full, `bg-ui-mint`, etc.) | Conforme |
| `1154:25532` | Cartes blanches | Bg, Border, Radius, Padding | White, 1.5px `#dbf0dd`, radius 24px, padding 28px | `Card.tsx` (`bg-white border-[1.5px] border-ui-card-border rounded-ui-card p-[28px]`) | Conforme |
| `1154:25532` | Badge icône Carte | Size, Bg, Border, Radius | 40×40px, `#eef7ec`, 1px `#e8ebdf`, circle | `w-10 h-10 rounded-full bg-ui-mint border border-ui-field-border` | Conforme |
| `1154:25532` | Input Formulaire | Radius, Height, Border, Font | Radius 14px, border 1px `#e8ebdf`, 15px Regular `#0b2c25`, px 16 py 15 | `Field.tsx` (`rounded-ui-ctl border-ui-field-border text-[15px] px-4 py-[15px]`) | Conforme |
| `1154:25702` | Input en erreur | Border, Error text, Error icon | Border 2px `#b3261e`, text 13px `#b3261e`, icône alertc | `border-2 border-ui-error text-ui-error` + `<Icon name="alertc" />` | Conforme |
| `1154:25702` | Bouton disabled | Opacity, Cursor | `opacity-45`, `cursor-not-allowed` | `disabled:opacity-45 disabled:cursor-not-allowed` | Conforme |
| `1154:25532` | Repère Carte | Shape, Bg, Icon, Etiquette | Circle 44px `#0b2c25`, white pin SVG, pill blanche texte 12px `#0b2c25` | `MapBox.tsx` `L.divIcon` avec SVG blanc et étiquette flottante | Conforme |
| `1154:25702` | Carte vide (empty) | Bg, Icon, Title, Subtitle | `#dfeadb`, pin 34px, "Aucune position trouvée" 15px SemiBold, helper 13px | `MapBox.tsx` état `empty` | Conforme |
| `1154:25874` | Carte down (down) | Bg, Icon, Title, Action | `#ecebe6`, wifioff 34px, "Carte indisponible" 15px SemiBold, bouton Réessayer | `MapBox.tsx` état `down` avec bouton secondaire Réessayer | Conforme |
| `1154:25874` | Bannière Warning | Bg, Border, Radius, Icon, Title | `#fff4dc`, 1px `#f0cf8f`, radius 16px, icon alert 22px, title 15px SemiBold `#8a5a00` | `Banner.tsx` variant `warn` | Conforme |
| `1154:26058` | Bannière Succès | Bg, Border, Radius, Icon, Title | `#eef7ec`, 1px `#a9d3a0`, radius 16px, icon check 22px, title 15px SemiBold `#17664e` | `Banner.tsx` variant `success` | Conforme |
| `1155:25969` | Bannière Info | Bg, Border, Radius, Icon, Title | `#f0f9ff`, 1px `#b9e6fe`, radius 16px, icon info 22px, title 15px SemiBold `#026aa7` | `Banner.tsx` variant `info` | Conforme |
| `1154:26236` | Mobile Header | Back btn, Title, Subtitle | Bouton 40px white/border, Titre 20px Medium, sous-titre 13px | `Header.tsx` vue mobile | Conforme |
| `1154:26236` | Mobile Map Height | Conteneur carte height | 170px (au lieu de 260px desktop) | `MapBox.tsx` (`h-[170px] md:h-[260px]`) | Conforme |

---

## 4. Inventaire des Icônes Vectorielles (22 SVGs)

Toutes les icônes nécessaires sont présentes localement dans `frontend/src/assets/icons/` et `frontend/src/assets/icons/figma/` :
1. `boutique-building.svg` (Figma `114:16322`) : icône boutique / commerce
2. `boutique-pin.svg` (Figma `2:14757`) : repère adresse
3. `boutique-pin-large.svg` (Figma `2:14757`) : épingle carte nominale
4. `boutique-pin-empty.svg` (Figma `2:14757`) : épingle état introuvable
5. `boutique-alertc.svg` (Figma `2:6389`) : alerte cercle rouge validation
6. `boutique-alert-warn.svg` (Figma `114:14651`) : avertissement bannière ambre
7. `boutique-wifioff.svg` (Figma `2:23366`) : service carte déconnecté
8. `boutique-refresh.svg` (Figma `114:19809`) : bouton réessayer
9. `boutique-check.svg` (Figma `2:8118`) : coche bouton enregistrer
10. `boutique-check-success.svg` (Figma `2:8118`) : coche bannière succès
11. `boutique-back.svg` / `arrow-left.svg` (Figma `114:13944`) : flèche retour mobile
12. `boutique-chevron-down.svg` / `input-chevron-down.svg` (Figma `114:13963`) : sélecteur catégorie
13. `boutique-file.svg` / `input-file-text.svg` (Figma `2:9299`) : registre de commerce
14. `boutique-phone.svg` / `input-phone.svg` (Figma `630:9165`) : téléphone
15. `boutique-clock.svg` (Figma `2:738`) : horaires ouverture/fermeture
16. `boutique-bell.svg` (Figma `2:6335`) : notifications en-tête
17. `boutique-user.svg` / `input-user.svg` (Figma `2:8353`) : navigation / profil
18. `boutique-dash.svg` (Figma `2:2986`) : tableau de bord
19. `boutique-add.svg` (Figma `114:14544`) : ajouter offre
20. `boutique-star.svg` (Figma `2:2510`) : avis
21. `boutique-cal.svg` (Figma `2:860`) : réservations
22. `boutique-logout.svg` (Figma `2:12994`) : déconnexion

**Icônes manquantes :** 0. Aucun fallback ou placeholder SVG externe n'a été requis.

---

## 5. Galerie de Développement (`/dev/ui`) et Isolation Production

### 5.1 Route & Composant Dev
Le fichier `frontend/src/dev/DevUiGallery.tsx` a été créé pour exposer l'intégralité des composants, boutons, inputs, cartes, bannières, chips et simulateur de carte sous format large et format contraint 390px.

Il inclut un marqueur de contrôle d'arborescence :
```ts
export const DEV_GALLERY_PROOF_TAG = 'FORSA_DEV_UI_GALLERY_ISOLATED_SECRET_PROOFTAG_R0';
```

Dans `frontend/src/App.tsx`, l'importation dynamique et la route sont conditionnées par `import.meta.env.DEV` :
```tsx
const DevUiGallery = import.meta.env.DEV
  ? React.lazy(() => import('./dev/DevUiGallery'))
  : null;

// ...
{import.meta.env.DEV && DevUiGallery && (
  <Route
    path="/dev/ui"
    element={
      <React.Suspense fallback={<div className="p-8">Chargement de la galerie UI...</div>}>
        <DevUiGallery />
      </React.Suspense>
    }
  />
)}
```

### 5.2 Preuve de l'Élimination en Production (Tree-Shaking)
Lors de l'exécution de `npm run build` (`tsc -b && vite build`) :
1. Recherche de la chaîne de test dans tout le répertoire `frontend/dist` :
```powershell
Get-ChildItem -Path frontend/dist -Recurse | Select-String -Pattern "FORSA_DEV_UI_GALLERY_ISOLATED_SECRET_PROOFTAG_R0"
# Résultat : 0 correspondance
```
2. Recherche du nom du composant `DevUiGallery` dans `frontend/dist` :
```powershell
Get-ChildItem -Path frontend/dist -Recurse | Select-String -Pattern "DevUiGallery"
# Résultat : 0 correspondance
```
**Conclusion :** Le code de la galerie et la route `/dev/ui` sont 100% absents du bundle de production.

---

## 6. Preuves de Compilation & Métriques

### 6.1 Sortie de `npm run build`
```text
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.3.8 building client environment for production...
transforming...
✓ 2245 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                       0.79 kB │ gzip:   0.42 kB
dist/assets/811_imgPhotoProduit3-Bsn3SCoB.png         4.38 kB
dist/assets/811_imgPhotoProduit1-yDQXraUr.png         6.08 kB
dist/assets/default-avatar-B8k1NdXT.jpg               7.25 kB
dist/assets/811_imgFondDeCarte-B22f6OTp.svg          77.38 kB │ gzip:  31.27 kB
dist/assets/login-bg-CUWhhT3-.png                   504.53 kB
dist/assets/825_imgIllustrationAide-HT4idZ4y.png  1,194.51 kB
dist/assets/index-BzrtmsKI.css                       89.21 kB │ gzip:  16.07 kB
dist/assets/index-DLRB4I6p.js                       805.88 kB │ gzip: 214.93 kB
✓ built in 13.92s
```

### 6.2 Métriques Chunks
- **JS Principal (`index-DLRB4I6p.js`) :** 805.88 kB (gzip: 214.93 kB)
- **CSS Principal (`index-BzrtmsKI.css`) :** 89.21 kB (gzip: 16.07 kB)
- **Erreurs TypeScript :** 0
- **Avertissements bloquants :** 0

---

## 7. Questions & Décisions Prises

1. **Version de React & Leaflet :** Le projet tourne sous React 19 (`^19.3.1`). En conséquence, la dépendance `react-leaflet` a été installée en version 5 (`^5.0.0`), pleinement compatible avec l'architecture React 19 et Leaflet.
2. **Isolation des composants :** Aucun écran existant n'a été modifié durant le Lot R0 (conformément aux règles du prompt). La migration de `ShopEditPage.tsx` ou des autres écrans vers ces composants partagés interviendra dans les lots ultérieurs.
3. **Tests frontend :** Aucun test runner (Jest/Vitest) n'étant configuré dans `frontend/package.json`, aucun outil n'a été installé conformément à la règle stricte du lot. La compilation stricte TypeScript (`tsc -b`) et le build Vite production font foi.
