# FORSA — Architecture Système & Déploiement Multi-Instances (WAMS)

> **Module :** Web Architectures & Microservices (WAMS) — UMBB ING4 GL (Semestre 7)  
> **Superviseur :** Dr. Yahiatene Youcef  
> **Composant :** MS1 Accounts & Shops — Scalabilité Horizontale, Justificatifs & Avatars PostgreSQL  
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
│  ms1-accounts-1 (Port 3001)     │                       │  ms1-accounts-2 (Port 3002)     │
│  - X-Instance-Id: ms1-accounts-1│                       │  - X-Instance-Id: ms1-accounts-2│
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
                               │  - avatar_data       │
                               └──────────────────────┘
```

### Identification des Instances (`X-Instance-Id`)
Chaque instance MS1 injecte automatiquement dans toutes les réponses HTTP l'en-tête `X-Instance-Id: <INSTANCE_ID>` via son middleware Express :
- `ms1-accounts-1` (port 3001) renvoie `X-Instance-Id: ms1-accounts-1`
- `ms1-accounts-2` (port 3002) renvoie `X-Instance-Id: ms1-accounts-2`

Cet en-tête est relayé fidèlement par Traefik au client, attestant de la répartition effective de la charge entre les instances.

---

## 2. Stockage des Documents et Avatars en Base PostgreSQL (BYTEA)

### Point de Preuve Explicite : Aucun Volume Partagé Requis
1. **Documents justificatifs :** Stockés dans la table `shop_documents` via la colonne `file_data` (BYTEA).
2. **Avatars utilisateurs :** Stockés dans la table `users` via la colonne `avatar_data` (BYTEA) avec `avatar_mime` (VARCHAR).

**Conséquence architecturale majeure :**
Puisque les données binaires résident directement dans la base PostgreSQL centrale partagée par les instances MS1, **aucun volume partagé (NFS, Ceph, volume partagé Docker multi-hôtes) n'est nécessaire** entre les instances. N'importe quelle instance MS1 peut recevoir et servir n'importe quel avatar ou document justificatif à tout instant.

### Preuve Formelle : Absence d'Écriture Disque pour les Nouveaux Fichiers
L'analyse statique du code source (`grep -rnE "writeFile|createWriteStream|diskStorage|mkdir|appendFile|renameSync|copyFile" services/ms1-accounts/src`) confirme qu'aucune fonction d'écriture disque n'est appelée lors du cycle de vie des nouveaux justificatifs ou avatars :

1. **Multer en mémoire pure (`memoryStorage`) :**
   - Documents : `upload.middleware.ts` utilise `multer.memoryStorage()` (max 5 Mo, PDF/JPG/PNG).
   - Avatars : `avatar-upload.middleware.ts` utilise `multer.memoryStorage()` (max 2 Mo, JPG/PNG/WebP).
2. **Persistance en base de données :**
   - Documents : gérés par `DatabaseStorageService.put()` qui met à jour la colonne `file_data` (BYTEA).
   - Avatars : gérés par `UserController.uploadAvatar()` qui met à jour `avatar_data` et `avatar_mime` (BYTEA).
3. **Distribution sans disque :**
   - Documents : servis via `shop.controller.ts` (`GET /api/shops/me/documents/:docId/download` et admin).
   - Avatars : servis via `UserController.getAvatar()` (`GET /api/users/avatars/:filename`), avec streaming direct du Buffer BYTEA et headers HTTP `Cache-Control: public, max-age=604800`.

---

## 3. Gestion des Clés RSA & JWKS Multi-Instances

### Uniformité des Clés en Production
Pour que les tokens JWT signés par `ms1-accounts-1` soient vérifiables par `ms1-accounts-2` sans régénération aléatoire :
- Les clés sont chargées prioritairement depuis les variables d'environnement `JWT_PRIVATE_KEY` et `JWT_PUBLIC_KEY`.
- Un identifiant de clé stable `kid` (`JWT_KEY_ID`, par défaut `forsa-ms1-auth-v1`) est obligatoirement embarqué dans l'en-tête de chaque token JWT (`header.kid`) et exposé sur le endpoint `/auth/jwks` et `/api/auth/jwks`.
- En environnement de production (`NODE_ENV=production`), le démarrage échoue immédiatement (*fail-fast*) si aucune clé RSA n'est fournie, interdisant toute divergence de clés entre conteneurs.

---

## 4. Throttling & Rate Limiting du Géocodeur Nominatim Multi-Instances

### Règle des $N$ Instances : $N \times 1000\text{ ms}$
Le service OpenStreetMap Nominatim applique une politique stricte : **au maximum 1 requête par seconde (1 req/s)**. Tout dépassement expose le service à un bannissement IP (HTTP 429).

Pour un déploiement de $N$ instances indépendantes sans bus partagé pour le throttler, la valeur de `GEOCODER_MIN_INTERVAL_MS` pour chaque instance doit impérativement respecter la formule :
$$\text{GEOCODER\_MIN\_INTERVAL\_MS} = N \times 1000\text{ ms}$$

- Pour $N = 1$ instance : $\text{GEOCODER\_MIN\_INTERVAL\_MS} = 1000\text{ ms}$ (1 req/s).
- Pour $N = 2$ instances : $\text{GEOCODER\_MIN\_INTERVAL\_MS} = 2000\text{ ms}$ (0.5 req/s par instance $\implies$ max 1 req/s cumulé).
- Pour $N = 3$ instances : $\text{GEOCODER\_MIN\_INTERVAL\_MS} = 3000\text{ ms}$ (0.33 req/s par instance $\implies$ max 1 req/s cumulé).

### User-Agent Identifiable Obligatoire
Le service `geocoder.service.ts` transmet systématiquement un en-tête `User-Agent` identifiable configuré via `config.geocoderUserAgent`. En production, le démarrage échoue immédiatement si `GEOCODER_USER_AGENT` est absent ou défini sur une valeur par défaut/fictive (`forsa-dev`, `dummy`, `default`).

---

## 5. Limites Multi-Instances Restantes & Pistes d'Amélioration

Bien que l'architecture actuelle garantisse l'intégrité des tokens, le partage des fichiers binaires (BYTEA) et le respect du débit global Nominatim, les limites architecturales suivantes subsistent et sont documentées :

1. **Limiteur de requêtes utilisateur du géocodeur en mémoire locale :**
   - Le compteur utilisateur (`checkUserRateLimit`) est maintenu dans la mémoire vive de chaque processus (`userRequestTimestamps`).
   - *Impact :* Un utilisateur peut consommer jusqu'à $N \times 10\text{ requêtes/min}$ (ex. 20 req/min avec 2 instances) si ses requêtes sont parfaitement équilibrées par Traefik.
   - *Solution cible :* Déporter le bucket utilisateur sur Redis ou une table PostgreSQL dédiée.
2. **Fichiers historiques sur disque local (fichiers legacy) :**
   - Le fallback de lecture sur disque local (`avatarFilePath` et anciens justificatifs) ne fonctionne que sur l'instance physique où le fichier avait été initialement écrit avant la migration BYTEA.
   - *Statut :* Tout nouveau fichier téléversé passe à 100% par PostgreSQL (BYTEA) et n'est pas affecté par cette limite.
3. **Invalidation de session en mémoire locale :**
   - Les sessions actives sont persistées en base PostgreSQL (`refresh_tokens`), mais si un cache mémoire est utilisé ultérieurement, un bus de publication/abonnement (RabbitMQ / Redis) sera nécessaire pour propager les révocations instantanées.

---

## 6. Script de Démonstration Traefik & Multi-Instances

Le script de démonstration est disponible dans [`scripts/demo-5b.sh`](../../scripts/demo-5b.sh).

### Points de Vérification Inclus
1. **Healthcheck Traefik & Découverte Consul :**
   Appels successifs à `http://localhost/health` montrant l'en-tête `X-Instance-Id` alternant entre `ms1-accounts-1` et `ms1-accounts-2`.
2. **Vérification de l'Appel Authentifié `GET /api/shops/geocode` :**
   - **Statut de l'obtention automatique d'un JWT via login Telegram :** **NOT EXECUTED**.
     *Raison :* Le protocole d'authentification FORSA repose exclusivement sur le bot Telegram officiel `@forsa_auth_bot` (génération de nonce, partage de contact interactif, validation de code OTP 6 chiffres). Aucun point de terminaison HTTP de contournement ni mot de passe n'existe, ce qui empêche d'obtenir un token JWT de manière scriptée sans interaction humaine sur smartphone.
   - **Alternative opérationnelle :** Le script fournit la commande utilisant un JWT signé hors-ligne à l'aide de la clé privée locale (`services/ms1-accounts/keys/private.pem`) pour attester de la réponse 200 et de la présence de `X-Instance-Id`.
