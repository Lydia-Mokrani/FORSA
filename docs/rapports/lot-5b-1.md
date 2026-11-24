# Rapport de Lot 5B-1 : Addendum Géocodeur & Documents (Multi-Instances 2x)

> **Branche Git :** `feat/ms1-telegram-auth`  
> **Date :** 24 novembre 2026  
> **Périmètre :** Backend (`services/ms1-accounts`), Infra (`docker-compose.yml`), Architecture WAMS (`docs/wams/architecture.md`), Démo (`scripts/demo-5b.sh`)  
> **Statut :** Validé (0 erreur TypeScript, 93/93 tests Jest réussis)

---

## 1. Géocodeur Nominatim & Configuration Pilotée par l'Environnement

### Problématique
Le géocodeur implémenté au lot 5A stocke sa file d'attente, son limiteur par utilisateur et son cache en mémoire vive du processus. Déployer 2 instances de MS1 avec la configuration mono-instance initiale (1 req/s chacune) exposerait Nominatim à un débit cumulé pouvant atteindre 2 requêtes/seconde, enfreignant sa politique d'utilisation stricte (maximum 1 req/s) et risquant un bannissement IP (HTTP 429).

### Implémentation des Variables d'Environnement
Les paramètres du géocodeur sont désormais pilotés par l'environnement avec des valeurs par défaut rétrocompatibles :
- `GEOCODER_MIN_INTERVAL_MS` (défaut : `1000`)
- `GEOCODER_QUEUE_MAX` (défaut : `20`)
- `GEOCODER_USER_LIMIT_PER_MIN` (défaut : `10`)

### Configuration Infra Multi-Instances
Dans `services/ms1-accounts/docker-compose.yml`, deux instances (`ms1-accounts-1` sur le port 3001 et `ms1-accounts-2` sur le port 3002) sont configurées avec :
```yaml
GEOCODER_MIN_INTERVAL_MS: 2000
GEOCODER_QUEUE_MAX: 20
GEOCODER_USER_LIMIT_PER_MIN: 10
```
Le débit cumulé vers Nominatim est donc :
$$\text{Débit global} = 2 \times \frac{1 \text{ req}}{2000 \text{ ms}} = 1 \text{ req/s}$$
Le total reste en permanence inférieur ou égal à 1 requête par seconde.

### Analyse du Limiteur par Utilisateur & Solution Cible
- **Comportement avec 2 instances :** Le compteur de requêtes par utilisateur étant géré en mémoire par chaque instance, avec un load-balancing round-robin Traefik, un utilisateur peut consommer jusqu'à 10 requêtes sur l'instance 1 et 10 requêtes sur l'instance 2 au cours d'une même minute, soit **jusqu'à 2x la limite nominale (20 req/min)**.
- **Solution cible :** La solution distribuée pérenne pour unifier le quota utilisateur entre toutes les instances est la mise en place d'un limiteur partagé (*shared limiter*) basé sur Redis ou une table PostgreSQL dédiée (algorithme *token bucket* / *leaky bucket*) si le temps du projet le permet.

### Tests Unitaires
Ajout de la suite de tests unitaires dédiée dans `services/ms1-accounts/tests/unit/lot5a.test.ts` validant :
1. L'application des valeurs par défaut sans variables d'environnement (1000ms, queue 20, limite 10 req/min).
2. La prise en compte des surcharges par variables d'environnement (`GEOCODER_MIN_INTERVAL_MS=2000`, `GEOCODER_QUEUE_MAX=50`, `GEOCODER_USER_LIMIT_PER_MIN=5`).
3. La priorité des options explicites injectées au constructeur.
4. Le blocage effectif à la 6ème requête quand la limite par minute est configurée à 5.

---

## 2. Stockage des Documents en PostgreSQL (BYTEA) & Absence de Volume Partagé

### Point de Preuve
Toutes les pièces justificatives des commerçants (`COMMERCIAL_REGISTER`, `TAX_ID`, `STOREFRONT`) sont stockées directement dans la base de données PostgreSQL dans la colonne `file_data` (BYTEA) de la table `shop_documents`.

**Preuve d'indépendance de volume :**
Puisque les deux instances MS1 partagent la base PostgreSQL `ms1-postgres`, n'importe quelle instance peut servir n'importe quel document sans qu'un volume Docker partagé ou un système de fichiers distribué (NFS, GlusterFS) ne soit nécessaire.

### Preuve par Grep : Aucune Écriture sur Disque pour les Nouveaux Fichiers
- `services/ms1-accounts/src/middleware/upload.middleware.ts` : configure `multer.memoryStorage()`.
- `services/ms1-accounts/src/controllers/shop.controller.ts` : appelle `storageService.put()` qui effectue un `prisma.shopDocument.update` avec `fileData: data` (BYTEA).
- Grep sur l'utilisation de `uploadDir` dans `services/ms1-accounts/src` :
  ```json
  [
    {
      "file": "services/ms1-accounts/src/config/env.ts",
      "line": 35,
      "text": "uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads', 'documents'),"
    },
    {
      "file": "services/ms1-accounts/src/controllers/shop.controller.ts",
      "line": 521,
      "text": "const uploadDirResolved = path.resolve(config.uploadDir);"
    },
    {
      "file": "services/ms1-accounts/src/controllers/shop.controller.ts",
      "line": 523,
      "text": "const safeTargetDiskPath = path.resolve(uploadDirResolved, safeDbFilename);"
    },
    {
      "file": "services/ms1-accounts/src/controllers/shop.controller.ts",
      "line": 526,
      "text": "!safeTargetDiskPath.startsWith(uploadDirResolved + path.sep) &&"
    },
    {
      "file": "services/ms1-accounts/src/controllers/shop.controller.ts",
      "line": 527,
      "text": "safeTargetDiskPath !== uploadDirResolved"
    }
  ]
  ```
  `config.uploadDir` n'est référencé qu'aux lignes 521-527 de `shop.controller.ts` pour le fallback en lecture seule. **Aucune écriture disque** n'a lieu lors des uploads.

### Limite du Fallback Disque Rétrocompatible
Le fallback local (`shop.controller.ts:519-537`) est strictement en lecture seule (`fs.createReadStream`).  
**Limite :** Les anciens fichiers justificatifs téléversés sur disque avant le passage à BYTEA n'existent que sur le conteneur/hôte où ils ont été déposés à l'époque et ne peuvent être servis par la seconde instance.

---

## 3. Démonstration Traefik & En-Tête `X-Instance-Id`

1. **Middleware `X-Instance-Id` :** Ajouté dans `services/ms1-accounts/src/app.ts` pour injecter `X-Instance-Id: <INSTANCE_ID>` sur toutes les réponses HTTP.
2. **Script de démonstration :** Créé dans `scripts/demo-5b.sh`.
3. **Statut de l'obtention automatique d'un JWT sans login réel Telegram :** **NOT EXECUTED**.  
   *Justification :* Le flux d'authentification FORSA repose exclusivement sur le bot Telegram `@forsa_auth_bot` (génération de nonce, partage interactif de contact Telegram sur mobile, validation de code OTP à 6 chiffres). Aucun point de terminaison de contournement (*backdoor*) n'existe pour obtenir un token JWT sans interaction humaine réelle sur smartphone.  
   Le script `scripts/demo-5b.sh` intègre la commande permettant d'exécuter la requête `GET /api/shops/geocode` avec un token JWT signé hors-ligne via la clé privée RSA locale (`keys/private.pem`), affichant l'en-tête `X-Instance-Id` à travers Traefik.
