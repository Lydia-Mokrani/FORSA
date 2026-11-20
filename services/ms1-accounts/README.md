# MS1 — Accounts & Shops Service 👤 @Hambli-Hiba

**Responsable :** Hambli Hiba (Personne 1)  
**Serveur de déploiement :** S1 (`10.0.0.11`)  
**Port HTTP :** `3001`  
**Base de données :** `forsa_ms1_accounts` (PostgreSQL 16 - Port 5432 sur S1)  
**Routage Traefik :** `/api/auth`, `/api/users`, `/api/shops`  

---

## 📌 Rôles et Responsabilités
- Gestion de l'authentification centrale par **JWT asymétrique RS256** (signature avec clé privée RSA 2048).
- Gestion des profils utilisateurs (Clients, Commerçants, Administrateurs).
- Gestion des boutiques et téléversement sécurisé multipart des 3 pièces justificatives légales (Registre de commerce, NIF, Devanture du magasin).
- Simulation de la vérification de téléphone par OTP (SMS).

---

## 📡 Événements RabbitMQ (Exchange `forsa.events`)
- **Émis :**
  - `user.registered` → Notifie MS5 pour envoi de l'e-mail de bienvenue.
  - `shop.created` → Notifie les services tiers de la création d'une nouvelle boutique.
  - `shop.documents_uploaded` → Notifie MS4 pour vérification des pièces légales.
- **Consommés :**
  - `merchant.suspended` (émis par MS4) → Passe le statut de la boutique et du commerçant à `SUSPENDED`.

---

## 🛠 Commandes utiles
```bash
# Générer les clés RSA 2048 (déjà fait)
npm run keys:generate

# Générer le client Prisma
npm run prisma:generate

# Démarrer en mode développement
npm run dev

# Compiler TypeScript
npm run build
```
