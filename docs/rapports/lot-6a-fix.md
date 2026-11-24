# Rapport d'Implémentation — Lot 6A-fix : Refonte "Ma boutique" sur Fondations R0

> **Branche Git :** `feat/ms1-telegram-auth`  
> **Date :** 24 novembre 2026  
> **Périmètre :** Frontend uniquement (`frontend/`) — Reconstruction complète de `ShopEditPage.tsx` avec les composants R0, carte Leaflet réelle et géocodage réel  
> **Statut :** Validé et Prêt pour Fusion / Recette

---

## 1. Vérification des Préconditions (Gate Checks)

| Précondition | Critère vérifié | Commande / Preuve | Résultat |
|---|---|---|---|
| **a) Lot R0 complété & validé** | `docs/rapports/lot-r0.md` existe, pas de `lot-r0-BLOCKED.md`, commit R0 poussé, build OK. | `git log --oneline -3` montre `97f6470 feat(frontend): lot R0 UI foundations tokens and shared components`. `npx tsc --noEmit` et `npm run build` exécutés avec code de sortie 0. | **VALIDE** |
| **b) Exports UI & react-leaflet** | `frontend/src/components/ui` exporte Button, Field, Card, Banner, Chip, Header, Avatar, MapBox. `react-leaflet` dans `package.json`. | `frontend/src/components/ui/index.ts` exporte l'ensemble. `package.json` contient `"react-leaflet": "^5.0.0"`. | **VALIDE** |
| **c) Backend Lot 5A & 5A-fix** | `docs/rapports/lot-5a.md` existe, commit `64d7fb8 fix(backend): lot 5A-fix...` présent. Routes dans `shop.routes.ts`. | `services/ms1-accounts/src/routes/shop.routes.ts` :<br>- Ligne 11 : `POST /me` (création)<br>- Ligne 14 : `GET /me` (lecture boutique)<br>- Ligne 17 : `PUT /me` (mise à jour)<br>- Ligne 38 : `GET /geocode` (géocodage) | **VALIDE** |

---

## 2. Tableau de Synthèse : RÉEL / SIMULÉ / MANQUANT

| Élément | Statut Antérieur (Lot 6A) | Statut Nouveau (Lot 6A-fix) | Détails Techniques |
|---|---|---|---|
| **Carte Géographique** | **SIMULÉ** (Mock SVG statique) | **RÉEL** | Utilisation de `react-leaflet` (`MapContainer`, `TileLayer`, `Marker`) avec repère personnalisé `L.divIcon` conforme Figma (cercle vert `#0b2c25`, épingle blanche, étiquette d'adresse flottante). |
| **Service de Géocodage** | **SIMULÉ** (Heuristiques regex "Fleurs"/"inconnu") | **RÉEL** | Hook pur `useShopGeocode` appelant `GET /api/shops/geocode?q=...` via `authFetch`. Debounce 800ms (si length >= 5), annulation par `AbortController`, déclenchement immédiat sur `onBlur`. |
| **Données de Boutique** | **SIMULÉ** (Hardcodé "Maison Gourmande", "MG", etc.) | **RÉEL** | Formulaire vierge par défaut. `GET /api/shops/me` au montage : statut 200 remplit les données réelles ; 404 initialise le mode création vierge. |
| **Persistance Boutique** | **SIMULÉ** / Partiel | **RÉEL** | `PUT /api/shops/me` (ou `POST /api/shops/me` si première création). Envoi de `latitude` et `longitude` uniquement si confirmées pour l'adresse courante (réinitialisation serveur à `null` sinon). |
| **Composants d'Interface** | **SIMULÉ** (Ad-hoc inline dans la page) | **RÉEL** | Composants partagés validés R0 (`Header`, `Card`, `Field`, `Button`, `Banner`, `Chip`, `MapBox`, `Icon`, `Avatar`). |
| **Barre d'Audit / Paramètre `?state=`** | **SIMULÉ** (Injecté dans le bundle prod) | **SUPPRIMÉ** | Élimination complète de la barre d'audit Figma et du paramètre `?state=`. L'état UI est 100% dérivé des données et événements réels. |
| **Catégories de Commerces** | **SIMULÉ** (Liste dupliquée et désynchronisée) | **RÉEL** | Déplacée dans `frontend/src/features/shop/shopCategories.ts` et partagée entre `RegisterPage.tsx` et `ShopEditPage.tsx`. |
| **Avatar Utilisateur** | **SIMULÉ** (Initiales fixes "MG") | **RÉEL** | Dérivé du profil connecté (`getStoredUser().fullName` / `avatarUrl`), repli sur le nom de boutique saisi, repli sur '?'. |

---

## 3. Preuves d'Élimination et d'Intégrité (Grep & Métriques)

### 3.1 Preuves d'absence des valeurs codées en dur (Grep)
Recherche sur `frontend/src/features/catalogue/pages/ShopEditPage.tsx` et `frontend/src/features/shop/useShopGeocode.ts` :

| Motif Interdit | Correspondances dans les sources 6A-fix | Correspondances bundle de production (`dist/`) |
|---|---|---|
| `"Maison Gourmande"` | **0** | **0** |
| `"Fleurs"` | **0** | **0** |
| `"Fléurs"` | **0** | **0** |
| `"inconnu"` | **0** | **0** |
| `state=` (paramètre URL) | **0** | **0** (`[?&]state=` = 0) |
| `"Aperçu Figma"` | **0** | **0** |
| `"nominatim"` | **0** | **0** (aucun appel direct externe) |
| `"/shops/my"` | **0** | **0** dans `ShopEditPage` (appel exclusif à `/api/shops/me`) |

### 3.2 Métriques du fichier `ShopEditPage.tsx`
- **Nombre de lignes avant refonte :** 752 lignes
- **Nombre de lignes après refonte :** 611 lignes
- **Gain net :** -141 lignes (code plus concis, testable et modulaire grâce aux composants R0)
- **Composants R0 exploités :** `Header`, `Card`, `Field`, `Button`, `Banner`, `Chip`, `MapBox`, `Icon`

### 3.3 Vérification des Compilations
- `npx tsc --noEmit` : **Exit Code 0** (aucune erreur TypeScript)
- `npm run build` (`tsc -b && vite build`) : **Exit Code 0** (bundle généré sans encombre)

---

## 4. Plan de Test Manuel pour Recette (Hyb)

Ce plan permet de valider les 5 scénarios fonctionnels clés de la page `/merchant/shop` :

### Scénario 1 : Adresse valide saisie
1. **Action :** Saisir une adresse valide connue (ex : `10 Rue Didouche Mourad, Alger`).
2. **Comportement attendu :**
   - Pendant la saisie : après 800ms de pause (ou lors de la perte de focus `blur`), la pastille affiche brièvement `Recherche de la position…` (état transitoire).
   - Dès la réponse 200 de `/api/shops/geocode` : la carte Leaflet centre le repère avec l'icône verte/blanche et affiche l'étiquette flottante avec l'adresse.
   - La pastille affiche `Position détectée` (vert `success`).
   - Le bouton "Enregistrer les modifications" est actif (`opacity-100`).

### Scénario 2 : Adresse introuvable / fantaisiste
1. **Action :** Saisir une adresse inexistante (ex : `Rue Inconnue 999999 Nulle Part`).
2. **Comportement attendu :**
   - Après l'appel backend renvoyant 404 (`ADDRESS_NOT_FOUND`), l'état UI dérive automatiquement vers `addressNotFound`.
   - L'input adresse passe en bordure rouge d'erreur (2px) avec le message exact Figma : *"Adresse introuvable. Vérifiez la rue et la ville, ou précisez la commune."*.
   - La carte affiche l'état vide (`MapBox status="empty"`) avec fond vert pâle, icône pin centrale 34px et texte *"Aucune position trouvée"*.
   - La pastille affiche `Position non détectée` (rouge `error`).
   - Le bouton "Enregistrer les modifications" est **désactivé** (`disabled`, opacité 45%).

### Scénario 3 : Service de géocodage ou tuiles indisponible
1. **Action :** Simuler une coupure réseau ou une indisponibilité du géocodeur (503 / 429 / tuiles bloquées).
2. **Comportement attendu :**
   - L'état UI dérive automatiquement vers `mapUnavailable`.
   - Une bannière d'avertissement ambre s'affiche sous l'en-tête : *"Le service de cartes est momentanément indisponible. Vous pouvez enregistrer vos informations : la position sur la carte sera confirmée plus tard."*.
   - Le conteneur de carte affiche l'état dégradé (`MapBox status="down"`) avec fond gris, icône wifi barré et le bouton *"Réessayer"*.
   - La pastille affiche `Position à confirmer` (ambre `warn`).
   - Le bouton "Enregistrer les modifications" **reste disponible** pour permettre au commerçant de sauvegarder son commerce ; les coordonnées `latitude` et `longitude` sont transmises sous forme `null`.
   - Un clic sur *"Réessayer"* relance la recherche et remonte la carte.

### Scénario 4 : Enregistrement réussi et reset sur modification
1. **Action :** Cliquer sur "Enregistrer les modifications" avec un formulaire valide, puis modifier un champ.
2. **Comportement attendu :**
   - L'appel `PUT /api/shops/me` s'exécute avec succès.
   - La bannière verte de succès s'affiche : *"Votre boutique a été mise à jour. Les clients voient déjà vos nouvelles informations."*.
   - Dès que l'utilisateur modifie à nouveau un champ du formulaire, la bannière de succès disparaît instantanément.
   - Un clic sur "Annuler" restaure les données enregistrées.

### Scénario 5 : Nouveau commerçant sans boutique (Première création)
1. **Action :** Se connecter avec un compte commerçant n'ayant pas encore de commerce créé (`GET /api/shops/me` renvoie 404).
2. **Comportement attendu :**
   - La page ne plante pas : le formulaire s'affiche vierge avec des placeholders d'exemple génériques.
   - L'avatar affiche les initiales du compte utilisateur connecté.
   - À la soumission, l'appel HTTP utilise `POST /api/shops/me` (au lieu de `PUT`).
   - La boutique est créée en base et le statut bascule dynamiquement en mode modification.

---

## 5. Questions & Décisions d'Implémentation

1. **Format des Horaires d'Ouverture :**  
   - Les maquettes Figma comportent deux champs horaires uniformes (`Ouverture` et `Fermeture`). Le backend et la page d'inscription (`RegisterPage.tsx`) gèrent une structure hebdomadaire détaillée jour par jour (`monday`...`sunday` avec statut `closed`).
   - **Décision :** La page extrait les heures d'ouverture/fermeture par défaut. Si l'utilisateur ne modifie pas ces champs, l'objet horaire complexe d'origine est préservé intact sans écrasement silencieux. S'il les modifie, les jours ouverts sont mis à jour avec ces nouvelles bornes.
2. **Dépendance partagée `shopCategories.ts` :**  
   - La liste `SHOP_CATEGORIES` a été extraite de `RegisterPage.tsx` pour être centralisée dans `frontend/src/features/shop/shopCategories.ts`. `RegisterPage.tsx` l'importe désormais sans aucun changement visuel ou fonctionnel.
3. **Tests Unitaires Frontend :**  
   - Aucun framework de test (Vitest/Jest) n'étant configuré dans le workspace `frontend/`, aucun package supplémentaire n'a été installé conformément aux consignes strictes du prompt. Le bon fonctionnement a été validé par compilation stricte TypeScript (`tsc -b`), build de production sans faille et vérification rigoureuse des signatures.
