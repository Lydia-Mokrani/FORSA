# FORSA (فرصة) — Décisions d'Architecture et d'Arbitrage Métier
**Version :** 1.0  
**Date de validation :** 20 Novembre 2026  
**Équipe :** Hambli Hiba (Lead MS1), Mokrani May Lydia, Rebahi Doua, Rafes Maroua, Khoumeri Asma  
**Superviseur :** Dr. Yahiatene Youcef (WAMS — UMBB ING4 GL)

---

## 1. Périmètre Visiteur vs Utilisateur Connecté
* **Règle retenue :** Consultation libre et détaillée.
* **Comportement :**
  * Le visiteur non connecté peut parcourir la liste des offres, appliquer des filtres, voir les commerces sur la carte et ouvrir la **fiche détaillée d'une offre** (photos, description, réduction, adresse de la boutique).
  * Les actions transactionnelles ou engageantes (**Réserver**, **Signaler**, **Publier un avis**) nécessitent obligatoirement une authentification.
  * Au clic sur ces boutons, le visiteur est redirigé de manière fluide : `/login?redirect=/offers/:id`.
* **Justification :** Respecte les standards UX de l'industrie (Too Good To Go, Airbnb, Leboncoin) et valorise la note de Design/Ergonomie (25%).

---

## 2. Vérification du Numéro de Téléphone (OTP)
* **Règle retenue :** Simulation OTP locale (Mock contrôlé).
* **Comportement :**
  * Lors de la saisie ou modification du numéro de téléphone, l'utilisateur demande la vérification.
  * **MS1** génère un code OTP à 4 chiffres (ex: `1234` ou code aléatoire) affiché dans les logs serveur et renvoyé dans le corps de la réponse JSON en environnement `DEV`.
  * L'utilisateur saisit ce code dans une modale dédiée sur le front pour passer son statut à `phoneVerified: true`.
* **Justification :** Valide à 100% l'exigence fonctionnelle du tuteur (F1.9) sans dépendre d'une passerelle SMS externe payante ou bloquée.

---

## 3. Seuils de Suspension Automatique et de No-Show
* **Règle retenue :** Seuil fixé à **5** occurrences distinctes.
* **Comportement Commerçant (MS4) :**
  * Lorsqu'un commerçant cumule **5 signalements distincts provenant de 5 clients ayant réellement effectué et validé un retrait chez lui**, MS4 déclenche automatiquement sa suspension.
  * Émission immédiate de l'événement `merchant.suspended` $\rightarrow$ MS2 masque automatiquement toutes ses offres actives du catalogue.
* **Comportement Client No-Show (MS3) :**
  * Si un client n'honore pas ses réservations et atteint **5 no-shows** (réservations expirées non retirées), son droit de réservation est suspendu automatiquement pour une durée de **7 jours**.
* **Justification :** Évite les suspensions abusives tout en offrant un scénario de démonstration live très facile à prouver devant le jury.

---

## 4. Justificatifs Commerçants et Sécurité des Fichiers (MS1)
* **Règle retenue :** 3 pièces justificatives obligatoires.
  1. *Extrait du Registre du Commerce* (PDF / Image).
  2. *Numéro d'Identifiant Fiscal (NIF)*.
  3. *Photographie de la devanture du magasin* (avec enseigne visible).
* **Règle de Sécurité Non-Négociable :**
  * Les documents sont stockés sur un **volume Docker privé** associé à MS1.
  * Aucun accès public via Traefik.
  * Seul un administrateur connecté (rôle `ADMIN`) peut visualiser ou télécharger ces pièces via l'endpoint sécurisé `GET /api/shops/:id/documents`.

---

## 5. Stratégie de Déploiement Multi-Serveurs (6 Machines — 20% de la note)
* **Plan d'adressage IP unifié :** Plage réseau privée **`10.0.0.1x`** (alignée sur tous les fichiers Compose, READMEs et schémas d'architecture).
* **Architecture réseau & Déploiement :**
  * Chaque machine physique est adressée sur le schéma fixe suivant (soit en réseau local dédié / Wi-Fi partagé, soit mappée via le VPN Tailscale / `/etc/hosts`) :
    * **S0 (Infra - Passerelle)** : `10.0.0.10` — Traefik v3 (`:80`, `:8080`), Consul (`:8500`), RabbitMQ (`:5672`, `:15672`), Build statique React.
    * **S1 (Hambli Hiba)** : `10.0.0.11` — MS1 Accounts & Shops (`:3001`) + PostgreSQL 1 (Docker `:5432`).
    * **S2 (Mokrani May Lydia)** : `10.0.0.12` — MS2 Catalogue & Search (`:3002`) + PostgreSQL 2 (Docker `:5432`).
    * **S3 (Rebahi Doua)** : `10.0.0.13` — MS3 Reservations (`:3003`) + PostgreSQL 3 (Docker `:5432`).
    * **S4 (Rafes Maroua)** : `10.0.0.14` — MS4 Trust & Moderation OCR (`:3004`) + PostgreSQL 4 (Docker `:5432`).
    * **S5 (Khoumeri Asma)** : `10.0.0.15` — MS5 Notifications (`:3005`) + PostgreSQL 5 (Docker `:5432`).
  * Les microservices interrogent le bus RabbitMQ et le registre Consul situés sur **S0 (`10.0.0.10`)** avec les identifiants unifiés `forsa_user:forsa_password`.

---

## 6. Délais d'Expiration et Restitution du Stock
* **Règle retenue :** Fenêtre de retrait sur l'offre + 30 minutes de grâce.
* **Comportement :**
  * Chaque offre précise un créneau de retrait (ex: *18h00 - 19h30*).
  * Si la réservation n'est pas validée 30 minutes après l'heure de fin (`finRetrait + 30 min`), le job planifié de MS3 passe la réservation en `EXPIRED`.
  * MS3 émet `reservation.expired` et appelle l'endpoint idempotent de MS2 `POST /internal/offers/:id/release` pour réinjecter immédiatement la quantité dans le stock disponible.

---

## 7. Gestion des Données Dérivées (Snapshots vs Requêtes Sync)
* **Règle retenue :** Synchronisation 100% asynchrone par événements (Eventual Consistency).
* **Comportement :**
  * MS2 a besoin du nom, de l'adresse et de la note de la boutique pour afficher ses offres.
  * **Interdiction formelle de faire un appel HTTP synchrone vers MS1 ou MS4 lors de la consultation du catalogue**.
  * MS2 maintient une table locale `shop_snapshots`.
  * Elle est mise à jour via les événements RabbitMQ :
    * `merchant.submitted` / `merchant.approved` (émis par MS1 / MS4).
    * `shop.rating_updated` (émis par MS4 dès qu'un nouvel avis est validé).
    * `reservation.picked_up` (émis par MS3 pour incrémenter le compteur de ventes).

---

## 8. Stack Technique Unifiée
* **Langage & Runtime :** Node.js 20 (LTS) avec **TypeScript** strict sur tous les services.
* **Framework Web :** Express 4 avec middleware de validation **Zod**.
* **ORM & Base de données :** **Prisma** avec **PostgreSQL 16**.
* **Format des erreurs d'API :**
  ```json
  {
    "error": {
      "code": "STOCK_INSUFFICIENT",
      "message": "La quantité demandée n'est plus disponible.",
      "details": []
    }
  }
  ```
* **Bibliothèque partagée :** `@forsa/common` (auth JWT RS256, wrapper RabbitMQ avec DLQ, enregistrement Consul).
