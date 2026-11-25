# Rapport de reconstruction Frontend MS1 — FORSA (Figma `yX4WMqraIaBSVKibnrCeat`, Canvas `6:9`)

**Date :** 25 Novembre 2026  
**Branche active :** `feature/ms1-accounts` (synchronisée sur `origin/feature/ms1-accounts`)  
**Statut de compilation :** ✅ `tsc -b && vite build` réussi (0 erreur, 2315 modules transformés)  
**Tests unitaires frontend :** ✅ `vitest run` : 6/6 fichiers de test passés, 44/44 tests validés  
**Connexion Figma MCP :** ✅ Vérifiée & opérationnelle sur `1181:15813`  

---

## 1. Synthèse des réalisations par ordre de priorité

### 1.1. Accès refusé (403) et Session expirée (401) — Node `1179:20924`
- Création de `frontend/src/features/auth/AccessDeniedPage.tsx` et `frontend/src/features/auth/SessionExpiredPage.tsx`.
- Conformes aux maquettes desktop (1440px) et mobile (390px) avec fond uni `#dce1d0`, carte blanche arrondie 32px/24px avec bordure `#dbf0dd`, icône horloge rouge/ambre officielle Figma (`clock-01-red.svg`, `clock-01-amber.svg`), et boutons d'action reliés aux routes de destination (`/` et `/login`).
- Routes configurées dans `frontend/src/App.tsx` : `/403`, `/access-denied`, `/401`, `/session-expired`.

### 1.2. Hub « Mon compte commerçant » desktop & mobile — Nodes `1150:28299` & `1187:22480`
- Création de `frontend/src/features/account/MerchantAccountPage.tsx` sous la route `/merchant/account`.
- Implémente l'ensemble des 5 sections Figma :
  1. **Informations du profil** (`1150:28080`) : avatar avec initiales/photo, nom, prénom, email, téléphone, badge rôle. Bouton « Modifier » -> `/merchant/account/edit-profile`.
  2. **Informations du commerce** (`1150:28135`) : nom, statut d'approbation (badge vert "Validé & actif"), adresse, catégorie, horaires d'ouverture. Bouton « Modifier » -> `/merchant/shop`.
  3. **Préférences & notifications** (`1150:28166`) : toggles récapitulatifs e-mail et rappels. Bouton « Modifier » -> `/merchant/account/preferences`.
  4. **Sécurité** (`1150:28198`) : e-mail associé avec bouton « Modifier » -> `/merchant/account/change-email`.
  5. **Besoin d'aide ?** (`1150:28221`) : assistance FORSA avec bouton `mailto:support@forsa.dz`.
  6. **Déconnexion Mobile** (`1187:22480`) : bouton pleine largeur en bas de page appelant `logout()` et redirigeant vers `/login`.

### 1.3. Pages « Modifier » commerçant — Node `1186:21472`
- **Profil commerçant (`1186:21473` / `1186:21568`)** : `frontend/src/features/account/MerchantEditProfilePage.tsx` (`/merchant/account/edit-profile`). Modification du nom, prénom, téléphone et consultation du statut boutique.
- **Préférences de notifications (`1186:21763` / `1186:21865`)** : `frontend/src/features/account/MerchantPreferencesPage.tsx` (`/merchant/account/preferences`). Toggles interactifs (réservations par e-mail, rappels horaires, nouveaux avis clients, offres proches de l'expiration) avec encart conseil « À savoir ».
- **Changement d'e-mail (`1186:22302` / `1186:22370`)** : `frontend/src/features/account/MerchantChangeEmailPage.tsx` (`/merchant/account/change-email`). Flux en 2 étapes avec saisie du nouvel e-mail puis vérification du code OTP reçu sur la nouvelle boîte mail.

### 1.4. Modales de compte client — Node `994:13556`
- **Modale changement d'e-mail** : `frontend/src/features/account/ChangeEmailModal.tsx` (`994:15622`).
- **Modale changement de mobile Telegram (2 étapes)** : `frontend/src/features/account/ChangePhoneModal.tsx` (`994:15525`).
- **Modale recadrage photo / cropper** : `frontend/src/features/account/AvatarCropperModal.tsx` (`994:15438`).
- Intégration complète dans `frontend/src/features/profile/ProfilePage.tsx` lors du téléversement d'avatar et de la modification du téléphone.

### 1.5. Bannière « Suppression impossible » — Node `1156:26271`
- Refonte de `frontend/src/features/settings/AccountDangerPage.tsx` (`/settings/danger`) selon la frame Figma `1156:26272`.
- Implémente la bannière d'avertissement bloquante `1156:26649` (« Suppression impossible (commandes en cours) ») avec lien direct vers la gestion des réservations.
- Modale de confirmation centrée `1156:26512` avec liste des 3 conséquences irréversibles et case à cocher obligatoire avant validation de la suppression.

### 1.6. Modale centrée de confirmation de changement de mode — Node `1155:25968`
- Refonte de `frontend/src/features/settings/ModeSwitchPage.tsx` (`/settings/mode`) selon la frame Figma `1155:25969`.
- Modale centrée `w-[560px]` (`1155:26176`) avec pastille icône switch, titre, explication et boutons "Annuler" / "Passer en mode commerçant".

### 1.7. Statuts de validation commerçant & re-dépôt — Node `1162:20380`
- Vérification et alignement des flux dans `MerchantStatusPage.tsx`, `MerchantDocumentsPage.tsx` et `DocumentResubmitPage.tsx`.
- Prise en charge des états : approuvé, en attente, rejeté (avec motif CNRC et lien direct vers re-dépôt), suspendu (avec motif et contact support), et re-dépôt avec validation des formats et tailles de fichiers.

### 1.8. Gestion des erreurs d'inscription commerçant — Node `1193:22165`
- Validation des étapes 09b (e-mail déjà utilisé avec lien direct vers `/login`), 09c (champs invalides étape 1), 10b (champs invalides étape 2 commerce) et 11b (fichiers rejetés étape 3 documents) dans `RegisterPage.tsx`.

---

## 2. Tableau d'audit et de conformité écran par écran

| Frame ID | Nom Figma | Fichier / Route | Verdict | Preuve | Interactions codées | Éléments DÉDUITS à valider |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `1179:20925` | Desktop · Accès refusé (403) | `AccessDeniedPage.tsx` (`/403`) | **OK** | Fond uni `#dce1d0`, carte 560px `#dbf0dd`, icône rouge Figma, bouton "Retour à l'accueil" | 1/1 | Redirection vers `/` |
| `1179:20947` | Desktop · Session expirée (401) | `SessionExpiredPage.tsx` (`/401`) | **OK** | Carte 560px, icône ambre Figma, bouton "Se reconnecter" avec `nextPath` | 1/1 | Mémorisation du `redirect` |
| `1179:20969` | Mobile · Accès refusé (403) | `AccessDeniedPage.tsx` (`/403`) | **OK** | Layout responsive 350px, en-tête mobile compact | 1/1 | Identique desktop |
| `1179:20990` | Mobile · Session expirée (401) | `SessionExpiredPage.tsx` (`/401`) | **OK** | Layout responsive 350px, bouton pleine largeur | 1/1 | Identique desktop |
| `1150:28079` / `1150:28299` | Desktop · Mon compte commerçant | `MerchantAccountPage.tsx` (`/merchant/account`) | **OK** | 5 cartes structurées conformes Figma (Profil, Commerce, Préférences, Sécurité, Support) | 5/5 | Liens Modifier vers chaque sous-page |
| `1187:22480` | Mobile · Mon compte commerçant | `MerchantAccountPage.tsx` (`/merchant/account`) | **OK** | Vue responsive mobile avec bouton de déconnexion rouge en bas de page | 6/6 | Bouton Déconnexion fonctionnel |
| `1186:21473` | Desktop · Modifier les informations du profil | `MerchantEditProfilePage.tsx` (`/merchant/account/edit-profile`) | **OK** | Formulaire gérant (nom, prénom, téléphone, statut boutique) | 2/2 | Annuler (`/merchant/account`), Enregistrer |
| `1186:21568` | Mobile · Modifier les informations du profil | `MerchantEditProfilePage.tsx` (`/merchant/account/edit-profile`) | **OK** | Formulaire responsive adapté écran 390px | 2/2 | Identique desktop |
| `1186:21763` | Desktop · Modifier les préférences | `MerchantPreferencesPage.tsx` (`/merchant/account/preferences`) | **OK** | 4 toggles notifications + carte conseil « À savoir » | 2/2 | Toggles interactifs, Sauvegarde |
| `1186:21865` | Mobile · Modifier les préférences | `MerchantPreferencesPage.tsx` (`/merchant/account/preferences`) | **OK** | Responsive 390px avec disposition verticale | 2/2 | Identique desktop |
| `1186:22302` | Desktop · Modifier l’e-mail | `MerchantChangeEmailPage.tsx` (`/merchant/account/change-email`) | **OK** | Flux 2 étapes : saisie e-mail puis vérification code OTP | 3/3 | Étape 1 envoi, Étape 2 validation OTP, Annuler |
| `1186:22370` | Mobile · Modifier l’e-mail | `MerchantChangeEmailPage.tsx` (`/merchant/account/change-email`) | **OK** | Responsive mobile 390px | 3/3 | Identique desktop |
| `994:15622` | Modal — Changement d'email | `ChangeEmailModal.tsx` | **OK** | Modale popup 2 étapes pour profil client | 2/2 | Fermeture, Validation code |
| `994:15525` | Desktop · Modal — Changement de téléphone | `ChangePhoneModal.tsx` | **OK** | Modale popup 2 étapes Telegram avec saisie et OTP | 3/3 | Démarrage bot, Validation OTP, Annuler |
| `994:15438` | Desktop · Modal — Recadrer la photo | `AvatarCropperModal.tsx` | **OK** | Modale cercle de masquage + curseur zoom + sauvegarde | 2/2 | Annuler, Valider le recadrage |
| `1156:26272` | Desktop · Paramètres — Supprimer le compte | `AccountDangerPage.tsx` (`/settings/danger`) | **OK** | Carte zone de danger avec bannière bloquante commandes en cours | 2/2 | Bouton Réservations, Déclenchement modale |
| `1156:26649` | Bannière suppression impossible | `AccountDangerPage.tsx` | **OK** | Affichée si `pendingOrdersCount > 0` | 1/1 | Clic redirection `/merchant/reservations` |
| `1156:26512` | Modal confirmation suppression | `AccountDangerPage.tsx` | **OK** | 3 conséquences détaillées + case à cocher obligatoire | 2/2 | Annuler, Confirmation suppression définitive |
| `1155:25969` | Mode — Passer en mode commerçant | `ModeSwitchPage.tsx` (`/settings/mode`) | **OK** | Cartes comparatives Client / Commerçant + Bannière info | 2/2 | Annuler, Déclencher modale |
| `1155:26176` | Modal confirmation changement de mode | `ModeSwitchPage.tsx` | **OK** | Modale centrée `w-[560px]`, pastille verte, bouton confirmer | 2/2 | Annuler, Exécuter le basculement |
| `1162:20381` | Desktop · Statut — Compte approuvé | `MerchantStatusPage.tsx` (`/merchant/status`) | **OK** | Pastille verte check, titre, roadmap 3 étapes, boutons dashboard & offre | 2/2 | Liens `/merchant/dashboard` et `/merchant/create-offer` |
| `1162:20479` | Desktop · Statut — Demande rejetée | `MerchantStatusPage.tsx` (`/merchant/status`) | **OK** | Pastille ambre alert, encart motif de rejet, boutons re-dépôt et documents | 2/2 | Liens `/merchant/documents/resubmit` et `/merchant/documents` |
| `1162:20586` | Desktop · Statut — Compte suspendu | `MerchantStatusPage.tsx` / `AccountSuspendedPage.tsx` | **OK** | Pastille rouge block, motif suspension, boutons support & déconnexion | 2/2 | Contact mailto & logout |
| `1162:20669` | Desktop · Statut — Voir mes documents | `MerchantDocumentsPage.tsx` (`/merchant/documents`) | **OK** | Liste des justificatifs CNRC, NIF, devanture avec badges de conformité | 2/2 | Retour statut, Re-dépôt |
| `1162:20809` | Desktop · Statut — Re-dépôt des pièces | `DocumentResubmitPage.tsx` (`/merchant/documents/resubmit`) | **OK** | Dropzones de remplacement avec drag & drop et validation 5 Mo | 2/2 | Téléversement, Annuler |
| `1193:22166` | 09b · Inscription commerçant · E-mail déjà utilisé | `RegisterPage.tsx` (`/register?role=merchant`) | **OK** | Alerte d'e-mail utilisé avec lien direct vers `/login` | 1/1 | Lien direct de connexion |
| `1193:22317` | 09c · Inscription commerçant · Champs invalides | `RegisterPage.tsx` | **OK** | Feedback visuel d'erreur sur nom, e-mail et mobile | 1/1 | Re-saisie et focus |
| `1193:22510` | 10b · Inscription commerce · Champs invalides | `RegisterPage.tsx` | **OK** | Validation requise sur établissement et adresse | 1/1 | Re-saisie étape 2 |
| `1193:22681` | 11b · Inscription documents · Fichier refusé | `RegisterPage.tsx` & `DocumentResubmitPage.tsx` | **OK** | Détection taille > 5 Mo et formats (PDF, JPG, PNG) avec alerte rouge | 1/1 | Réinitialisation du fichier |
| `994:13556` | Client PC · Profil | `ProfilePage.tsx` (`/profile`) | **OK** | Profil client avec intégration de l'AvatarCropperModal et ChangePhoneModal | 4/4 | Édition, Avatar, Téléphone, Sauvegarde |
| `1159:14137` | Client PC · Paramètres | `SettingsPage.tsx` (`/settings`) | **OK** | Sessions actives, compte Telegram lié, déconnexion avec modale de confirmation | 3/3 | Déconnexion, Gestion mode, Zone sensible |

---

## 3. Éléments DÉDUITS à valider par le Lead Dev / PO

1. **Routage de secours pour l'e-mail OTP commerçant (`POST /api/users/me/email/request-change` & `POST /api/users/me/email/verify-change`) :**  
   - Si les endpoints dédiés au changement d'e-mail ne sont pas encore déployés sur MS1 dans l'environnement de test, le composant utilise un fallback via `PUT /api/users/me` après confirmation locale du code OTP.
2. **Détection des commandes en cours pour la zone sensible (`AccountDangerPage.tsx`) :**  
   - Le composant interroge le store local / les réservations pour savoir si `pendingOrdersCount > 0`. S'il y a des commandes non finalisées, la bannière bloquante s'affiche et désactive l'ouverture de la modale de suppression.
3. **Conservation stricte du shell MS2 :**  
   - Aucun fichier sous `frontend/src/features/catalogue/**` n'a été altéré. `MerchantSidebar.tsx` pointe vers `/merchant/account` et son bouton de déconnexion utilise la méthode officielle `logout()`.
