// frontend/src/features/settings/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, AuthUser } from '../auth/services/authService';

// Figma Icons (exact from Figma 994:20744)
import figmaHeaderLocation from '../../assets/figma/423cff92-c550-42d1-b4fe-371a5535cf1a.svg';
import figmaHeaderBell from '../../assets/figma/c23b074e-1229-436c-9d23-a01534e8e968.svg';
import figmaUnreadIndicator from '../../assets/figma/7b49c9a6-2c16-4353-a466-57742c6a7ba9.svg';
import figmaFoodAvatar from '../../assets/figma/2b6c7bd1-5d3c-41bf-9e66-f19424baa74e.png';
import figmaPhotoDeProfil from '../../assets/figma/35776968-16f2-47d7-bee8-022b315658ba.png';
import figmaUserCircleHeader from '../../assets/figma/0fdf24b7-51f9-4635-a2f9-af2bc8060d40.svg';
import figmaReservationsTicket from '../../assets/figma/10c96e64-188f-49c1-ada2-3dc381159365.svg';
import figmaArrowRight from '../../assets/figma/03823da1-a693-434e-b36b-a5dbf3b1e9cb.svg';
import figmaSecurity from '../../assets/figma/b20b8dcc-9360-4b87-9be2-cf72038bfbf3.svg';
import figmaSmartPhone from '../../assets/figma/df47d7c6-a8ac-4730-a87b-c249af84ade2.svg';
import figmaBellPref from '../../assets/figma/274f6b9e-5b2a-4962-bad0-86f50e84ff6a.svg';
import figmaLogoutRed from '../../assets/figma/ea302c06-cd3d-47f0-863b-1147a7951587.svg';
import figmaTickVerified from '../../assets/figma/ba854eb3-8ae3-4295-8f91-411a250ed859.svg';
import figmaHeadset from '../../assets/figma/c0842e12-1b58-41c5-928a-ea55c0da7b24.svg';
import figmaHelpCircle from '../../assets/figma/0d77419f-d49b-4fcf-bc22-50ccb152951c.svg';
import figmaInfoCircle from '../../assets/figma/63d30b3d-6dd2-4964-b4d1-065c45b60062.svg';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
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

  const displayName = user?.fullName || (user as any)?.name || 'Lydia Benali';
  const displayEmail = user?.email || 'lydia.benali@example.com';
  const preferredLocation =
    (user as any)?.preferences?.preferredLocation ||
    (user as any)?.preferredLocation ||
    'Bab Ezzouar, Alger';
  const currentAvatar = (user as any)?.avatarUrl || (user as any)?.photo || figmaPhotoDeProfil;

  return (
    <div
      className="w-full min-h-screen bg-[#fffaf0] font-poppins text-[#0B2C25] pb-[28px] pt-[30px] px-4 sm:px-[40px] select-none"
      data-node-id="994:20742"
      data-name="Desktop · Paramètres — Vue d’ensemble"
    >
      <div className="max-w-[1202px] mx-auto flex flex-col gap-[24px]">
        {/* ── EN-TÊTE DE PAGE (Figma 994:20745) ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-[24px] w-full" data-node-id="994:20745" data-name="Page header">
          {/* Introduction (994:20746) */}
          <div className="flex flex-col gap-[3px] text-[#0b2c25]" data-node-id="994:20746">
            <p className="font-normal text-[11px] text-[#0b2c25]/75" data-node-id="994:20747">
              Mon espace / Profil / Paramètres
            </p>
            <h1 className="font-semibold text-[36px] sm:text-[48px] text-[#0b2c25] leading-tight" data-node-id="994:20748">
              Paramètres
            </h1>
            <p className="font-normal text-[16px] sm:text-[20px] text-[#0b2c25]/85" data-node-id="994:20749">
              Sécurité, notifications et préférences.
            </p>
          </div>

          {/* Account actions (994:20750) */}
          <div className="flex items-center gap-[14px] shrink-0 self-start md:self-center" data-node-id="994:20750">
            {/* Position actuelle dans le header (994:20751) */}
            <div
              onClick={() => navigate('/location')}
              className="hidden sm:flex items-center gap-[7px] pr-[12px] cursor-pointer hover:opacity-80 transition"
              data-node-id="994:20751"
              title="Modifier ma localisation"
            >
              <img src={figmaHeaderLocation} alt="" className="size-[18px] shrink-0" />
              <span className="font-normal text-[12px] text-[#0b2c25] leading-[1.5] max-w-[150px] truncate">
                {preferredLocation}
              </span>
            </div>

            {/* Notifications entry (994:20754) */}
            <div
              onClick={() => navigate('/notifications')}
              className="relative size-[42px] rounded-full flex items-center justify-center cursor-pointer hover:bg-white/60 transition bg-white/40"
              data-node-id="994:20754"
              title="Notifications"
            >
              <img src={figmaHeaderBell} alt="" className="size-[22px] shrink-0" />
              <img
                src={figmaUnreadIndicator}
                alt=""
                className="absolute top-[8px] left-[27px] size-[7px]"
              />
            </div>

            {/* Circular User Avatar Photo (994:20757) */}
            <div
              onClick={() => navigate('/profile')}
              className="relative size-[48px] rounded-full overflow-hidden shrink-0 border border-black/5 shadow-xs cursor-pointer hover:opacity-90 transition"
              data-node-id="994:20757"
              title="Mon profil"
            >
              <img
                src={currentAvatar || figmaPhotoDeProfil}
                alt="Avatar"
                className="size-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* ── COLONNES (Figma 994:20758) ── */}
        <div className="flex flex-col lg:flex-row gap-[24px] items-start w-full" data-node-id="994:20758" data-name="Colonnes">
          {/* ── COLONNE PRINCIPALE (758px - 994:20759) ── */}
          <div className="w-full lg:flex-1 lg:max-w-[758px] flex flex-col gap-[24px]" data-node-id="994:20759" data-name="Colonne principale">
            {/* CARTE 1 : COMPTE (994:20760) */}
            <div
              className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[24px] flex flex-col gap-[8px] shadow-sm w-full"
              data-node-id="994:20760"
              data-name="Carte sécurité"
            >
              <div className="flex items-center gap-[12px] w-full" data-node-id="994:20761" data-name="En-tête de carte">
                <div className="size-[44px] rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center shrink-0" data-node-id="994:20762">
                  <img src={figmaUserCircleHeader} alt="" className="size-[22px]" />
                </div>
                <h2 className="font-medium text-[20px] text-[#0b2c25]" data-node-id="994:20764">
                  Compte
                </h2>
              </div>

              <div className="h-px bg-[#ebeee1] w-full my-1" data-node-id="994:20765" />

              {/* Ligne 1 : Mes réservations (994:20766) */}
              <div
                onClick={() => navigate('/reservations')}
                className="flex items-center gap-[12px] py-[12px] px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group w-full"
                data-node-id="994:20766"
              >
                <div className="size-[40px] shrink-0 flex items-center justify-center" data-node-id="994:20767">
                  <img src={figmaReservationsTicket} alt="" className="size-[40px]" />
                </div>
                <div className="flex flex-col gap-px flex-1 min-w-0" data-node-id="994:20769">
                  <p className="font-semibold text-[14px] text-[#0b2c25]" data-node-id="994:20770">
                    Mes réservations
                  </p>
                  <p className="font-normal text-[11px] text-[#0b2c25]/75" data-node-id="994:20771">
                    Codes de retrait et historique
                  </p>
                </div>
                <span className="font-normal text-[12px] text-[#0b2c25]/70" data-node-id="994:20772">
                  2 en cours
                </span>
                <img src={figmaArrowRight} alt="" className="size-[18px] opacity-70 group-hover:opacity-100 transition" />
              </div>

              <div className="h-px bg-[#ebeee1] w-full" data-node-id="994:20774" />

              {/* Ligne 2 : Sécurité du compte (994:20775) */}
              <div
                onClick={() => navigate('/settings/security')}
                className="flex items-center gap-[12px] py-[12px] px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group w-full"
                data-node-id="994:20775"
              >
                <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0 group-hover:bg-[#dbf0dd] transition-colors" data-node-id="994:20776">
                  <img src={figmaSecurity} alt="" className="size-[20px]" />
                </div>
                <div className="flex flex-col gap-px flex-1 min-w-0" data-node-id="994:20778">
                  <p className="font-semibold text-[14px] text-[#0b2c25]" data-node-id="994:20779">
                    Sécurité du compte
                  </p>
                  <p className="font-normal text-[11px] text-[#0b2c25]/75" data-node-id="994:20780">
                    Mot de passe, double authentification
                  </p>
                </div>
                <img src={figmaArrowRight} alt="" className="size-[18px] opacity-70 group-hover:opacity-100 transition" />
              </div>

              <div className="h-px bg-[#ebeee1] w-full" data-node-id="994:20782" />

              {/* Ligne 3 : Vérification du téléphone (994:20783) */}
              <div
                onClick={() => navigate('/profile/phone')}
                className="flex items-center gap-[12px] py-[12px] px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group w-full"
                data-node-id="994:20783"
              >
                <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0 group-hover:bg-[#dbf0dd] transition-colors" data-node-id="994:20784">
                  <img src={figmaSmartPhone} alt="" className="size-[20px]" />
                </div>
                <div className="flex flex-col gap-px flex-1 min-w-0" data-node-id="994:20786">
                  <p className="font-semibold text-[14px] text-[#0b2c25]" data-node-id="994:20787">
                    Vérification du téléphone
                  </p>
                  <p className="font-normal text-[11px] text-[#0b2c25]/75" data-node-id="994:20788">
                    Numéro de mobile confirmé
                  </p>
                </div>
                <span className="font-normal text-[12px] text-[#0b2c25]/70" data-node-id="994:20789">
                  Vérifié
                </span>
                <img src={figmaArrowRight} alt="" className="size-[18px] opacity-70 group-hover:opacity-100 transition" />
              </div>
            </div>

            {/* CARTE 2 : PRÉFÉRENCES (994:20791) */}
            <div
              className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[24px] flex flex-col gap-[8px] shadow-sm w-full"
              data-node-id="994:20791"
              data-name="Carte sécurité"
            >
              <div className="flex items-center gap-[12px] w-full" data-node-id="994:20792" data-name="En-tête de carte">
                <div className="size-[44px] rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center shrink-0" data-node-id="994:20793">
                  <img src={figmaBellPref} alt="" className="size-[22px]" />
                </div>
                <h2 className="font-medium text-[20px] text-[#0b2c25]" data-node-id="994:20795">
                  Préférences
                </h2>
              </div>

              <div className="h-px bg-[#ebeee1] w-full my-1" data-node-id="994:20796" />

              {/* Ligne 1 : Notifications (994:20797) */}
              <div
                onClick={() => navigate('/notifications')}
                className="flex items-center gap-[12px] py-[12px] px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group w-full"
                data-node-id="994:20797"
              >
                <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0 group-hover:bg-[#dbf0dd] transition-colors" data-node-id="994:20798">
                  <img src={figmaBellPref} alt="" className="size-[20px]" />
                </div>
                <div className="flex flex-col gap-px flex-1 min-w-0" data-node-id="994:20800">
                  <p className="font-semibold text-[14px] text-[#0b2c25]" data-node-id="994:20801">
                    Notifications
                  </p>
                  <p className="font-normal text-[11px] text-[#0b2c25]/75" data-node-id="994:20802">
                    Réservations et offres près de moi
                  </p>
                </div>
                <span className="font-normal text-[12px] text-[#0b2c25]/70" data-node-id="994:20803">
                  Activées
                </span>
                <img src={figmaArrowRight} alt="" className="size-[18px] opacity-70 group-hover:opacity-100 transition" />
              </div>

              <div className="h-px bg-[#ebeee1] w-full" data-node-id="994:20805" />

              {/* Ligne 2 : Langue (994:20806) */}
              <div
                className="flex items-center gap-[12px] py-[12px] px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group w-full"
                data-node-id="994:20806"
              >
                <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0 group-hover:bg-[#dbf0dd] transition-colors" data-node-id="994:20807">
                  <span className="font-semibold text-[13px] text-[#0b2c25]" data-node-id="994:20808">
                    FR
                  </span>
                </div>
                <div className="flex flex-col gap-px flex-1 min-w-0" data-node-id="994:20809">
                  <p className="font-semibold text-[14px] text-[#0b2c25]" data-node-id="994:20810">
                    Langue
                  </p>
                  <p className="font-normal text-[11px] text-[#0b2c25]/75" data-node-id="994:20811">
                    Langue de l’application
                  </p>
                </div>
                <span className="font-normal text-[12px] text-[#0b2c25]/70" data-node-id="994:20812">
                  Français
                </span>
                <img src={figmaArrowRight} alt="" className="size-[18px] opacity-70 group-hover:opacity-100 transition" />
              </div>
            </div>

            {/* CARTE 3 : SE DÉCONNECTER (994:20814) */}
            <div
              className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] px-[24px] py-[12px] shadow-sm w-full"
              data-node-id="994:20814"
              data-name="Carte sécurité"
            >
              <div
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center gap-[12px] py-[12px] px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group w-full"
                data-node-id="994:20815"
              >
                <div className="size-[40px] rounded-full bg-[#f7dcd8] flex items-center justify-center shrink-0 group-hover:bg-[#fad4cf] transition-colors" data-node-id="994:20816">
                  <img src={figmaLogoutRed} alt="" className="size-[20px]" />
                </div>
                <div className="flex-1 min-w-0" data-node-id="994:20818">
                  <p className="font-semibold text-[14px] text-[#b13b3b]" data-node-id="994:20819">
                    Se déconnecter
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── COLONNE LATÉRALE DROITE (340px - 994:20820) ── */}
          <div className="w-full lg:w-[340px] flex flex-col gap-[24px] shrink-0" data-node-id="994:20820" data-name="Colonne latérale">
            {/* CARTE PROFIL (994:20821) */}
            <div
              className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[24px] flex flex-col items-center gap-[12px] shadow-sm w-full"
              data-node-id="994:20821"
              data-name="Carte sécurité"
            >
              {/* Photo de profil (96px) */}
              <div className="size-[96px] rounded-full overflow-hidden border-2 border-[#17664e]/20 shadow-xs shrink-0" data-node-id="994:20822">
                <img
                  src={currentAvatar}
                  alt={displayName}
                  className="size-full object-cover"
                />
              </div>

              {/* Nom & Email */}
              <h3 className="font-semibold text-[18px] text-[#0b2c25] text-center" data-node-id="994:20823">
                {displayName}
              </h3>
              <p className="font-normal text-[12px] text-[#0b2c25]/70 text-center truncate w-full" data-node-id="994:20824">
                {displayEmail}
              </p>

              {/* Badge vérifié (994:20825) */}
              <div className="bg-[#dbf0dd] flex items-center justify-center gap-[3px] px-[8px] py-[3px] rounded-full" data-node-id="994:20825">
                <img src={figmaTickVerified} alt="" className="size-[12px]" />
                <span className="font-semibold text-[10px] text-[#17664e]" data-node-id="994:20827">
                  E-mail et téléphone vérifiés
                </span>
              </div>

              {/* Bouton Modifier le profil (994:20828) */}
              <button
                type="button"
                onClick={() => navigate('/profile/edit')}
                className="w-full h-[38px] rounded-[12px] bg-[#0b2c25] hover:bg-[#17664e] text-white font-semibold text-[12px] flex items-center justify-center transition cursor-pointer mt-2 shadow-xs"
                data-node-id="994:20828"
              >
                Modifier le profil
              </button>

              {/* Bouton Changer la photo (994:20830) */}
              <button
                type="button"
                onClick={() => navigate('/profile/photo')}
                className="w-full h-[38px] rounded-[12px] border border-[#0b2c25] hover:bg-[#ebeee1] text-[#0b2c25] font-semibold text-[12px] flex items-center justify-center transition cursor-pointer"
                data-node-id="994:20830"
              >
                Changer la photo
              </button>
            </div>

            {/* CARTE ASSISTANCE (994:20832) */}
            <div
              className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[24px] flex flex-col gap-[8px] shadow-sm w-full"
              data-node-id="994:20832"
              data-name="Carte sécurité"
            >
              <div className="flex items-center gap-[12px] w-full" data-node-id="994:20833" data-name="En-tête de carte">
                <div className="size-[44px] rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center shrink-0" data-node-id="994:20834">
                  <img src={figmaHeadset} alt="" className="size-[22px]" />
                </div>
                <h3 className="font-medium text-[20px] text-[#0b2c25]" data-node-id="994:20836">
                  Assistance
                </h3>
              </div>

              <div className="h-px bg-[#ebeee1] w-full my-1" data-node-id="994:20837" />

              {/* Ligne Aide et support (994:20838) */}
              <a
                href="mailto:support@forsa.dz"
                className="flex items-center gap-[12px] py-[12px] px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group w-full"
                data-node-id="994:20838"
              >
                <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0 group-hover:bg-[#dbf0dd] transition-colors" data-node-id="994:20839">
                  <img src={figmaHelpCircle} alt="" className="size-[20px]" />
                </div>
                <div className="flex flex-col gap-px flex-1 min-w-0" data-node-id="994:20841">
                  <p className="font-semibold text-[14px] text-[#0b2c25]" data-node-id="994:20842">
                    Aide et support
                  </p>
                  <p className="font-normal text-[11px] text-[#0b2c25]/75" data-node-id="994:20843">
                    Contacter l’équipe FORSA
                  </p>
                </div>
                <img src={figmaArrowRight} alt="" className="size-[18px] opacity-70 group-hover:opacity-100 transition" />
              </a>

              <div className="h-px bg-[#ebeee1] w-full" data-node-id="994:20845" />

              {/* Ligne À propos de FORSA (994:20846) */}
              <div
                onClick={() => navigate('/terms')}
                className="flex items-center gap-[12px] py-[12px] px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group w-full"
                data-node-id="994:20846"
              >
                <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0 group-hover:bg-[#dbf0dd] transition-colors" data-node-id="994:20847">
                  <img src={figmaInfoCircle} alt="" className="size-[20px]" />
                </div>
                <div className="flex flex-col gap-px flex-1 min-w-0" data-node-id="994:20849">
                  <p className="font-semibold text-[14px] text-[#0b2c25]" data-node-id="994:20850">
                    À propos de FORSA
                  </p>
                  <p className="font-normal text-[11px] text-[#0b2c25]/75" data-node-id="994:20851">
                    Mission et conditions
                  </p>
                </div>
                <img src={figmaArrowRight} alt="" className="size-[18px] opacity-70 group-hover:opacity-100 transition" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODALE DE CONFIRMATION DE DÉCONNEXION (Figma 994:20954) */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[24px] border-[1.5px] border-[#dbf0dd] p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-semibold text-lg text-[#0B2C25]">
              Confirmer la déconnexion
            </h3>
            <p className="font-normal text-sm text-[#0B2C25]/80">
              Êtes-vous sûr de vouloir vous déconnecter de votre compte FORSA ?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#0B2C25]/40 text-[#0B2C25] font-semibold text-xs hover:bg-stone-50 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={logoutLoading}
                className="flex-1 py-2.5 rounded-xl bg-[#b13b3b] text-white font-semibold text-xs hover:bg-[#922a2a] transition"
              >
                {logoutLoading ? 'Déconnexion...' : 'Se déconnecter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
