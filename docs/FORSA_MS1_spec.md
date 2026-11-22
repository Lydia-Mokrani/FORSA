# FORSA (فرصة) — MS1 Comptes & boutiques : spécification d'implémentation

Version : 22/11/2026. Projet univ. UMBB ING4 GL, matière WAMS. Tuteur : Dr Yahiatene Youcef.
Statut des infos : le design Figma est la source de vérité visuelle. Le backend/Telegram ci-dessous est une **proposition à valider** ; ne rien inventer au-delà, poser la question en cas de doute.

## 0. Contexte et stack
- Plateforme web de vente d'invendus à prix réduit : réservation en ligne, retrait en magasin.
- Stack prévue : React 18 + Tailwind, Node/Express, PostgreSQL + PostGIS, Leaflet/OpenStreetMap.
- Repo GitHub : Lydia-Mokrani/FORSA. Dev du 08/11 au 12/12/2026, version finale 15/12/2026.
- Acteurs : visiteur, client, commerçant, administrateur, système.
- Réservation (scénario voulu) : réserver → ticket/QR généré automatiquement → retrait (scan en magasin) → avis. Le magasin ne confirme pas la réservation à l'avance.
- 5 microservices : MS1 comptes+boutiques, MS2 catalogue/recherche, MS3 réservations, MS4 confiance/modération (validation commerçants, signalements, OCR dates, avis), MS5 notifications. Ce document ne concerne que **MS1** (+ ses interfaces avec MS2/MS4/MS5).

## 1. Règles pour implémenter le design
- Figma : fichier `forsa`, pages `inspos` (icônes), `web pc`, `web phone`, `ready to dev` (écrans MS1 à implémenter ici). Ne PAS modifier Figma.
- Reprendre fidèlement : couleurs, typo (Poppins), rayons, espacements, composants du design system. Tokens observés : vert foncé `#0b2c25`, vert `#17664e`, lime `#84b140`, menthe `#eef7ec`, crème `#fdf8ec`/`#fffaf0`, bordure `#d9ddd0`, rouge `#b3261e`, ambre `#fff4dc`. Cartes : rayon 20, bordure 1px.
- Icônes : uniquement celles de la page `inspos` (famille Hugeicons). Aucune icône externe.
- Chaque écran existe en desktop (1440) et mobile (390) → implémentation responsive, pas deux apps.
- Implémenter **tous les états** dessinés (erreur, vide, chargement, succès, désactivé), pas seulement l'état nominal.
- Nommage des frames Figma = nom des composants/pages (ex. `Desktop · Ma boutique — Adresse introuvable` → `ShopEditPage` état `addressNotFound`).
- Réutiliser les composants communs : Sidebar (client/commerçant), Header, Card, Field (label+input+erreur), Button (primary/secondary/danger/dangerOutline), Banner (success/warn/error/info), Chip, Modal (desktop) / BottomSheet (mobile), Stepper, Dropzone, MapBox.

## 2. Contraintes WAMS (à respecter dans l'architecture)
- 2.1 API REST métier (CRUD + endpoints métier). 2.2 Service d'authentification dédié (tokens, rôles/permissions) → module `auth` de MS1 clairement isolé.
- 2.3 UI web consommant l'API + auth. 2.4 RabbitMQ pour ≥1 flux asynchrone. 2.5 Consul (registry). 2.6 Traefik (reverse proxy + load balancing). 2.7 Chaque microservice sur un serveur distinct.
- Livrables : dépôt Git, rapport PDF, démo live, preuve multi-serveurs. Notation : conception 25 %, implémentation 30 %, déploiement multi-serveurs 20 %, asynchrone+sécurité 15 %, présentation+doc 10 %.
- MS1 : s'enregistre dans Consul avec `GET /health` ; routes Traefik `/api/auth`, `/api/users`, `/api/shops` ; ≥2 instances pour montrer le load balancing ; JWT validé localement par les autres services (clé publique).

## 3. Authentification par numéro + bot Telegram (décision de l'équipe)
Remplace e-mail + mot de passe. Un bot ne peut pas écrire à un numéro tant que l'utilisateur n'a pas démarré le bot → étape « Ouvrir Telegram ».

### 3.1 Connexion / inscription
1. L'utilisateur saisit son numéro (E.164, ex. +213…).
2. `POST /auth/telegram/start` → défi à usage unique ; l'UI affiche bouton « Ouvrir Telegram » + QR (`t.me/<bot>?start=<nonce>`) + état d'attente (poll `GET /auth/telegram/challenges/{id}`).
3. Dans Telegram : le bot demande le partage du contact (bouton `request_contact`).
4. Le bot vérifie : `contact.user_id == message.from.id` ET numéro == numéro saisi.
5. Le bot publie `telegram.contact.received` (RabbitMQ) ; MS1 valide, génère un code à 6 chiffres, publie `telegram.send.otp` ; MS5/bot l'envoie dans Telegram.
6. L'utilisateur saisit le code → `POST /auth/telegram/verify` → access JWT + refresh token.
- Connexions suivantes : compte déjà lié (`telegram_chat_id`) → le bot envoie directement le code (pas d'étape 3).
- Inscription = même flux avec usage `REGISTER` (+ infos de profil / étapes commerçant).

### 3.2 Changement de numéro
1. Step-up : code envoyé sur le Telegram actuel (usage `CONFIRM_SENSITIVE`).
2. Saisie du nouveau numéro ; refus si déjà utilisé par un autre compte.
3. L'utilisateur ouvre le bot depuis le Telegram qui possède le nouveau numéro, partage son contact, saisit le code.
4. Mise à jour atomique : `phone_e164` + `telegram_user_id` + `telegram_chat_id`.
- Cas court : même compte Telegram dont le numéro a changé (même `telegram_user_id`). Cas long : nouvelle SIM + nouveau compte Telegram.
- Erreurs UI à gérer : numéro déjà utilisé, contact ne correspond pas, code invalide/expiré, trop de tentatives, bot indisponible.

### 3.3 Sécurité
- Nonce à usage unique, courte durée (≈10 min). Code : 6 chiffres haché, TTL 5 min, 5 essais max.
- Rate limit par numéro et par IP (ex. 3 démarrages / 10 min).
- Jeton du bot en variable d'environnement ou Consul KV. Webhook : header secret Telegram ; en démo réseau univ. préférer **long polling** (`getUpdates`).
- JWT d'accès 15 min (claims : `sub`, `roles`, `mode`, `shopStatus`), refresh à rotation.
- Opérations sensibles (suppression de compte, changement de numéro) : confirmation par code Telegram (remplace « mot de passe actuel » dans les maquettes).
- Récupération en cas de perte du numéro : **à définir** (commerçants : appui sur leurs documents ; clients : décision produit).

## 4. Pages Figma MS1 → routes proposées
Légende : [OK] = conforme à la décision Telegram ; [ADAPTER] = maquette basée e-mail/mot de passe/SMS à adapter ; [NOUVEAU] = écran Telegram à concevoir ; [GARDER?] = à décider.

### 4.1 Connexion / inscription (section `login`, ~47 frames desktop+mobile)
| Page | Route | Options / états | API |
|---|---|---|---|
| Accueil / choix du profil | `/` | choisir client ou commerçant, vers connexion/inscription | — |
| Connexion (client/commerçant) | `/login` | identifiants incorrects, compte suspendu [ADAPTER → numéro] | `/auth/telegram/*` |
| Inscription client | `/register/client` | validation [ADAPTER → numéro] | `/auth/telegram/*` |
| Inscription commerçant (3 étapes Compte/Commerce/Documents) | `/register/merchant` | étape 2 : nom, catégorie, n° registre, adresse ; étape 3 : documents | `/auth/*`, `PUT /shops/me`, `POST /shops/me/documents` |
| Demande en attente | `/merchant/status` | message d'attente | — |
| Mot de passe oublié | — | **supprimer** | — |
| Vérification e-mail (envoi/vérifié/lien expiré) | — | [ADAPTER] e-mail facultatif ; sinon supprimer | — |
| Vérification téléphone (SMS) | `/auth/telegram/code` | [ADAPTER → code Telegram] | `/auth/telegram/verify` |
| Google / Apple (choix espace, ajout téléphone, compte existant, comptes liés) | — | [GARDER?] | `/auth/oauth/{provider}` |
| Saisie du numéro, Ouvrir Telegram (bouton+QR+attente), saisie du code, erreurs | `/auth/telegram`, `/auth/telegram/code` | [NOUVEAU] | `/auth/telegram/*` |

### 4.2 Profil client (≈21 frames mobile + 28 desktop)
- `/profile` Mon profil — 4 états : e-mail non vérifié, téléphone non vérifié, compte suspendu, profil incomplet. Entrée : « Profil » (sidebar / barre du bas).
- `/profile/edit` Modifier le profil — erreurs de validation, « changements non enregistrés », confirmation.
- Photo — choisir, recadrer, fichier refusé (`POST /users/me/photo`).
- Changer l'e-mail (5 états) [ADAPTER : e-mail facultatif ; plus de « mot de passe actuel »].
- Téléphone — nouveau numéro, code, code invalide, confirmé [ADAPTER → §3.2].

### 4.3 Paramètres client (7 frames desktop + 1 mobile)
- `/settings` Vue d'ensemble ; `/settings/security` Sécurité (appareils connectés, Telegram lié) [ADAPTER] ; Confirmation de déconnexion.
- Mot de passe (formulaire, force, erreurs, modifié) → **supprimer**.

### 4.4 Compte commerçant
- `/merchant/account` Mon compte commerçant (desktop) : blocs Informations du profil, Informations du commerce, Préférences & notifications (toggles), Statistiques, Sécurité, Aide. Boutons « Modifier » : profil, commerce (→ Ma boutique), préférences, e-mail → **écrans de destination à créer** (« Mon compte » mobile aussi).
- Compte en attente de validation.

### 4.5 Écrans ajoutés (page `ready to dev`)
- **Ma boutique** `/merchant/shop` (4 desktop + 3 mobile) : Modifier (nom, catégorie, n° registre, téléphone, adresse, horaires, carte+repère) ; Adresse introuvable (erreur champ, carte vide, Enregistrer désactivé) ; Carte indisponible (bannière warn, bouton Réessayer, enregistrement possible) ; Enregistrée (desktop). API `GET/PUT /shops/me` + géocodage.
- **Changement de mode client↔commerçant** `/settings/mode` (4 desktop + 3 mobile) : choix du mode ; confirmation « Passer en mode commerçant ? » ; indisponible si boutique non approuvée (bannière warn « en cours de vérification », bouton désactivé) ; retour mode client (confirmation). API `POST /auth/switch-mode`.
- **Désactiver / supprimer le compte** `/settings/account` (5 desktop + 4 mobile) : zone sensible (2 cartes) ; confirmation suppression (conséquences, champ de confirmation, case « Je comprends ») ; erreur de confirmation ; suppression impossible pour commerçant avec réservations/offres actives (compteurs) ; compte désactivé. Dans les maquettes le champ est « mot de passe » → **le remplacer par un code Telegram**. API `POST /users/me/deactivate`, `DELETE /users/me`.
- **Statuts de validation commerçant** `/merchant/status`, `/merchant/documents` (6 desktop + 6 mobile) : approuvé (stepper 3 étapes, CTA Ajouter une offre) ; rejeté (motif + « Déposer à nouveau ») ; suspendu (motif, offres masquées, contacter le support) ; Voir mes documents (liste + statut + voir) ; Re-dépôt (remplacer le document refusé, bouton Renvoyer désactivé tant que vide) ; Re-dépôt fichier refusé (PDF/JPG/PNG, 5 Mo max). API `GET /shops/me/verification`, `GET/POST /shops/me/documents`. Noms de documents (registre de commerce, pièce d'identité du gérant, justificatif d'adresse) = exemples à confirmer.

### 4.6 Redirection après connexion
- Client numéro non vérifié → `/profile` avec bandeau (réservation bloquée) ; client actif → accueil/offres.
- Compte suspendu → écran connexion « compte suspendu ». Compte désactivé → connexion puis réactivation.
- Commerçant : PENDING → attente ; REJECTED → rejeté → re-dépôt ; APPROVED → tableau de bord ; SUSPENDED → suspendu (offres masquées).

### 4.7 Corrections dans les écrans commerçant existants
- Sidebar : libellé « Réservations » en double ; ordre différent entre les 2 écrans.
- Textes tronqués « Adress », « Horair ». Second bloc « Informations du profil » → « Informations du commerce ».

## 5. Modèle de données MS1 (proposition PostgreSQL)
- `users` : id, phone_e164 UNIQUE, telegram_user_id UNIQUE, telegram_chat_id, roles[], active_mode, status (ACTIVE|DEACTIVATED|SUSPENDED|DELETED), email NULL, photo_url, display_name, created_at, deleted_at. **Pas de password_hash.**
- `auth_challenges` : id, phone, purpose (LOGIN|REGISTER|CHANGE_PHONE|CONFIRM_SENSITIVE), nonce_hash, code_hash, expires_at, attempts, status, user_id NULL, new_phone NULL.
- `sessions` : refresh token haché, appareil, expiration, révoqué.
- `shops` : id, owner_id, name, category, registry_number, phone, address, lat/lng (PostGIS), opening/closing, verification_status (PENDING|APPROVED|REJECTED|SUSPENDED), reject_reason.
- `verification_documents` : id, shop_id, type, storage_path (privé), status (REVIEW|OK|REFUSED), reason, uploaded_at.
- `user_preferences` (notifications), `audit_log`.

## 6. API MS1 (proposition)
- Auth : `POST /auth/telegram/start`, `GET /auth/telegram/challenges/{id}`, `POST /auth/telegram/verify`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/sessions`, `POST /auth/switch-mode`.
- Utilisateur : `GET/PUT /users/me`, `POST /users/me/photo`, `POST /users/me/phone/change/start`, `POST /users/me/phone/change/verify`, `POST /users/me/deactivate`, `DELETE /users/me`.
- Boutique : `GET/PUT /shops/me`, `GET /shops/me/verification`, `GET/POST /shops/me/documents`, `GET /shops/{id}` (fiche publique : adresse, position, horaires, offres actives, évaluations).
- Technique : `GET /health`, JWKS/clé publique pour validation par les autres services.

## 7. Règles métier
- Passage en mode commerçant autorisé seulement si `shops.verification_status = APPROVED`. Un compte peut avoir les 2 rôles.
- Publier une offre : commerçant approuvé + numéro vérifié (MS2 contrôle via le JWT).
- Désactivation : status DEACTIVATED, offres masquées, réactivation à la prochaine connexion.
- Suppression : refusée s'il reste réservations/offres actives (compteurs affichés) ; sinon anonymisation.
- Documents de vérification : accessibles aux seuls admins, jamais d'URL publique. Fichiers acceptés : PDF/JPG/PNG, 5 Mo max.
- Validation commerçant : MS1 stocke le statut, **MS4 décide**.
- Suspension : MS4 envoie `account.suspended` → MS1 met à jour, MS2 masque les offres.
- Notification Telegram impossible (bot bloqué) : marquer `telegram_blocked` et afficher le bandeau « Telegram non relié / bot bloqué ».

## 8. Événements RabbitMQ
- Bot → MS1 : `telegram.contact.received`. MS1 → bot (MS5) : `telegram.send.otp`.
- MS1 → MS4 : `shop.verification.requested`. MS4 → MS1 : `shop.verification.decided` (approved|rejected + motif), `account.suspended`, `account.reactivated`.
- MS1 → MS2 : `account.status.changed` (masquer/rétablir offres). MS1 → MS5 : `account.status.changed`, `user.registered`.
- Le service du bot vit dans MS5 (notifications) : Telegram remplace l'e-mail comme canal d'envoi. Il s'enregistre dans Consul.

## 9. Décisions encore ouvertes (ne pas trancher seul)
- Garder ou retirer Google/Apple. E-mail totalement facultatif ?
- Emplacement du changement de mode dans l'UI (Paramètres, sidebar ou profil).
- Délai de rétractation après suppression : aucun défini.
- Récupération de compte si numéro perdu. Webhook vs long polling.
- Noms exacts des documents demandés aux commerçants.

## 10. Écarts à signaler à l'équipe
- Le dossier UML (CU-02/03/04, F1.4, F1.5, F1.9, attribut `motDePasse`) décrit encore e-mail+mot de passe → à réécrire.
- CU-08 : précondition « e-mail vérifié » → « numéro Telegram vérifié ».
- Le UML prévoit accepter/refuser une réservation (CU-18) alors que le scénario voulu n'a pas de confirmation à l'avance : à aligner.
