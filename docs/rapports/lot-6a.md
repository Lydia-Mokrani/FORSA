# FORSA — Rapport de Réalisation : Lot 6A (Ma boutique)

> **Date :** 23 novembre 2026  
> **Branche Git :** `feat/ms1-telegram-auth`  
> **Auteur :** Antigravity Agent  
> **Périmètre :** Frontend uniquement — Section « Ma boutique » (`/merchant/shop`)

---

## 1. Contexte & Objectif du Lot 6A

Le Lot 6A concrétise l'implémentation de la section **« Ma boutique »** (`/merchant/shop`) pour les commerçants de la plateforme FORSA. 

Cette vue permet à un commerçant connecté (avec rôle `MERCHANT`) de :
- Consulter et mettre à jour les coordonnées de sa boutique (nom, catégorie, n° de registre de commerce, téléphone de contact, adresse physique).
- Définir ses horaires d'ouverture et de fermeture habituels.
- Visualiser la localisation géographique calculée de son établissement sur une carte interactive avec repère et étiquette d'adresse.
- Gérer les états dégradés (adresse non reconnue / introuvable, indisponibilité technique temporaire du service cartographique) et la confirmation de sauvegarde.

Conformément aux règles du Lot 6A :
- **Strictement frontend :** Aucune modification de schéma de base de données, de migration ou d'endpoint backend n'a été réalisée.
- **Source de vérité visuelle :** L'inspection intégrale des 7 frames Figma de la section MS1 — Ma boutique (`1154:25531`) a été effectuée exclusivement via le MCP Figma.
- **Règles de sécurité :** Utilisation systématique de `authFetch` (JWT avec gestion automatique du cycle de rafraîchissement) et aucun secret dans le code.

---

## 2. Synthèse de l'Inspection Figma MCP (Section `1154:25531`)

L'audit détaillé et les contextes de design ont été extraits et consignés dans `docs/rapports/figma-ma-boutique-inspection.md`.

### 2.1 Inventaire des 7 Frames Figma Inspectées

| # | Node ID | Nom exact dans Figma | Format | Dimensions | Rôle fonctionnel |
|---|---------|----------------------|--------|------------|------------------|
| 1 | `1154:25532` | `Desktop · Ma boutique — Modifier` | Desktop | 1440 × 1024 px | État nominal d'édition standard |
| 2 | `1154:25702` | `Desktop · Ma boutique — Adresse introuvable` | Desktop | 1440 × 1024 px | Erreur validation / géocodage de l'adresse |
| 3 | `1154:25874` | `Desktop · Ma boutique — Carte indisponible` | Desktop | 1440 × 1041 px | Dégradation technique du service de carte |
| 4 | `1154:26058` | `Desktop · Ma boutique — Modifications enregistrées` | Desktop | 1440 × 1041 px | Confirmation visuelle de succès |
| 5 | `1154:26236` | `Mobile · Ma boutique — Modifier` | Mobile | 390 × 1401 px | État nominal responsive mobile |
| 6 | `1154:26356` | `Mobile · Ma boutique — Adresse introuvable` | Mobile | 390 × 1405 px | Erreur adresse introuvable sur mobile |
| 7 | `1154:26478` | `Mobile · Ma boutique — Carte indisponible` | Mobile | 390 × 1565 px | Service carte indisponible sur mobile |

### 2.2 Tokens de Design Identifiés & Respectés
- **Fond d'application :** `#fffaf0` (crème chaud).
- **Couleurs Principales :**
  - Vert Forêt Primaire : `#0b2c25` (sidebar, typographies titres h1/h2, labels, bouton Enregistrer).
  - Vert Émeraude : `#17664e` (focus input adresse, badge pastille "Position détectée", avatar gérant).
  - Vert Clair / Mint : `#eef7ec` (fond des badges icônes, pastilles et bannière succès).
  - Bordures de cartes : `#dbf0dd` (1.5px solid).
  - Bordures inputs : `#e8ebdf` (1px solid).
  - Erreur : `#b3261e` (bordure 2px input adresse, message d'erreur, pastille "Position non détectée" `#fdecea`).
  - Avertissement : `#8a5a00` (bannière & pastille fond `#fff4dc`, bordure `#f0cf8f`).
- **Typographie (Poppins) :**
  - Desktop H1 : 48px SemiBold ; Mobile H1 : 20px Medium.
  - Titres de cartes : 20px Medium (Desktop) / 18px SemiBold (Mobile).
  - Labels : 14px Medium ; Inputs : 15px Regular ; Helpers : 12px Regular.
  - Boutons : 15px Medium ; Pastilles : 12px Medium.
- **Rayons de Courbure (Border Radius) :**
  - Cartes principales : `rounded-[24px]`.
  - Inputs & Boutons : `rounded-[14px]`.
  - Conteneur de carte géographique & Bannières : `rounded-[16px]`.
  - Badges, Pastilles, Avatar : `rounded-[100px]`.
  - Spécification `docs/FORSA_MS1_spec.md` §1 mise à jour : correction de la valeur obsolète de 20px vers 24px/32px.

---

## 3. Implémentation Frontend : `ShopEditPage.tsx`

Le composant a été créé dans `frontend/src/features/catalogue/pages/ShopEditPage.tsx` et enregistré sous la route `/merchant/shop` dans `frontend/src/App.tsx`.

### 3.1 Architecture & Responsive
- **Desktop (≥ 1024px) :**
  - En-tête avec fil d'Ariane (`Mon espace / Ma boutique`), H1 48px, sous-titre 20px, cloche de notifications et avatar "MG" 48×48px.
  - Disposition en **2 colonnes horizontales** :
    - Colonne 1 (`w-[640px]`) : Carte « Informations du commerce ».
    - Colonne 2 (`flex-1`) : Carte « Localisation sur la carte ».
  - Actions en bas à droite : `[ Annuler ]` puis `[ Enregistrer les modifications ]`.
- **Mobile (390px) :**
  - En-tête compact avec bouton retour circulaire 40px (`boutique-back.svg`), H1 20px et sous-titre 13px.
  - Disposition empilée en **1 colonne verticale** pleine largeur.
  - Catégorie et N° de registre de commerce disposés verticalement.
  - Actions empilées en bas de page dans l'ordre ergonomique mobile : `[ Enregistrer les modifications ]` au-dessus de `[ Annuler ]`.

### 3.2 Prise en Compte des 4 États Fonctionnels

```
                           ┌──────────────────────────────┐
                           │      État 1 : NOMINAL        │
                           │  - Input adresse focus vert  │
                           │  - Carte active + repère     │
                           │  - Pastille "détectée"       │
                           │  - Enregistrer actif         │
                           └──────────────┬───────────────┘
                                          │
                  ┌───────────────────────┼───────────────────────┐
                  ▼                       ▼                       ▼
      ┌──────────────────────┐┌──────────────────────┐┌──────────────────────┐
      │État 2: ADRESSE ERR   ││État 3: CARTE DOWN    ││État 4: ENREGISTRÉE   │
      │- Bordure rouge 2px   ││- Bannière ambre      ││- Bannière verte      │
      │- Erreur sous input   ││- Fond gris + wifioff ││- Données à jour      │
      │- Carte vide (no pin) ││- Bouton Réessayer    ││- Repère positionné   │
      │- Pastille non détecté││- Pastille à confirmer││- Enregistrer actif   │
      │- Enregistrer bloqué  ││- Enregistrer actif   │└──────────────────────┘
      │  (opacity-45)        │└──────────────────────┘
      └──────────────────────┘
```

1. **Nominal (`nominal`) :**
   - Champs éditables avec styles et icônes Figma dédiées (`icon/building`, `icon/chevron-down`, `icon/file`, `icon/phone`, `icon/pin`, `icon/clock`).
   - Carte avec voirie stylisée, repère circulaire vert forêt `#0b2c25` et étiquette d'adresse flottante blanche.
   - Pastille verte `Position détectée`.
   - Bouton `Enregistrer les modifications` actif.
2. **Adresse introuvable (`addressNotFound`) :**
   - Bordure de l'input adresse en rouge `border-2 border-[#b3261e]`.
   - Message d'alerte rouge avec icône `boutique-alertc.svg` : *« Adresse introuvable. Vérifiez la rue et la ville, ou précisez la commune. »*
   - Carte vide sans tracé de routes, avec icône épingle vide 34px (`boutique-pin-empty.svg`) et textes explicatifs.
   - Pastille rouge `Position non détectée`.
   - Bouton `Enregistrer les modifications` **désactivé** (`opacity-45 cursor-not-allowed`, `disabled={true}`).
3. **Carte indisponible (`mapUnavailable`) :**
   - Bannière d'avertissement ambre `#fff4dc` : *« Le service de cartes est momentanément indisponible. Vous pouvez enregistrer vos informations : la position sur la carte sera confirmée plus tard. »*
   - Conteneur de carte en fond gris `#ecebe6` avec icône 34px `boutique-wifioff.svg` et bouton interne `[ Réessayer ]`.
   - Pastille ambre `Position à confirmer`.
   - Bouton `Enregistrer les modifications` **actif** (l'utilisateur peut enregistrer son texte sans être bloqué par le service de carte).
4. **Modifications enregistrées (`saved`) :**
   - Bannière de succès verte `#eef7ec` : *« Votre boutique a été mise à jour. Les clients voient déjà vos nouvelles informations. »*
   - Carte et informations confirmées.

### 3.3 Contrôle Interactif pour Audit
Un bandeau discret de bascule rapide a été intégré en haut de page pour permettre aux évaluateurs et développeurs de tester instantanément les 4 états Figma (ou via le paramètre d'URL `?state=nominal|addressNotFound|mapUnavailable|saved`).

---

## 4. Corrections UI Réalisées (Phase 6)

1. **Sidebar Commerçant (`MerchantSidebar.tsx`) :**
   - Suppression du doublon "Réservations" et réalignement strict selon la navigation Figma :
     1. Tableau de bord (`/merchant/dashboard`)
     2. Ajouter une offre (`/merchant/create-offer`)
     3. Avis
     4. Compte (`/merchant/shop`)
     5. Réservations
2. **Libellés Formulaire :**
   - Absence totale de libellés tronqués : libellés explicites `Adresse du commerce` et `Horaires` (`Ouverture` / `Fermeture`).
3. **Titre de Carte :**
   - Carte 1 intitulée exactement `Informations du commerce` (et non `Informations du profil`).
4. **Spécification `docs/FORSA_MS1_spec.md` §1 :**
   - Correction du rayon de courbure des cartes à `24px` (ou `32px` selon le conteneur) avec mention explicite de l'inspection Figma.

---

## 5. Assets Vectoriels Figma Extraits

22 icônes SVG ont été téléchargées localement dans `frontend/src/assets/icons/figma/` pour garantir l'absence de toute URL Figma temporaire à l'exécution :
- `boutique-building.svg`, `boutique-pin.svg`, `boutique-pin-large.svg`, `boutique-pin-empty.svg`
- `boutique-alertc.svg`, `boutique-alert-warn.svg`, `boutique-wifioff.svg`, `boutique-refresh.svg`
- `boutique-check-success.svg`, `boutique-check.svg`, `boutique-back.svg`, `boutique-chevron-down.svg`
- `boutique-file.svg`, `boutique-phone.svg`, `boutique-clock.svg`, `boutique-dash.svg`
- `boutique-add.svg`, `boutique-star.svg`, `boutique-user.svg`, `boutique-cal.svg`, `boutique-logout.svg`, `boutique-bell.svg`

---

## 6. Vérifications & Preuves Techniques

| Vérification | Commande exécutée | Résultat | Preuve |
|---|---|---|---|
| **Contrôle TypeScript Frontend** | `npx tsc --noEmit --project frontend/tsconfig.json` | **0 erreur** (Code 0) | Sortie propre sans erreur de type |
| **Build Production Frontend** | `npm run build --prefix frontend` | **Succès** (Code 0) | Bundle Vite généré en 59.7s (`dist/assets/index-*.js`, `dist/assets/index-*.css`) |
| **Non-régression Backend** | `npx jest --config services/ms1-accounts/jest.config.json tests/unit` | **51/51 tests réussis** | Tests `telegram-auth`, `lot2b` et `validation` validés |
| **Contrat d'API Shop** | `services/ms1-accounts/src/controllers/shop.controller.ts` | **Conforme** | Endpoints `GET /api/shops/my` et `PUT /api/shops/my` connectés |

---

## 7. Conclusion

Le Lot 6A est achevé avec un respect scrupuleux des maquettes Figma MS1, des règles d'accessibilité et de responsive design, sans aucune altération du backend existant ni de la base de données.
