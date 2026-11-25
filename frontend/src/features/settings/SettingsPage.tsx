// frontend/src/features/settings/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCircle,
  Shield,
  Phone,
  Bell,
  Globe,
  MapPin,
  RefreshCw,
  LogOut,
  ChevronRight,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
} from 'lucide-react';
import {
  getCurrentUser,
  logout,
  AuthUser,
} from '../auth/services/authService';
import { useLocation } from '../catalogue/context/LocationContext';
import defaultAvatar from '../../assets/default-avatar.jpg';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { location } = useLocation();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const u = await getCurrentUser();
        if (mounted) setUser(u);
      } catch {
        const cached = localStorage.getItem('forsa_user');
        if (cached && mounted) {
          try {
            setUser(JSON.parse(cached));
          } catch {}
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleConfirmLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    } finally {
      setLogoutLoading(false);
    }
  };

  const isMerchant = user?.roles?.includes('MERCHANT');
  const userPhoto = (user as any)?.avatarUrl || (user as any)?.photo || defaultAvatar;
  const userName = user?.fullName || (user as any)?.name || 'Utilisateur FORSA';
  const userEmail = user?.email || 'utilisateur@forsa.dz';

  return (
    <div
      className="min-h-screen bg-[#fffaf0] p-4 sm:p-6 md:p-8 font-poppins text-[#0B2C25] selection:bg-[#17664e] selection:text-white"
      data-node-id="994:20742"
      data-name="Desktop · Paramètres — Vue d’ensemble"
    >
      <div className="max-w-[1140px] mx-auto space-y-6">
        {/* En-tête Figma 994:20745 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-[44px] font-bold tracking-tight text-[#0b2c25]">
              Paramètres
            </h1>
            <p className="text-sm sm:text-base text-[#0b2c25]/75 mt-1 font-normal">
              Sécurité, notifications et préférences.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="self-start sm:self-auto border border-[#0b2c25]/30 hover:bg-stone-100 text-[#0b2c25] text-xs font-semibold px-4 py-2 rounded-full transition cursor-pointer"
          >
            ← Retour au profil
          </button>
        </div>

        {/* Grille 2 Colonnes : Figma 994:20758 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Colonne Principale (Gauche - 8/12) */}
          <div className="lg:col-span-8 space-y-6">
            {/* ─── CARTE 1 : COMPTE (Figma 994:20760) ─── */}
            <div className="bg-white rounded-[24px] border-[1.5px] border-[#dbf0dd] p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-[#ebeee1]">
                <div className="size-11 rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center text-[#17664e] shrink-0">
                  <UserCircle className="size-5" />
                </div>
                <div>
                  <h2 className="text-[20px] font-semibold text-[#0b2c25]">Compte</h2>
                  <p className="text-xs text-[#0b2c25]/60">Réservations, sécurité et coordonnées</p>
                </div>
              </div>

              <div className="divide-y divide-[#ebeee1]">
                {/* Ligne Mes réservations */}
                <div
                  onClick={() => navigate('/reservations')}
                  className="flex items-center justify-between py-3.5 px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="size-10 rounded-full bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                      <Calendar className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#0b2c25] group-hover:text-[#17664e] transition">
                        Mes réservations
                      </h4>
                      <p className="text-xs text-[#0b2c25]/60">Codes de retrait et historique de vos paniers</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-[#17664e] bg-[#eef7ec] px-2.5 py-0.5 rounded-full border border-[#235347]/20">
                      0 en cours
                    </span>
                    <ChevronRight className="size-4 text-[#0b2c25]/40 group-hover:text-[#0b2c25] transition" />
                  </div>
                </div>

                {/* Ligne Sécurité du compte */}
                <div
                  onClick={() => navigate('/settings/security')}
                  className="flex items-center justify-between py-3.5 px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="size-10 rounded-full bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                      <Shield className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#0b2c25] group-hover:text-[#17664e] transition">
                        Sécurité du compte
                      </h4>
                      <p className="text-xs text-[#0b2c25]/60">Mot de passe, double authentification et sessions actives</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-medium text-[#0b2c25]/70 hidden sm:inline">
                      Gérer
                    </span>
                    <ChevronRight className="size-4 text-[#0b2c25]/40 group-hover:text-[#0b2c25] transition" />
                  </div>
                </div>

                {/* Ligne Vérification du téléphone */}
                <div
                  onClick={() => navigate('/profile/phone')}
                  className="flex items-center justify-between py-3.5 px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="size-10 rounded-full bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                      <Phone className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#0b2c25] group-hover:text-[#17664e] transition">
                        Vérification du téléphone
                      </h4>
                      <p className="text-xs text-[#0b2c25]/60">
                        {user?.phoneE164 || (user as any)?.phone || 'Numéro de mobile confirmé'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-[#17664e] bg-[#eef7ec] px-2.5 py-0.5 rounded-full border border-[#235347]/20 flex items-center gap-1">
                      <CheckCircle2 className="size-3" />
                      <span>Vérifié</span>
                    </span>
                    <ChevronRight className="size-4 text-[#0b2c25]/40 group-hover:text-[#0b2c25] transition" />
                  </div>
                </div>
              </div>
            </div>

            {/* ─── CARTE 2 : PRÉFÉRENCES (Figma 994:20791) ─── */}
            <div className="bg-white rounded-[24px] border-[1.5px] border-[#dbf0dd] p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-[#ebeee1]">
                <div className="size-11 rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center text-[#17664e] shrink-0">
                  <Bell className="size-5" />
                </div>
                <div>
                  <h2 className="text-[20px] font-semibold text-[#0b2c25]">Préférences</h2>
                  <p className="text-xs text-[#0b2c25]/60">Notifications, langue et rayon de recherche</p>
                </div>
              </div>

              <div className="divide-y divide-[#ebeee1]">
                {/* Ligne Notifications */}
                <div
                  onClick={() => navigate('/notifications')}
                  className="flex items-center justify-between py-3.5 px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="size-10 rounded-full bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                      <Bell className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#0b2c25] group-hover:text-[#17664e] transition">
                        Notifications
                      </h4>
                      <p className="text-xs text-[#0b2c25]/60">Alertes nouveaux paniers, réservations et e-mails</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-[#17664e] bg-[#eef7ec] px-2.5 py-0.5 rounded-full border border-[#235347]/20">
                      Activées
                    </span>
                    <ChevronRight className="size-4 text-[#0b2c25]/40 group-hover:text-[#0b2c25] transition" />
                  </div>
                </div>

                {/* Ligne Langue */}
                <div className="flex items-center justify-between py-3.5 px-2 hover:bg-[#fffaf0] rounded-[16px] transition">
                  <div className="flex items-center gap-3.5">
                    <div className="size-10 rounded-full bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                      <Globe className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#0b2c25]">Langue de l’application</h4>
                      <p className="text-xs text-[#0b2c25]/60">Français (Algérie)</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#0b2c25] bg-[#fffaf0] border border-[#0b2c25]/20 px-3 py-1 rounded-full">
                    Français
                  </span>
                </div>

                {/* Ligne Localisation / Ma zone de recherche */}
                <div
                  onClick={() => navigate('/location')}
                  className="flex items-center justify-between py-3.5 px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="size-10 rounded-full bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                      <MapPin className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#0b2c25] group-hover:text-[#17664e] transition">
                        Ma zone de recherche
                      </h4>
                      <p className="text-xs text-[#0b2c25]/60">
                        {location.label || 'Bab Ezzouar, Alger'} · {(location as any).radius || 10} km
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-medium text-[#17664e] hover:underline">
                      Modifier la zone
                    </span>
                    <ChevronRight className="size-4 text-[#0b2c25]/40 group-hover:text-[#0b2c25] transition" />
                  </div>
                </div>
              </div>
            </div>

            {/* ─── CARTE 3 : MODE & DÉCONNEXION ─── */}
            <div className="bg-white rounded-[24px] border-[1.5px] border-[#dbf0dd] p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-[#ebeee1]">
                <div className="size-11 rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center text-[#17664e] shrink-0">
                  <RefreshCw className="size-5" />
                </div>
                <div>
                  <h2 className="text-[20px] font-semibold text-[#0b2c25]">Espace & Session</h2>
                  <p className="text-xs text-[#0b2c25]/60">Bascule de profil et déconnexion</p>
                </div>
              </div>

              <div className="divide-y divide-[#ebeee1]">
                {/* Passer en mode commerçant */}
                <div
                  onClick={() => navigate('/settings/mode')}
                  className="flex items-center justify-between py-3.5 px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="size-10 rounded-full bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                      <RefreshCw className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#0b2c25] group-hover:text-[#17664e] transition">
                        Changer de mode
                      </h4>
                      <p className="text-xs text-[#0b2c25]/60">
                        Basculez entre votre profil client et votre espace commerçant
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#0b2c25] bg-[#eef7ec] px-2.5 py-0.5 rounded-full border border-[#235347]/20">
                      {isMerchant ? 'Mode Commerçant' : 'Mode Client'}
                    </span>
                    <ChevronRight className="size-4 text-[#0b2c25]/40 group-hover:text-[#0b2c25] transition" />
                  </div>
                </div>

                {/* Déconnexion */}
                <div
                  onClick={() => setShowLogoutModal(true)}
                  className="flex items-center justify-between py-3.5 px-2 hover:bg-stone-50 rounded-[16px] transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="size-10 rounded-full bg-[#ebeee1] flex items-center justify-center text-red-600 shrink-0">
                      <LogOut className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-red-600">Se déconnecter</h4>
                      <p className="text-xs text-[#0b2c25]/60">Fermer votre session sur cet appareil</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-[#0b2c25]/40 group-hover:text-[#0b2c25] transition" />
                </div>
              </div>
            </div>
          </div>

          {/* Colonne Latérale (Droite - 4/12) : Figma 994:20821 & 994:20835 */}
          <div className="lg:col-span-4 space-y-6">
            {/* ─── CARTE PROFIL (Figma 994:20821) ─── */}
            <div className="bg-white rounded-[24px] border-[1.5px] border-[#dbf0dd] p-6 shadow-sm flex flex-col items-center text-center gap-3">
              <div className="relative size-24 rounded-full overflow-hidden border-2 border-[#17664e]/30 shadow-sm shrink-0">
                <img
                  src={userPhoto}
                  alt={userName}
                  className="size-full object-cover"
                />
              </div>

              <div>
                <h3 className="text-[18px] font-semibold text-[#0b2c25] leading-snug">
                  {userName}
                </h3>
                <p className="text-xs text-[#0b2c25]/70 mt-0.5">
                  {userEmail}
                </p>
              </div>

              <div className="bg-[#dbf0dd] content-stretch flex gap-1.5 items-center justify-center px-3 py-1 rounded-full">
                <CheckCircle2 className="size-3.5 text-[#17664e]" />
                <span className="text-[11px] font-semibold text-[#17664e]">
                  E-mail et téléphone vérifiés
                </span>
              </div>

              <div className="w-full pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="w-full h-10 rounded-full border border-[#0b2c25] hover:bg-[#0b2c25] hover:text-white text-xs font-semibold text-[#0b2c25] transition cursor-pointer flex items-center justify-center"
                >
                  Modifier le profil
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/profile/photo')}
                  className="text-xs text-[#17664e] hover:underline font-medium cursor-pointer block mx-auto py-1"
                >
                  Changer la photo
                </button>
              </div>
            </div>

            {/* ─── CARTE ASSISTANCE (Figma 994:20835) ─── */}
            <div className="bg-white rounded-[24px] border-[1.5px] border-[#dbf0dd] p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-[#ebeee1]">
                <div className="size-11 rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center text-[#17664e] shrink-0">
                  <HelpCircle className="size-5" />
                </div>
                <div>
                  <h3 className="text-[18px] font-semibold text-[#0b2c25]">Assistance</h3>
                  <p className="text-xs text-[#0b2c25]/60">Aide, support et conditions</p>
                </div>
              </div>

              <div className="divide-y divide-[#ebeee1]">
                {/* Aide et support */}
                <a
                  href="mailto:support@forsa.dz"
                  className="flex items-center justify-between py-3 px-2 hover:bg-[#fffaf0] rounded-[14px] transition cursor-pointer group"
                >
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-[#0b2c25] group-hover:text-[#17664e] transition">
                      Aide et support
                    </h4>
                    <p className="text-[11px] text-[#0b2c25]/60">Contacter l’équipe FORSA</p>
                  </div>
                  <ChevronRight className="size-4 text-[#0b2c25]/40 group-hover:text-[#0b2c25] transition" />
                </a>

                {/* À propos de FORSA */}
                <div
                  onClick={() => navigate('/cgu')}
                  className="flex items-center justify-between py-3 px-2 hover:bg-[#fffaf0] rounded-[14px] transition cursor-pointer group"
                >
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-[#0b2c25] group-hover:text-[#17664e] transition">
                      À propos de FORSA
                    </h4>
                    <p className="text-[11px] text-[#0b2c25]/60">Mission et conditions d'utilisation</p>
                  </div>
                  <ChevronRight className="size-4 text-[#0b2c25]/40 group-hover:text-[#0b2c25] transition" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Confirmation de Déconnexion */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-[24px] border border-[#dbf0dd] p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-amber-700">
              <div className="size-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0b2c25]">Confirmation de déconnexion</h3>
            </div>
            <p className="text-sm text-[#0b2c25]/75 leading-relaxed">
              Êtes-vous certain de vouloir fermer votre session sur cet appareil ? Vos paniers et réservations restent en sécurité.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2.5 rounded-[12px] border border-[#0b2c25]/30 text-xs font-semibold text-[#0b2c25] hover:bg-stone-100 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={logoutLoading}
                className="px-4 py-2.5 rounded-[12px] bg-red-600 hover:bg-red-700 text-xs font-semibold text-white shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {logoutLoading ? 'Déconnexion...' : 'Confirmer la déconnexion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SettingsPage;
