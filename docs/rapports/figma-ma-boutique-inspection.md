# Rapport d'Inspection Figma — Section MS1 : Ma boutique

> **Fichier Figma :** `yX4WMqraIaBSVKibnrCeat`  
> **Section ID :** `1154:25531` ("MS1 — Ma boutique")  
> **Date d'inspection :** 23 novembre 2026  
> **Statut :** Validé et documenté

---

## 1. Vue d'ensemble & Inventaire des Écrans

La section **MS1 — Ma boutique** comprend **7 frames Figma** couvrant les 4 états fonctionnels de la page de gestion/modification de la boutique par le commerçant, déclinés sur Desktop (1440px) et Mobile (390px).

| # | Node ID | Nom de la Frame Figma | Format | Dimensions | Usage / État |
|---|---------|----------------------|--------|------------|--------------|
| 1 | `1154:25532` | Desktop · Ma boutique — Modifier | Desktop | 1440 × 1024 px | État nominal / initial en édition |
| 2 | `1154:25702` | Desktop · Ma boutique — Adresse introuvable | Desktop | 1440 × 1024 px | Erreur de géocodage / validation adresse |
| 3 | `1154:25874` | Desktop · Ma boutique — Carte indisponible | Desktop | 1440 × 1041 px | Dégradation technique du service cartographique |
| 4 | `1154:26058` | Desktop · Ma boutique — Modifications enregistrées | Desktop | 1440 × 1041 px | Confirmation de succès après sauvegarde |
| 5 | `1154:26236` | Mobile · Ma boutique — Modifier | Mobile | 390 × 1401 px | État nominal / initial en édition sur mobile |
| 6 | `1154:26356` | Mobile · Ma boutique — Adresse introuvable | Mobile | 390 × 1405 px | Erreur adresse / repère non placé sur mobile |
| 7 | `1154:26478` | Mobile · Ma boutique — Carte indisponible | Mobile | 390 × 1565 px | Dégradation technique cartographique sur mobile |

---

## 2. Tokens de Design & Fondations

### 2.1 Palette de Couleurs

| Catégorie | Valeur HEX / RGBA | Rôle & Éléments cibles |
|-----------|-------------------|------------------------|
| **Fond d'application** | `#fffaf0` | Background principal de la page entière (Desktop et Mobile) |
| **Vert Sombre Primaire** | `#0b2c25` | Sidebar, titres h1/h2, labels, texte principal, bouton Enregistrer, icônes |
| **Vert Émeraude Secondaire** | `#17664e` | Focus bordure input adresse, pastille "Position détectée", avatar, texte bannière succès |
| **Bordure Carte / Succès** | `#dbf0dd` | Bordure standard des cartes (1.5px), bordure avatar |
| **Bordure Neutre Input** | `#e8ebdf` | Bordure par défaut des inputs (1px), badge icône en-tête carte, bouton retour mobile |
| **Bordure Succès Bannière** | `#a9d3a0` | Bordure de la bannière succès (1px) |
| **Fond Succès / Mint clair** | `#eef7ec` | Fond pastille position détectée, fond badge icône carte, fond avatar, fond bannière succès |
| **Fond Carte Map (nominal)** | `#dfeadb` | Fond du canvas SVG / placeholder de carte active |
| **Blanc pur** | `#ffffff` | Cartes blanches, inputs blancs, bouton Annuler, bouton Déconnexion, routes sur carte |
| **Erreur Rouge** | `#b3261e` | Bordure input adresse en erreur (2px), message d'erreur, pastille "Position non détectée" |
| **Fond Erreur clair** | `#fdecea` | Fond de la pastille "Position non détectée" |
| **Avertissement Ambre** | `#8a5a00` | Texte & pastille "Position à confirmer", texte titre bannière avertissement |
| **Fond Avertissement** | `#fff4dc` | Fond bannière service de cartes indisponible, fond pastille avertissement |
| **Bordure Avertissement** | `#f0cf8f` | Bordure de la bannière d'avertissement carte indisponible |
| **Fond Carte Indisponible** | `#ecebe6` | Fond gris-beige du conteneur de carte lorsque le service est down |
| **Texte secondaire (70%)** | `rgba(11, 44, 37, 0.7)` | Sous-titres, texte d'aide, descriptions des états vides et bannières |
| **Texte secondaire (80%)** | `rgba(11, 44, 37, 0.8)` | Sous-titre Desktop de page |
| **Routes de carte simulées**| `rgba(255, 255, 255, 0.75)` | Tracés de voirie superposés dans le placeholder de carte |

### 2.2 Typographie (Police : Poppins)

| Usage | Taille | Graisse (Weight) | Couleur |
|-------|--------|------------------|---------|
| **Fil d'Ariane (Breadcrumb)** | 11px | Regular (400) | `#0b2c25` |
| **Logo Sidebar (FORSA)** | 19px | ExtraBold (800) | `#ffffff` |
| **Navigation Sidebar** | 14px | SemiBold (600) | `#ffffff` (inactif) / `#0b2c25` (actif) |
| **Bouton Déconnexion Sidebar**| 14px | Medium (500) | `#0b2c25` |
| **Titre Page Desktop (H1)** | 48px | SemiBold (600) | `#0b2c25` |
| **Sous-titre Page Desktop** | 20px | Regular (400) | `rgba(11, 44, 37, 0.8)` |
| **Titre Page Mobile** | 20px | Medium (500) | `#0b2c25` |
| **Sous-titre Page Mobile** | 13px | Regular (400) | `rgba(11, 44, 37, 0.7)` |
| **Titre de Carte (Desktop)** | 20px | Medium (500) | `#0b2c25` |
| **Titre de Carte (Mobile)** | 18px | SemiBold (600) | `#0b2c25` |
| **Labels des formulaires** | 14px | Medium (500) | `#0b2c25` |
| **Valeurs / Contenu Inputs** | 15px | Regular (400) | `#0b2c25` |
| **Texte d'aide (Helper)** | 12px | Regular (400) | `rgba(11, 44, 37, 0.7)` |
| **Message d'erreur validation** | 13px | Regular (400) | `#b3261e` |
| **Pastille / Badge état** | 12px | Medium (500) | `#17664e` / `#b3261e` / `#8a5a00` |
| **Étiquette adresse sur carte** | 12px | Medium (500) | `#0b2c25` |
| **Titre État Carte / Bannière**| 15px | SemiBold (600) | `#0b2c25` / `#17664e` / `#8a5a00` |
| **Texte État Carte / Bannière**| 13px | Regular (400) | `rgba(11, 44, 37, 0.7)` |
| **Boutons d'action** | 15px | Medium (500) | `#ffffff` (Enregistrer) / `#0b2c25` (Annuler, Réessayer) |
| **Monogramme Avatar** | 15px | SemiBold (600) | `#17664e` |

### 2.3 Rayons de courbure (Border Radius)

| Valeur | Éléments d'application |
|--------|------------------------|
| `rounded-[40px]` (`rounded-tr-[40px] rounded-br-[40px]`) | Sidebar Commerçant Desktop |
| `rounded-[28px]` (`rounded-tl-[28px] rounded-bl-[28px]`) | Élément actif du menu latéral ("Compte") |
| `rounded-[24px]` | Cartes blanches principales (Informations & Carte) |
| `rounded-[16px]` | Conteneur de carte géographique, Bannières d'alerte / succès / warning |
| `rounded-[14px]` | Inputs de formulaire, Boutons principaux et secondaires, Bouton Déconnexion |
| `rounded-[100px]` (full pill) | Badges icônes d'en-tête, Pastilles d'état, Avatar utilisateur, Repère sur carte, Étiquette d'adresse, Bouton retour mobile |

### 2.4 Espacements & Gaps Clés

| Contexte | Propriété | Valeur |
|----------|-----------|--------|
| **Desktop Layout Global** | Left Sidebar width / Left Content offset | `w-[238px]`, content `left-[278px]` (marge interne 40px) |
| **Desktop Contenu principal** | Gap vertical entre blocs | `gap-[28px]` (entre en-tête, bannière, colonnes, actions) |
| **Desktop Colonnes** | Gap horizontal entre cartes | `gap-[28px]`, Carte 1: `w-[640px]`, Carte 2: `flex-[1_0_0]` (454px) |
| **Desktop Carte Padding** | Padding interne | `p-[28px]` |
| **Mobile Layout Global** | Padding global | `pt-[64px] pb-[36px] px-[20px]`, `gap-[18px]` |
| **Mobile Carte Padding** | Padding interne | `p-[20px]`, `gap-[22px]` |
| **Formulaire - Éléments** | Gap vertical entre champs | `gap-[18px]` (Desktop), `gap-[16px]` (Mobile) |
| **Formulaire - Label / Input**| Gap vertical | `gap-[8px]` |
| **Formulaire - Inputs côte à côte** | Gap horizontal (Catégorie & RC, Ouverture & Fermeture) | `gap-[16px]` (Desktop) ; Sur mobile Catégorie & RC sont empilés verticalement |
| **Inputs - Padding interne**| Padding | `px-[16px] py-[15px]`, `gap-[12px]` |
| **Boutons - Padding** | Padding | `px-[26px] py-[14px]`, `gap-[10px]` |
| **Bannières - Padding** | Padding | `p-[18px]`, `gap-[14px]` |
| **Carte Map - Hauteur** | Hauteur conteneur carte | `h-[260px]` (Desktop), `h-[170px]` (Mobile) |

---

## 3. Structure Détaillée des Composants

### 3.1 Sidebar Latérale (Desktop Commerçant)
- **Position & Taille :** `fixed/absolute`, `w-[238px]`, `h-[1024px]` (ou 1041px selon la hauteur totale), `bg-[#0b2c25]`, bordures droites arrondies à `40px`.
- **Marque :** Texte "FORSA" en Poppins ExtraBold 19px blanc, placé à `top-[64px] left-[75px]`.
- **Navigation (`top-[190px] left-[20px] w-[218px]`, `gap-[10px]`) :**
  1. *Tableau de bord* : icône 20px `icon/dash`, texte 14px SemiBold blanc, hauteur 56px, `pl-[34px] pr-[12px]`.
  2. *Ajouter une offre* : icône 20px `icon/add`, texte 14px SemiBold blanc.
  3. *Avis* : icône 20px `icon/star`, texte 14px SemiBold blanc.
  4. *Compte* (Actif dans cette maquette) : `bg-[#fffaf0]` (reprend le fond de la page), texte `#0b2c25`, coins gauches arrondis `rounded-tl-[28px] rounded-bl-[28px]`, icône `icon/user` sombre.
  5. *Réservations* : icône 20px `icon/cal`, texte 14px SemiBold blanc.
- **Pied de sidebar :** Bouton blanc `Déconnexion`, `top-[930px]/top-[947px] left-[37px]`, `px-[20px] py-[12px]`, `rounded-[14px]`, icône 18px `icon/logout`, texte 14px Medium `#0b2c25`.

### 3.2 En-tête de Page

#### Version Desktop
- **Fil d'Ariane (Breadcrumb) :** `Mon espace / Ma boutique` (Poppins Regular 11px `#0b2c25`).
- **Titre (H1) :** `Ma boutique` (Poppins SemiBold 48px `#0b2c25`).
- **Sous-titre :** `Présentez votre commerce et sa localisation à vos clients` (Poppins Regular 20px `rgba(11,44,37,0.8)`).
- **Zone Profil droite :**
  - Cloche de notification (icône 28px `icon/bell`).
  - Avatar circulaire 48×48px (`bg-[#eef7ec]`, bordure 1px `#dbf0dd`), initiales "MG" en Poppins SemiBold 15px `#17664e`.

#### Version Mobile
- **Barre supérieure :** Horloge iOS "9:41" (14px SemiBold `#0b2c25` à `top-[22px] left-[28px]`).
- **Ligne Titre & Navigation :**
  - Bouton rond Retour 40×40px (`bg-white`, bordure `#e8ebdf`, icône flèche gauche 20px `icon/back`).
  - Bloc titre empilé : Titre `Ma boutique` (Poppins Medium 20px) + Sous-titre `Modifiez les informations de votre commerce` (Poppins Regular 13px).

### 3.3 Carte 1 : Informations du commerce
- **Conteneur :** Fond blanc, bordure 1.5px `#dbf0dd`, arrondi 24px, padding 28px (20px sur mobile).
- **En-tête de carte :**
  - Pastille badge ronde (`bg-[#eef7ec]`, bordure 1px `#e8ebdf`, padding 10px) avec icône 20px commerce `icon/building`.
  - Titre : `Informations du commerce` (20px Medium Desktop / 18px SemiBold Mobile).
- **Champs du formulaire :**
  1. **Nom du commerce :** Label 14px Medium. Input avec icône gauche `icon/building` 20px. Valeur : `Maison Gourmande`.
  2. **Catégorie :** Label 14px Medium. Input sélecteur avec chevron bas `icon/down` 18px à droite. Valeur : `Boulangerie – Pâtisserie`.
  3. **N° de registre de commerce :** Label 14px Medium. Input avec icône gauche `icon/file` 20px. Valeur : `16/00-0123456 B 21`.
  4. **Téléphone du commerce :** Label 14px Medium. Input avec icône gauche `icon/phone` 20px. Valeur : `+213 555 12 34 56`.
  5. **Adresse du commerce :** Label 14px Medium. Input avec icône gauche `icon/pin` 20px.
     - *État nominal :* Bordure 2px `#17664e` (focus actif). Texte helper sous l'input : `Le repère sur la carte est placé automatiquement à partir de cette adresse.` (12px Regular `rgba(11,44,37,0.7)`).
     - *État erreur :* Bordure 2px `#b3261e`. Message sous l'input avec icône 16px `icon/alertc` rouge et texte `Adresse introuvable. Vérifiez la rue et la ville, ou précisez la commune.` (13px Regular `#b3261e`).
     - *État enregistré :* Bordure standard 1px `#e8ebdf`.
  6. **Horaires (Ouverture & Fermeture) :** Deux champs affichés côte à côte (sur Desktop et Mobile). Chacun avec icône 20px `icon/clock`. Valeurs par défaut : `08:00` et `20:00`.

### 3.4 Carte 2 : Localisation sur la carte
- **Conteneur :** Fond blanc, bordure 1.5px `#dbf0dd`, arrondi 24px, padding 28px (20px sur mobile).
- **En-tête de carte :**
  - Pastille badge ronde (`bg-[#eef7ec]`, bordure `#e8ebdf`, p-10px) avec icône `icon/pin`.
  - Titre : `Localisation sur la carte` (Desktop) / `Localisation` (Mobile).
- **Conteneur Map (`h-[260px]` Desktop / `h-[170px]` Mobile, arrondi 16px) :**
  - **A. État Nominal / Sauvegardé (`Carte — ok`) :**
    - Fond cartographique `#dfeadb` avec tracés de routes simulées en blanc semi-transparent (`rgba(255,255,255,0.75)`).
    - Repère centré : Pastille circulaire `#0b2c25` (padding 14px) avec icône pin blanche 24px (`icon/pin`).
    - Étiquette d'adresse flottante : Pilule blanche (`rounded-[100px]`, `px-[12px] py-[6px]`), texte 12px Medium `#0b2c25` : `12 Rue des Fleurs, Boumerdès`.
    - Pastille sous carte : `bg-[#eef7ec]`, texte `#17664e` 12px Medium `Position détectée`.
    - Note explicative (Desktop) : `Les clients proches de vous verront votre commerce sur la carte et dans les résultats.` (13px Regular).
  - **B. État Adresse Introuvable (`Carte — empty`) :**
    - Fond cartographique `#dfeadb` sans routes.
    - Icône pin centrale 34px (`icon/pin`).
    - Titre centré : `Aucune position trouvée` (15px SemiBold `#0b2c25`).
    - Sous-titre centré : `Saisissez une adresse valide pour afficher le repère.` (13px Regular `rgba(11,44,37,0.7)`).
    - Pastille sous carte : `bg-[#fdecea]`, texte `#b3261e` 12px Medium `Position non détectée`.
    - Note explicative (Desktop) : `Corrigez l’adresse pour que les clients puissent vous trouver sur la carte.`
  - **C. État Carte Indisponible (`Carte — down`) :**
    - Fond gris-neutre `#ecebe6`.
    - Icône centrale wifi désactivé 34px `icon/wifioff`.
    - Titre centré : `Carte indisponible` (15px SemiBold `#0b2c25`).
    - Sous-titre centré : `Réessayez dans quelques instants.` (13px Regular).
    - Bouton d'action intégré : `Bouton — Réessayer` (`bg-white`, bordure 1.5px `#0b2c25`, arrondi 14px, `px-[26px] py-[14px]`, icône 18px `icon/refresh`, texte 15px Medium `#0b2c25`).
    - Pastille sous carte : `bg-[#fff4dc]`, texte `#8a5a00` 12px Medium `Position à confirmer`.
    - Note explicative (Desktop) : `Les clients proches de vous verront votre commerce sur la carte et dans les résultats.`

### 3.5 Bannières d'alerte contextuelles (Pleine largeur sous l'en-tête)
- **Bannière Avertissement (Carte indisponible) :**
  - Fond `#fff4dc`, bordure 1px `#f0cf8f`, arrondi 16px, padding 18px.
  - Icône gauche 22px warning `icon/alert`.
  - Titre : `Le service de cartes est momentanément indisponible.` (15px SemiBold `#8a5a00`).
  - Description : `Vous pouvez enregistrer vos informations : la position sur la carte sera confirmée plus tard.` (13px Regular `rgba(11,44,37,0.7)`).
- **Bannière Succès (Modifications enregistrées) :**
  - Fond `#eef7ec`, bordure 1px `#a9d3a0`, arrondi 16px, padding 18px.
  - Icône gauche 22px check `icon/check` verte.
  - Titre : `Votre boutique a été mise à jour.` (15px SemiBold `#17664e`).
  - Description : `Les clients voient déjà vos nouvelles informations.` (13px Regular `rgba(11,44,37,0.7)`).

### 3.6 Boutons d'Action Principaux
- **Bouton Enregistrer les modifications :**
  - Fond `#0b2c25`, texte blanc 15px Medium, arrondi 14px, padding `px-[26px] py-[14px]`, icône gauche 18px `icon/check`.
  - *Comportement désactivé :* Dans l'état "Adresse introuvable", le bouton a une opacité réduite à 45% (`opacity-45`), indiquant l'interdiction de sauvegarde tant que l'adresse est invalide.
  - *Comportement actif :* Dans les états nominal, carte indisponible et succès, le bouton est 100% opaque et cliquable.
- **Bouton Annuler :**
  - Fond blanc, bordure 1.5px `#0b2c25`, texte 15px Medium `#0b2c25`, arrondi 14px, padding `px-[26px] py-[14px]`.

---

## 4. Matrice des 4 États Fonctionnels

| Critère d'état | 1. Nominal ("Modifier") | 2. Adresse introuvable | 3. Carte indisponible | 4. Modifications enregistrées |
|----------------|-------------------------|------------------------|-----------------------|------------------------------|
| **Bannière supérieure** | Aucune | Aucune | Jaune-Ambre (`#fff4dc`) avertissement service carte | Verte (`#eef7ec`) confirmation succès |
| **Bordure Input Adresse** | `border-2 border-[#17664e]` (focus) | `border-2 border-[#b3261e]` (erreur) | `border border-[#e8ebdf]` (défaut) | `border border-[#e8ebdf]` (défaut) |
| **Sous-texte Adresse** | Helper neutre (70% opacité) | Message d'erreur rouge + icône alertc | Helper neutre | Helper neutre |
| **Visuel Carte** | Fond `#dfeadb`, routes blanches, repère épingle + étiquette | Fond `#dfeadb`, icône pin 34px, titre & description vide | Fond gris `#ecebe6`, icône wifioff 34px + bouton Réessayer | Fond `#dfeadb`, routes blanches, repère épingle + étiquette |
| **Pastille Localisation** | Vert (`#eef7ec`) "Position détectée" | Rouge (`#fdecea`) "Position non détectée" | Ambre (`#fff4dc`) "Position à confirmer" | Vert (`#eef7ec`) "Position détectée" |
| **Texte sous pastille** | "Les clients proches de vous..." | "Corrigez l’adresse pour que les clients..." | "Les clients proches de vous..." | "Les clients proches de vous..." |
| **Bouton Enregistrer** | Actif (`opacity-100`) | **Désactivé (`opacity-45`)** | Actif (`opacity-100`) | Actif (`opacity-100`) |
| **Bouton Réessayer Carte** | Non présent | Non présent | **Présent dans le cadre carte** | Non présent |

---

## 5. Matrice Responsive : Différences Desktop vs Mobile

| Élément | Desktop (1440px) | Mobile (390px) | Notes d'intégration |
|---------|------------------|----------------|---------------------|
| **Navigation globale** | Sidebar fixe 238px avec menu complet & déconnexion | Barre supérieure avec bouton rond retour 40px | Pas de sidebar sur mobile dans cette vue |
| **Disposition principale** | 2 colonnes (`w-[640px]` + `flex-1`) côte à côte | 1 colonne verticale empilée (`w-full`) | Sur mobile la carte passe sous les infos |
| **Taille H1 / Titre** | 48px SemiBold | 20px Medium | Évite les débordements sur écran 390px |
| **Sous-titre** | 20px Regular | 13px Regular | Texte plus compact adapté au format mobile |
| **Champs Catégorie & RC** | Disposés en ligne (flex row, 2 colonnes égales) | Disposés en colonne (flex col, empilés verticalement) | Gain de lisibilité sur écran étroit |
| **Champs Horaires (Ouv/Ferm)**| 2 colonnes (flex row) | 2 colonnes (flex row maintenu) | Les heures courtes (08:00) tiennent sur 1 ligne |
| **Hauteur du conteneur carte**| `h-[260px]` | `h-[170px]` | Réduit pour préserver la hauteur visible |
| **Titre de la carte Localisation**| `Localisation sur la carte` (20px Medium) | `Localisation` (18px SemiBold) | Libellé raccourci |
| **Note d'aide sous pastille** | Présente sous la pastille de carte | **Absente sur mobile** | Allègement visuel sur petit écran |
| **Position des boutons d'actions**| En bas de page, alignés à droite horizontalement | En bas de page, pleine largeur empilés verticalement | "Enregistrer" en haut, "Annuler" en bas |
| **Ordre des boutons d'actions**| [ Annuler ] [ Enregistrer les modifications ] | [ Enregistrer les modifications ]<br>[ Annuler ] | Standard UX mobile (action primaire au pouce) |

---

## 6. Catalogue des Assets et Icônes Figma

Tous les assets vectoriels nécessaires ont été extraits et sauvegardés localement dans le dossier :  
`frontend/src/assets/icons/figma/`

| Nom du fichier local | Type / Rôle | Taille de rendu | Source Node Figma |
|----------------------|-------------|-----------------|-------------------|
| `boutique-building.svg` | Icône boutique / commerce | 20 × 20 px | `114:16322` |
| `boutique-pin.svg` | Repère / géolocalisation input et badge | 20 × 20 px | `2:14757` |
| `boutique-pin-large.svg`| Épingle sur carte (état nominal) | 24 × 24 px | `2:14757` |
| `boutique-pin-empty.svg`| Épingle état vide / adresse introuvable | 34 × 34 px | `2:14757` |
| `boutique-alertc.svg` | Icône cercle d'erreur (adresse introuvable) | 16 × 16 px | `2:6389` |
| `boutique-alert-warn.svg`| Icône avertissement bannière | 22 × 22 px | `114:14651` |
| `boutique-wifioff.svg` | Icône service carte coupé | 34 × 34 px | `2:23366` |
| `boutique-refresh.svg` | Icône bouton réessayer carte | 18 × 18 px | `114:19809` |
| `boutique-check-success.svg`| Icône bannière succès verte | 22 × 22 px | `2:8118` |
| `boutique-check.svg` | Icône coche bouton enregistrer | 18 × 18 px | `2:8118` |
| `boutique-back.svg` | Icône flèche retour mobile | 20 × 20 px | `114:13944` |
| `boutique-chevron-down.svg`| Icône sélecteur catégorie | 18 × 18 px | `114:13963` |
| `boutique-file.svg` | Icône registre de commerce | 20 × 20 px | `2:9299` |
| `boutique-phone.svg` | Icône téléphone commerce | 20 × 20 px | `630:9165` |
| `boutique-clock.svg` | Icône horaires ouverture/fermeture | 20 × 20 px | `2:738` |
| `boutique-dash.svg` | Icône navigation tableau de bord | 20 × 20 px | `2:2986` |
| `boutique-add.svg` | Icône navigation ajouter offre | 20 × 20 px | `114:14544` |
| `boutique-star.svg` | Icône navigation avis | 20 × 20 px | `2:2510` |
| `boutique-user.svg` | Icône navigation compte | 20 × 20 px | `2:8353` |
| `boutique-cal.svg` | Icône navigation réservations | 20 × 20 px | `2:860` |
| `boutique-logout.svg` | Icône bouton déconnexion | 18 × 18 px | `2:12994` |
| `boutique-bell.svg` | Icône notifications en-tête | 28 × 28 px | `2:6335` |

---

## 7. Recommandations d'Implémentation React / TypeScript / Tailwind

1. **Architecture de Composants suggérée :**
   - `ShopFormView.tsx` : Composant conteneur gérant l'état (`nominal`, `addressError`, `mapError`, `success`).
   - `ShopInformationCard.tsx` : Carte des données commerçant (Nom, Catégorie, RC, Téléphone, Adresse, Horaires).
   - `ShopMapCard.tsx` : Carte géographique dynamique avec simulation de dégradation (`Carte — ok`, `Carte — empty`, `Carte — down`).
   - `ShopBanner.tsx` : Bannière conditionnelle (succès ou avertissement selon le contexte).
   - `ShopActions.tsx` : Bloc des boutons Annuler / Enregistrer (avec gestion disabled `opacity-45`).

2. **Accessibilité & UX :**
   - L'input adresse doit posséder `aria-invalid="true"` et `aria-describedby="address-error"` en cas d'adresse introuvable.
   - Les boutons d'action doivent avoir `disabled={isSubmitting || addressInvalid}` synchronisé avec la classe `opacity-45 cursor-not-allowed`.
   - Les pastilles d'état de localisation doivent posséder `role="status"`.

3. **Responsive :**
   - Utiliser Tailwind flexbox : `flex flex-col lg:flex-row gap-[28px]`.
   - Ordre des boutons mobile inversé : `flex flex-col-reverse lg:flex-row`.
