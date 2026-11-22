# FORSA (فرصة) — Plateforme Solidaire Anti-Gaspillage Alimentaire 🌱

[![Node.js 22](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js)](https://nodejs.org)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.13-FF6600?logo=rabbitmq)](https://www.rabbitmq.com)
[![Traefik v3](https://img.shields.io/badge/Traefik-v3-24A1C1?logo=traefik)](https://traefik.io)
[![Consul](https://img.shields.io/badge/HashiCorp-Consul-F24C53?logo=consul)](https://www.consul.io)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma)](https://www.prisma.io)

Projet académique réalisé dans le cadre du module **WAMS (Web Architectures & Microservices)**  
**Niveau :** ING4 – Génie Logiciel (S7)  
**Établissement :** Université M'Hamed Bougara de Boumerdès (UMBB)  
**Superviseur :** Dr. Yahiatene Youcef  

---

## 👥 Équipe Projet & Répartition des Microservices

| Service | Domaine Métier | Étudiante Responsable | Profil GitHub | Serveur Déploiement | Port Interne |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MS1** | **Accounts & Shops** (Auth RS256, Profils, Justificatifs) | **Hambli Hiba** | [@hyb0hb](https://github.com/hyb0hb) | Serveur S1 (`10.0.0.11`) | `3001` |
| **MS2** | **Catalogue & Search** (Offres, Géolocalisation, Stock atomique) | **Mokrani May Lydia** | [@Lydia-Mokrani](https://github.com/Lydia-Mokrani) | Serveur S2 (`10.0.0.12`) | `3002` |
| **MS3** | **Reservations** (Réservations, QR Code, Validation retrait) | **Rebahi Doua** | [@Itshannahh](https://github.com/Itshannahh) | Serveur S3 (`10.0.0.13`) | `3003` |
| **MS4** | **Trust & Moderation** (OCR Tesseract.js, Avis, Signalements) | **Rafes Maroua** | @Rafes-Maroua | Serveur S4 (`10.0.0.14`) | `3004` |
| **MS5** | **Notifications & Worker** (E-mails Nodemailer, In-App SSE) | **Khoumeri Asma** | @Khoumeri-Asma | Serveur S5 (`10.0.0.15`) | `3005` |
| **S0** | **Infrastructure & Passerelle** (Traefik v3, Consul, RabbitMQ) | Équipe FORSA | - | Serveur S0 (`10.0.0.10`) | `80`, `8500`, `5672` |

---

## 🏗 Architecture Globale du Système

Conformément au cahier des charges WAMS, chaque microservice possède **sa propre base de données PostgreSQL isolée** sur son serveur dédié. Le routage et la découverte sont gérés dynamiquement par **Traefik v3** et **Consul**, et les échanges asynchrones transitent par **RabbitMQ** (Topic exchange avec Dead-Letter Queue).

```mermaid
flowchart TD
    Client["Navigateur Web (React SPA - S0)"] -->|Port 80/443| Traefik["Traefik v3 (Reverse Proxy / Load Balancer - S0)"]
    
    subgraph S0["Serveur S0 (Infra)"]
        Traefik
        Consul["Consul (Service Discovery)"]
        RabbitMQ["RabbitMQ (Topic: forsa.events + DLQ)"]
        Traefik -.->|Découverte dynamique| Consul
    end

    subgraph S1["Serveur S1 (10.0.0.11)"]
        MS1["MS1: Accounts & Shops (@hyb0hb)"] --> DB1[(PostgreSQL 1)]
    end
    subgraph S2["Serveur S2 (10.0.0.12)"]
        MS2["MS2: Catalogue & Search (@Lydia-Mokrani)"] --> DB2[(PostgreSQL 2)]
    end
    subgraph S3["Serveur S3 (10.0.0.13)"]
        MS3["MS3: Reservations (@Itshannahh)"] --> DB3[(PostgreSQL 3)]
    end
    subgraph S4["Serveur S4 (10.0.0.14)"]
        MS4["MS4: Trust & Moderation (Rafes Maroua)"] --> DB4[(PostgreSQL 4)]
    end
    subgraph S5["Serveur S5 (10.0.0.15)"]
        MS5["MS5: Notifications & Worker (Khoumeri Asma)"] --> DB5[(PostgreSQL 5)]
    end

    Traefik -->|/api/auth, /api/users, /api/shops| MS1
    Traefik -->|/api/offers, /api/categories| MS2
    Traefik -->|/api/reservations| MS3
    Traefik -->|/api/admin, /api/reviews, /api/reports| MS4
    Traefik -->|/api/notifications| MS5

    MS1 -.->|Register & Healthcheck| Consul
    MS2 -.->|Register & Healthcheck| Consul
    MS3 -.->|Register & Healthcheck| Consul
    MS4 -.->|Register & Healthcheck| Consul
    MS5 -.->|Register & Healthcheck| Consul

    MS3 ==>|HTTP Synchrone /internal/reserve| MS2
    
    MS1 & MS2 & MS3 & MS4 & MS5 <-->|Events Asynchrones Topic forsa.events| RabbitMQ
```

---

## 📚 Documentation Technique

* [**Contrat des Événements RabbitMQ (`docs/events.md`)**](docs/events.md) : Schémas JSON stricts de tous les messages asynchrones.
* [**Décisions d'Architecture Validées (`docs/decisions.md`)**](docs/decisions.md) : Justifications techniques (RS256, seuils, isolation DB).
* [**Stratégie Base de Données (`docs/database-strategy.md`)**](docs/database-strategy.md) : PostgreSQL par service, migrations Prisma, Snapshots.
* [**Workflow Git & Collaboration (`docs/git-workflow.md`)**](docs/git-workflow.md) : Règles de branches, Pull Requests et conventions de commits.
* [**Roadmap Équipe (`docs/roadmap-equipe.md`)**](docs/roadmap-equipe.md) : Planning détaillé étape par étape pour chaque membre.

---

## 🚀 Démarrage Rapide (Développement Local)

### 1. Cloner et installer les dépendances
```bash
git clone https://github.com/Lydia-Mokrani/FORSA.git
cd FORSA
git checkout develop
npm install
npm run build:common
```

### 2. Démarrer l'infrastructure centrale (S0)
```bash
npm run dev:infra
```
* **Dashboard Traefik :** [http://localhost:8080](http://localhost:8080)
* **UI Consul :** [http://localhost:8500](http://localhost:8500)
* **Management RabbitMQ :** [http://localhost:15672](http://localhost:15672) *(guest / guest)*

### 3. Lancer votre microservice (Ex: MS1 Accounts)
```bash
# Générer le client Prisma
npm run prisma:ms1

# Démarrer MS1 en mode hot-reload
npm run dev:ms1
```

---

## 🔒 Sécurité et Conformité
* Signature asymétrique des tokens d'authentification (**JWT RS256**).
* Clés privées et fichiers `.env` exclus du contrôle de version.
* Accès aux pièces justificatives commerçants restreint strictement au rôle `ADMIN` sur volume Docker privé.
* Résilience et tolérance aux pannes via **Dead-Letter Queue (DLQ)** RabbitMQ.
