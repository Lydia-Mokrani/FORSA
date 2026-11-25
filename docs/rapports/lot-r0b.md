# Rapport d'Implémentation — Lot R0b : Composants Partagés Manquants & Token Auth Background

> **Branche Git :** `feat/ms1-telegram-auth`  
> **Date :** 25 novembre 2026  
> **Périmètre :** Frontend uniquement (`frontend/src/components/ui/`, `frontend/src/dev/`, `frontend/tailwind.config.js`, `frontend/src/index.css`)  
> **Statut :** Validé (Build 100% propre, 34/34 tests passés, 0 erreur TypeScript, exclusion stricte prod vérifiée)

---

## 1. Inventaire des Composants Partagés R0b

| Composant | Fichier | Props Clés | Variantes & États | Accessibilité & Rôles |
|---|---|---|---|---|
| **Modal** | `Modal.tsx` | `isOpen`, `onClose`, `title`, `description`, `actions`, `closeOnEsc`, `closeOnBackdropClick`, `showCloseButton`, `size` ('sm'\|'md'\|'lg'\|'xl') | Desktop / Général. Fond blanc, bordure 1.5px `#dbf0dd`, rayon 24px (`rounded-ui-card`), ombre portée. Slots titre, description, actions. | `role="dialog"`, `aria-modal="true"`, focus trap actif (Tab / Shift+Tab), focus restauré à la fermeture, touche Échap |
| **BottomSheet** | `BottomSheet.tsx` | `isOpen`, `onClose`, `title`, `description`, `actions`, `showDragHandle`, `closeOnEsc`, `closeOnBackdropClick` | Mobile. Glisse depuis le bas de l'écran (`fixed bottom-0`), poignée tactile (drag handle `w-12 h-1.5`), coins supérieurs arrondis `rounded-t-[28px]`, padding optimisé pouce. | `role="dialog"`, `aria-modal="true"`, focus trap, fermeture tactile backdrop & Échap |
| **ResponsiveDialog** | `ResponsiveDialog.tsx` | Hérite des props `ModalProps` et `BottomSheetProps`, `mobileBreakpoint` (défaut `(min-width: 768px)`) | Wrapper adaptatif : bascule automatique entre `Modal` sur Desktop (>= 768px) et `BottomSheet` sur Mobile (< 768px). | Conforme WAI-ARIA selon la cible affichée |
| **Stepper** | `Stepper.tsx` | `steps: StepItem[]`, `current: number`, `orientation: 'horizontal' \| 'vertical'` | États par étape : `done` (pastille verte `#17664e` avec coche SVG blanche + trait vert), `current` (bordure 2px `#17664e` sur fond mint `#eef7ec` avec chiffre vert), `upcoming` (bordure `#e8ebdf` sur fond blanc avec chiffre gris). | `<nav aria-label="Étapes du parcours">`, `<ol>`, `aria-current="step"` sur l'étape courante |
| **Dropzone** | `Dropzone.tsx` | `accept` (défaut PDF, JPG, PNG), `maxBytes` (défaut 5 Mo), `onFile`, `error`, `value`, `label`, `helperText`, `disabled` | Zone à tirets (dashed), drag-and-drop natif + clic sélecteur. États : `default` (tirets `#e8ebdf`), `dragover` (tirets `#17664e` sur fond mint), `selected` (carte fichier avec icône, nom, taille et bouton suppression), `error` (tirets rouges `#b3261e` sur fond `#fdecea` + alerte). | `role="button"`, `aria-invalid`, `aria-label`, déclenchement clavier Enter / Espace |

---

## 2. Matrice de Conformité Figma

| Composant | Node ID Figma | Valeurs Vérifiées | Valeur Figma | Implémenté dans R0b | Statut (OK/Écart) |
|---|---|---|---|---|---|
| **Modal** | `1155:26072` | Backdrop, dimensions, rayon, bordures, typographie titre | Fond sombre opacité 40%, carte blanche 24px, bordure `#dbf0dd`, titre 20-22px SemiBold | `Modal.tsx` (`bg-ui-ink/40 backdrop-blur-xs`, `rounded-ui-card`, `border-ui-card-border`, `max-w-[520px]`) | OK (Conforme) |
| **BottomSheet** | Mobile inféré | Poignée supérieure, ancrage bas d'écran, rayon supérieur | Glissière bas d'écran, poignée tactile 48×6px arrondie, coins hauts 28px | `BottomSheet.tsx` (`rounded-t-[28px]`, `w-12 h-1.5`, `max-h-[85vh]`) | OK (Conforme) |
| **ResponsiveDialog** | Breakpoint md | Bascule Desktop/Mobile | Desktop modal centré / Mobile fiche basse | `ResponsiveDialog.tsx` via `window.matchMedia('(min-width: 768px)')` | OK (Conforme) |
| **Stepper** (Commerçant) | `1150:28236` | 3 étapes : Compte/Commerce/Documents ou Inscrit/Documents/Vérification | Pastilles 36-40px, coche blanche sur vert `#17664e`, trait connecteur | `Stepper.tsx` avec états done/current/upcoming et orientation h/v | OK (Conforme) |
| **Dropzone** | `1030:23441` / Doc frame | Zone tirets, icône upload, mention formats acceptés | Bordure tirets 2px, icône flèche upload, texte 14px, mention PDF/JPG/PNG 5 Mo | `Dropzone.tsx` avec pré-validation type + taille 5 Mo client | OK (Conforme) |

---

## 3. Décision Fond Authentification [DECISION HYB]

Conformément à la décision de Hyb, le fond photo/bokeh décoratif des pages d'authentification et de statut est standardisé vers la couleur unie **`#dce1d0`**.
- Ajout du token `ui.auth-bg` dans `frontend/tailwind.config.js` (`colors.ui.auth-bg: '#dce1d0'`).
- Ajout de la variable CSS dans `frontend/src/index.css` (`--color-ui-auth-bg: #dce1d0;` sous `@theme`).

### 3.1 Ratios de Contraste WCAG (Calculs exacts KaTeX / Luminance relative)

Pour la couleur d'arrière-plan $#dce1d0$ :
- Composantes sRGB : $R = 220/255 \approx 0.8627$, $G = 225/255 \approx 0.8824$, $B = 208/255 \approx 0.8157$
- Luminance relative $L_1 \approx 0.7338$
- Vert sombre texte `ui.ink` ($#0b2c25$) : Luminance $L_2 \approx 0.0195$
- **Contraste texte sur fond `#dce1d0` :**
  $$\frac{0.7338 + 0.05}{0.0195 + 0.05} = \frac{0.7838}{0.0695} \approx \mathbf{11.28 : 1}$$
  *(Dépasse largement le seuil WCAG AAA de 7.0:1).*
- **Contraste texte sur carte blanche (`#ffffff`) :**
  $$\frac{1.0000 + 0.05}{0.0195 + 0.05} = \frac{1.0500}{0.0695} \approx \mathbf{15.11 : 1}$$
  *(Conformité WCAG AAA).*
- **Contraste vert émeraude `ui.emerald` ($#17664e$) sur `#dce1d0` :**
  $$\frac{0.7338 + 0.05}{0.1110 + 0.05} = \frac{0.7838}{0.1610} \approx \mathbf{4.87 : 1}$$
  *(Conforme WCAG AA pour texte normal).*

*Note Figma :* Les maquettes Figma affichent encore le fond bokeh historique. Si l'équipe le souhaite, Hiba (propriétaire du compte Figma) pourra mettre à jour les frames.

---

## 4. Tests Unitaires & Couverture Vitest

3 nouveaux fichiers de tests créés dans `frontend/src/components/ui/` :
- `Modal.test.tsx` :
  1. Fermeture sur touche Échap (Escape)
  2. Respect du paramètre `closeOnEsc=false`
  3. Piège du focus (Focus Trap) lors de la navigation au clavier (Tab / Shift+Tab)
  4. Absence de rendu quand `isOpen=false`
- `Dropzone.test.tsx` :
  1. Refus immédiat d'un fichier dont le type n'est pas autorisé (`virus.exe` -> message d'erreur et rejet)
  2. Refus immédiat d'un fichier dépassant la taille maximale de 5 Mo (`6 Mo` -> message d'erreur et rejet)
  3. Acceptation d'un fichier conforme (`registre.pdf`) et affichage du récapitulatif
- `Stepper.test.tsx` :
  1. Présence de l'attribut `aria-current="step"` exclusivement sur l'étape courante
  2. Rendu fidèle de tous les titres et descriptions d'étapes

**Résultat Vitest :** 5 fichiers de tests exécutés, **34 tests passés sur 34 (100%)**.

---

## 5. Galerie Dev (`/dev/ui`) & Exclusion Production

La galerie `frontend/src/dev/DevUiGallery.tsx` a été enrichie avec :
- Section 8 : Démonstrateur interactif de `Modal`, `BottomSheet` et `ResponsiveDialog`.
- Section 9 : Démonstrateur de `Stepper` (modes horizontal et vertical, simulation des étapes).
- Section 10 : Démonstrateur de `Dropzone` avec simulation d'erreur et manipulation de fichiers.
- Section 11 : Démonstrateur du fond uni `ui.auth-bg`.
- Section 7 (Conteneur mobile 390px) : Intégration mobile de `Stepper`, `Dropzone` et déclencheur `ResponsiveDialog`.

**Preuve d'élimination en production (Tree-Shaking) :**
Recherche dans `frontend/dist` de `FORSA_DEV_UI_GALLERY_ISOLATED_SECRET_PROOFTAG_R0` :
**0 correspondance** (module totalement exclu du bundle final).
