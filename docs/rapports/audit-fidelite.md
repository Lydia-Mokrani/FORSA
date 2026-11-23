# Audit de Fidélité Figma ↔ Frontend — MS1 FORSA

**Date** : 2026-11-23  
**Branche** : `feat/ms1-telegram-auth`  
**Source Figma** : fichier `yX4WMqraIaBSVKibnrCeat`, page `6:9` (canvas " nb")  
**Méthode** : MCP Figma (`get_metadata` node `6:9`) + lecture du code source frontend  
**Périmètre** : MS1 uniquement (auth, profil, boutique, statuts, mode, suppression)

---

## 1. Inventaire des frames MS1 sur la page 6:9

La page 6:9 contient un seul canvas nommé " nb" (`id: 6:9`, x=0 y=0 w=0 h=0) avec une **Section 1** (`1181:15813`) encadrant l'ensemble. Les sections MS1 identifiées sont :

### 1.1 Section `MS1` — Compte commerçant (`1150:28299`)

| Node-id | Nom de la frame | Format | Dimensions | État |
|---|---|---|---|---|
| `1150:28079` | Desktop · MS1 — Mon compte commerçant | Desktop | 1440×1062 | nominal |
| `1150:28236` | Desktop · MS1 — Compte commerçant en attente de validation | Desktop | 1440×1024 | pending (stepper 3 étapes) |

### 1.2 Section `MS1 — Ma boutique (F1.10 · F1.11 · F1.15)` (`1154:25531`)

| Node-id | Nom de la frame | Format | Dimensions | État |
|---|---|---|---|---|
| `1154:25532` | Desktop · Ma boutique — Modifier | Desktop | 1440×1024 | édition (carte info + MapBox) |
| `1154:25702` | Desktop · Ma boutique — Adresse introuvable | Desktop | 1440×1024 | erreur adresse (carte vide) |
| `1154:25874` | Desktop · Ma boutique — Carte indisponible | Desktop | 1440×1041 | erreur carte (bannière warn + Réessayer) |
| `1154:26058` | Desktop · Ma boutique — Modifications enregistrées | Desktop | 1440×1041 | succès (bannière success) |
| `1154:26236` | Mobile · Ma boutique — Modifier | Mobile | 390×1401 | édition mobile |
| `1154:26356` | Mobile · Ma boutique — Adresse introuvable | Mobile | 390×1405 | erreur adresse mobile |
| `1154:26478` | Mobile · Ma boutique — Carte indisponible | Mobile | 390×1565 | erreur carte mobile |

### 1.3 Section `MS1 — Changement de mode client ↔ commerçant (F1.18)` (`1155:25968`)

| Node-id | Nom de la frame | Format | Dimensions | État |
|---|---|---|---|---|
| `1155:25969` | Desktop · Mode — Passer en mode commerçant | Desktop | 1440×1024 | choix du mode (2 cards + bannière info) |
| `1155:26072` | Desktop · Mode — Confirmation · Passer en mode commerçant | Desktop | 1440×1024 | confirmation modal-like |
| Non récupérée | Desktop · Mode — Boutique non approuvée | Desktop | — | Non récupérée (hors offset lu) |
| Non récupérée | Desktop · Mode — Retour mode client | Desktop | — | Non récupérée |
| Non récupérée | Mobile · Mode (×3) | Mobile | — | Non récupérée |

> **Note** : Le dump MCP ne couvre que les 1 500 premières lignes de la section mode. Les frames au-delà de `1155:26072` (confirmations, mobile) n'ont pas été récupérées dans ce lot.

### 1.4 Sections non couvertes par le dump (hors offset)

Les sections suivantes existent dans Figma selon la spec §4 mais n'ont pas été lues dans le présent dump MCP (fichier de 20 000 lignes, lecture partielle) :

- **Login / inscription** (~47 frames) — section `login` : Non récupérée directement (nœuds trop loin dans le fichier)
- **Profil client** (~49 frames) — Non récupérée
- **Paramètres** (~8 frames) — Non récupérée
- **Statuts de validation** (~12 frames) — Non récupérée
- **Suppression / désactivation** (~9 frames) — Non récupérée

> Ces sections seront auditées par inférence depuis le code et la spec §4, les frames du dump partiel disponibles servant de référence de style.

---

## 2. Audit Login — Comparaison Figma ↔ Code (`LoginPage`, `RegisterPage`, `MerchantStatusPage`, `AccountSuspendedPage`)

Les frames login (≈47 écrans) ne sont pas récupérées directement depuis le dump MCP (trop profond dans le fichier). L'audit est effectué par comparaison entre la spec §4.1 et le code existant.

### 2.1 `LoginPage.tsx` — flux Telegram (étapes PHONE / WAITING_TELEGRAM / VERIFY_OTP / LOCKED)

| Étape/Frame Figma (inférée) | Composant code | Fidélité | Écart principal |
|---|---|---|---|
| Accueil · Choix du profil (toggle client/commerçant) | `LoginPage` step `PHONE` — toggle rôle pill | **OK** | Chip rôle présent, design glassmorphism conforme aux tokens Figma (#0B2C25, #17664E, #FFFAF0/28) |
| Connexion client — saisie numéro | `LoginPage` step `PHONE` — form | **Écart mineur** | Input h=56px ✓, rayon 14px ✓ ; prefix "+213" en texte statique au lieu d'un Field composant réutilisable ; pas de composant `Field` isolé |
| Saisie numéro — état erreur | `LoginPage` — `errorMessage` banner | **Écart mineur** | Bannière d'erreur inline (div) au lieu du composant `Banner` Figma ; couleur #B22222 au lieu du rouge spec #B3261E (delta 1 point) |
| Connexion commerçant — info banner | `LoginPage` step `PHONE` MERCHANT — info div | **Écart mineur** | Bloc info présent ; pas de composant `Banner` isolé variant `info` |
| Ouvrir Telegram — bouton + QR + attente | `LoginPage` step `WAITING_TELEGRAM` | **OK** | Bouton Telegram #229ED9 ✓, QRCodeSVG ✓, polling 2 s ✓, countdown ✓ |
| Ouvrir Telegram — état erreur | `LoginPage` step `WAITING_TELEGRAM` errorMessage | **OK** | Rendu conforme |
| Code OTP 6 cases | `LoginPage` step `VERIFY_OTP` — 6 inputs | **Écart mineur** | Cases h=64px mobile / 56px desktop code, Figma montre cases h~60px ; rayon `rounded-2xl` (16px) ✓ ; auto-focus ✓ ; auto-submit ✓ |
| OTP — état code invalide / tentatives | `LoginPage` — `attemptsLeft` | **OK** | Message dynamique nombre d'essais restants ✓ |
| OTP — état verrouillé (5 essais) | `LoginPage` step `LOCKED` | **OK** | Écran dédié avec bouton Recommencer ✓ |
| OTP — expiration / renvoi | `LoginPage` — `resendCooldown` + timer | **OK** | Cooldown 60s, timer 5 min ✓ |
| Succès connexion — modal overlay | `LoginPage` — `isSuccess` modal | **Écart mineur** | Modal overlay présent ; fond `bg-black/40` au lieu de fond Figma semi-transparent vert sombre ; icône checkmark ✓ |
| Compte suspendu — redirection | `LoginPage` → `navigate('/account/suspended')` | **OK** | Redirection correcte |
| `AccountSuspendedPage` | `AccountSuspendedPage.tsx` | **Écart mineur** | Fond bokeh + glassmorphism ✓ ; couleur badge `#D96B43` (ambre chaud) conforme spec ; **manque** : motif de suspension affiché (Figma montre un champ texte avec le motif réel) ; contact via mailto: au lieu du lien support intégré |
| `MerchantStatusPage` — PENDING | `MerchantStatusPage.tsx` status PENDING | **Écart mineur** | Icône horloge ✓ ; **manque** : stepper 3 étapes Figma (Inscrit → Documents envoyés → En cours de vérification) ; code montre résumé texte seul |
| `MerchantStatusPage` — APPROVED | `MerchantStatusPage.tsx` status APPROVED | **OK** | Icône checkmark ✓, CTA tableau de bord ✓ |
| `MerchantStatusPage` — REJECTED | `MerchantStatusPage.tsx` status REJECTED | **Écart mineur** | Icône ✕ texte (span emoji) au lieu de SVG Figma `icon/alertc` ; lien « re-dépôt » pointe vers `/register?role=merchant&step=3` (réinscription) au lieu d'une page `/merchant/documents` dédiée |
| `MerchantStatusPage` — SUSPENDED | `MerchantStatusPage.tsx` status SUSPENDED | **Écart mineur** | Redirection double (SUSPENDED dans MerchantStatusPage + AccountSuspendedPage) ; Figma montre un seul écran commerçant suspendu avec motif et bouton support |

### 2.2 `RegisterPage.tsx` — Inscription client et commerçant (3 étapes)

| Frame Figma (inférée) | Composant code | Fidélité | Écart principal |
|---|---|---|---|
| Inscription client — form | `RegisterPage` role CUSTOMER step `FORM` | **Écart mineur** | Champs nom + email + téléphone ✓ ; case CGU ✓ ; fond glassmorphism ✓ ; **manque** : validation e-mail en temps réel (Figma montre état erreur inline sur le Field) |
| Inscription client — Telegram (WAITING / OTP) | `RegisterPage` CUSTOMER `WAITING_TELEGRAM` / `VERIFY_OTP` | **OK** | Flux identique à LoginPage ✓ |
| Inscription commerçant — étape 1 Compte | `RegisterPage` MERCHANT step 1 | **OK** | Champs ownerName, email, phone, CGU ✓ |
| Inscription commerçant — étape 2 Commerce | `RegisterPage` MERCHANT step 2 | **Écart mineur** | Champs shopName, catégorie (select), registre, téléphone boutique ✓ ; **manque** : champ adresse + MapBox à l'étape 2 (Figma §4.1 : adresse à l'étape 2 ; code : adresse absente, déportée dans Ma boutique) |
| Inscription commerçant — étape 2 horaires | `RegisterPage` MERCHANT step 2 — `DEFAULT_OPENING_HOURS` | **Écart mineur** | Horaires par jour (7 jours) présents ; Figma montre 2 champs Ouverture/Fermeture simples (heure unique) ; code implémente un tableau complet jour par jour (enrichissement) |
| Inscription commerçant — étape 3 Documents | `RegisterPage` MERCHANT step 3 | **Écart mineur** | Dropzone SVG upload présente ; **manque** : composant `Dropzone` Figma avec zone drag-and-drop visuelle délimitée (tirets) ; **manque** : stepper visuel en haut de page indiquant l'étape courante |
| Inscription commerçant — Telegram auth | `RegisterPage` MERCHANT `merchantAuthStep` | **OK** | Flux OTP Telegram identique ✓ |
| États erreur formulaire | `RegisterPage` — `fieldErrors` | **Écart mineur** | Messages d'erreur inline présents ; **manque** : style Field composant (label flottant + bordure rouge + icône alerte) ; erreurs affichées en texte rouge brut sous l'input |

---

## 3. Audit Profil client et Paramètres

### 3.1 `ProfilePage.tsx` — Mon profil / Modifier le profil

| Frame Figma (inférée depuis spec §4.2) | Mode code | Fidélité | Écart principal |
|---|---|---|---|
| Desktop · Profil — Mon profil (état nominal) | `ProfilePage` viewMode `view` | **OK** | Breadcrumb ✓, titre "Mon profil" h1 48px ✓, fond `#FFFAF0` ✓, Sidebar client ✓ |
| Profil — Avatar + initiales | `ProfilePage` — avatar / initiales | **OK** | Avatar circulaire ✓, initiales calculées ✓, bouton appareil photo ✓ |
| Profil — Blocs info (nom, email, téléphone, localisation) | `ProfilePage` viewMode `view` — blocs | **Écart mineur** | Blocs présents avec icônes Figma ✓ ; **manque** : badge "Commerçant vérifié" Figma (chip vert) quand `roles` inclut MERCHANT |
| Profil — Bandeau téléphone non vérifié | `ProfilePage` — `!isPhoneVerified` banner | **Écart mineur** | Bandeau présent ; couleur et style non standardisés (div inline vs composant `Banner warn`) |
| Profil — Bandeau e-mail non vérifié | `ProfilePage` — `!isEmailVerified` | **Écart mineur** | Lien renvoi email présent ; **manque** : bandeau structuré type `Banner info` Figma avec CTA "Vérifier" proéminent |
| Profil — Bandeau compte suspendu | `ProfilePage` — `isSuspended` | **OK** | Redirection correcte vers `/account/suspended` |
| Profil — Profil incomplet | `ProfilePage` — `isProfileIncomplete` | **Écart mineur** | Détection incomplète (manque email et localisation dans la condition) |
| Modifier le profil — form | `ProfilePage` viewMode `edit` | **OK** | Champs fullName, email, phone, localisation ✓, boutons Enregistrer/Annuler ✓ |
| Modifier le profil — erreurs de validation | `ProfilePage` — `phoneError` / `emailError` | **Écart mineur** | Messages d'erreur affichés sous les inputs ; **manque** : composant `Field` avec bordure rouge + icône d'alerte comme en Figma |
| Modifier le profil — changements non enregistrés | `ProfilePage` — `hasUnsavedChanges` | **À refaire** | Variable calculée mais **pas de dialog de confirmation** si l'utilisateur quitte la page ; Figma prévoit une Modal de confirmation |
| Photo — choisir / recadrer | `ProfilePage` — `handleAvatarChange` | **Écart mineur** | Upload simple sans recadrage (crop) ; Figma montre un cropper intégré ; format webp accepté (non spécifié dans Figma) |
| Photo — fichier refusé | `ProfilePage` — `avatarError` | **Écart mineur** | Message d'erreur texte seul ; Figma montre un Banner error avec icône |
| Changer l'e-mail — 5 états | `ProfilePage` — `showEmailModal` | **À refaire** | Modal simple saisie seule ; Figma prévoit 5 états (saisie, envoi, vérifié, lien expiré, erreur conflit) ; seul l'état saisie est implémenté |
| Changer le numéro — flux 2 étapes Telegram | `ProfilePage` — `showPhoneOtpModal` / `phoneChangeStep` | **OK** | Flux 3 étapes (OTP actuel → nouveau numéro → liaison Telegram) ✓, polling ✓, erreurs ✓ |
| Paramètres (blocs Sécurité, Aide) | `ProfilePage` — blocs sécurité | **Absent du code** | La page profil inclut un bloc Paramètres/Sécurité (Figma : section séparée `/settings`) ; aucune page `/settings` ni `/settings/security` implémentée |

### 3.2 Paramètres client (`/settings`, `/settings/security`)

| Frame Figma (inférée depuis spec §4.3) | Code existant | Fidélité | Écart principal |
|---|---|---|---|
| Desktop · Paramètres — Vue d'ensemble | Absent | **Absent du code** | Aucune page `SettingsPage` implémentée |
| Desktop · Paramètres — Sécurité (sessions, Telegram lié) | Absent | **Absent du code** | `GET /auth/sessions` implémenté côté backend mais pas d'UI |
| Confirmation de déconnexion | `LoginPage` → `navigate('/login')` direct | **Absent du code** | Pas de dialog de confirmation ; déconnexion directe dans `ProfilePage.handleLogout` |
| Désactiver / Supprimer le compte (5D + 4M) | Absent | **Absent du code** | `POST /users/me/deactivate` et `DELETE /users/me` non implémentés côté backend ET frontend |

---

## 4. Composants communs — Inventaire Figma vs Code

### 4.1 Composants présents dans Figma et absents en tant que composants réutilisables

| Composant Figma | Variantes Figma | Statut code | Différence |
|---|---|---|---|
| **Button** | `primary` (#0B2C25), `secondary` (outline), `danger` (#B3261E), `dangerOutline`, `disabled` | Inline (`<button>` avec classes Tailwind) | **Absent** en tant que composant isolé ; chaque page redéfinit ses boutons ; pas de variante `danger` ni `dangerOutline` factorée |
| **Field** | `default`, `focused` (bordure verte), `error` (bordure rouge + icône + message), `disabled`, `success` | Inline (div + input + span) | **Absent** ; le pattern label+input+erreur est répété ~20× sans composant |
| **Card** | Carte info, Carte boutique, Carte stat | Inline (div avec classes) | **Absent** ; cartes déclarées à la volée (rayon variable : 20–32px selon la page) |
| **Banner** | `success` (vert), `warn` (ambre), `error` (rouge), `info` (bleu) | Inline divs | **Absent** ; couleurs inconsistantes entre pages (rouge `#B22222` vs `#B3261E`, ambre `#E89234` vs `#FFF4DC`) |
| **Chip** | `modeActuel` (vert pale), `vérification en cours` (ambre), `validé` (vert) | Inline spans | **Absent** en tant que composant ; plusieurs variantes inventées à la volée |
| **Modal** | Confirmation (desktop), Erreur confirmation | `showPhoneOtpModal` div inline, `isSuccess` div overlay | **Absent** ; pas de composant `Modal` réutilisable avec backdrop, focus trap, ESC |
| **BottomSheet** | Mobile : confirmation, erreur | Absent | **Totalement absent** du code |
| **Stepper** | 3 étapes (Figma `Roadmap — Étape`) | Absent | **Absent** ; `MerchantStatusPage` PENDING montre un résumé texte au lieu du stepper visuel |
| **Dropzone** | Zone drag-and-drop (tirets, icône upload, format accepté) | Upload `<input type="file">` simple | **Absent** ; drag-and-drop non implémenté |
| **MapBox** | Carte avec repère, état vide (aucune position), état erreur (icône wifi-off + Réessayer) | Absent | **Totalement absent** ; Ma boutique `/merchant/shop` non implémentée côté frontend |
| **Sidebar** | Client (Accueil, Carte, Réservations, Notifications, Profil) + Merchant (Tableau de bord, Ajouter, Avis, Compte, Réservations) | `MerchantSidebar.tsx` (MS2 catalogue) | **Partiel** ; sidebar commerçant existe dans `catalogue/components/MerchantSidebar.tsx` ; sidebar client absente ; composant non intégré aux pages MS1 |
| **Header** | Logo + fil d'Ariane + titre + sous-titre + Avatar + cloche | Inline dans chaque page | **Absent** en tant que composant ; `LoginPage`/`MerchantStatusPage` ont leur propre header minimaliste, `ProfilePage` a un header différent |

### 4.2 Composants partiellement conformes

| Composant | Conformité | Remarque |
|---|---|---|
| Input téléphone (préfixe +213) | 70% | Préfixe hard-codé en texte ; séparateur `|` correct ; fond glassmorphism conforme ; **manque** : composant réutilisable `Field` avec label au-dessus |
| OTP 6 cases | 85% | Auto-focus ✓, auto-submit ✓, coller ✓ ; taille des cases légèrement différente (w-11/h-14 code vs ~60px Figma) |
| QR Code | 95% | `QRCodeSVG` taille 150×150 ; Figma montre ~160×160 dans une carte `bg-white/80 rounded-2xl` ✓ |
| Toggle rôle (pill) | 80% | Pill présente ; **manque** : icône `badge-role-icon.svg` a été adaptée (non issue du fichier `inspos`) |

---

## 5. Tokens Figma vs Tailwind / CSS

### 5.1 Couleurs

| Token Figma (spec §1) | Valeur Figma | Code / Tailwind | Statut |
|---|---|---|---|
| Vert foncé (dark) | `#0B2C25` | `forsa.dark: '#0B2C25'` ✓ | **Conforme** |
| Vert (emerald) | `#17664E` | `forsa.emerald: '#17664E'` ✓ | **Conforme** |
| Lime (leaf) | `#84B140` | `forsa.leaf: '#84B140'` ✓ | **Conforme** |
| Menthe (fond mint) | `#EEF7EC` | Absent du config Tailwind | **Manquant** — non défini ; utilisé inline dans Figma pour les bandeaux success légers |
| Crème fond | `#FDF8EC` / `#FFFAF0` | `forsa.cream: '#FFFDF0'` ⚠ | **Écart mineur** : spec #FFFAF0, config #FFFDF0 (3 chars différents) ; utilisé inline `bg-[#FFFAF0]` correct dans le code |
| Bordure | `#D9DDD0` | `forsa.border: rgba(11,44,37,0.12)` ⚠ | **Écart** : Figma donne une couleur fixe gris-vert ; code utilise rgba dynamique — résultat visuel proche mais pas identique |
| Rouge erreur | `#B3261E` | `forsa.danger: '#EF4444'` ✗ | **Écart significatif** : rouge Figma Material `#B3261E` ≠ rouge Tailwind standard `#EF4444` ; dans le code certaines pages utilisent inline `#B22222` ou `#B3261E` |
| Ambre | `#FFF4DC` | `forsa.warning: '#F59E0B'` ✗ | **Écart** : ambre Figma est un fond pâle (#FFF4DC) ; config Tailwind utilise un ambre intense (#F59E0B pour le texte) ; manque le fond ambre pâle comme token |
| Telegarm blue | `#229ED9` | Inline `bg-[#229ED9]` ✓ | **Conforme** (inline) |

### 5.2 Rayons de courbure

| Token Figma | Valeur | Code Tailwind | Statut |
|---|---|---|---|
| Cartes (Card) | 20px | `rounded-2xl` = 16px ⚠ / `rounded-card` = 28px ⚠ | **Écart** : Figma spécifie rayon 20px pour les cartes ; code oscille entre 16 et 32px selon la page |
| Boutons (Button) | ~16px | `rounded-btn: 16px` ✓ / inline `rounded-[16px]` ✓ | **Conforme** |
| Inputs (Field) | ~14px | `rounded-input: 14px` ✓ / inline `rounded-[14px]` ✓ | **Conforme** |
| Modal | ~24px | inline `rounded-3xl` = 24px ✓ | **Conforme** |
| Carte Login principale | 32px | inline `rounded-[32px]` ✓ | **Conforme** |
| Carte boutique / info (Ma boutique) | 20px | Non implémenté | Non applicable (page absente) |

### 5.3 Ombres

| Token Figma | Valeur approx. | Code | Statut |
|---|---|---|---|
| Glassmorphism (login card) | `0px 16px 40px 0px rgba(0,0,0,0.10)` | `shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)]` ✓ | **Conforme** (inline) |
| Glass standard | — | `shadow-glass: 0 20px 40px -15px rgba(11,44,37,0.10)` | **Non utilisé** dans les pages auth (glass-standard non appliqué) |
| Bouton primaire | — | `shadow-btn` disponible mais non appliqué systématiquement | **Incohérence** |

### 5.4 Espacements et typographie

| Token Figma | Valeur | Code | Statut |
|---|---|---|---|
| Police | Poppins | `fontFamily.poppins: ['Poppins', 'sans-serif']` ✓, classe `font-poppins` ✓ | **Conforme** |
| Titre page (h1) | ≈48–56px, font-semibold | `text-[40px] sm:text-[48px] font-semibold` (ProfilePage) ✓ | **Conforme** |
| Titre carte (h2) | 24–28px | `text-2xl sm:text-[28px]` ✓ | **Conforme** |
| Label Field | 14–15px | `text-[14px]` / `text-sm` ✓ | **Conforme** |
| Sous-titre | 15–16px, opacity 65–75% | `text-[15px] text-[#0B2C25]/65` ✓ | **Conforme** |
| Breadcrumb | 11–12px | `text-[11px]` ✓ | **Conforme** |
| Espacement section | 30–32px gap | `gap-[20px]` à `gap-6` selon page | **Écart mineur** : gap variable selon page (20 à 24px code vs 24–32px Figma) |

### 5.5 Tokens manquants dans Tailwind

| Token manquant | Usage Figma | Impact |
|---|---|---|
| `forsa.mint: '#EEF7EC'` | Fond Chip/Badge success léger | Bandeaux success utilisent des approx. inline |
| `forsa.amber-light: '#FFF4DC'` | Fond Banner warn | Ambre fond pâle manquant |
| `forsa.card-radius: 20px` | Rayon carte standard | Cartes oscillent entre 16 et 28px |
| `forsa.border-static: '#D9DDD0'` | Bordure card Figma | Config actuelle RGBA dynamique ≠ hex fixe |
| Ombre bouton Figma | `0 4px 12px rgba(11,44,37,0.25)` | `shadow-btn` présent mais différent |

---

## 6. Plan de refonte par lots

### Lot R0 — Fondations UI *(1–2 jours, prérequis à tout)*

**Objectif** : Créer un design system de composants réutilisables aligné sur Figma. Mettre à jour `tailwind.config.js`.

**Travaux** :
- Corriger les tokens de couleur (`#B3261E`, `#EEF7EC`, `#FFF4DC`, `#D9DDD0`, `#FFFAF0`)
- Ajouter token rayon `card: 20px`
- Créer composant **`Button`** (primary, secondary, danger, dangerOutline, disabled)
- Créer composant **`Field`** (label+input+erreur+icône, états default/focused/error/disabled)
- Créer composant **`Banner`** (success, warn, error, info)
- Créer composant **`Card`** (rayon 20px, bordure 1px #D9DDD0, ombre)
- Créer composant **`Modal`** (desktop, focus trap, ESC)
- Créer composant **`Chip`** (modeActuel, vérification, validé, rejeté)
- Créer composant **`Sidebar`** client et refactorer `MerchantSidebar`
- Créer composant **`Header`** (logo + fil d'Ariane + titre + actions)

**Écrans impactés** : tous (~78 frames)

---

### Lot R1 — Login & Inscription *(~47 frames, 3–4 jours)*

**Objectif** : Aligner `LoginPage`, `RegisterPage` sur les composants R0 ; implémenter les états manquants.

**Travaux** :
- Remplacer les divs inline par `Field`, `Button`, `Banner`, `Card`, `Chip`
- Ajouter `Stepper` visuel (étapes inscription commerçant)
- Ajouter `BottomSheet` mobile (confirmation rôle)
- Implémenter cropper photo (étape profil)
- Corriger rayon 20px sur la carte principale login → passer de `rounded-[32px]` à `rounded-card-lg` (32px déjà dans config ✓)
- Harmoniser rouge erreur `#B22222` → `#B3261E`
- Ajouter champ adresse + MapBox à l'étape 2 inscription commerçant

**Écrans** : ~47 frames (desktop + mobile)

---

### Lot R2 — Profil client *(~49 frames, 3–4 jours)*

**Objectif** : Aligner `ProfilePage` (view + edit) ; implémenter les états et modales manquants.

**Travaux** :
- Intégrer `Header` composant R0
- Remplacer les blocs inline par `Card`, `Banner`, `Field`, `Button`
- Implémenter dialog "Changements non enregistrés" (`Modal`)
- Implémenter cropper avatar (Dropzone → crop → upload)
- Implémenter les 5 états du changement d'email (saisie, envoi, vérifié, lien expiré, conflit)
- Ajouter badge "Commerçant vérifié" (Chip)
- Aligner les bandeaux non-vérifiés sur `Banner`

**Écrans** : ~49 frames (21 mobile + 28 desktop)

---

### Lot R3 — Paramètres & Sécurité *(~8 frames, 1–2 jours)*

**Objectif** : Créer les pages `/settings` et `/settings/security` inexistantes.

**Travaux** :
- Créer `SettingsPage` (`/settings`) : vue d'ensemble (sécurité, Telegram lié, déconnexion, zone danger)
- Créer `SecurityPage` (`/settings/security`) : sessions actives (`GET /auth/sessions`), révoquer
- Implémenter dialog confirmation déconnexion
- Supprimer les références "Mot de passe" dans les maquettes Figma (remplacer par code Telegram)

**Écrans** : ~8 frames (7 desktop + 1 mobile)

---

### Lot R4 — Statuts commerçant *(~12 frames, 2–3 jours)*

**Objectif** : Aligner `MerchantStatusPage` et créer les pages statuts manquantes.

**Travaux** :
- Implémenter `Stepper` visuel PENDING (3 étapes : Inscrit → Documents → Vérification)
- Créer page `/merchant/documents` (liste documents, statut REVIEW/OK/REFUSED, voir)
- Créer page `/merchant/documents/resubmit` (re-dépôt avec `Dropzone`)
- Corriger icône REJECTED (SVG Figma au lieu de span emoji ✕)
- Supprimer la double gestion SUSPENDED (unifier vers un seul écran)
- Ajouter motif de suspension affiché (provenant de `shops.reject_reason`)

**Écrans** : ~12 frames (6 desktop + 6 mobile)

---

### Lot R5 — Ma boutique + Mode + Suppression *(~25 frames, 3–4 jours)*

**Objectif** : Créer les pages complètement absentes du frontend.

**Travaux** :
- Créer `ShopEditPage` (`/merchant/shop`) : 4 états desktop + 3 mobile (Modifier, Adresse introuvable, Carte indisponible, Enregistré) avec **MapBox** (Leaflet + OpenStreetMap) + géocodage
- Créer `ModeSwitchPage` (`/settings/mode`) : 4 états desktop + 3 mobile (Choix, Confirmation, Boutique non approuvée, Retour client)
- Créer `AccountDangerPage` (`/settings/account`) : 5 états desktop + 4 mobile (Zone sensible, Confirmation suppression, Erreur, Compteurs, Compte désactivé) — remplacer "mot de passe" par code Telegram
- Implémenter backend : `POST /users/me/deactivate`, `DELETE /users/me`

**Écrans** : ~25 frames (11 desktop + 14 mobile)

---

## Synthèse

| Lot | Contenu | Frames | Prérequis | Priorité |
|---|---|---|---|---|
| **R0** | Fondations UI (tokens + composants) | — | — | 🔴 Critique |
| **R1** | Login & Inscription | ~47 | R0 | 🔴 Critique |
| **R2** | Profil client | ~49 | R0, R1 | 🟠 Haute |
| **R3** | Paramètres & Sécurité | ~8 | R0, R2 | 🟡 Moyenne |
| **R4** | Statuts commerçant | ~12 | R0, R1 | 🟠 Haute |
| **R5** | Boutique + Mode + Suppression | ~25 | R0, R4 | 🟡 Moyenne |
| **Total** | | **~141 écrans** | | |

**Ordre conseillé** : R0 → R1 (en parallèle R4) → R2 → R3 → R5

---

## Annexe — Frames MCP non récupérées

Les sections suivantes de la page 6:9 dépassent le volume de lecture MCP de ce rapport (fichier 20 006 lignes, lecture partielle offset 0–46 000 octets). Elles devront être auditées par une passe MCP complémentaire avec un nœud-id plus précis :

- Section Login (~47 frames) : nœud de section non localisé dans le dump
- Section Profil client (~49 frames) : nœud de section non localisé
- Section Paramètres (~8 frames) : nœud de section non localisé
- Section Suppression/Désactivation (~9 frames) : nœud de section non localisé
- Frames Mode switchs restantes (mobile + confirmation boutique non approuvée) : partiellement lues
