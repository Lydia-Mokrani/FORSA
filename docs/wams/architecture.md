# FORSA — Architecture Système & Déploiement Multi-Instances (WAMS)

> **Module :** Web Architectures & Microservices (WAMS) — UMBB ING4 GL (Semestre 7)  
> **Superviseur :** Dr. Yahiatene Youcef  
> **Composant :** MS1 Accounts & Shops — Scalabilité Horizontale & Justificatifs PostgreSQL  
> **Date :** 24 novembre 2026  

---

## 1. Vue d'Ensemble & Scalabilité Horizontale (MS1)

Dans le cadre du cahier des charges WAMS, le service **MS1 Accounts & Shops** est conçu pour un déploiement multi-instances sans état (*stateless worker*), supervisé par le reverse-proxy et load-balancer **Traefik v3** via la découverte de service dynamique **HashiCorp Consul**.

```
                           ┌────────────────────────┐
                           │   Client Web / Tests   │
                           └───────────┬────────────┘
                                       │ Port 80 (HTTP)
                                       ▼
                     ┌───────────────────────────────────┐
                     │            Traefik v3             │
                     │  (Load Balancer Round-Robin S0)   │
                     └───────┬───────────────────┬───────┘
          Découverte Consul  │                   │
         ┌───────────────────┘                   └──────────────────┐
         ▼                                                          ▼
┌─────────────────────────────────┐                       ┌─────────────────────────────────┐
│     MS1 Instance 1 (Port 3001)   │                       │     MS1 Instance 2 (Port 3002)   │
│  - X-Instance-Id: ms1-acc-1     │                       │  - X-Instance-Id: ms1-acc-2     │
│  - GEOCODER_MIN_INTERVAL: 2000ms│                       │  - GEOCODER_MIN_INTERVAL: 2000ms│
└────────────────┬────────────────┘                       └────────────────┬────────────────┘
                 │                                                         │
                 └─────────────────────────┬───────────────────────────────┘
                                           │
                                           ▼
                               ┌──────────────────────┐
                               │ PostgreSQL 16 (DB1)  │
                               │  - Colonne BYTEA     │
                               │  - file_data         │
                               └──────────────────────┘
```

### Identification des Instances (`X-Instance-Id`)
Chaque instance MS1 injecte automatiquement dans toutes les réponses HTTP l'en-tête `X-Instance-Id: <INSTANCE_ID>` via son middleware Express :
- `ms1-accounts-1` (port 3001) renvoie `X-Instance-Id: ms1-accounts-1`
- `ms1-accounts-2` (port 3002) renvoie `X-Instance-Id: ms1-accounts-2`

Cet en-tête est relayé fidèlement par Traefik au client, permettant d'attester de la répartition effective de la charge entre les deux instances.

---

## 2. Stockage des Documents Justificatifs en Base PostgreSQL (BYTEA)

### Point de Preuve Explicite : Aucun Volume Partagé Requis
Les pièces justificatives téléversées par les commerçants (`COMMERCIAL_REGISTER`, `TAX_ID`, `STOREFRONT`) sont stockées directement dans la base de données PostgreSQL dédiée à MS1 via la colonne binaire `file_data` (type **BYTEA**) de la table `shop_documents`.

**Conséquence architecturale majeure :**
Puisque les données binaires résident directement dans la base PostgreSQL centrale partagée par les instances MS1, **aucun volume partagé (NFS, GlusterFS ou volume Docker partagé multi-hôtes) n'est nécessaire** entre les instances. N'importe quelle instance MS1 peut recevoir et servir n'importe quel document à tout moment.

### Preuve Formelle par Grep : Absence d'Écriture Disque pour les Nouveaux Fichiers
L'analyse statique du code source confirme qu'aucune fonction d'écriture disque n'est appelée lors du cycle de vie des nouveaux justificatifs :

1. **Réception en mémoire vive (RAM) :**
   ```text
   services/ms1-accounts/src/middleware/upload.middleware.ts:6
   const storage = multer.memoryStorage();
   ```
   Multer utilise exclusivement `memoryStorage()` : aucun fichier temporaire n'est créé sur le disque lors de l'upload.

2. **Validation des Magic Bytes en mémoire :**
   `validateDocumentFile(file)` vérifie l'en-tête binaire (%PDF-, PNG, JPEG) directement sur `file.buffer`.

3. **Persistance en base via `StorageService` :**
   ```text
   services/ms1-accounts/src/controllers/shop.controller.ts:422
   await storageService.put(doc.id, file.buffer, validation.detectedMime || file.mimetype, doc.originalName);
   ```
   L'implémentation `DatabaseStorageService.put()` exécute :
   ```text
   services/ms1-accounts/src/services/storage.service.ts:30-36
   await prisma.shopDocument.update({
     where: { id },
     data: {
       fileData: data,
       storagePath: `db://${id}`,
     },
   });
   ```

4. **Grep des écritures disque dans `services/ms1-accounts/src` :**
   - Seules les clés RSA (`jwt.service.ts`) et les avatars publics (`avatar-upload.middleware.ts`) écrivent sur le disque.
   - **0 écriture disque** pour les pièces justificatives des boutiques.

### Limite du Fallback Rétrocompatible Disque (Fichiers Anciens)
Pour garantir la compatibilité avec les documents téléversés avant la mise en place du stockage BYTEA, le contrôleur `shop.controller.ts` conserve un fallback sécurisé en **lecture seule** :
```ts
// shop.controller.ts (lignes 532-536)
if (fs.existsSync(safeTargetDiskPath)) {
  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
  fs.createReadStream(safeTargetDiskPath).pipe(res);
  return;
}
```
**Limite architecturale identifiée :** Ce fallback disque est purement local. Les anciens fichiers résidant sur le système de fichiers d'une machine ne sont pas accessibles par l'autre instance. Tous les nouveaux fichiers créés depuis le lot 5A sont stockés en base (BYTEA) et sont donc universellement accessibles par toutes les instances.

---

## 3. Throttling & Rate Limiting du Géocodeur Nominatim Multi-Instances

### Politique d'Utilisation Nominatim & Débit Global
Le service OpenStreetMap Nominatim applique une politique stricte : **au maximum 1 requête par seconde (1 req/s)**. Tout dépassement expose le service à un bannissement IP (HTTP 429).

### Configuration Pilotée par Variables d'Environnement
Dans `services/ms1-accounts/src/config/env.ts` et `geocoder.service.ts`, les paramètres du géocodeur sont entièrement configurables via l'environnement :

| Variable d'Environnement | Rôle | Valeur par Défaut (Mono-Instance) | Valeur Déployée (Multi-Instances 2x) |
|---|---|---|---|
| `GEOCODER_MIN_INTERVAL_MS` | Intervalle minimum entre 2 requêtes consécutives vers Nominatim | `1000` (1 req/s) | **`2000`** (0.5 req/s par instance) |
| `GEOCODER_QUEUE_MAX` | Taille maximale de la file d'attente d'attente avant rejet 503 | `20` | `20` |
| `GEOCODER_USER_LIMIT_PER_MIN` | Limite de requêtes de géocodage par utilisateur authentifié | `10` | `10` |

### Calcul du Débit Cumulé avec 2 Instances
Avec 2 instances configurées à `GEOCODER_MIN_INTERVAL_MS=2000` :
$$\text{Débit maximal total} = 2 \times \frac{1 \text{ req}}{2000 \text{ ms}} = 1 \text{ req/s}$$
Le total cumulé reste strictement **inférieur ou égal à 1 requête par seconde**, respectant scrupuleusement la politique d'OpenStreetMap.

### Comportement du Rate Limit Utilisateur & Amélioration Cible
- **Comportement actuel :** Le compteur de requêtes par utilisateur (`checkUserRateLimit`) est maintenu dans la mémoire de chaque processus (`userRequestTimestamps`).
- **Effet multi-instances :** Si un utilisateur envoie des requêtes réparties équitablement entre les deux instances par Traefik, il peut consommer jusqu'à $2 \times 10 = 20\text{ requêtes par minute}$ (facteur d'échelle effectif jusqu'à $2\times$).
- **Solution cible (recommandée) :** La solution distribuée optimale pour un environnement de production hautement disponible est un limiteur de débit centralisé (Redis ou table PostgreSQL dédiée avec algorithme de *token bucket*) afin d'unifier le quota utilisateur à travers l'ensemble du cluster.

---

## 4. Script de Démonstration Traefik & Multi-Instances

Le script de démonstration est disponible dans [`scripts/demo-5b.sh`](../../scripts/demo-5b.sh).

### Points de Vérification Inclus
1. **Healthcheck Traefik & Découverte Consul :**
   Appels successifs à `http://localhost/health` montrant l'en-tête `X-Instance-Id` alternant entre `ms1-accounts-1` et `ms1-accounts-2`.
2. **Vérification de l'Appel Authentifié `GET /api/shops/geocode` :**
   - **Statut de l'obtention automatique d'un JWT via login Telegram :** **NOT EXECUTED**.
     *Raison :* Le protocole d'authentification FORSA repose exclusivement sur le bot Telegram officiel `@forsa_auth_bot` (génération de nonce, partage de contact interactif, validation de code OTP 6 chiffres). Aucun point de terminaison HTTP de contournement ni mot de passe n'existe, ce qui empêche d'obtenir un token JWT de manière scriptée sans interaction humaine sur smartphone.
   - **Alternative opérationnelle :** Le script fournit la commande utilisant un JWT signé hors-ligne à l'aide de la clé privée locale (`services/ms1-accounts/keys/private.pem`) pour attester de la réponse 200 et de la présence de `X-Instance-Id`.
