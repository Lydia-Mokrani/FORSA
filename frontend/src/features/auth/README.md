# Frontend — Authentification & Profils 👤 @hyb0hb (Hambli Hiba)

**Responsable :** Hambli Hiba (`@hyb0hb`)  
**Microservice associé :** `services/ms1-accounts` (Port 3001)  
**Branche Git dédiée :** `feature/ms1-accounts`  

---

## 🎨 Écrans et Composants déjà développés / à enrichir :
1. **Page de Connexion (`LoginPage.tsx`) :**
   - Toggle interactif Client / Commerçant avec design glassmorphism aux couleurs FORSA.
   - Gestion des tokens JWT (Access Token en mémoire/Axios interceptor et Refresh Token).
2. **Page d'Inscription (`RegisterPage.tsx`) :**
   - Inscription Client ou Commerçant.
3. **Espace Profil & Vérification Téléphone :**
   - Affichage des informations du compte.
   - Modal de vérification OTP par SMS (avec affichage du code de test pour la démo).
4. **Formulaire d'Enregistrement Boutique & Justificatifs (Commerçant) :**
   - Saisie des informations du commerce (nom, adresse, horaires).
   - Téléversement des 3 fichiers légaux (Registre du commerce, NIF, Devanture).
