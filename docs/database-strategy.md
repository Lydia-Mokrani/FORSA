# FORSA (فرصة) — Stratégie de Gestion des Bases de Données
**Version :** 1.0  
**SGBD :** PostgreSQL 16 (conteneurisé via Docker)  
**ORM :** Prisma 5+ (TypeScript)  
**Règle d'or :** 1 Base de données isolée par Microservice (Zéro requête croisée)

---

## 1. Principe Fondamental : "Database-per-Service"

Dans l'architecture WAMS imposée par le Dr. Yahiatene, chaque microservice est le propriétaire exclusif de son schéma de persistance :

```mermaid
flowchart TD
    subgraph S1["Serveur S1 (Hiba)"]
        MS1["MS1 (Accounts & Shops)"] --> DB1[("PostgreSQL 1<br/>forsa_accounts")]
    end
    subgraph S2["Serveur S2"]
        MS2["MS2 (Catalogue & Search)"] --> DB2[("PostgreSQL 2<br/>forsa_catalogue")]
    end
    subgraph S3["Serveur S3"]
        MS3["MS3 (Reservations)"] --> DB3[("PostgreSQL 3<br/>forsa_reservations")]
    end
    subgraph S4["Serveur S4"]
        MS4["MS4 (Trust & Moderation)"] --> DB4[("PostgreSQL 4<br/>forsa_trust")]
    end
    subgraph S5["Serveur S5"]
        MS5["MS5 (Notifications)"] --> DB5[("PostgreSQL 5<br/>forsa_notifications")]
    end

    MS1 -.->|INTERDIT (Jamais d'accès direct)| DB2
    MS2 -.->|INTERDIT (Jamais d'accès direct)| DB1
```

* **Isolation totale :** MS1 ne connaît ni l'hôte, ni l'utilisateur, ni le mot de passe de la base de MS2.
* **Tolérance aux pannes :** Si le conteneur PostgreSQL 4 (Trust) redémarre, les opérations d'achat (MS2/MS3) et d'authentification (MS1) continuent sans aucune interruption.

---

## 2. Déploiement Local par Service (`docker-compose.yml`)

Chaque membre dispose d'un conteneur PostgreSQL préconfiguré dans le dossier de son service.

### Exemple pour MS1 (`services/ms1-accounts/docker-compose.yml`) :
```yaml
version: '3.8'

services:
  postgres-ms1:
    image: postgres:16-alpine
    container_name: forsa-postgres-ms1
    restart: always
    environment:
      POSTGRES_USER: forsa_user
      POSTGRES_PASSWORD: forsa_password
      POSTGRES_DB: forsa_accounts
    ports:
      - "5432:5432"
    volumes:
      - ms1_pgdata:/var/lib/postgresql/data

volumes:
  ms1_pgdata:
```

### Attribution des ports locaux pour tester plusieurs services sur une même machine :
| Service | Base de données locale | Port externe local (si sur 1 seul PC) | Port en production (Multi-serveurs) |
| :--- | :--- | :--- | :--- |
| **MS1** | `forsa_accounts` | `5432` | `5432` (sur Machine S1) |
| **MS2** | `forsa_catalogue` | `5433` | `5432` (sur Machine S2) |
| **MS3** | `forsa_reservations` | `5434` | `5432` (sur Machine S3) |
| **MS4** | `forsa_trust` | `5435` | `5432` (sur Machine S4) |
| **MS5** | `forsa_notifications` | `5436` | `5432` (sur Machine S5) |

---

## 3. Workflow des Migrations avec Prisma

Chaque service gère son dossier `prisma/` de manière autonome :
```text
services/ms1-accounts/
├── prisma/
│   ├── schema.prisma       # Définition des modèles (User, Shop, etc.)
│   ├── seed.ts             # Script d'injection des données de test
│   └── migrations/         # Historique horodaté des scripts SQL générés
```

### Commandes indispensables pour chaque membre :

1. **Appliquer une modification de schéma en cours de dev :**
   ```bash
   npx prisma migrate dev --name ajouter_champ_telephone
   ```
   * Met à jour la base PostgreSQL locale.
   * Génère le fichier de migration SQL dans `prisma/migrations/`.
   * Régénère le client TypeScript (`@prisma/client`) avec typage strict.

2. **Ouvrir l'interface graphique de visualisation des tables (Prisma Studio) :**
   ```bash
   npx prisma studio
   ```
   * Ouvre une interface web sur `http://localhost:5555` pour voir et modifier les enregistrements en direct.

3. **Appliquer les migrations sur le serveur en production :**
   ```bash
   npx prisma migrate deploy
   ```
   * Exécute toutes les migrations en attente sans régénérer de fichiers.

---

## 4. Comment faire sans `JOIN` SQL : Le Pattern "Snapshot"

### Le problème :
Dans le catalogue (MS2), une offre doit afficher :
* Le titre et le prix (stockés dans MS2).
* Le nom du magasin, son adresse et sa note moyenne (gérés respectivement par MS1 et MS4).
* **Interdiction de faire un appel HTTP synchrone vers MS1 à chaque recherche d'offre** (trop lent, risque de cascade de pannes).

### La solution : La table `shop_snapshots` dans MS2
MS2 stocke une copie locale en lecture seule des informations dont il a besoin :

```prisma
// services/ms2-catalogue/prisma/schema.prisma
model ShopSnapshot {
  shopId        String   @id
  name          String
  address       String
  latitude      Float
  longitude     Float
  logoUrl       String?
  averageRating Float    @default(0.0)
  salesCount    Int      @default(0)
  status        String   @default("PENDING") // PENDING, APPROVED, SUSPENDED
  updatedAt     DateTime @updatedAt
}
```

### Mécanisme de mise à jour asynchrone (RabbitMQ) :
1. Un commerçant modifie son adresse dans MS1 $\rightarrow$ MS1 émet `merchant.submitted`.
2. L'administrateur valide la boutique dans MS4 $\rightarrow$ MS4 émet `merchant.approved`.
3. Un client note la boutique dans MS4 $\rightarrow$ MS4 émet `shop.rating_updated`.
4. **MS2 consomme ces événements et met à jour sa table `ShopSnapshot` en arrière-plan.**
5. Lors d'une recherche, MS2 fait une simple jointure locale entre `Offer` et `ShopSnapshot`. Vitesse maximale, zéro latence réseau !

---

## 5. Données de Démonstration pour la Soutenance (`seed.ts`)

Pour réussir la démonstration de 10 minutes devant le jury sans devoir créer manuellement 20 comptes et 50 offres, chaque service intègre un script `seed.ts`.

Exécution en une seule commande :
```bash
npx prisma db seed
```

### Contenu des données injectées par service :
* **MS1 (Hiba)** :
  * 1 compte Administrateur (`admin@forsa.dz` / `Admin1234!`).
  * 3 comptes commerçants vérifiés avec boutiques configurées (*Boulangerie La Rose*, *Primeur El Baraka*, *Pâtisserie Fleur*).
  * 2 comptes clients actifs avec e-mail vérifié.
* **MS2** :
  * 8 catégories alimentaires officielles.
  * 12 offres réparties avec photos réelles, prix réduits et créneaux horaires valides pour le jour même.
* **MS3** :
  * 3 réservations passées (historique).
  * 1 réservation active avec son code de retrait (`FRS-2026`) et QR code prêt à être scanné en direct devant le tuteur.
* **MS4** :
  * 4 signalements déjà enregistrés sur une boutique de test (il suffira d'en ajouter 1 seul en direct pendant la démo pour montrer la suspension automatique au 5ᵉ signalement !).
