# FORSA (فرصة) — Stratégie Git & Workflow de Collaboration
**Version :** 1.0  
**Équipe :** 5 Développeuses (Hiba, May Lydia, Doua, Maroua, Asma)  
**Règle d'or :** Aucun push direct sur `main`. Intégration continue via Pull Requests (PR).

---

## 1. Organisation du Monorepo et Cloisonnement

Pour que les 5 membres travaillent en parallèle sans aucun conflit de merge, la codebase est strictement partitionnée par dossier :

```text
forsa/
├── services/
│   ├── ms1-accounts/       👉 Zone exclusive : Personne 1 (Hiba)
│   ├── ms2-catalogue/      👉 Zone exclusive : Personne 2
│   ├── ms3-reservations/   👉 Zone exclusive : Personne 3
│   ├── ms4-trust/          👉 Zone exclusive : Personne 4
│   └── ms5-notifications/  👉 Zone exclusive : Personne 5
├── frontend/src/features/
│   ├── auth/               👉 Hiba (Login, Register, Profils, Switch mode)
│   ├── offers/             👉 Personne 2 (Accueil, Explorer, Détail offre)
│   ├── reservations/       👉 Personne 3 (Modale, Reçu QR, Scanner commerçant)
│   ├── admin/              👉 Personne 4 (Dashboard modération, Documents, OCR)
│   └── notifications/      👉 Personne 5 (Cloche, Liste notifications)
├── packages/common/        ⚠️ Zone partagée (Lead Infra / Personne 5)
├── infra/                  ⚠️ Zone partagée (Lead Infra / Personne 5)
└── docs/                   📖 Contrats partagés (decisions.md, events.md, roadmap.md)
```

> [!TIP]
> **Pourquoi il n'y a pas de conflits :** Git ne génère des conflits que lorsque deux personnes modifient les mêmes lignes d'un même fichier. En travaillant chacune dans son dossier de microservice et de feature front, vos branches n'ont aucune intersection de code !

---

## 2. Structure des Branches (Git Flow)

```mermaid
gitGraph
    commit id: "Initial Commit"
    branch develop
    checkout develop
    commit id: "Infra S0 ready"
    
    branch feature/ms1-auth
    checkout feature/ms1-auth
    commit id: "feat(ms1): login API"
    commit id: "feat(ms1): JWT RS256"
    checkout develop
    merge feature/ms1-auth id: "PR #1 Merged"
    
    branch feature/ms2-offers
    checkout feature/ms2-offers
    commit id: "feat(ms2): offers CRUD"
    checkout develop
    merge feature/ms2-offers id: "PR #2 Merged"
    
    checkout main
    merge develop id: "Release V1.0 (Stable)"
```

1. **`main` (Branche Sacrée)** :
   * Contient la version stable testée et prête pour la démonstration devant le professeur.
   * **Push direct strictement interdit** (protégée sur GitHub).
   * Seul le lead technique fusionne `develop` vers `main` lors des jalons majeurs.
2. **`develop` (Branche d'intégration continue)** :
   * La branche vivante où convergent toutes les fonctionnalités validées.
3. **`feature/msX-nom-de-tache` (Branches individuelles)** :
   * Créée par chaque membre pour une fonctionnalité précise (ex: `feature/ms1-login`, `feature/ms2-atomic-stock`, `feature/ms3-qrcode`).

---

## 3. Guide Pratique Quotidien (Commandes pas-à-pas)

### Étape 1 : Le matin, synchroniser son espace local
Avant de coder, toujours récupérer les dernières nouveautés de l'équipe :
```bash
git checkout develop
git pull origin develop
```

### Étape 2 : Créer sa branche de tâche
```bash
# Exemple pour Hiba sur MS1
git checkout -b feature/ms1-inscription-commercant
```

### Étape 3 : Coder et tester localement
Vous développez dans votre sous-dossier dédié (ex: `services/ms1-accounts/`) et testez vos routes avec Postman et votre base PostgreSQL locale.

### Étape 4 : Enregistrer ses modifications (Commits conventionnels)
Format obligatoire : `<type>(<scope>): <description courte>`
* Types autorisés : `feat` (nouvelle fonctionnalité), `fix` (correction de bug), `docs` (documentation), `test` (tests), `chore` (maintenance/config).
```bash
git add services/ms1-accounts/ frontend/src/features/auth/
git commit -m "feat(ms1): upload des 3 documents commercants et verification OTP"
```

### Étape 5 : Pousser sa branche sur GitHub
```bash
git push -u origin feature/ms1-inscription-commercant
```

### Étape 6 : Ouvrir une Pull Request (PR)
1. Aller sur le dépôt GitHub du projet.
2. Cliquer sur le bouton jaune **"Compare & pull request"**.
3. Vérifier : **base: `develop`** $\leftarrow$ **compare: `feature/ms1-inscription-commercant`**.
4. Ajouter une description claire :
   * *Qu'est-ce qui a été fait ?*
   * *Comment tester (ex: endpoint Postman, identifiants de test).*
5. **Revue par les pairs** : Une équipière teste ou vérifie le code, puis clique sur **"Approve"** et **"Merge pull request"**.
6. Supprimer la branche distante sur GitHub.

---

## 4. Règle Vitale : Sécurité et Fichiers `.env`

> [!CAUTION]
> **Sanction Académique Immédiate :** Le sujet WAMS pénalise tout mot de passe, token ou clé secrète committé dans le dépôt Git.

* Le fichier `.env` contenant vos vrais secrets locaux est **strictement ignoré** par Git via `.gitignore`.
* À la place, chaque service committe un fichier **`.env.example`** modèle :
  ```env
  PORT=3001
  NODE_ENV=development
  DATABASE_URL=postgresql://forsa_user:password@localhost:5432/forsa_ms1
  JWT_PRIVATE_KEY_PATH=./keys/private.pem
  JWT_PUBLIC_KEY_PATH=./keys/public.pem
  RABBITMQ_URL=amqp://guest:guest@localhost:5672
  CONSUL_URL=http://localhost:8500
  INTERNAL_API_KEY=forsa_internal_secret_key_2026
  ```
* Chaque membre copie `.env.example` vers `.env` sur sa machine et y renseigne ses identifiants locaux.

---

## 5. Procédure de Déploiement sur les Serveurs (S0 à S5)

Le jour de la soutenance (ou lors des répétitions), chaque membre déploie son service sur sa machine connectée à Tailscale :

```bash
# 1. Se placer sur la version stable
git checkout main
git pull origin main

# 2. Aller dans son service
cd services/ms1-accounts

# 3. Démarrer sa base et son service avec Docker
docker compose up -d --build

# 4. Appliquer les migrations de base de données
npx prisma migrate deploy

# 5. Injecter les données de démonstration pour le jury
npx prisma db seed
```
Le service s'enregistre immédiatement dans Consul sur le serveur S0 et devient accessible via Traefik.
