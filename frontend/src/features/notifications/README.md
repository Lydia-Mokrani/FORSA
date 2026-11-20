# Frontend — Centre de Notifications 👤 Khoumeri Asma

**Responsable :** Khoumeri Asma  
**Microservice associé :** `services/ms5-notifications` (Port 3005)  

---

## 🎨 Écrans et Composants à développer :
1. **Composant Cloche de Notification (Header) :**
   - Badge indiquant le nombre de notifications non lues.
   - Menu déroulant avec les dernières alertes (confirmation de commande, nouvelle offre favori, alerte créneau).
2. **Page Historique des Notifications :**
   - Liste complète avec filtres (Toutes, Non lues).
   - Bouton "Tout marquer comme lu".
3. **Écouteur d'événements temps réel (SSE / EventSource) :**
   - Réception instantanée des alertes sans rechargement de page.
