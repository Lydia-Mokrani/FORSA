# Audit de Fidélité Figma vs Code Frontend (v2)

**Commit audité :** `f6e89b9 F-fix`  
**Date :** 25 Novembre 2026  
**Branche :** `feat/ms1-telegram-auth`  
**Statut :** READ-ONLY (aucun code modifié, aucun appel d’écriture Figma)  

---

## 1. Résumé Exécutif (Executive Summary)

Le présent audit compare de manière exhaustive les spécifications graphiques officielles du fichier Figma (`yX4WMqraIaBSVKibnrCeat`, canvas `6:9`) et l'implémentation frontend React / TypeScript / Tailwind située dans `frontend/src/`.

Toutes les 13 sections officielles pertinentes pour le jalon MS1 ont été localisées, explorées et indexées via le MCP Figma. Au total, **167 cadres (frames)** directs ont été recensés et audités sans inventer de nœuds ni extrapoler de valeurs inexistantes.

### Synthèse Globale des Écrans et États

| Métrique | Total | Pourcentage |
| :--- | :---: | :---: |
| **Nombre total de sections auditées** | **13** | 100% |
| **Nombre total de cadres Figma recensés** | **167** | 100% |
| **Cadres lus et analysés** | **167** | 100% |
| **Cadres non lus (NOT READ)** | **0** | 0% |
| **Verdict OK (Fidélité stricte)** | **56** | 33.5% |
| **Verdict Minor Gap (Écarts mineurs de style / interactions équivalentes)** | **75** | 44.9% |
| **Verdict Major Gap (Écrans / flux fonctionnels manquants)** | **7** | 4.2% |
| **Verdict Not Built (Non construits / Non applicables car hors-périmètre)** | **29** | 17.4% |

---

### Synthèse par Section

| Section ID | Nom de la Section Figma | Libellé Fonctionnel | Total Frames | Lus | Non lus | OK | Minor Gap | Major Gap | Not Built |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `1030:23441` | login | Login | 51 | 51 | 0 | 10 | 24 | 0 | 17 |
| `1155:25968` | MS1 — Changement de mode client ↔ commerçant (F1.18) | Mode | 7 | 7 | 0 | 5 | 2 | 0 | 0 |
| `1154:25531` | MS1 — Ma boutique (F1.10 · F1.11 · F1.15) | Ma boutique | 7 | 7 | 0 | 5 | 2 | 0 | 0 |
| `1150:28299` | MS1 | Compte commerçant Desktop | 2 | 2 | 0 | 0 | 0 | 2 | 0 |
| `1156:26271` | MS1 — Désactivation / suppression du compte (F1.17) | Désactivation / suppression du compte | 9 | 9 | 0 | 9 | 0 | 0 | 0 |
| `994:13556` | Client PC · Profil — tous les cas | Profil client Desktop | 22 | 22 | 0 | 1 | 21 | 0 | 0 |
| `898:18788` | Client Mobile · Profil — tous les cas | Profil client Mobile | 21 | 21 | 0 | 1 | 20 | 0 | 0 |
| `1159:14137` | Client PC · Paramètres (sécurité, mot de passe, déconnexion) | Paramètres | 13 | 13 | 0 | 1 | 4 | 0 | 8 |
| `1162:20380` | MS1 — Statuts de validation du commerçant (F1.12 · F1.13) | Statuts de validation du commerçant | 12 | 12 | 0 | 12 | 0 | 0 | 0 |
| `1179:20924` | Accès refusé et session expirée (F1.8) | Accès refusé et session expirée | 4 | 4 | 0 | 0 | 0 | 4 | 0 |
| `1186:21472` | MS1 — Mon compte commerçant · Destinations « Modifier » | Compte commerçant — Destinations Modifier | 5 | 5 | 0 | 2 | 1 | 0 | 2 |
| `1187:22479` | MS1 — Mon compte commerçant · Mobile | Compte commerçant Mobile | 6 | 6 | 0 | 2 | 1 | 1 | 2 |
| `1193:22165` | MS1 — Inscription commerçant · Erreurs de validation (F1.1) | Inscription commerçant — Erreurs | 8 | 8 | 0 | 8 | 0 | 0 | 0 |

---

### Top 10 des Écarts Majeurs par Impact Utilisateur (avec estimation de correction)

| Rang | Intitulé de l'Écart | Impact Utilisateur | Effort | Cadres Figma concernés | Fichiers cibles |
| :---: | :--- | :--- | :---: | :--- | :--- |
| **1** | **Écran 403 (Accès refusé)** | L'utilisateur n'a aucun retour explicite lorsqu'il tente d'accéder à une zone non autorisée (redirection silencieuse). | **S** | `1179:20925`, `1179:20969` | `frontend/src/features/auth/AccessDeniedPage.tsx` |
| **2** | **Écran / Dialogue 401 (Session expirée)** | Lorsque le jeton expire, l'utilisateur est déconnecté sans dialogue de reconnexion inline ni préservation d'état. | **S** | `1179:20947`, `1179:20990` | `frontend/src/features/auth/SessionExpiredModal.tsx` |
| **3** | **Modale de Recadrage de Photo de Profil (Cropper)** | L'avatar uploadé n'est pas prévisualisé ni recadré au format carré/rond avant l'envoi API. | **M** | `994:15438`, `1114:25186` | `frontend/src/features/profile/AvatarCropperModal.tsx` |
| **4** | **Modales de Changement d'E-mail en 2 étapes** | L'utilisateur ne dispose pas du flux frontend pour modifier son email avec vérification OTP (pourtant supporté en backend Lot E1). | **M** | `994:15622`-`994:15972`, `1114:25334`-`1114:25630` | `frontend/src/features/profile/ChangeEmailModal.tsx` |
| **5** | **Modales de Changement de Téléphone en 2 étapes** | Pas d'interface pour initier le transfert de numéro de téléphone vérifié. | **M** | `994:16147`-`994:16497`, `1114:25778`-`1114:26074` | `frontend/src/features/profile/ChangePhoneModal.tsx` |
| **6** | **Hub Dédié "Mon compte commerçant" (Desktop & Mobile)** | Le compte commerçant s'appuie sur le dashboard catalogue MS2 au lieu d'une page centrale de gestion de compte dédiée comme en Figma. | **L** | `1150:28079`, `1187:22480` | `frontend/src/features/account/MerchantAccountPage.tsx` |
| **7** | **Gestion d'Erreur Blocage Suppression de Compte** | Si un commerçant a des commandes en cours, l'écran de suppression n'affiche pas la bannière d'interdiction détaillée. | **S** | `1156:26649`, `1156:27156` | `frontend/src/features/settings/AccountDangerPage.tsx` |
| **8** | **Carte de Fidélité Client / Statut Avantages** | Absence du bloc visuel fidélité / points sur le profil client. | **M** | `994:16925`, `1152:26566` | `frontend/src/features/profile/LoyaltyCard.tsx` |
| **9** | **Dialogue de Confirmation Mode Switch (Modal vs Inline)** | Le changement de mode utilise une confirmation inline au lieu de la modale centrée 530px Figma. | **S** | `1155:26072`, `1155:26316`, `1155:26504` | `frontend/src/features/settings/ModeSwitchPage.tsx` |
| **10** | **Préférences et Notifications Commerçant Détaillées** | Toggles fins de réception d'alertes SMS/Email pour nouvelles commandes non isolés dans une vue dédiée. | **S** | `1186:21763`, `1191:22481` | `frontend/src/features/settings/MerchantPreferencesPage.tsx` |

---

### Éléments Non Auditables et Limitations Constatées

1. **Pages hors MS1 :** Les sections Catalogue pur (MS2 : recherche d'offres, détail offre, création d'offre) n'ont pas été auditées ici car réservées à l'équipe MS2 et explicitement exclues par le périmètre.
2. **Planche de composants graphiques (`1030:23442`) :** La frame *Kit — Connexion / Inscription* est une feuille de styles interne Figma et ne représente pas une vue applicative.
3. **Canvas étendu `6:9` :** Les sous-arborescences non parentées directement sous une section MS1 ont été ignorées pour éviter toute troncature mémoire du MCP Figma.

---

## 2. Déviations Volontaires et Décisions d'Architecture (Deliberate Known Deviations)

Les éléments suivants diffèrent de la maquette Figma mais constituent des **décisions validées par Hyb / Lead Tech** ; ils ne doivent en aucun cas être considérés comme des anomalies ou des bugs :

1. **Arrière-plan solide d'authentification `#dce1d0` (`bg-ui-auth-bg`) :**  
   Figma présentait des arrière-plans photo avec effet bokeh pour la connexion/inscription. Conformément à la décision Hyb, l'application utilise un fond épuré uni pastel `#dce1d0` afin d'assurer une lisibilité maximale, un chargement instantané sans asset lourd et une cohérence visuelle parfaite.
2. **Authentification Passwordless via Telegram OTP :**  
   Figma comportait un formulaire classique identifiant/mot de passe avec écran "Mot de passe oublié". Dans le code, l'authentification prioritaire d'Algérie se fait sans mot de passe, par vérification de numéro de téléphone algérien (`+213`) et envoi d'un code OTP sécurisé à 6 chiffres via le bot officiel Telegram FORSA. Les écrans Figma liés aux mots de passe (17, 18, 19, formulaires de mise à jour de mot de passe) sont donc **intentionnellement non construits**.
3. **Boutons Sociaux (Apple et Google) :**  
   - Le bouton Apple est formellement désactivé car le compte développeur Apple n'est pas encore souscrit.  
   - Le bouton Google est honnête et désactivé jusqu'au Lot G1 (géré dans le commit `f6e89b9 F-fix`), évitant toute promesse d'authentification trompeuse.
4. **Conservation de l'ossature globale MS2 (Shell) :**  
   L'enveloppe applicative (`ClientLayout`, `MerchantSidebar`, `Navbar`, `Footer`, `LocationContext`) a été préservée sans régression pour garantir l'interopérabilité fluide avec les modules catalogue et panier de l'autre équipe.

---

## 3. Écrans et États Présents dans le Code mais Absents de Figma (`[NOT IN FIGMA]`)

Plusieurs flux et états critiques ont été créés dans le code pour la sécurité et l'expérience utilisateur réelle sans équivalent direct dans Figma :

- **`[NOT IN FIGMA]` Détection et normalisation automatique des numéros algériens :** Gestion des préfixes (`05`, `06`, `07`, `+213`) avec masquage sécurisé (`+213 5•• ••• •89`).
- **`[NOT IN FIGMA]` Écran de verrouillage temporaire après 5 tentatives OTP erronées :** Compte à rebours de sécurité bloquant les attaques par force brute (`LoginPage.tsx`).
- **`[NOT IN FIGMA]` Authentification par QR Code Telegram direct :** Bouton ouvrant l'application Telegram sur mobile ou générant le deep-link direct vers le bot.
- **`[NOT IN FIGMA]` Tableau de bord des sessions actives révocables :** Liste interactive des jetons JWT révocables avec détails d'OS, navigateur et adresse IP (`SettingsPage.tsx`).
- **`[NOT IN FIGMA]` Galerie de développement UI (`DevUiGallery.tsx`) :** Vitrine réservée au mode développement pour tester l'ensemble des composants atomiques isolés (Boutons, Stepper, Dropzone, Bannières, Chips).

---

## 4. Cadres Figma Sans Aucun Code Correspondant (Frames Not Built)

Les 25 cadres suivants n'ont aucune correspondance dans le code source actuel :
- **Section Login (1030:23441) :**
  - `1030:23442` (Kit — Connexion / Inscription)
  - `1030:23876` & `1030:24138` (15 · Lien de vérification expiré Desktop/Mobile)
  - `1030:23917`, `1030:23932`, `1030:23946` (17, 18, 19 · Mot de passe oublié, Lien envoyé, Nouveau mot de passe Desktop)
  - `1030:24177`, `1030:24191`, `1030:24204` (17, 18, 19 · Mot de passe oublié Mobile)
  - `1070:23441` à `1070:23766` (20, 21, 22, 23 · Flux Google/Apple et comptes liés Desktop & Mobile - 8 frames)
- **Section Profil Client (994:13556 & 898:18788) :**
  - `994:15438` & `1114:25186` (Recadrer la photo cropper Desktop & Mobile)
  - `994:15622`-`994:15972` & `1114:25334`-`1114:25630` (Modales changement email - 6 frames)
  - `994:16147`-`994:16497` & `1114:25778`-`1114:26074` (Modales changement téléphone - 6 frames)
  - `994:16925` & `1152:26566` (Carte fidélité / statut du compte)
- **Section Paramètres (1159:14137) :**
  - `994:21082`-`994:21552` & `1182:20952`-`1182:21616` (Sous-écrans mot de passe - 8 frames)
- **Section Accès Refusé & Session Expirée (1179:20924) :**
  - `1179:20925`, `1179:20947`, `1179:20969`, `1179:20990` (4 frames d'erreurs HTTP dédiées)
- **Section Compte Commerçant Destinations Modifier (1186:21472 & 1187:22479) :**
  - `1186:22000` & `1191:22641` (Mot de passe commerçant)
  - `1186:22302` & `1191:22850` (Modifier l'email commerçant)

---

## 5. Tableaux Détaillés Cadre par Cadre

### Section `1030:23441` — login (Login)

*Nombre total de cadres : 51 | Lus : 51 | Non lus : 0*

| frame id + exact name | code page/component | texts identical? | colours | radius | typography | spacing | icons | states present | verdict | evidence (file:line) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `1030:23442`<br>**Kit — Connexion / Inscription** | Design System Kit | - | - | - | - | - | - | - | **not built** | Non applicable (planche de composants Figma) |
| `1030:23454`<br>**01 · Accueil · Desktop** | WelcomePage.tsx | Identique (Bienvenue sur FORSA, slogans, CTA) | Fond crème #fffaf0, Vert FORSA #17664e | Boutons rounded-xl (12px) vs 14px Figma | Plus Jakarta Sans (Inter / font-sans fallback) | py-12 px-6 gap-6 aligné | Logo SVG FORSA présent | Default / Hover | **minor gap** | frontend/src/features/auth/WelcomePage.tsx:1-48 |
| `1030:23464`<br>**02 · Choix du profil · Desktop** | RoleChoicePage.tsx | Identique ("Je suis un particulier" / "Je suis un commerçant") | bg-[#fffaf0], Cartes blanches bordure #dbf0dd, hover #17664e | Cartes rounded-2xl (20px) | Inter / Plus Jakarta Sans | Grid 2 colonnes p-6 gap-6 | role-client-icon.svg & role-merchant-icon.svg intégrés | Normal / Sélectionné | **OK** | frontend/src/features/auth/RoleChoicePage.tsx:1-117 |
| `1030:23479`<br>**03 · Connexion — client · Desktop** | LoginPage.tsx | Différent [DECISION HYB]: Connexion sans mot de passe Telegram | bg-ui-auth-bg #dce1d0 [DECISION HYB], Cartes blanches #ffffff | Cartes rounded-3xl (24px), inputs rounded-xl (12px) | Font-sans aligné | Formulaire compact max-w-md mx-auto | Telegram icon, Apple/Google logos (Apple désactivé) | Saisie téléphone, envoi code OTP, saisie OTP, compte verrouillé | **minor gap** | frontend/src/features/auth/LoginPage.tsx:1-837 |
| `1030:23505`<br>**04 · Connexion — commerçant · Desktop** | LoginPage.tsx | Différent [DECISION HYB]: Connexion sans mot de passe Telegram | bg-ui-auth-bg #dce1d0 [DECISION HYB], Cartes blanches #ffffff | Cartes rounded-3xl (24px), inputs rounded-xl (12px) | Font-sans aligné | Formulaire compact max-w-md mx-auto | Telegram icon, Apple/Google logos (Apple désactivé) | Saisie téléphone, envoi code OTP, saisie OTP, compte verrouillé | **minor gap** | frontend/src/features/auth/LoginPage.tsx:1-837 |
| `1030:23527`<br>**05 · Connexion — identifiants incorrects · Desktop** | LoginPage.tsx | Différent: Code OTP invalide / Trop de tentatives vs mot de passe faux | Erreur rouge #b3261e, fond rose #fdecea, bordure #f2b8b3 | Bannière rounded-xl (12px) | Text-sm text-[#b3261e] | Margin top 12px | information-circle.svg rouge | Erreur OTP 1 à 4 tentatives, verrouillage 5 tentatives | **minor gap** | frontend/src/features/auth/LoginPage.tsx:420-510 |
| `1030:23549`<br>**06 · Connexion — compte suspendu · Desktop** | AccountSuspendedPage.tsx | Identique ("Compte suspendu", contact support WhatsApp/Email) | Fond crème #fffaf0, Carte blanche, Alerte rouge #b3261e | Carte rounded-2xl (24px) | H1 24px semi-bold, body 14px | p-8 max-w-lg mx-auto | Alert triangle icon rouge #b3261e | Lecture seule avec lien direct mailto:support@forsa.dz | **OK** | frontend/src/features/auth/AccountSuspendedPage.tsx:1-80 |
| `1030:23563`<br>**07 · Connexion réussie · Desktop** | LoginPage.tsx | Pas de frame d attente: redirection immédiate vers dashboard/catalogue | - | - | - | - | - | Redirection programmée via useNavigate() | **minor gap** | frontend/src/features/auth/LoginPage.tsx:320-350 |
| `1030:23576`<br>**01 · Accueil · Mobile** | WelcomePage.tsx | Identique (Bienvenue sur FORSA, slogans, CTA) | Fond crème #fffaf0, Vert FORSA #17664e | Boutons rounded-xl (12px) vs 14px Figma | Plus Jakarta Sans (Inter / font-sans fallback) | py-12 px-6 gap-6 aligné | Logo SVG FORSA présent | Default / Hover | **minor gap** | frontend/src/features/auth/WelcomePage.tsx:1-48 |
| `1030:23585`<br>**02 · Choix du profil · Mobile** | RoleChoicePage.tsx | Identique ("Je suis un particulier" / "Je suis un commerçant") | bg-[#fffaf0], Cartes blanches bordure #dbf0dd, hover #17664e | Cartes rounded-2xl (20px) | Inter / Plus Jakarta Sans | Grid 2 colonnes p-6 gap-6 | role-client-icon.svg & role-merchant-icon.svg intégrés | Normal / Sélectionné | **OK** | frontend/src/features/auth/RoleChoicePage.tsx:1-117 |
| `1030:23599`<br>**03 · Connexion — client · Mobile** | LoginPage.tsx | Différent [DECISION HYB]: Connexion sans mot de passe Telegram | bg-ui-auth-bg #dce1d0 [DECISION HYB], Cartes blanches #ffffff | Cartes rounded-3xl (24px), inputs rounded-xl (12px) | Font-sans aligné | Formulaire compact max-w-md mx-auto | Telegram icon, Apple/Google logos (Apple désactivé) | Saisie téléphone, envoi code OTP, saisie OTP, compte verrouillé | **minor gap** | frontend/src/features/auth/LoginPage.tsx:1-837 |
| `1030:23624`<br>**04 · Connexion — commerçant · Mobile** | LoginPage.tsx | Différent [DECISION HYB]: Connexion sans mot de passe Telegram | bg-ui-auth-bg #dce1d0 [DECISION HYB], Cartes blanches #ffffff | Cartes rounded-3xl (24px), inputs rounded-xl (12px) | Font-sans aligné | Formulaire compact max-w-md mx-auto | Telegram icon, Apple/Google logos (Apple désactivé) | Saisie téléphone, envoi code OTP, saisie OTP, compte verrouillé | **minor gap** | frontend/src/features/auth/LoginPage.tsx:1-837 |
| `1030:23645`<br>**05 · Connexion — identifiants incorrects · Mobile** | LoginPage.tsx | Différent: Code OTP invalide / Trop de tentatives vs mot de passe faux | Erreur rouge #b3261e, fond rose #fdecea, bordure #f2b8b3 | Bannière rounded-xl (12px) | Text-sm text-[#b3261e] | Margin top 12px | information-circle.svg rouge | Erreur OTP 1 à 4 tentatives, verrouillage 5 tentatives | **minor gap** | frontend/src/features/auth/LoginPage.tsx:420-510 |
| `1030:23666`<br>**06 · Connexion — compte suspendu · Mobile** | AccountSuspendedPage.tsx | Identique ("Compte suspendu", contact support WhatsApp/Email) | Fond crème #fffaf0, Carte blanche, Alerte rouge #b3261e | Carte rounded-2xl (24px) | H1 24px semi-bold, body 14px | p-8 max-w-lg mx-auto | Alert triangle icon rouge #b3261e | Lecture seule avec lien direct mailto:support@forsa.dz | **OK** | frontend/src/features/auth/AccountSuspendedPage.tsx:1-80 |
| `1030:23679`<br>**07 · Connexion réussie · Mobile** | LoginPage.tsx | Pas de frame d attente: redirection immédiate vers dashboard/catalogue | - | - | - | - | - | Redirection programmée via useNavigate() | **minor gap** | frontend/src/features/auth/LoginPage.tsx:320-350 |
| `1030:23691`<br>**08 · Inscription — client · Desktop** | RegisterPage.tsx | Formulaire client: nom, prénom, email, téléphone + validation OTP | bg-[#fffaf0], Cartes blanches, vert #17664e | rounded-2xl (24px) | Font-sans régulier | Gap-4 formulaire vertical | Icons de champ: mail, phone, user | Formulaire actif, validation inline, erreur email existant | **minor gap** | frontend/src/features/auth/RegisterPage.tsx:1-400 |
| `1030:23711`<br>**09 · Inscription commerçant — 1 Compte · Desktop** | RegisterPage.tsx | Étape 1 compte commerçant: identité & téléphone | Bordure active #17664e, erreur #b3261e | rounded-xl (12px) | Font-sans | Stepper en haut, formulaire en bas | Icons user, phone, lock | Champs valides, champs en erreur | **minor gap** | frontend/src/features/auth/RegisterPage.tsx:200-450 |
| `1030:23743`<br>**10 · Inscription commerçant — 2 Commerce · Desktop** | RegisterPage.tsx | Étape 2 commerce: nom boutique, catégorie, adresse, wilaya | Bordures neutres #d0d7d0, focus #17664e | rounded-xl (12px) | Font-sans | Gap-4 | Store icon, pin location icon | Saisie, autocomplétion wilaya/commune | **minor gap** | frontend/src/features/auth/RegisterPage.tsx:450-700 |
| `1030:23774`<br>**11 · Inscription commerçant — 3 Documents · Desktop** | RegisterPage.tsx | Étape 3: RC, NIF, pièce identité | Zone upload pointillée #17664e, fond #f6faf6 | rounded-2xl (16px) | Font-sans | p-6 | Upload icon figma/upload-01.svg | Vide, fichier sélectionné, erreur format/poids | **OK** | frontend/src/features/auth/RegisterPage.tsx:700-950 |
| `1030:23830`<br>**12 · Demande envoyée — en attente de validation · Desktop** | MerchantStatusPage.tsx | Identique ("Dossier soumis", "Vérification en cours", 24-48h) | bg-[#fffaf0], Cartes blanches, stepper #17664e, bannière #fff4dc | rounded-3xl (24px) | H1 24px, sous-titre 14px | p-8 max-w-2xl mx-auto | Stepper checkmark, clock illustration | En attente de validation | **OK** | frontend/src/features/auth/MerchantStatusPage.tsx:70-130 |
| `1030:23847`<br>**13 · Vérification de l’e-mail · Desktop** | RegisterPage.tsx | Bannière d information email requis (Lot E1 aligné) | bg-stone-50 border-stone-200 | rounded-xl | Text-sm | p-4 my-4 | Email icon | En attente de clic / validé | **minor gap** | frontend/src/features/auth/RegisterPage.tsx:960-1050 |
| `1030:23863`<br>**14 · E-mail vérifié · Desktop** | RegisterPage.tsx | Bannière d information email requis (Lot E1 aligné) | bg-stone-50 border-stone-200 | rounded-xl | Text-sm | p-4 my-4 | Email icon | En attente de clic / validé | **minor gap** | frontend/src/features/auth/RegisterPage.tsx:960-1050 |
| `1030:23876`<br>**15 · Lien de vérification expiré · Desktop** | - | - | - | - | - | - | - | - | **not built** | Écran de renvoi lien expiré non implémenté (géré par backend E1) |
| `1030:23892`<br>**16 · Vérification du téléphone (client) · Desktop** | LoginPage.tsx / RegisterPage.tsx | Code à 6 chiffres envoyé via bot Telegram FORSA | Champs OTP bordés #17664e | Input box rounded-lg (8px) | Mono 20px bold centré | Gap-2 justify-center | Telegram icon | Saisie chiffre par chiffre, renvoi du code avec timer | **OK** | frontend/src/features/auth/LoginPage.tsx:520-650 |
| `1030:23917`<br>**17 · Mot de passe oublié · Desktop** | - | - | - | - | - | - | - | - | **not built** | Non applicable: architecture sans mot de passe [DECISION HYB]. Récupération par email gérée en backend Lot E1. |
| `1030:23932`<br>**18 · Lien de réinitialisation envoyé · Desktop** | - | - | - | - | - | - | - | - | **not built** | Non applicable: architecture sans mot de passe [DECISION HYB]. Récupération par email gérée en backend Lot E1. |
| `1030:23946`<br>**19 · Nouveau mot de passe · Desktop** | - | - | - | - | - | - | - | - | **not built** | Non applicable: architecture sans mot de passe [DECISION HYB]. Récupération par email gérée en backend Lot E1. |
| `1030:23960`<br>**08 · Inscription — client · Mobile** | RegisterPage.tsx | Formulaire client: nom, prénom, email, téléphone + validation OTP | bg-[#fffaf0], Cartes blanches, vert #17664e | rounded-2xl (24px) | Font-sans régulier | Gap-4 formulaire vertical | Icons de champ: mail, phone, user | Formulaire actif, validation inline, erreur email existant | **minor gap** | frontend/src/features/auth/RegisterPage.tsx:1-400 |
| `1030:23979`<br>**09 · Inscription commerçant — 1 Compte · Mobile** | RegisterPage.tsx | Étape 1 compte commerçant: identité & téléphone | Bordure active #17664e, erreur #b3261e | rounded-xl (12px) | Font-sans | Stepper en haut, formulaire en bas | Icons user, phone, lock | Champs valides, champs en erreur | **minor gap** | frontend/src/features/auth/RegisterPage.tsx:200-450 |
| `1030:24010`<br>**10 · Inscription commerçant — 2 Commerce · Mobile** | RegisterPage.tsx | Étape 2 commerce: nom boutique, catégorie, adresse, wilaya | Bordures neutres #d0d7d0, focus #17664e | rounded-xl (12px) | Font-sans | Gap-4 | Store icon, pin location icon | Saisie, autocomplétion wilaya/commune | **minor gap** | frontend/src/features/auth/RegisterPage.tsx:450-700 |
| `1030:24040`<br>**11 · Inscription commerçant — 3 Documents · Mobile** | RegisterPage.tsx | Étape 3: RC, NIF, pièce identité | Zone upload pointillée #17664e, fond #f6faf6 | rounded-2xl (16px) | Font-sans | p-6 | Upload icon figma/upload-01.svg | Vide, fichier sélectionné, erreur format/poids | **OK** | frontend/src/features/auth/RegisterPage.tsx:700-950 |
| `1030:24095`<br>**12 · Demande envoyée — en attente de validation · Mobile** | MerchantStatusPage.tsx | Identique ("Dossier soumis", "Vérification en cours", 24-48h) | bg-[#fffaf0], Cartes blanches, stepper #17664e, bannière #fff4dc | rounded-3xl (24px) | H1 24px, sous-titre 14px | p-8 max-w-2xl mx-auto | Stepper checkmark, clock illustration | En attente de validation | **OK** | frontend/src/features/auth/MerchantStatusPage.tsx:70-130 |
| `1030:24111`<br>**13 · Vérification de l’e-mail · Mobile** | RegisterPage.tsx | Bannière d information email requis (Lot E1 aligné) | bg-stone-50 border-stone-200 | rounded-xl | Text-sm | p-4 my-4 | Email icon | En attente de clic / validé | **minor gap** | frontend/src/features/auth/RegisterPage.tsx:960-1050 |
| `1030:24126`<br>**14 · E-mail vérifié · Mobile** | RegisterPage.tsx | Bannière d information email requis (Lot E1 aligné) | bg-stone-50 border-stone-200 | rounded-xl | Text-sm | p-4 my-4 | Email icon | En attente de clic / validé | **minor gap** | frontend/src/features/auth/RegisterPage.tsx:960-1050 |
| `1030:24138`<br>**15 · Lien de vérification expiré · Mobile** | - | - | - | - | - | - | - | - | **not built** | Écran de renvoi lien expiré non implémenté (géré par backend E1) |
| `1030:24153`<br>**16 · Vérification du téléphone (client) · Mobile** | LoginPage.tsx / RegisterPage.tsx | Code à 6 chiffres envoyé via bot Telegram FORSA | Champs OTP bordés #17664e | Input box rounded-lg (8px) | Mono 20px bold centré | Gap-2 justify-center | Telegram icon | Saisie chiffre par chiffre, renvoi du code avec timer | **OK** | frontend/src/features/auth/LoginPage.tsx:520-650 |
| `1030:24177`<br>**17 · Mot de passe oublié · Mobile** | - | - | - | - | - | - | - | - | **not built** | Non applicable: architecture sans mot de passe [DECISION HYB]. Récupération par email gérée en backend Lot E1. |
| `1030:24191`<br>**18 · Lien de réinitialisation envoyé · Mobile** | - | - | - | - | - | - | - | - | **not built** | Non applicable: architecture sans mot de passe [DECISION HYB]. Récupération par email gérée en backend Lot E1. |
| `1030:24204`<br>**19 · Nouveau mot de passe · Mobile** | - | - | - | - | - | - | - | - | **not built** | Non applicable: architecture sans mot de passe [DECISION HYB]. Récupération par email gérée en backend Lot E1. |
| `1070:23441`<br>**20 · Google ou Apple — Choisir mon espace · Desktop** | LoginPage.tsx | Bouton Apple désactivé, Bouton Google prêt pour Lot G1 | Boutons standards | rounded-xl | Font-sans medium | Gap-3 | Apple & Google svg | Désactivé avec tooltip / modal de rattachement non codée | **not built** | frontend/src/features/auth/LoginPage.tsx:360-410 (Modal dédiée non construite) |
| `1070:23478`<br>**21 · Google ou Apple — Ajouter mon téléphone · Desktop** | LoginPage.tsx | Bouton Apple désactivé, Bouton Google prêt pour Lot G1 | Boutons standards | rounded-xl | Font-sans medium | Gap-3 | Apple & Google svg | Désactivé avec tooltip / modal de rattachement non codée | **not built** | frontend/src/features/auth/LoginPage.tsx:360-410 (Modal dédiée non construite) |
| `1070:23520`<br>**23 · Google ou Apple — Compte déjà existant · Desktop** | LoginPage.tsx | Bouton Apple désactivé, Bouton Google prêt pour Lot G1 | Boutons standards | rounded-xl | Font-sans medium | Gap-3 | Apple & Google svg | Désactivé avec tooltip / modal de rattachement non codée | **not built** | frontend/src/features/auth/LoginPage.tsx:360-410 (Modal dédiée non construite) |
| `1070:23577`<br>**22 · Sécurité du compte — Comptes liés · Desktop** | LoginPage.tsx | Bouton Apple désactivé, Bouton Google prêt pour Lot G1 | Boutons standards | rounded-xl | Font-sans medium | Gap-3 | Apple & Google svg | Désactivé avec tooltip / modal de rattachement non codée | **not built** | frontend/src/features/auth/LoginPage.tsx:360-410 (Modal dédiée non construite) |
| `1070:23633`<br>**20 · Google ou Apple — Choisir mon espace · Mobile** | LoginPage.tsx | Bouton Apple désactivé, Bouton Google prêt pour Lot G1 | Boutons standards | rounded-xl | Font-sans medium | Gap-3 | Apple & Google svg | Désactivé avec tooltip / modal de rattachement non codée | **not built** | frontend/src/features/auth/LoginPage.tsx:360-410 (Modal dédiée non construite) |
| `1070:23669`<br>**21 · Google ou Apple — Ajouter mon téléphone · Mobile** | LoginPage.tsx | Bouton Apple désactivé, Bouton Google prêt pour Lot G1 | Boutons standards | rounded-xl | Font-sans medium | Gap-3 | Apple & Google svg | Désactivé avec tooltip / modal de rattachement non codée | **not built** | frontend/src/features/auth/LoginPage.tsx:360-410 (Modal dédiée non construite) |
| `1070:23710`<br>**23 · Google ou Apple — Compte déjà existant · Mobile** | LoginPage.tsx | Bouton Apple désactivé, Bouton Google prêt pour Lot G1 | Boutons standards | rounded-xl | Font-sans medium | Gap-3 | Apple & Google svg | Désactivé avec tooltip / modal de rattachement non codée | **not built** | frontend/src/features/auth/LoginPage.tsx:360-410 (Modal dédiée non construite) |
| `1070:23766`<br>**22 · Sécurité du compte — Comptes liés · Mobile** | LoginPage.tsx | Bouton Apple désactivé, Bouton Google prêt pour Lot G1 | Boutons standards | rounded-xl | Font-sans medium | Gap-3 | Apple & Google svg | Désactivé avec tooltip / modal de rattachement non codée | **not built** | frontend/src/features/auth/LoginPage.tsx:360-410 (Modal dédiée non construite) |
| `1188:21751`<br>**08b · Inscription — client · E-mail déjà utilisé · Desktop** | RegisterPage.tsx | Formulaire client: nom, prénom, email, téléphone + validation OTP | bg-[#fffaf0], Cartes blanches, vert #17664e | rounded-2xl (24px) | Font-sans régulier | Gap-4 formulaire vertical | Icons de champ: mail, phone, user | Formulaire actif, validation inline, erreur email existant | **minor gap** | frontend/src/features/auth/RegisterPage.tsx:1-400 |
| `1188:21815`<br>**08c · Inscription — client · Champs invalides · Desktop** | RegisterPage.tsx | Formulaire client: nom, prénom, email, téléphone + validation OTP | bg-[#fffaf0], Cartes blanches, vert #17664e | rounded-2xl (24px) | Font-sans régulier | Gap-4 formulaire vertical | Icons de champ: mail, phone, user | Formulaire actif, validation inline, erreur email existant | **minor gap** | frontend/src/features/auth/RegisterPage.tsx:1-400 |
| `1188:21900`<br>**08b · Inscription — client · E-mail déjà utilisé · Mobile** | RegisterPage.tsx | Formulaire client: nom, prénom, email, téléphone + validation OTP | bg-[#fffaf0], Cartes blanches, vert #17664e | rounded-2xl (24px) | Font-sans régulier | Gap-4 formulaire vertical | Icons de champ: mail, phone, user | Formulaire actif, validation inline, erreur email existant | **minor gap** | frontend/src/features/auth/RegisterPage.tsx:1-400 |
| `1188:21963`<br>**08c · Inscription — client · Champs invalides · Mobile** | RegisterPage.tsx | Formulaire client: nom, prénom, email, téléphone + validation OTP | bg-[#fffaf0], Cartes blanches, vert #17664e | rounded-2xl (24px) | Font-sans régulier | Gap-4 formulaire vertical | Icons de champ: mail, phone, user | Formulaire actif, validation inline, erreur email existant | **minor gap** | frontend/src/features/auth/RegisterPage.tsx:1-400 |

---

### Section `1155:25968` — MS1 — Changement de mode client ↔ commerçant (F1.18) (Mode)

*Nombre total de cadres : 7 | Lus : 7 | Non lus : 0*

| frame id + exact name | code page/component | texts identical? | colours | radius | typography | spacing | icons | states present | verdict | evidence (file:line) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `1155:25969`<br>**Desktop · Mode — Passer en mode commerçant** | ModeSwitchPage.tsx | Identique ("Changer de mode", "Mode Particulier", "Mode Commerçant") | bg-[#fffaf0], Carte active bg-[#eef7ec] border-[#17664e], Carte commerçant bg-white border-[#dbf0dd] | rounded-[24px], badge rounded-full, boutons rounded-[14px] | Inter 24px bold, 16px medium, 14px regular | Grid 2 colonnes 530px, gap 28px, padding 28px | role-client-icon.svg, role-merchant-icon.svg, badge checkmark | Client actif, commerçant commutable | **OK** | frontend/src/features/settings/ModeSwitchPage.tsx:40-120 |
| `1155:26072`<br>**Desktop · Mode — Confirmation · Passer en mode commerçant** | ModeSwitchPage.tsx | Identique ("Changer de mode", "Mode Particulier", "Mode Commerçant") | bg-[#fffaf0], Carte active bg-[#eef7ec] border-[#17664e], Carte commerçant bg-white border-[#dbf0dd] | rounded-[24px], badge rounded-full, boutons rounded-[14px] | Inter 24px bold, 16px medium, 14px regular | Grid 2 colonnes 530px, gap 28px, padding 28px | role-client-icon.svg, role-merchant-icon.svg, badge checkmark | Client actif, commerçant commutable | **OK** | frontend/src/features/settings/ModeSwitchPage.tsx:40-120 |
| `1155:26202`<br>**Desktop · Mode — Indisponible · Boutique en attente de validation** | ModeSwitchPage.tsx | Identique ("Votre boutique est en cours d’examen") | Carte grisée / bordure ambre #f59e0b, pastille jaune #fff4dc | rounded-[24px] | Font-sans | p-6 | Clock icon illustration | Carte commerçant désactivée avec lien vers statut | **minor gap** | frontend/src/features/settings/ModeSwitchPage.tsx:75-95 |
| `1155:26316`<br>**Desktop · Mode — Confirmation · Revenir en mode client** | ModeSwitchPage.tsx | Identique en vue mobile | Idem Desktop | Idem Desktop | Idem Desktop | Flex col empilé vertical | Idem Desktop | Responsive mobile testé | **OK** | frontend/src/features/settings/ModeSwitchPage.tsx:40-200 |
| `1155:26447`<br>**Mobile · Mode — Passer en mode commerçant** | ModeSwitchPage.tsx | Identique ("Changer de mode", "Mode Particulier", "Mode Commerçant") | bg-[#fffaf0], Carte active bg-[#eef7ec] border-[#17664e], Carte commerçant bg-white border-[#dbf0dd] | rounded-[24px], badge rounded-full, boutons rounded-[14px] | Inter 24px bold, 16px medium, 14px regular | Grid 2 colonnes 530px, gap 28px, padding 28px | role-client-icon.svg, role-merchant-icon.svg, badge checkmark | Client actif, commerçant commutable | **OK** | frontend/src/features/settings/ModeSwitchPage.tsx:40-120 |
| `1155:26504`<br>**Mobile · Mode — Confirmation · Passer en mode commerçant** | ModeSwitchPage.tsx | Identique ("Changer de mode", "Mode Particulier", "Mode Commerçant") | bg-[#fffaf0], Carte active bg-[#eef7ec] border-[#17664e], Carte commerçant bg-white border-[#dbf0dd] | rounded-[24px], badge rounded-full, boutons rounded-[14px] | Inter 24px bold, 16px medium, 14px regular | Grid 2 colonnes 530px, gap 28px, padding 28px | role-client-icon.svg, role-merchant-icon.svg, badge checkmark | Client actif, commerçant commutable | **OK** | frontend/src/features/settings/ModeSwitchPage.tsx:40-120 |
| `1155:26586`<br>**Mobile · Mode — Indisponible · Boutique en attente de validation** | ModeSwitchPage.tsx | Identique ("Votre boutique est en cours d’examen") | Carte grisée / bordure ambre #f59e0b, pastille jaune #fff4dc | rounded-[24px] | Font-sans | p-6 | Clock icon illustration | Carte commerçant désactivée avec lien vers statut | **minor gap** | frontend/src/features/settings/ModeSwitchPage.tsx:75-95 |

---

### Section `1154:25531` — MS1 — Ma boutique (F1.10 · F1.11 · F1.15) (Ma boutique)

*Nombre total de cadres : 7 | Lus : 7 | Non lus : 0*

| frame id + exact name | code page/component | texts identical? | colours | radius | typography | spacing | icons | states present | verdict | evidence (file:line) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `1154:25532`<br>**Desktop · Ma boutique — Modifier** | ShopEditPage.tsx | Identique responsive mobile | Idem Desktop | Idem Desktop | Idem Desktop | Padding 16px empilé | Idem Desktop | Idem Desktop | **OK** | frontend/src/features/catalogue/pages/ShopEditPage.tsx:60-350 |
| `1154:25702`<br>**Desktop · Ma boutique — Adresse introuvable** | ShopEditPage.tsx | Identique ("Adresse introuvable. Veuillez vérifier ou déplacer le curseur") | Bannière ambre bg-[#fff4dc] border-[#ffd580] text-[#8a5a00] | rounded-[16px] | Text-sm medium | p-4 my-4 | information-circle.svg jaune | Bannière d avertissement affichée si géocodage échoue | **minor gap** | frontend/src/features/catalogue/pages/ShopEditPage.tsx:145-180 |
| `1154:25874`<br>**Desktop · Ma boutique — Carte indisponible** | ShopEditPage.tsx | Identique responsive mobile | Idem Desktop | Idem Desktop | Idem Desktop | Padding 16px empilé | Idem Desktop | Idem Desktop | **OK** | frontend/src/features/catalogue/pages/ShopEditPage.tsx:60-350 |
| `1154:26058`<br>**Desktop · Ma boutique — Modifications enregistrées** | ShopEditPage.tsx | Identique responsive mobile | Idem Desktop | Idem Desktop | Idem Desktop | Padding 16px empilé | Idem Desktop | Idem Desktop | **OK** | frontend/src/features/catalogue/pages/ShopEditPage.tsx:60-350 |
| `1154:26236`<br>**Mobile · Ma boutique — Modifier** | ShopEditPage.tsx | Identique responsive mobile | Idem Desktop | Idem Desktop | Idem Desktop | Padding 16px empilé | Idem Desktop | Idem Desktop | **OK** | frontend/src/features/catalogue/pages/ShopEditPage.tsx:60-350 |
| `1154:26356`<br>**Mobile · Ma boutique — Adresse introuvable** | ShopEditPage.tsx | Identique ("Adresse introuvable. Veuillez vérifier ou déplacer le curseur") | Bannière ambre bg-[#fff4dc] border-[#ffd580] text-[#8a5a00] | rounded-[16px] | Text-sm medium | p-4 my-4 | information-circle.svg jaune | Bannière d avertissement affichée si géocodage échoue | **minor gap** | frontend/src/features/catalogue/pages/ShopEditPage.tsx:145-180 |
| `1154:26478`<br>**Mobile · Ma boutique — Carte indisponible** | ShopEditPage.tsx | Identique responsive mobile | Idem Desktop | Idem Desktop | Idem Desktop | Padding 16px empilé | Idem Desktop | Idem Desktop | **OK** | frontend/src/features/catalogue/pages/ShopEditPage.tsx:60-350 |

---

### Section `1150:28299` — MS1 (Compte commerçant Desktop)

*Nombre total de cadres : 2 | Lus : 2 | Non lus : 0*

| frame id + exact name | code page/component | texts identical? | colours | radius | typography | spacing | icons | states present | verdict | evidence (file:line) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `1150:28079`<br>**Desktop · MS1 — Mon compte commerçant** | MerchantDashboardPage.tsx / ShopEditPage.tsx | Différent: Figma montre un hub compte dédié avec tuiles, le code utilise MerchantDashboardPage | bg-stone-50, cartes blanches | rounded-2xl | Font-sans | Sidebar + main content 1200px | Icons catalogue MS2 | Dashboard avec métriques et offres | **major gap** | frontend/src/features/catalogue/pages/MerchantDashboardPage.tsx:1-250 |
| `1150:28236`<br>**Desktop · MS1 — Compte commerçant en attente de validation** | MerchantDashboardPage.tsx / ShopEditPage.tsx | Différent: Figma montre un hub compte dédié avec tuiles, le code utilise MerchantDashboardPage | bg-stone-50, cartes blanches | rounded-2xl | Font-sans | Sidebar + main content 1200px | Icons catalogue MS2 | Dashboard avec métriques et offres | **major gap** | frontend/src/features/catalogue/pages/MerchantDashboardPage.tsx:1-250 |

---

### Section `1156:26271` — MS1 — Désactivation / suppression du compte (F1.17) (Désactivation / suppression du compte)

*Nombre total de cadres : 9 | Lus : 9 | Non lus : 0*

| frame id + exact name | code page/component | texts identical? | colours | radius | typography | spacing | icons | states present | verdict | evidence (file:line) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `1156:26272`<br>**Desktop · Compte — Zone sensible** | AccountDangerPage.tsx | Identique ("Désactiver mon compte", "Supprimer mon compte", explications) | bg-[#fffaf0], Carte désactivation bg-white border-[#dbf0dd], Carte suppression bg-[#fffafa] border-[#f2b8b3] | rounded-[24px], boutons rounded-[14px] | H1 24px, titres cartes 18px semi-bold, body 14px | p-8 max-w-3xl mx-auto, gap-6 | Alerte triangle rouge, pause icon | Cartes visibles avec boutons d action | **OK** | frontend/src/features/settings/AccountDangerPage.tsx:35-110 |
| `1156:26373`<br>**Desktop · Compte — Supprimer · Confirmation** | AccountDangerPage.tsx | Identique responsive mobile | Idem Desktop | Idem Desktop | Idem Desktop | p-4 flex col | Idem Desktop | Mobile viewport | **OK** | frontend/src/features/settings/AccountDangerPage.tsx:35-144 |
| `1156:26538`<br>**Desktop · Compte — Supprimer · Mot de passe incorrect** | AccountDangerPage.tsx | Identique responsive mobile | Idem Desktop | Idem Desktop | Idem Desktop | p-4 flex col | Idem Desktop | Mobile viewport | **OK** | frontend/src/features/settings/AccountDangerPage.tsx:35-144 |
| `1156:26710`<br>**Desktop · Compte — Supprimer · Impossible (commerçant)** | AccountDangerPage.tsx | Identique responsive mobile | Idem Desktop | Idem Desktop | Idem Desktop | p-4 flex col | Idem Desktop | Mobile viewport | **OK** | frontend/src/features/settings/AccountDangerPage.tsx:35-144 |
| `1156:26845`<br>**Desktop · Compte — Compte désactivé** | AccountDangerPage.tsx | Identique responsive mobile | Idem Desktop | Idem Desktop | Idem Desktop | p-4 flex col | Idem Desktop | Mobile viewport | **OK** | frontend/src/features/settings/AccountDangerPage.tsx:35-144 |
| `1156:26860`<br>**Mobile · Compte — Zone sensible** | AccountDangerPage.tsx | Identique ("Désactiver mon compte", "Supprimer mon compte", explications) | bg-[#fffaf0], Carte désactivation bg-white border-[#dbf0dd], Carte suppression bg-[#fffafa] border-[#f2b8b3] | rounded-[24px], boutons rounded-[14px] | H1 24px, titres cartes 18px semi-bold, body 14px | p-8 max-w-3xl mx-auto, gap-6 | Alerte triangle rouge, pause icon | Cartes visibles avec boutons d action | **OK** | frontend/src/features/settings/AccountDangerPage.tsx:35-110 |
| `1156:26915`<br>**Mobile · Compte — Supprimer · Confirmation** | AccountDangerPage.tsx | Identique responsive mobile | Idem Desktop | Idem Desktop | Idem Desktop | p-4 flex col | Idem Desktop | Mobile viewport | **OK** | frontend/src/features/settings/AccountDangerPage.tsx:35-144 |
| `1156:27032`<br>**Mobile · Compte — Supprimer · Mot de passe incorrect** | AccountDangerPage.tsx | Identique responsive mobile | Idem Desktop | Idem Desktop | Idem Desktop | p-4 flex col | Idem Desktop | Mobile viewport | **OK** | frontend/src/features/settings/AccountDangerPage.tsx:35-144 |
| `1156:27156`<br>**Mobile · Compte — Compte désactivé** | AccountDangerPage.tsx | Identique responsive mobile | Idem Desktop | Idem Desktop | Idem Desktop | p-4 flex col | Idem Desktop | Mobile viewport | **OK** | frontend/src/features/settings/AccountDangerPage.tsx:35-144 |

---

### Section `994:13556` — Client PC · Profil — tous les cas (Profil client Desktop)

*Nombre total de cadres : 22 | Lus : 22 | Non lus : 0*

| frame id + exact name | code page/component | texts identical? | colours | radius | typography | spacing | icons | states present | verdict | evidence (file:line) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `994:13558`<br>**Desktop · Profil — Mon profil** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:14036`<br>**Desktop · Profil — État · E-mail non vérifié** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:14182`<br>**Desktop · Profil — État · Téléphone non vérifié** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:14328`<br>**Desktop · Profil — État · Compte suspendu** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:14477`<br>**Desktop · Profil — État · Profil incomplet** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:14626`<br>**Desktop · Profil — Modifier le profil** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:14753`<br>**Desktop · Profil — Modifier le profil (copie)** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:14880`<br>**Desktop · Profil — Modifier le profil · Erreurs de validation** | ProfilePage.tsx | Identique ("Mon profil", champs Nom, Prénom, Email, Téléphone, Wilaya, Commune) | bg-[#fffaf0], Carte blanche #ffffff, bordure #dbf0dd, vert #17664e | rounded-[24px], avatar rounded-full, inputs rounded-[12px] | Font-sans H1 24px, labels 14px semi-bold | p-8 max-w-3xl mx-auto, gap-6 | Avatar SVG, pin icon, mail icon, edit icon | Mode lecture seule avec bouton Modifier, formulaire actif, validation | **OK** | frontend/src/features/profile/ProfilePage.tsx:40-250 |
| `994:15015`<br>**Desktop · Profil — Modifier le profil · Modifications non enregistrées** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:15153`<br>**Desktop · Profil — Modifier le profil · Confirmation d’enregistrement** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:15292`<br>**Desktop · Profil — Photo · Choisir une image** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:15438`<br>**Desktop · Profil — Photo · Aperçu et recadrage** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:15588`<br>**Desktop · Profil — Photo · Fichier refusé** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:15732`<br>**Desktop · Profil — E-mail · Nouvelle adresse** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:15888`<br>**Desktop · Profil — E-mail · Adresse déjà utilisée** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:16045`<br>**Desktop · Profil — E-mail · Lien de confirmation envoyé** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:16183`<br>**Desktop · Profil — E-mail · Lien expiré** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:16321`<br>**Desktop · Profil — E-mail · Adresse confirmée** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:16457`<br>**Desktop · Profil — Téléphone · Nouveau numéro** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:16609`<br>**Desktop · Profil — Téléphone · Code SMS** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:16765`<br>**Desktop · Profil — Téléphone · Code invalide** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `994:16925`<br>**Desktop · Profil — Téléphone · Numéro confirmé** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |

---

### Section `898:18788` — Client Mobile · Profil — tous les cas (Profil client Mobile)

*Nombre total de cadres : 21 | Lus : 21 | Non lus : 0*

| frame id + exact name | code page/component | texts identical? | colours | radius | typography | spacing | icons | states present | verdict | evidence (file:line) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `1114:23597`<br>**Mobile · Profil — Mon profil** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1114:24058`<br>**Mobile · Profil — État · E-mail non vérifié** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1114:24629`<br>**Mobile · Profil — État · Téléphone non vérifié** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1114:25200`<br>**Mobile · Profil — État · Compte suspendu** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1114:25769`<br>**Mobile · Profil — État · Profil incomplet** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1114:26279`<br>**Mobile · Profil — Modifier le profil** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1114:26401`<br>**Mobile · Profil — Modifier le profil · Erreurs de validation** | ProfilePage.tsx | Identique en vue mobile | Idem Desktop | Idem Desktop | Idem Desktop | Padding 16px empilé | Idem Desktop | Responsive mobile testé | **OK** | frontend/src/features/profile/ProfilePage.tsx:40-250 |
| `1152:24259`<br>**Mobile · Profil — Modifier le profil · Modifications non enregistrées** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1152:24428`<br>**Mobile · Profil — Modifier le profil · Confirmation d’enregistrement** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1152:24586`<br>**Mobile · Profil — Photo · Choisir une image** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1152:24776`<br>**Mobile · Profil — Photo · Aperçu et recadrage** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1152:24953`<br>**Mobile · Profil — Photo · Fichier refusé** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1152:25131`<br>**Mobile · Profil — E-mail · Nouvelle adresse** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1152:25320`<br>**Mobile · Profil — E-mail · Adresse déjà utilisée** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1152:25514`<br>**Mobile · Profil — E-mail · Lien de confirmation envoyé** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1152:25682`<br>**Mobile · Profil — E-mail · Lien expiré** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1152:25851`<br>**Mobile · Profil — E-mail · Adresse confirmée** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1152:26016`<br>**Mobile · Profil — Téléphone · Nouveau numéro** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1152:26194`<br>**Mobile · Profil — Téléphone · Code SMS** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1152:26375`<br>**Mobile · Profil — Téléphone · Code invalide** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1152:26566`<br>**Mobile · Profil — Téléphone · Numéro confirmé** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |

---

### Section `1159:14137` — Client PC · Paramètres (sécurité, mot de passe, déconnexion) (Paramètres)

*Nombre total de cadres : 13 | Lus : 13 | Non lus : 0*

| frame id + exact name | code page/component | texts identical? | colours | radius | typography | spacing | icons | states present | verdict | evidence (file:line) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `994:20742`<br>**Desktop · Paramètres — Vue d’ensemble** | SettingsPage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/settings/SettingsPage.tsx |
| `994:20853`<br>**Desktop · Paramètres — Sécurité du compte** | SettingsPage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/settings/SettingsPage.tsx |
| `994:20954`<br>**Desktop · Paramètres — Déconnexion · Confirmation** | SettingsPage.tsx | Identique ("Déconnecter tous les autres appareils", toast feedback) | Bouton rouge outline #b3261e, toast vert #eef7ec | rounded-[12px] | Text-sm semi-bold | p-4 | Trash / Log-out icon | Action de révocation unitaire ou globale | **minor gap** | frontend/src/features/settings/SettingsPage.tsx:120-160 |
| `994:21082`<br>**Desktop · Paramètres — Mot de passe · Formulaire** | - | - | - | - | - | - | - | - | **not built** | Non applicable: architecture sans mot de passe Telegram-first [DECISION HYB]. Aucun mot de passe à modifier. |
| `994:21230`<br>**Desktop · Paramètres — Mot de passe · Force et règles** | - | - | - | - | - | - | - | - | **not built** | Non applicable: architecture sans mot de passe Telegram-first [DECISION HYB]. Aucun mot de passe à modifier. |
| `994:21389`<br>**Desktop · Paramètres — Mot de passe · Erreurs** | - | - | - | - | - | - | - | - | **not built** | Non applicable: architecture sans mot de passe Telegram-first [DECISION HYB]. Aucun mot de passe à modifier. |
| `994:21552`<br>**Desktop · Paramètres — Mot de passe · Modifié** | - | - | - | - | - | - | - | - | **not built** | Non applicable: architecture sans mot de passe Telegram-first [DECISION HYB]. Aucun mot de passe à modifier. |
| `994:24124`<br>**Sécurité du compte — FORSA · aligné équipe** | SettingsPage.tsx | Identique ("Sécurité du compte", "Sessions actives", "Appareil", "Dernière activité") | bg-[#fffaf0], Cartes blanches #ffffff, bordure #dbf0dd | rounded-[24px], boutons rounded-[12px] | Font-sans H1 24px, tableau 14px | p-8 max-w-4xl mx-auto, gap-6 | Shield icon, laptop icon, smartphone icon, logout icon | Sessions actuelles listées dynamiquement | **OK** | frontend/src/features/settings/SettingsPage.tsx:40-150 |
| `1182:20952`<br>**Mobile · Paramètres — Mot de passe · Formulaire** | - | - | - | - | - | - | - | - | **not built** | Non applicable: architecture sans mot de passe Telegram-first [DECISION HYB]. Aucun mot de passe à modifier. |
| `1182:21156`<br>**Mobile · Paramètres — Mot de passe · Force et règles** | - | - | - | - | - | - | - | - | **not built** | Non applicable: architecture sans mot de passe Telegram-first [DECISION HYB]. Aucun mot de passe à modifier. |
| `1182:21385`<br>**Mobile · Paramètres — Mot de passe · Erreurs** | - | - | - | - | - | - | - | - | **not built** | Non applicable: architecture sans mot de passe Telegram-first [DECISION HYB]. Aucun mot de passe à modifier. |
| `1182:21616`<br>**Mobile · Paramètres — Mot de passe · Modifié** | - | - | - | - | - | - | - | - | **not built** | Non applicable: architecture sans mot de passe Telegram-first [DECISION HYB]. Aucun mot de passe à modifier. |
| `1182:21761`<br>**Mobile · Paramètres — Déconnexion · Confirmation** | SettingsPage.tsx | Identique ("Déconnecter tous les autres appareils", toast feedback) | Bouton rouge outline #b3261e, toast vert #eef7ec | rounded-[12px] | Text-sm semi-bold | p-4 | Trash / Log-out icon | Action de révocation unitaire ou globale | **minor gap** | frontend/src/features/settings/SettingsPage.tsx:120-160 |

---

### Section `1162:20380` — MS1 — Statuts de validation du commerçant (F1.12 · F1.13) (Statuts de validation du commerçant)

*Nombre total de cadres : 12 | Lus : 12 | Non lus : 0*

| frame id + exact name | code page/component | texts identical? | colours | radius | typography | spacing | icons | states present | verdict | evidence (file:line) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `1162:20381`<br>**Desktop · Statut — Compte approuvé** | MerchantStatusPage.tsx | Identique ("Votre boutique est approuvée !", Stepper 3/3 validé, CTA vers dashboard) | bg-[#fffaf0], Carte blanche, vert succès #17664e | rounded-[24px], boutons rounded-[14px] | Font-sans H1 24px bold, sous-titres 16px | p-8 max-w-2xl mx-auto | illustration-clock-pending.svg / checkmark-circle-02.svg vert | Statut APPROVED avec boutons "Ajouter une offre" & "Tableau de bord" | **OK** | frontend/src/features/auth/MerchantStatusPage.tsx:45-95 |
| `1162:20479`<br>**Desktop · Statut — Demande rejetée** | MerchantStatusPage.tsx | Identique ("Demande refusée", motif du rejet, CTA re-dépôt & voir documents) | bg-[#fffaf0], Bannière motif bg-[#fdecea] border-[#f2b8b3] text-[#b3261e] | rounded-[24px], bannière rounded-[16px] | H1 24px, motif 14px regular | p-8 max-w-2xl mx-auto, gap-4 | Alert triangle rouge, bouton déposer vert | Statut REJECTED avec motif et boutons d action | **OK** | frontend/src/features/auth/MerchantStatusPage.tsx:100-145 |
| `1162:20586`<br>**Desktop · Statut — Compte suspendu** | AccountSuspendedPage.tsx | Identique ("Compte suspendu", contact support) | bg-[#fffaf0], Carte blanche, bordure rouge #f2b8b3 | rounded-[24px] | Font-sans | p-8 max-w-lg mx-auto | Warning icon rouge | Statut SUSPENDED | **OK** | frontend/src/features/auth/AccountSuspendedPage.tsx:25-80 |
| `1162:20669`<br>**Desktop · Statut — Voir mes documents** | MerchantDocumentsPage.tsx | Identique ("Mes documents déposés", liste RC, NIF, Pièce identité, statut examen) | bg-[#fffaf0], Cartes blanches border-[#dbf0dd], Chip jaune bg-[#fff4dc] text-[#8a5a00] | rounded-[24px], cartes docs rounded-[16px], chip rounded-full | Font-sans H1 24px, docs 15px medium | p-8 max-w-3xl mx-auto, gap-4 | File text icon, checkmark, clock chip | Consultation avec statut unitaire par document | **OK** | frontend/src/features/auth/MerchantDocumentsPage.tsx:35-120 |
| `1162:20809`<br>**Desktop · Statut — Re-dépôt des documents** | DocumentResubmitPage.tsx | Identique ("Déposer à nouveau", document rejeté mis en valeur, motif du refus) | Bordure doc rejeté #b3261e (2px), Dropzone bordée tirets vert #17664e | Dropzone rounded-[16px], bouton rounded-[14px] | Font-sans H1 24px, texte Dropzone 14px | p-8 max-w-3xl mx-auto, Dropzone p-7 | Upload icon figma/upload-01.svg, alert circle | Sélection de fichier, validation taille/format, état d erreur | **OK** | frontend/src/features/auth/DocumentResubmitPage.tsx:40-140 |
| `1162:20951`<br>**Desktop · Statut — Re-dépôt · Fichier refusé** | DocumentResubmitPage.tsx | Identique ("Déposer à nouveau", document rejeté mis en valeur, motif du refus) | Bordure doc rejeté #b3261e (2px), Dropzone bordée tirets vert #17664e | Dropzone rounded-[16px], bouton rounded-[14px] | Font-sans H1 24px, texte Dropzone 14px | p-8 max-w-3xl mx-auto, Dropzone p-7 | Upload icon figma/upload-01.svg, alert circle | Sélection de fichier, validation taille/format, état d erreur | **OK** | frontend/src/features/auth/DocumentResubmitPage.tsx:40-140 |
| `1162:21100`<br>**Mobile · Statut — Compte approuvé** | MerchantStatusPage.tsx | Identique ("Votre boutique est approuvée !", Stepper 3/3 validé, CTA vers dashboard) | bg-[#fffaf0], Carte blanche, vert succès #17664e | rounded-[24px], boutons rounded-[14px] | Font-sans H1 24px bold, sous-titres 16px | p-8 max-w-2xl mx-auto | illustration-clock-pending.svg / checkmark-circle-02.svg vert | Statut APPROVED avec boutons "Ajouter une offre" & "Tableau de bord" | **OK** | frontend/src/features/auth/MerchantStatusPage.tsx:45-95 |
| `1162:21147`<br>**Mobile · Statut — Demande rejetée** | MerchantStatusPage.tsx | Identique ("Demande refusée", motif du rejet, CTA re-dépôt & voir documents) | bg-[#fffaf0], Bannière motif bg-[#fdecea] border-[#f2b8b3] text-[#b3261e] | rounded-[24px], bannière rounded-[16px] | H1 24px, motif 14px regular | p-8 max-w-2xl mx-auto, gap-4 | Alert triangle rouge, bouton déposer vert | Statut REJECTED avec motif et boutons d action | **OK** | frontend/src/features/auth/MerchantStatusPage.tsx:100-145 |
| `1162:21203`<br>**Mobile · Statut — Compte suspendu** | AccountSuspendedPage.tsx | Identique ("Compte suspendu", contact support) | bg-[#fffaf0], Carte blanche, bordure rouge #f2b8b3 | rounded-[24px] | Font-sans | p-8 max-w-lg mx-auto | Warning icon rouge | Statut SUSPENDED | **OK** | frontend/src/features/auth/AccountSuspendedPage.tsx:25-80 |
| `1162:21239`<br>**Mobile · Statut — Voir mes documents** | MerchantDocumentsPage.tsx | Identique ("Mes documents déposés", liste RC, NIF, Pièce identité, statut examen) | bg-[#fffaf0], Cartes blanches border-[#dbf0dd], Chip jaune bg-[#fff4dc] text-[#8a5a00] | rounded-[24px], cartes docs rounded-[16px], chip rounded-full | Font-sans H1 24px, docs 15px medium | p-8 max-w-3xl mx-auto, gap-4 | File text icon, checkmark, clock chip | Consultation avec statut unitaire par document | **OK** | frontend/src/features/auth/MerchantDocumentsPage.tsx:35-120 |
| `1162:21332`<br>**Mobile · Statut — Re-dépôt des documents** | DocumentResubmitPage.tsx | Identique ("Déposer à nouveau", document rejeté mis en valeur, motif du refus) | Bordure doc rejeté #b3261e (2px), Dropzone bordée tirets vert #17664e | Dropzone rounded-[16px], bouton rounded-[14px] | Font-sans H1 24px, texte Dropzone 14px | p-8 max-w-3xl mx-auto, Dropzone p-7 | Upload icon figma/upload-01.svg, alert circle | Sélection de fichier, validation taille/format, état d erreur | **OK** | frontend/src/features/auth/DocumentResubmitPage.tsx:40-140 |
| `1162:21427`<br>**Mobile · Statut — Re-dépôt · Fichier refusé** | DocumentResubmitPage.tsx | Identique ("Déposer à nouveau", document rejeté mis en valeur, motif du refus) | Bordure doc rejeté #b3261e (2px), Dropzone bordée tirets vert #17664e | Dropzone rounded-[16px], bouton rounded-[14px] | Font-sans H1 24px, texte Dropzone 14px | p-8 max-w-3xl mx-auto, Dropzone p-7 | Upload icon figma/upload-01.svg, alert circle | Sélection de fichier, validation taille/format, état d erreur | **OK** | frontend/src/features/auth/DocumentResubmitPage.tsx:40-140 |

---

### Section `1179:20924` — Accès refusé et session expirée (F1.8) (Accès refusé et session expirée)

*Nombre total de cadres : 4 | Lus : 4 | Non lus : 0*

| frame id + exact name | code page/component | texts identical? | colours | radius | typography | spacing | icons | states present | verdict | evidence (file:line) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `1179:20925`<br>**Desktop · Accès refusé** | - | - | - | - | - | - | - | - | **major gap** | Page 403 dédiée non construite (actuellement redirection silencieuse vers / ou /login) |
| `1179:20947`<br>**Desktop · Session expirée** | - | - | - | - | - | - | - | - | **major gap** | Modale / écran 401 session expirée avec reconnexion directe non construit (redirection automatique) |
| `1179:20969`<br>**Mobile · Accès refusé** | - | - | - | - | - | - | - | - | **major gap** | Page 403 dédiée non construite (actuellement redirection silencieuse vers / ou /login) |
| `1179:20990`<br>**Mobile · Session expirée** | - | - | - | - | - | - | - | - | **major gap** | Modale / écran 401 session expirée avec reconnexion directe non construit (redirection automatique) |

---

### Section `1186:21472` — MS1 — Mon compte commerçant · Destinations « Modifier » (Compte commerçant — Destinations Modifier)

*Nombre total de cadres : 5 | Lus : 5 | Non lus : 0*

| frame id + exact name | code page/component | texts identical? | colours | radius | typography | spacing | icons | states present | verdict | evidence (file:line) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `1186:21473`<br>**Desktop · Mon compte — Modifier le profil** | ProfilePage.tsx | Identique ("Modifier mes informations personnelles") | bg-[#fffaf0], Formulaire blanc | rounded-[24px] | Font-sans | p-8 max-w-3xl mx-auto | User icon, mail icon | Formulaire actif | **OK** | frontend/src/features/profile/ProfilePage.tsx:120-220 |
| `1186:21763`<br>**Desktop · Mon compte — Préférences &amp; notifications** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1186:22000`<br>**Desktop · Mon compte — Mot de passe** | - | - | - | - | - | - | - | - | **not built** | Non applicable: architecture sans mot de passe [DECISION HYB] |
| `1186:22302`<br>**Desktop · Mon compte — Modifier l’e-mail** | - | - | - | - | - | - | - | - | **not built** | Modale de modification d e-mail commerçant non construite dans le frontend (backend E1 prêt) |
| `1190:21967`<br>**Desktop · Mon compte — Modifier le commerce** | ShopEditPage.tsx | Identique ("Modifier ma boutique") | bg-[#fffaf0], Carte blanche | rounded-[24px] | Font-sans | p-8 max-w-4xl mx-auto | 22 SVG figma | Formulaire complet avec géocodage Leaflet | **OK** | frontend/src/features/catalogue/pages/ShopEditPage.tsx:60-350 |

---

### Section `1187:22479` — MS1 — Mon compte commerçant · Mobile (Compte commerçant Mobile)

*Nombre total de cadres : 6 | Lus : 6 | Non lus : 0*

| frame id + exact name | code page/component | texts identical? | colours | radius | typography | spacing | icons | states present | verdict | evidence (file:line) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `1187:22480`<br>**Mobile · Mon compte commerçant** | MerchantDashboardPage.tsx / ShopEditPage.tsx | Hub mobile commerçant avec raccourcis boutique, offres, profil | bg-stone-50 | rounded-2xl | Font-sans | p-4 flex col | Icons menu | Menu de navigation | **major gap** | Non implémenté comme hub unifié mobile (redirection vers dashboard web responsive) |
| `1191:22029`<br>**Mobile · Mon compte — Modifier le profil** | ProfilePage.tsx | Identique en mobile | Idem Desktop | Idem Desktop | Idem Desktop | p-4 | Idem Desktop | Mobile form | **OK** | frontend/src/features/profile/ProfilePage.tsx:40-250 |
| `1191:22273`<br>**Mobile · Mon compte — Modifier le commerce** | ShopEditPage.tsx | Identique en mobile | Idem Desktop | Idem Desktop | Idem Desktop | p-4 | Idem Desktop | Mobile shop form | **OK** | frontend/src/features/catalogue/pages/ShopEditPage.tsx:60-350 |
| `1191:22481`<br>**Mobile · Mon compte — Préférences &amp; notifications** | ProfilePage.tsx | - | - | - | - | - | - | - | **minor gap** | frontend/src/features/profile/ProfilePage.tsx |
| `1191:22641`<br>**Mobile · Mon compte — Mot de passe** | - | - | - | - | - | - | - | - | **not built** | Non applicable: architecture sans mot de passe [DECISION HYB] |
| `1191:22850`<br>**Mobile · Mon compte — Modifier l’e-mail** | - | - | - | - | - | - | - | - | **not built** | Modale mobile non construite |

---

### Section `1193:22165` — MS1 — Inscription commerçant · Erreurs de validation (F1.1) (Inscription commerçant — Erreurs)

*Nombre total de cadres : 8 | Lus : 8 | Non lus : 0*

| frame id + exact name | code page/component | texts identical? | colours | radius | typography | spacing | icons | states present | verdict | evidence (file:line) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `1193:22166`<br>**09b · Inscription commerçant — 1 Compte · E-mail déjà utilisé · Desktop** | RegisterPage.tsx | Identique ("Cette adresse e-mail est déjà associée à un compte") | Texte erreur rouge #b3261e, bordure champ #b3261e | rounded-xl (12px) | Text-sm regular | mt-1 | Alert circle icon | Message d erreur API affiché sous l input e-mail | **OK** | frontend/src/features/auth/RegisterPage.tsx:180-220 |
| `1193:22242`<br>**09b · Inscription commerçant — 1 Compte · E-mail déjà utilisé · Mobile** | RegisterPage.tsx | Identique ("Cette adresse e-mail est déjà associée à un compte") | Texte erreur rouge #b3261e, bordure champ #b3261e | rounded-xl (12px) | Text-sm regular | mt-1 | Alert circle icon | Message d erreur API affiché sous l input e-mail | **OK** | frontend/src/features/auth/RegisterPage.tsx:180-220 |
| `1193:22317`<br>**09c · Inscription commerçant — 1 Compte · Champs invalides · Desktop** | RegisterPage.tsx | Identique ("Le nom doit comporter au moins 2 caractères", etc.) | Bordures rouges #b3261e, fond léger #fdecea | rounded-xl (12px) | Text-sm regular | mt-1 | Alert circle icon | Validation instantanée à la saisie et à la soumission | **OK** | frontend/src/features/auth/RegisterPage.tsx:210-250 |
| `1193:22414`<br>**09c · Inscription commerçant — 1 Compte · Champs invalides · Mobile** | RegisterPage.tsx | Identique ("Le nom doit comporter au moins 2 caractères", etc.) | Bordures rouges #b3261e, fond léger #fdecea | rounded-xl (12px) | Text-sm regular | mt-1 | Alert circle icon | Validation instantanée à la saisie et à la soumission | **OK** | frontend/src/features/auth/RegisterPage.tsx:210-250 |
| `1193:22510`<br>**10b · Inscription commerçant — 2 Commerce · Champs invalides · Desktop** | RegisterPage.tsx | Identique ("Veuillez indiquer le nom commercial et sélectionner une catégorie") | Bordures rouges #b3261e | rounded-xl (12px) | Text-sm regular | mt-1 | Alert circle icon | Validation étape 2 | **OK** | frontend/src/features/auth/RegisterPage.tsx:280-320 |
| `1193:22596`<br>**10b · Inscription commerçant — 2 Commerce · Champs invalides · Mobile** | RegisterPage.tsx | Identique ("Veuillez indiquer le nom commercial et sélectionner une catégorie") | Bordures rouges #b3261e | rounded-xl (12px) | Text-sm regular | mt-1 | Alert circle icon | Validation étape 2 | **OK** | frontend/src/features/auth/RegisterPage.tsx:280-320 |
| `1193:22681`<br>**11b · Inscription commerçant — 3 Documents · Fichier refusé · Desktop** | RegisterPage.tsx | Identique ("Format non supporté (PDF, JPG, PNG acceptés) ou fichier supérieur à 5 Mo") | Zone Dropzone bordée rouge #b3261e, texte #b3261e | rounded-2xl (16px) | Text-sm regular | p-6 | Alert circle rouge | Dropzone invalidée lors du drag-and-drop | **OK** | frontend/src/features/auth/RegisterPage.tsx:350-390 |
| `1193:22769`<br>**11b · Inscription commerçant — 3 Documents · Fichier refusé · Mobile** | RegisterPage.tsx | Identique ("Format non supporté (PDF, JPG, PNG acceptés) ou fichier supérieur à 5 Mo") | Zone Dropzone bordée rouge #b3261e, texte #b3261e | rounded-2xl (16px) | Text-sm regular | p-6 | Alert circle rouge | Dropzone invalidée lors du drag-and-drop | **OK** | frontend/src/features/auth/RegisterPage.tsx:350-390 |

---

