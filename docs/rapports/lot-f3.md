# Rapport d'Exécution — Lot F3 : Statuts de validation commerçant & Pièces justificatives

**Date :** 25 Novembre 2026  
**Branche :** `feat/ms1-telegram-auth`  
**Statut :** TERMINE ET VALIDE  

---

## 1. Inventaire des Maquettes Figma & Audit des Sections

Conformément aux règles du projet, l'audit visuel a été mené en lecture seule :

| Section / Écran | Node ID | Nom du Frame Figma | Statut d'audit | Implémentation / Justification |
| :--- | :--- | :--- | :--- | :--- |
| **Statut Commerçant** | `1150:28299` | Compte commerçant / Statut | Audit code & tokens | 4 états conformes (PENDING, APPROVED, REJECTED, SUSPENDED) |
| **Statut En attente** | `1150:28300` | Statut Pending Stepper | Audit code & tokens | Intégration du composant `Stepper` (3 étapes) |
| **Statut Rejeté** | `1150:28305` | Statut Rejeté | Audit code & tokens | Remplacement emoji par SVG token erreur, lien vers resubmit |
| **Pièces Justificatives** | `1150:28320` | Liste des documents | Audit code & tokens | `/merchant/documents` (badges de conformité, motif de rejet) |
| **Mise à jour pièces** | `1150:28340` | Téléversement documents | Audit code & tokens | `/merchant/documents/resubmit` avec `Dropzone` 5 Mo |
| **Compte Suspendu** | `785:21652` | Écran Suspension | Audit par nom | Harmonisation visuelle sur fond `#dce1d0` (`ui.auth-bg`) |

---

## 2. Refonte de `MerchantStatusPage.tsx` & Corrections

1. **4 États Métier Réels :**
   - **PENDING :** Présentation du `Stepper` officiel R0b à 3 étapes (*Dossier soumis* [terminé], *Vérification en cours* [actuel, `aria-current="step"`], *Boutique activée* [à venir]). Récapitulatif du nom de commerce déclaré et rappel du délai ouvrable (24h à 48h).
   - **APPROVED :** Badge de succès `Chip variant="success"`, message de félicitations et CTA direct vers `/merchant/dashboard`.
   - **REJECTED :** Motif réel extrait de `GET /api/shops/me/verification` (`rejectReason`) avec message de repli générique si non spécifié. Suppression de l'ancien caractère emoji `✕` remplacé par l'icône SVG du token d'erreur (`<Icon name="alert-circle" />` et `Banner variant="error"`).
   - **SUSPENDED :** Écran d'avertissement avec contact du support (`support@forsa-dz.com`).
2. **Correction du Bug de Redirection Rejet :**
   - Le bouton "Mettre à jour mes documents" pointait auparavant de manière erronée vers `/register?role=merchant&step=3`. Il a été corrigé pour pointer rigoureusement vers `/merchant/documents/resubmit`.
3. **Application de la Décision HYB [DECISION HYB] :**
   - Suppression intégrale de l'image de fond bokeh et des filtres superposés.
   - Fond solide pleine page via la classe `bg-ui-auth-bg` (`#dce1d0`).
   - Carte centrale sur fond blanc avec bordure `ui-field-border`, rayon 32px et ombre douce.

---

## 3. Harmonisation de `AccountSuspendedPage.tsx`

- Harmonisation complète sur la charte R0/R0b et la décision HYB.
- Fond solide `#dce1d0` (`bg-ui-auth-bg`), suppression de l'image `loginBg`.
- Carte accessible 32px, `Chip variant="error"`, `Banner variant="warn"` et bouton de contact d'assistance.

---

## 4. Gestion des Pièces Justificatives

### A. Consultation des documents (`/merchant/documents` — `MerchantDocumentsPage.tsx`)
- Appel du point de terminaison réel `GET /api/shops/me/documents`.
- Affichage détaillé de chaque pièce :
  - **Registre du commerce (CNRC)** (`commercial_register`)
  - **Identifiant fiscal (NIF / NIS)** (`tax_id`)
  - **Photo de la devanture** (`storefront`)
- Étiquettes d'état conformes : `VALIDATED` (`Chip variant="success"`), `PENDING` (`Chip variant="warn"`), `REJECTED` (`Chip variant="error"` avec encadré du motif de non-conformité).
- Raccourci vers la mise à jour des pièces justificatives.

### B. Téléversement actualisé (`/merchant/documents/resubmit` — `DocumentResubmitPage.tsx`)
- Trois zones de dépôt `Dropzone` dédiées avec pré-validation client :
  - Formats acceptés : PDF, PNG, JPG (photo devanture : PNG/JPG).
  - Contrôle strict de la taille maximale à 5 Mo.
- Soumission multipart sécurisée vers `POST /api/shops/me/documents` via `uploadShopDocuments(formData)`.
- Bannière de confirmation de succès et redirection vers `/merchant/status`.

---

## 5. Preuve de Suppression de l'Actif `login-bg.png` [DECISION HYB]

### A. Preuve Grep d'absence de référence avant suppression
Commande exécutée :
```bash
git grep -i "login-bg" frontend/src
```
**Résultat : 0 correspondance dans `frontend/src`.**

### B. Suppression de l'actif
Fichier supprimé du dépôt : `frontend/src/assets/login-bg.png` (504.53 kB).

### C. Évolution des tailles de chunks & actifs (Avant / Après)

| Actif / Chunk généré | Taille Avant suppression (F2) | Taille Après suppression (F3) | Gain net |
| :--- | :--- | :--- | :--- |
| `dist/assets/login-bg-*.png` | **504.53 kB** | **0 kB (supprimé)** | **-504.53 kB (-100%)** |
| `dist/assets/index-*.css` | 108.80 kB (gzip: 23.09 kB) | 104.69 kB (gzip: 22.61 kB) | -4.11 kB |
| `dist/assets/index-*.js` | 814.39 kB (gzip: 226.07 kB) | 819.03 kB (gzip: 227.21 kB) | +4.64 kB (pages docs) |
| **Total bundle assets image** | **1 789.75 kB** | **1 285.22 kB** | **-504.53 kB (-28.2%)** |

---

## 6. Preuves de Validation

1. **TypeScript (`tsc -b`) :** SUCCÈS (0 erreur).
2. **Build de Production Vite (`vite build`) :** SUCCÈS (génération complète en 7.66s).
3. **Tests Unitaires Vitest :** 34 tests réussis sur 34 (5 suites de tests).
4. **Intégrité Git :** Uniquement des chemins situés sous `frontend/` et `docs/rapports/`.
