# Questions & Architecture WAMS — Microservices FORSA

**Date** : 2026-11-23  
**Contexte** : Phase 1 & 2 (Lot 2B / Lots 3-4)  
**Service concerné** : MS1 Accounts & Shops (`services/ms1-accounts`)

---

## 1. Rate Limiting en Environnement Multi-Instances (WAMS / Traefik)

### Constat actuel
- Le rate limiting est actuellement stocké en mémoire vive du processus Node.js via un `Map<string, RateLimitRecord>` dans `services/ms1-accounts/src/middlewares/rate-limit.middleware.ts`.
- **Comportement avec 2 instances derrière Traefik** :
  - Traefik distribue les requêtes HTTP entre les instances (round-robin ou IP hash).
  - Les compteurs de requêtes ne sont pas partagés entre les processus.
  - Un attaquant ou un utilisateur peut donc effectuer jusqu'à $N \times \text{limite}$ requêtes ($2 \times 3 = 6$ démarrages au lieu de 3 en 10 minutes) selon l'équilibrage.
  - Il y a risque d'incohérence si les requêtes consécutives `/start` et `/verify` tombent sur deux instances distinctes.

### Proposition d'évolution (Production / Staging)
1. **Stockage partagé distribué** : Utiliser un store partagé (Redis avec clé TTL automatique ou memcached) pour synchroniser les compteurs d'adresses IP et numéros de téléphone entre tous les réplicas MS1.
2. **Déportation sur Traefik / Gateway** : Implémenter un middleware de rate-limiting directement au niveau de la passerelle Traefik (qui voit l'ensemble du trafic entrant avant répartition).

---

## 2. Bot Telegram et Long Polling Multi-Instances

### Constat actuel
- Le service utilise le long polling Telegram (`getUpdates`) dans `services/ms1-accounts/src/services/telegram.service.ts`.
- **Comportement avec 2 instances utilisant le même token Telegram** :
  - Telegram interdit strictement plusieurs appels concurrents à `getUpdates` avec le même token de bot.
  - Telegram renvoie immédiatement une erreur **HTTP 409 Conflict** :
    ```json
    { "ok": false, "error_code": 409, "description": "Conflict: terminated by other getUpdates request; make sure that only one bot instance is running" }
    ```
  - Les instances entrent en concurrence destructrice, s'interrompent mutuellement et des messages utilisateurs (partage de contact, code) sont perdus.

### Proposition d'évolution (Production / Staging / MS5)
1. **Isolation dans un service dédié (MS5)** : Déplacer le bot Telegram dans le microservice dédié aux notifications et intégrations (MS5) déployé en instance unique (singleton `replicas: 1`). MS1 ne communique avec lui que par les événements RabbitMQ (`telegram.contact.received`, `telegram.send.otp`, `telegram.send.message`), architecture déjà préparée au Lot 2B.
2. **Leader Election (Consul)** : Si maintenu dans MS1, utiliser Consul Session / Distributed Lock (`consul.lock`) pour qu'une seule instance obtienne le rôle de "poller" actif.
3. **Webhooks Telegram (Production)** : Remplacer le long polling par un Webhook Telegram officiel (`setWebhook`) routé par Traefik vers `/api/auth/telegram/webhook`. Cette approche est stateless et nativement compatible avec le dimensionnement horizontal (multi-instances).

---

## 3. Stockage Sécurisé du Refresh Token (Cookie HttpOnly vs LocalStorage)

### Constat actuel
- Le JWT access token est maintenu exclusivement en mémoire vive (`let inMemoryAccessToken`), ce qui le protège contre l'exfiltration XSS statique.
- En revanche, le refresh token (validité 7 jours) est actuellement stocké dans `localStorage` sous la clé `forsa_refresh_token` (`frontend/src/features/auth/services/authService.ts#L20, L246`).
- **Risque de sécurité (XSS)** :
  - Tout script malveillant injecté via une faille XSS (dépendance compromise, injection dans une entrée utilisateur non échappée) a un accès direct et synchrone au `localStorage`.
  - Un attaquant peut ainsi dérober le refresh token et générer de nouveaux access tokens.

### Proposition & Recommandation
- Stocker le refresh token dans un cookie serveur avec les attributs stricts :
  - `HttpOnly` : inaccessible depuis le JavaScript (`document.cookie`), immunisé contre l'exfiltration XSS.
  - `Secure` : transmis uniquement sur HTTPS (chiffré en transit).
  - `SameSite=Strict` ou `SameSite=Lax` : protection contre les attaques CSRF (Cross-Site Request Forgery).
  - `Path=/api/auth/refresh` : le cookie n'est envoyé par le navigateur que sur la route de rotation dédiée.

---

## 4. Stockage des Documents Justificatifs et Compatibilité Multi-Serveurs

### Constat actuel
- Les fichiers justificatifs (registre de commerce, NIF, pièce d'identité) sont actuellement enregistrés sur le disque dur local du conteneur via `multer.diskStorage` (`services/ms1-accounts/src/middleware/upload.middleware.ts#L14`).
- **Comportement avec plusieurs réplicas MS1** :
  - Si un commerçant uploade ses documents sur l'instance A de MS1, et que la modération ADMIN ou un appel de téléchargement est routé par Traefik vers l'instance B, le fichier est introuvable (`404 Document non trouvé` sur le disque local).

### Proposition & Recommandation
1. **Stockage Objet Compatible S3 / MinIO** :
   - Déployer une instance MinIO (ou bucket S3 / Cloud Storage).
   - Les fichiers uploadés sont streamés vers le stockage objet sécurisé avec clés d'accès chiffrées.
   - Les URLs de téléchargement utilisent des liens présignés temporaires (Presigned URLs, validité 15 min) accessibles uniquement aux administrateurs autorisés.
2. **Volume Persistant Partagé (NFS / Ceph)** :
   - Monter un volume partagé commun `/mnt/shared-uploads` sur tous les conteneurs MS1 si un stockage bloc/fichier réseau est préféré.

---

## 5. Alignement et Harmonisation des Noms d'Endpoints (§6 vs Implémentation)

### Constat d'écarts
- La spécification §6 liste :
  - `GET /shops/me`, `PUT /shops/me`, `POST /shops/me/documents`
  - `POST /users/me/photo`
- L'implémentation existante utilise :
  - `GET /shops/my`, `PUT /shops/my`, `POST /shops/my/documents`
  - `POST /users/me/avatar`

### Recommandation
- Conserver les routes actuelles `/my` et `/avatar` tout en ajoutant des alias stricts `/shops/me` et `/users/me/photo` pour garantir 100% de conformité avec la spécification §6 sans créer de régression sur les consommateurs existants.
