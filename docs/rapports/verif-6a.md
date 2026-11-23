# LOT V — Rapport de Vérification du Lot 6A & Statut Lot 5A

> **Type :** Audit de conformité technique (Lecture seule / Factuel)  
> **Date :** 23 novembre 2026  
> **Branche :** `feat/ms1-telegram-auth`  
> **Commit audité :** `d41db41` (`feat(front): lot 6A ma boutique`)

---

## 1. Git & Historique des Tests

### 1.1 Commande `git log -8 --oneline`
```text
d41db41 feat(front): lot 6A ma boutique
e3de34b fix(frontend): bind Vite server to dual-stack IPv4/IPv6 (::)
fae16d2 fix(ms1): audit lot 2c
cd33f1c feat(lot2c): frontend Telegram auth, legacy removal & security fixes
5f1c72a feat(ms1): lot 2B
04a6b88 docs(ms1): rapport final lot-2a (tsc 0 erreur, 17/17 tests)
9cef4b2 fix(ms1): null-guard for normalizeToE164 in auth controller and telegram service
2faa76e docs(ms1): rapport lot-2a
```

### 1.2 Commande `git show --stat d41db41`
```text
commit d41db418fcef58971b60a4e2ef2a7f1eb6030e28
Author: Niykven <aniaa199a@gmail.com>
Date:   Mon Nov 23 22:59:19 2026 +0100

    feat(front): lot 6A ma boutique

 docs/FORSA_MS1_spec.md                             |   2 +-
 docs/rapports/audit-fidelite.md                    | 347 ++++++++++
 docs/rapports/figma-ma-boutique-inspection.md      | 283 ++++++++
 docs/rapports/lot-6a.md                            | 175 +++++
 frontend/src/App.tsx                               |   5 +
 frontend/src/assets/icons/figma/boutique-add.svg   |   6 +
 .../src/assets/icons/figma/boutique-alert-warn.svg |   7 +
 .../src/assets/icons/figma/boutique-alertc.svg     |   7 +
 frontend/src/assets/icons/figma/boutique-back.svg  |   6 +
 frontend/src/assets/icons/figma/boutique-bell.svg  |   7 +
 .../src/assets/icons/figma/boutique-building.svg   |   9 +
 frontend/src/assets/icons/figma/boutique-cal.svg   |   9 +
 .../assets/icons/figma/boutique-check-success.svg  |   6 +
 frontend/src/assets/icons/figma/boutique-check.svg |   6 +
 .../assets/icons/figma/boutique-chevron-down.svg   |   5 +
 frontend/src/assets/icons/figma/boutique-clock.svg |   6 +
 frontend/src/assets/icons/figma/boutique-dash.svg  |   8 +
 frontend/src/assets/icons/figma/boutique-file.svg  |   8 +
 .../src/assets/icons/figma/boutique-logout.svg     |   6 +
 frontend/src/assets/icons/figma/boutique-phone.svg |   7 +
 .../src/assets/icons/figma/boutique-pin-empty.svg  |   6 +
 .../src/assets/icons/figma/boutique-pin-large.svg  |   6 +
 frontend/src/assets/icons/figma/boutique-pin.svg   |   6 +
 .../src/assets/icons/figma/boutique-refresh.svg    |   5 +
 frontend/src/assets/icons/figma/boutique-star.svg  |   6 +
 frontend/src/assets/icons/figma/boutique-user.svg  |   6 +
 .../src/assets/icons/figma/boutique-wifioff.svg    |  11 +
 .../catalogue/components/MerchantLayout.tsx        |   2 +-
 .../catalogue/components/MerchantSidebar.tsx       |   4 +-
 .../src/features/catalogue/pages/ShopEditPage.tsx  | 752 +++++++++++++++++++++
 30 files changed, 1715 insertions(+), 4 deletions(-)
```

### 1.3 Inventaire `ls docs/rapports` & Statut de `lot-5a.md`
Fichiers présents dans `docs/rapports/` :
- `audit-fidelite.md`
- `audit-lot-2c.md`
- `figma-ma-boutique-inspection.md`
- `lot-1b.md`
- `lot-2a-final.md`
- `lot-2a.md`
- `lot-2b.md`
- `lot-2c.md`
- `lot-6a.md`
- `questions.md`
- `reprise.md`

**Preuve :** Le fichier `docs/rapports/lot-5a.md` **N'EXISTE PAS** dans le dépôt. Le backend Lot 5A a été commité sans document de rapport formalisé sous ce nom.

### 1.4 Analyse des Tests : passage de 32/32 à 51 tests
- **Aucun fichier de test n'a été ajouté dans le commit `d41db41`** (`git show --stat d41db41` n'inclut aucun fichier sous `tests/`).
- **Explication du décompte :**
  - Le rapport d'audit post-lot 2C ciblait expressément deux fichiers : `telegram-auth.test.ts` et `lot2b.test.ts` (15 + 17 = 32 tests au départ).
  - Dans le commit `fae16d2` (`fix(ms1): audit lot 2c`), 3 tests de sécurité anti-escalade ont été ajoutés dans `telegram-auth.test.ts` (portant sa suite à 18 tests, soit 18 + 17 = 35 tests).
  - La commande globale `npx jest ... tests/unit` exécutée lors du Lot 6A a englobé tous les fichiers de `tests/unit/`, incluant le fichier préexistant `validation.test.ts` (16 tests sur les schémas Zod, présent depuis le commit initial du 22/11 02:44).
  - Décompte total : 18 (`telegram-auth.test.ts`, Lot 2A) + 17 (`lot2b.test.ts`, Lot 2B) + 16 (`validation.test.ts`, Lot 1 / Baseline) = **51 tests passés**.
  - Le fichier `jwt.service.test.ts` (suite unitaire initiale) échoue à la compilation TypeScript (erreur TS2739 : champs `roles` et `mode` absents du payload de test suite aux évolutions du Lot 2A).

---

## 2. Analyse de `ShopEditPage.tsx`

### 2.1 Requêtes API `authFetch` (Mount & Save)
- **GET au chargement :**
  - **Fichier & Lignes :** `frontend/src/features/catalogue/pages/ShopEditPage.tsx:90-93`
  ```typescript
  async function loadShopData() {
    try {
      setIsLoading(true);
      const res = await authFetch('/api/shops/my');
  ```
  - **URL exacte :** `/api/shops/my`
- **PUT à la sauvegarde :**
  - **Fichier & Lignes :** `frontend/src/features/catalogue/pages/ShopEditPage.tsx:167-171`
  ```typescript
  const res = await authFetch('/api/shops/my', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  ```
  - **URL exacte :** `/api/shops/my`

### 2.2 Valeurs Métier Codées en Dur (Hardcoded Business Values)

| Valeur codée en dur | Emplacement exact (`file:line`) | Usage dans le composant |
|---|---|---|
| `name: 'Maison Gourmande'` | `ShopEditPage.tsx:58` | Valeur initiale du state `formData` |
| `category: 'Boulangerie – Pâtisserie'` | `ShopEditPage.tsx:59` | Valeur initiale du state `formData` |
| `registryNumber: '16/00-0123456 B 21'` | `ShopEditPage.tsx:60` | Valeur initiale du state `formData` |
| `phone: '+213 555 12 34 56'` | `ShopEditPage.tsx:61` | Valeur initiale du state `formData` |
| `address: '12 Rue des Fleurs, Boumerdès'` | `ShopEditPage.tsx:62` | Valeur initiale du state `formData` |
| `openTime: '08:00'`, `closeTime: '20:00'` | `ShopEditPage.tsx:63-64` | Valeurs initiales horaires dans `formData` |
| `latitude: 36.7599`, `longitude: 3.4728` | `ShopEditPage.tsx:65-66` | Coordonnées GPS par défaut (Boumerdès) |
| `'12 Rue des Fléurs, Boumerdes'` | `ShopEditPage.tsx:78` et `ShopEditPage.tsx:251` | Injection de la faute de frappe Figma pour forcer l'état `addressNotFound` |
| Valeurs de repli `name`, `category`, `phone`, `address`, `openTime`, `closeTime` | `ShopEditPage.tsx:104-111` | Fallback si l'API retourne des champs `null` ou vides |
| Chaîne test `'Fléurs'` | `ShopEditPage.tsx:136` | Heuristique `newAddress.includes('Fléurs')` pour basculer en erreur |
| Initiales avatar `"MG"` | `ShopEditPage.tsx:310` | Monogramme codé en dur dans le cercle avatar en-tête desktop |
| Placeholders d'inputs (`'16/00-0123456 B 21'`, `'+213 555 12 34 56'`, etc.) | `ShopEditPage.tsx:378, 400, 424, 452, 470` | Placeholders textuels |
| Étiquette de repère carte `'12 Rue des Fleurs, Boumerdès'` | `ShopEditPage.tsx:533` | Fallback sur la pilule flottante de la carte |

### 2.3 Décision de l'État de la Page (`nominal` / `addressNotFound` / `mapUnavailable` / `saved`)
- **Code source décisionnel (`ShopEditPage.tsx:48-55, 73-82, 133-142, 185-192`) :**
  ```typescript
  // 1. Initialisation par paramètre d'URL ?state= ou nominal
  const initialParamState = searchParams.get('state') as ShopPageState | null;
  const [pageState, setPageState] = useState<ShopPageState>(
    initialParamState && ['nominal', 'addressNotFound', 'mapUnavailable', 'saved'].includes(initialParamState)
      ? initialParamState
      : 'nominal'
  );

  // 2. Synchronisation réactive au query param
  useEffect(() => {
    const qState = searchParams.get('state') as ShopPageState | null;
    if (qState && ['nominal', 'addressNotFound', 'mapUnavailable', 'saved'].includes(qState)) {
      setPageState(qState);
      if (qState === 'addressNotFound') {
        setFormData((prev) => ({ ...prev, address: '12 Rue des Fléurs, Boumerdes' }));
      }
    }
  }, [searchParams]);

  // 3. Bascule dynamique sur saisie d'adresse
  const handleAddressChange = (newAddress: string) => {
    setFormData((prev) => ({ ...prev, address: newAddress }));
    if (newAddress.trim().length === 0 || newAddress.toLowerCase().includes('inconnu') || newAddress.includes('Fléurs')) {
      setPageState('addressNotFound');
    } else if (pageState === 'addressNotFound') {
      setPageState('nominal');
    }
  };

  // 4. Bascule sur exception réseau/carte lors de la sauvegarde
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Une erreur inattendue est survenue.';
    setErrorMessage(msg);
    if (msg.toLowerCase().includes('carte') || msg.toLowerCase().includes('géocodage') || msg.toLowerCase().includes('map')) {
      setPageState('mapUnavailable');
    }
  }
  ```
- **Présence en Production & `import.meta.env.DEV` :**
  - **NON GATÉ :** Il n'y a **aucun** appel à `import.meta.env.DEV` ou condition d'environnement dans `ShopEditPage.tsx`.
  - **Présent en production :** OUI. La barre de contrôle rapide (`Aperçu Figma 4 États :`) et le paramètre `?state=` sont compilés et affichés sans restriction dans le bundle de production `dist/assets/index-CK_ivrqB.js`.

### 2.4 Déclenchement Réel des États d'Erreur & Géocodage
- **Déclenchement de `addressNotFound` :** Aucun géocodeur n'est interrogé. L'état est déclenché artificiellement par comparaison de sous-chaînes dans `handleAddressChange` (`newAddress.trim().length === 0`, présence de `"inconnu"` ou présence de `"Fléurs"`), ou par sélection du bouton d'audit.
- **Déclenchement de `mapUnavailable` :** Déclenché uniquement si l'exception catchée lors de `PUT /api/shops/my` contient les mots `"carte"`, `"géocodage"` ou `"map"`, ou via le bouton d'audit.
- **Appel de géocodage :** **AUCUN**. Il n'y a aucun appel à un service de géocodage (ni endpoint backend, ni API externe telle qu'OpenStreetMap Nominatim). Les coordonnées `(36.7599, 3.4728)` restent fixes.

---

## 3. Cartographie & Leaflet

### 3.1 Dépendances dans `frontend/package.json`
- `leaflet` : **Présent** (`"leaflet": "^1.9.4"` à la ligne 13).
- `react-leaflet` : **ABSENT** de `package.json`.
- **Différence apportée par `d41db41` sur `package.json` :** **AUCUNE**. `git show --stat d41db41` confirme que `frontend/package.json` n'a pas été modifié. `leaflet` était préinstallé depuis les phases antérieures du projet (utilisé dans `ShopsMapViewPage.tsx`).

### 3.2 Nature de la Carte dans `ShopEditPage.tsx`
- La carte dans `ShopEditPage.tsx` est un **placeholder SVG statique simulé** (`ShopEditPage.tsx:501-536`).
- Elle n'initialise aucune instance Leaflet (`L.map(...)` n'est pas appelé) et ne charge aucune tuile cartographique OSM. Elle reproduit visuellement les courbes de routes via des balises SVG `<path>` dessinées en blanc semi-transparent sur fond `#dfeadb`, avec une pastille HTML absolue pour le repère et l'adresse.

---

## 4. Contrat Backend (`services/ms1-accounts`)

### 4.1 Schéma `PUT /api/shops/my` (`shop.controller.ts:28-37`)
```typescript
const updateShopSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  address: z.string().min(5).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  phone: z.string().min(8).optional(),
  openingHours: z.record(z.any()).optional(),
  logoUrl: z.string().url().optional(),
});
```

- **Champs validés & persistés :** `name`, `description`, `address`, `latitude`, `longitude`, `phone`, `openingHours`, `logoUrl`.
- **Champs ignorés / non persistés :**
  - Le frontend associe la catégorie au champ `description` (`description: formData.category`).
  - Le champ **`registryNumber`** (N° de registre de commerce) est modifiable dans l'UI mais **n'est pas envoyé dans le payload PUT** par le frontend (`ShopEditPage.tsx:153-164`) et n'est pas géré par `updateShopSchema`.
- **Rejet de champs :** Le frontend n'envoie aucun champ rejeté par Zod (Zod en mode par défaut ignore/strippe les champs surnuméraires, et ici le payload ne contient que des champs connus).

### 4.2 Existence des Endpoints de la Spécification §4

| Endpoint spécifié | Statut réel dans le code backend | Preuve technique |
|---|---|---|
| Alias `/shops/me` | **NON IMPLÉMENTÉ** | `shop.routes.ts` n'expose que `/my` (`shopRouter.get('/my')`, `shopRouter.put('/my')`). Aucun alias `/me`. |
| `GET /shops/me/verification` | **NON IMPLÉMENTÉ** | Absent de `shop.routes.ts`. |
| `GET /shops/me/documents` | **NON IMPLÉMENTÉ** | Seul `POST /my/documents` (upload commerçant) et `GET /:id/documents` (admin) existent. Pas de GET commerçant. |
| `POST /users/me/deactivate` | **NON IMPLÉMENTÉ** | Absent de `user.routes.ts`. |
| `DELETE /users/me` | **NON IMPLÉMENTÉ** | Absent de `user.routes.ts`. |

---

## 5. Fichiers Modifiés Hors Périmètre & Sidebar

### 5.1 Liste Complète des Fichiers Modifiés par `d41db41`
1. `docs/FORSA_MS1_spec.md` (ajustement du rayon de courbure des cartes à 24px/32px).
2. `docs/rapports/lot-6a.md`, `docs/rapports/figma-ma-boutique-inspection.md`, `docs/rapports/audit-fidelite.md`.
3. `frontend/src/App.tsx` (enregistrement de la route `/merchant/shop`).
4. `frontend/src/assets/icons/figma/boutique-*.svg` (22 fichiers SVG d'icônes).
5. `frontend/src/features/catalogue/components/MerchantLayout.tsx` (ajustement CSS de marge gauche `ml-0 md:ml-[238px]` pour le mobile).
6. `frontend/src/features/catalogue/components/MerchantSidebar.tsx` (réorganisation des liens de navigation).
7. `frontend/src/features/catalogue/pages/ShopEditPage.tsx` (page créée).

*Note d'organisation :* Il n'existe pas de dossier nommé `frontend/src/features/ms1` ; les fonctionnalités MS1 sont réparties entre `features/auth`, `features/profile` et les composants partagés sous `features/catalogue`.

### 5.2 Liens de la Sidebar Commerçant & Correspondance `App.tsx`
Dans `MerchantSidebar.tsx:202-208` :
- `Tableau de bord` -> `to: '/merchant/dashboard'` : **Existe** (`App.tsx:50`).
- `Ajouter une offre` -> `to: '/merchant/create-offer'` : **Existe** (`App.tsx:58`).
- `Avis` -> Aucun lien (`to` absent, rendu en `<div>` inerte) : **Non routé**.
- `Compte` -> `to: '/merchant/shop'` : **Existe** (`App.tsx:66`).
- `Réservations` -> Aucun lien (`to` absent, rendu en `<div>` inerte) : **Non routé**.

### 5.3 Pourquoi "Compte" Pointe vers `/merchant/shop` ?
Sur la frame Figma `1154:25532` (« Desktop · Ma boutique — Modifier »), l'élément actif de la barre de navigation latérale est explicitement l'onglet **« Compte »** (affiché avec fond blanc `#fffaf0` et texte sombre `#0b2c25`).  
Auparavant, cet item pointait vers `/profile` (la page profil client standard). Pour que la vue « Ma boutique » corresponde à l'onglet sélectionné dans la maquette et que le commerçant puisse y accéder depuis sa barre latérale, le lien a été redirigé vers `/merchant/shop`.

---

## 6. Duplication de Composants UI en Ligne (Inline)

Le composant `ShopEditPage.tsx` a été construit de manière autonome sans faire appel à des briques partagées globales. Voici l'inventaire des composants créés inline :

| Composant du Design System | Éléments inline dans `ShopEditPage.tsx` | Emplacement (`line`) | Lignes approx. |
|---|---|---|---|
| **Header (Desktop & Mobile)** | En-tête mobile (bouton retour + titre + sous-titre) et en-tête desktop (breadcrumb + H1 + sous-titre + cloche + avatar) | `L288-329` | ~42 lignes |
| **Banners (Success / Warning / Error)** | Bannières d'alerte avec icône, conteneur coloré, titre et description (`#eef7ec`, `#fff4dc`, `#fdecea`) | `L332-368` | ~37 lignes |
| **Card (Conteneur blanc)** | 2 conteneurs blancs avec bordure `#dbf0dd`, rayon `24px`, badge d'en-tête circulaire et titre | `L377-485` (Commerce) & `L489-586` (Carte) | ~207 lignes |
| **Field / Input / Select** | 6 blocs de formulaire (label + conteneur input + icône gauche/droite + gestion bordure focus/erreur + helper text) | `L389-524` | ~135 lignes |
| **MapBox** | Rendu cartographique complet (canvas SVG routes, épingle centrale, étiquette flottante, état vide, état hors ligne) | `L497-564` | ~68 lignes |
| **Chip / Pastille d'état** | Badges d'état arrondis (`Position détectée`, `Position non détectée`, `Position à confirmer`) | `L566-586` | ~21 lignes |
| **Button** | Boutons d'action `Enregistrer`, `Annuler`, `Réessayer` et les 4 boutons de la barre d'audit | `L220-282`, `L554-561`, `L590-609` | ~90 lignes |

---

## 7. Tableau Verdict : Réel, Simulé et Manquant

| Élément / Fonctionnalité | Classification | Détail factuel & Preuve |
|---|---|---|
| **Rendu & Responsive Design** | **RÉEL** | Conforme aux 7 frames Figma en 1440px (2 cols) et 390px (1 col). Build Vite et TypeScript sans erreur. |
| **Routage `/merchant/shop`** | **RÉEL** | Déclaré dans `App.tsx` et intégré dans le layout `MerchantLayout`. |
| **Lecture API (`GET /api/shops/my`)** | **RÉEL** | Exécuté au montage via `authFetch`. Récupère les données existantes de la boutique si présentes. |
| **Écriture API (`PUT /api/shops/my`)** | **RÉEL** | Sauvegarde les modifications (nom, catégorie/description, adresse, téléphone, horaires). |
| **Verrouillage du formulaire** | **RÉEL** | Le bouton `Enregistrer` est effectivement désactivé (`disabled`, `opacity-45`) en état `addressNotFound`. |
| **Icônes SVG Figma locales** | **RÉEL** | 22 icônes extraites du Figma et stockées localement (aucun lien distant temporaire). |
| **Carte Géographique** | **SIMULÉ** | Placeholder SVG statique sans instance Leaflet ni tuiles OpenStreetMap réelles. |
| **Géocodage de l'adresse** | **SIMULÉ** | Aucune API de géocodage appelée. Coordonnées GPS fixes (Boumerdès). |
| **Détection `addressNotFound`** | **SIMULÉ** | Déclenché par test de sous-chaîne (`"inconnu"`, `"Fléurs"`, vide) ou toggle bar, non par rejet d'un géocodeur. |
| **Détection `mapUnavailable`** | **SIMULÉ** | Déclenché par détection textuelle dans le message d'erreur ou toggle bar. |
| **Barre d'audit & `?state=`** | **SIMULÉ** | Présente en production, non isolée par `import.meta.env.DEV`. |
| **Avatar Commerçant** | **SIMULÉ** | Initiales fixes `"MG"` codées en dur, non dynamisées par le profil de l'utilisateur connecté. |
| **Sauvegarde N° Registre Commerce** | **MANQUANT** | Champ non inclus dans `PUT /api/shops/my` et absent du schéma `updateShopSchema`. |
| **Carte Leaflet réelle** | **MANQUANT** | Bibliothèque `leaflet` présente dans `package.json` mais non exploitée dans cette page. |
| **Endpoints Spec §4 (`/shops/me`, documents)** | **MANQUANT** | `/shops/me`, `GET /shops/me/verification`, `GET /shops/me/documents`, `deactivate` absents du backend. |
| **Rapport `lot-5a.md`** | **MANQUANT** | Aucun rapport `lot-5a.md` n'existe dans `docs/rapports/`. |
| **Composants partagés réutilisables** | **MANQUANT** | Code UI 100% inline, aucun composant générique `Button`, `Field`, `Card`, etc. extrait. |

---

## 8. Conclusion de l'Audit

Le Lot 6A présente une fidélité visuelle de premier ordre par rapport aux 7 frames Figma inspectées (couleurs, espacements, typographies, icônes et déclinaison responsive 1440px / 390px). 
L'intégration backend est fonctionnelle sur les flux nominaux de lecture et mise à jour (`GET/PUT /api/shops/my`). En revanche, la cartographie interactive (Leaflet) et le géocodage dynamique demeurent simulés par des mécanismes SVG et textuels statiques, et la barre de prévisualisation des états Figma n'est pas conditionnée à l'environnement de développement.
