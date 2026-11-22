# Frontend — Espace Réservations & QR Code 👤 @Itshannahh (Doua)

**Responsable :** Rebahi Doua (`@Itshannahh`)  
**Microservice associé :** `services/ms3-reservations` (Port 3003)  

---

## 🎨 Écrans et Composants à développer :
1. **Modal / Page de confirmation de réservation :**
   - Récapitulatif du panier, prix remisé, adresse du magasin et plage horaire de retrait.
   - Bouton "Confirmer ma réservation" (appelle `POST /api/reservations`).
2. **Page "Mes Réservations" (Espace Client) :**
   - Liste des réservations actives et de l'historique (`PENDING`, `PICKED_UP`, `EXPIRED`).
   - Affichage du **QR Code** de retrait généré + Code texte (ex: `FRS-8492`).
3. **Scanner / Validation de retrait (Espace Commerçant) :**
   - Caméra de scan QR Code ou champ de saisie du code texte.
   - Bouton de validation physique remettant le panier au client (`POST /api/reservations/:id/pickup`).
