import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import {
  logout,
  getCurrentUser,
  getMyShop,
  updateUserProfile,
  AuthUser,
} from '../auth/services/authService';

// Official Figma SVGs and images
import badgeProfil from '../../assets/icons/figma/badge-profil.svg';
import badgeCommerce from '../../assets/icons/figma/badge-commerce.svg';
import badgePreferences from '../../assets/icons/figma/badge-preferences.svg';
import badgeSecurite from '../../assets/icons/figma/badge-securite.svg';
import badgeAide from '../../assets/icons/figma/badge-aide.svg';
import merchantStorefrontAvatar from '../../assets/icons/figma/merchant-storefront-avatar.svg';
import iconeEdit from '../../assets/icons/figma/icone-edit-02.svg';
import iconeCheckmarkBadge from '../../assets/icons/figma/icone-checkmark-badge-01.svg';
import iconeMail from '../../assets/icons/figma/icone-mail-01.svg';
import iconeCall from '../../assets/icons/figma/icone-call.svg';
import iconeLocation from '../../assets/icons/figma/icone-location-01.svg';
import iconeSquareLock from '../../assets/icons/figma/icone-square-lock-01.svg';
import iconeSmartPhone from '../../assets/icons/figma/icone-smart-phone-01.svg';
import iconeSecurityCheck from '../../assets/icons/figma/icone-security-check.svg';
import iconeUserCircle from '../../assets/icons/figma/icone-user-circle.svg';
import iconeBell from '../../assets/icons/figma/icone-bell.svg';
import illustrationAide from '../../assets/images/figma/825_imgIllustrationAide.png';

// Modals de sécurité et d'édition
import { ChangeEmailModal } from './ChangeEmailModal';
import { ChangePhoneModal } from './ChangePhoneModal';
import { SessionsModal } from './SessionsModal';
import { PasswordRecoveryModal } from './PasswordRecoveryModal';
import { ModeSwitchModal } from './ModeSwitchModal';
import { EditCommerceModal } from './EditCommerceModal';
import { EditProfileModal } from './EditProfileModal';

export const MerchantAccountPage: React.FC = () => {
  const navigate = useNavigate();

  // État du profil commerçant
  const [profile, setProfile] = useState({
    shopName: 'Maison Gourmande',
    fullName: 'Maison Gourmande',
    email: 'maison.gourmande@forsa.dz',
    phone: '+213 555 12 34 56',
    address: '12 Rue des Fleurs, Boumerdès',
    city: 'Boumerdès, Algérie',
    activityType: 'Boulangerie – Pâtisserie',
    openingHours: '8h00 – 20h00',
    isVerified: true,
  });

  // Toggles de préférences
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [reminderAlerts, setReminderAlerts] = useState(true);

  // Modals
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [isCommerceModalOpen, setIsCommerceModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Initialisation avec les données réelles du backend
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const user: AuthUser = await getCurrentUser();
        const shop = await getMyShop();

        if (mounted && user) {
          setProfile((prev) => ({
            ...prev,
            fullName: user.fullName || prev.fullName,
            email: user.email || prev.email,
            phone: user.phoneE164 || prev.phone,
            shopName: shop?.name || user.shop?.name || prev.shopName,
            activityType: shop?.category || user.shop?.category || prev.activityType,
            address: shop?.address || user.shop?.address || prev.address,
            openingHours: shop?.openingHours || prev.openingHours,
            isVerified: (shop?.verificationStatus || user.shop?.verificationStatus) !== 'REJECTED',
          }));

          if (user.preferences) {
            setEmailNotifs(user.preferences.pushEnabled !== false);
            setReminderAlerts(user.preferences.telegramNotifications !== false);
          }
        }
      } catch {
        // En cas de prévisualisation sans backend actif, conserver les valeurs de démonstration conformes à Figma
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleEmailNotifs = async () => {
    const nextVal = !emailNotifs;
    setEmailNotifs(nextVal);
    try {
      await updateUserProfile({ pushEnabled: nextVal });
    } catch {
      // Optimistic update
    }
  };

  const handleToggleReminderAlerts = async () => {
    const nextVal = !reminderAlerts;
    setReminderAlerts(nextVal);
    try {
      await updateUserProfile({ telegramNotifications: nextVal });
    } catch {
      // Optimistic update
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  const handleSupport = () => {
    window.location.href = 'mailto:support@forsa.dz?subject=FORSA%20-%20Assistance%20Commer%C3%A7ant';
  };

  return (
    <div
      className="max-w-[1148px] mx-auto pb-16 font-poppins text-[#0B2C25]"
      data-node-id="1150:28079"
      data-name="Desktop · MS1 — Mon compte commerçant"
    >
      {/* Mobile Top Header (1187:22480) */}
      <div className="md:hidden flex items-center justify-between py-4 mb-4 border-b border-[#dbf0dd]">
        <button
          type="button"
          onClick={() => navigate('/merchant/dashboard')}
          className="size-10 rounded-full bg-white border border-[#dbf0dd] flex items-center justify-center text-[#0b2c25] hover:bg-stone-50 cursor-pointer shadow-xs"
          data-node-id="1187:22483"
          aria-label="Retour"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-semibold text-lg text-[#0B2C25]">Mon compte</h1>
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="size-10 rounded-full bg-white border border-[#dbf0dd] flex items-center justify-center text-[#0b2c25] hover:bg-stone-50 cursor-pointer shadow-xs"
          aria-label="Notifications"
        >
          <img src={iconeBell} alt="" className="size-5" />
        </button>
      </div>

      {/* Desktop En-tête (1150:28120) */}
      <header className="hidden md:flex items-start justify-between mb-8" data-node-id="1150:28120">
        <div>
          <p className="text-xs text-[#0b2c25]/80 uppercase tracking-wider mb-1 font-medium" data-node-id="1171:20916">
            Mon espace / Mon compte
          </p>
          <h1 className="font-semibold text-[44px] lg:text-[48px] text-[#0b2c25] leading-tight" data-node-id="1150:28122">
            Mon compte
          </h1>
          <p className="text-lg lg:text-[20px] text-[#0b2c25]/80 mt-1" data-node-id="1150:28123">
            Gérez vos informations et vos préférences
          </p>
        </div>

        <div className="flex items-center gap-4 pt-2" data-node-id="1150:28124">
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="size-12 rounded-full bg-white border border-[#dbf0dd] flex items-center justify-center text-[#0b2c25] hover:bg-stone-50 cursor-pointer transition-colors shadow-xs"
            aria-label="Notifications"
            data-node-id="1150:28125"
          >
            <img src={iconeBell} alt="" className="size-5" />
          </button>
          <div
            className="size-12 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#0b2c25] font-semibold text-base shadow-xs"
            data-node-id="1171:20892"
            title={profile.shopName}
          >
            MG
          </div>
        </div>
      </header>

      {/* Grille des Cartes (2 colonnes Figma) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Colonne Gauche (7 colonnes sur 12) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* CARTE 1 : Informations du profil (1150:28128) */}
          <section
            className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 sm:p-7 shadow-xs relative"
            data-node-id="1150:28128"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <img src={badgeProfil} alt="" className="size-10" />
                <h2 className="font-semibold text-xl text-[#0b2c25]" data-node-id="1150:28129">
                  Informations du profil
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="h-8 px-4 rounded-full border border-[#0b2c25] bg-white text-xs font-semibold text-[#0b2c25] flex items-center gap-1.5 hover:bg-stone-50 cursor-pointer shadow-xs active:scale-95 transition-all"
                data-node-id="1150:28151"
              >
                <span>Modifier</span>
                <img src={iconeEdit} alt="" className="size-3.5" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-2">
              {/* Grand avatar circulaire officiel Figma */}
              <div className="shrink-0" data-node-id="1150:28132">
                <img
                  src={merchantStorefrontAvatar}
                  alt="Avatar Commerce"
                  className="size-28 sm:size-32 object-contain"
                />
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1.5">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h3 className="font-semibold text-2xl text-[#0b2c25]" data-node-id="1150:28135">
                      {profile.shopName}
                    </h3>
                    <img
                      src={iconeCheckmarkBadge}
                      alt="Vérifié"
                      className="size-5 shrink-0"
                    />
                  </div>
                </div>

                <div className="mb-3 flex justify-center sm:justify-start">
                  <span
                    className="inline-flex items-center gap-1.5 bg-[#eef7ec] text-[#17664e] border border-[#dbf0dd] rounded-full px-3 py-0.5 text-xs font-medium"
                    data-node-id="1150:28137"
                  >
                    <CheckCircle2 className="size-3.5 text-[#17664e]" />
                    Commerçant vérifié
                  </span>
                </div>

                <div className="flex flex-col gap-2 text-sm text-[#0b2c25]/85 mt-2" data-node-id="1150:28141">
                  <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                    <img src={iconeMail} alt="" className="size-4 shrink-0" />
                    <span>{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                    <img src={iconeCall} alt="" className="size-4 shrink-0" />
                    <span>{profile.phone}</span>
                  </div>
                  <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                    <img src={iconeLocation} alt="" className="size-4 shrink-0" />
                    <span>{profile.city}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CARTE 2 : Informations du commerce (1150:28154) */}
          <section
            className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 sm:p-7 shadow-xs"
            data-node-id="1150:28154"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <img src={badgeCommerce} alt="" className="size-10" />
                <h2 className="font-semibold text-xl text-[#0b2c25]" data-node-id="1150:28155">
                  Informations du commerce
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsCommerceModalOpen(true)}
                className="h-8 px-4 rounded-full border border-[#0b2c25] bg-white text-xs font-semibold text-[#0b2c25] flex items-center gap-1.5 hover:bg-stone-50 cursor-pointer shadow-xs active:scale-95 transition-all"
                data-node-id="1150:28158"
              >
                <span>Modifier</span>
                <img src={iconeEdit} alt="" className="size-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-sm" data-node-id="1150:28161">
              <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-stone-100">
                <span className="font-medium text-[#0b2c25] w-52 text-[15px]">Nom du commerce :</span>
                <span className="text-[#0b2c25]/85 font-normal">{profile.shopName}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-stone-100">
                <span className="font-medium text-[#0b2c25] w-52 text-[15px]">Type d’activité :</span>
                <span className="text-[#0b2c25]/85 font-normal">{profile.activityType}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-stone-100">
                <span className="font-medium text-[#0b2c25] w-52 text-[15px]">Adresse :</span>
                <span className="text-[#0b2c25]/85 font-normal">{profile.address}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center py-2">
                <span className="font-medium text-[#0b2c25] w-52 text-[15px]">Horaire :</span>
                <span className="text-[#0b2c25]/85 font-normal">{profile.openingHours}</span>
              </div>
            </div>
          </section>

          {/* CARTE 3 : Préférences & Notifications (1150:28167) */}
          <section
            className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 sm:p-7 shadow-xs"
            data-node-id="1150:28167"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <img src={badgePreferences} alt="" className="size-10" />
                <h2 className="font-semibold text-xl text-[#0b2c25]" data-node-id="1150:28168">
                  Préférences &amp; Notifications
                </h2>
              </div>

              <button
                type="button"
                onClick={() => navigate('/merchant/account/preferences')}
                className="h-8 px-4 rounded-full border border-[#0b2c25] bg-white text-xs font-semibold text-[#0b2c25] flex items-center gap-1.5 hover:bg-stone-50 cursor-pointer shadow-xs active:scale-95 transition-all"
                data-node-id="1150:28171"
              >
                <span>Modifier</span>
                <img src={iconeEdit} alt="" className="size-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between py-2 border-b border-stone-100">
                <div className="max-w-[80%]">
                  <p className="font-medium text-sm text-[#0b2c25]">Recevoir des notifications par e-mail</p>
                  <p className="text-xs text-[#0b2c25]/65">Restez informé de vos réservations et nouveaux avis.</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleEmailNotifs}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                    emailNotifs ? 'bg-[#17664e]' : 'bg-stone-300'
                  }`}
                  aria-label="Toggle notifications email"
                >
                  <div
                    className={`size-5 rounded-full bg-white shadow-xs transition-transform ${
                      emailNotifs ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="max-w-[80%]">
                  <p className="font-medium text-sm text-[#0b2c25]">Recevoir des alertes de rappel</p>
                  <p className="text-xs text-[#0b2c25]/65">Rappel sur les dates de retrait de vos réservations.</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleReminderAlerts}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                    reminderAlerts ? 'bg-[#17664e]' : 'bg-stone-300'
                  }`}
                  aria-label="Toggle alertes de rappel"
                >
                  <div
                    className={`size-5 rounded-full bg-white shadow-xs transition-transform ${
                      reminderAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Colonne Droite (5 colonnes sur 12) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* CARTE 4 : Sécurité (1150:28206) */}
          <section
            className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 sm:p-7 shadow-xs"
            data-node-id="1150:28206"
          >
            <div className="flex items-center gap-3 mb-5">
              <img src={badgeSecurite} alt="" className="size-10" />
              <h2 className="font-semibold text-xl text-[#0b2c25]" data-node-id="1150:28207">
                Sécurité
              </h2>
            </div>

            <div className="flex flex-col gap-4">
              {/* Row Mot de passe (1150:28215) */}
              <div className="flex items-center justify-between py-2.5 border-b border-stone-100">
                <div className="flex items-start gap-3">
                  <img src={iconeSquareLock} alt="" className="size-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-[#0b2c25]" data-node-id="1150:28215">
                      Mot de passe
                    </p>
                    <p className="text-xs text-[#0b2c25]/70" data-node-id="1150:28216">
                      Dernière modification : il y a 3 mois
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="h-8 px-3.5 rounded-full border border-[#0b2c25] bg-white text-xs font-semibold text-[#0b2c25] flex items-center gap-1.5 hover:bg-stone-50 cursor-pointer shadow-xs active:scale-95 transition-all shrink-0"
                  data-node-id="1150:28217"
                >
                  <span>Modifier</span>
                  <img src={iconeEdit} alt="" className="size-3.5" />
                </button>
              </div>

              {/* Row Adresse e-mail (1150:28224) */}
              <div className="flex items-center justify-between py-2.5 border-b border-stone-100">
                <div className="flex items-start gap-3">
                  <img src={iconeMail} alt="" className="size-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-[#0b2c25]" data-node-id="1150:28224">
                      Adresse e-mail
                    </p>
                    <p className="text-xs text-[#17664e] font-semibold" data-node-id="1150:28225">
                      Vérifiée ✓
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(true)}
                  className="h-8 px-3.5 rounded-full border border-[#0b2c25] bg-white text-xs font-semibold text-[#0b2c25] flex items-center gap-1.5 hover:bg-stone-50 cursor-pointer shadow-xs active:scale-95 transition-all shrink-0"
                  data-node-id="1150:28226"
                >
                  <span>Modifier</span>
                  <img src={iconeEdit} alt="" className="size-3.5" />
                </button>
              </div>

              {/* Row Numéro de mobile (Telegram OTP 2-step) */}
              <div className="flex items-center justify-between py-2.5 border-b border-stone-100">
                <div className="flex items-start gap-3">
                  <img src={iconeSmartPhone} alt="" className="size-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-[#0b2c25]">
                      Numéro de mobile
                    </p>
                    <p className="text-xs text-[#17664e] font-semibold">
                      Sécurisé par Telegram · Vérifié ✓
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPhoneModalOpen(true)}
                  className="h-8 px-3.5 rounded-full border border-[#0b2c25] bg-white text-xs font-semibold text-[#0b2c25] flex items-center gap-1.5 hover:bg-stone-50 cursor-pointer shadow-xs active:scale-95 transition-all shrink-0"
                >
                  <span>Modifier</span>
                  <img src={iconeEdit} alt="" className="size-3.5" />
                </button>
              </div>

              {/* Row Sessions actives */}
              <div className="flex items-center justify-between py-2.5 border-b border-stone-100">
                <div className="flex items-start gap-3">
                  <img src={iconeSecurityCheck} alt="" className="size-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-[#0b2c25]">
                      Sessions actives
                    </p>
                    <p className="text-xs text-[#0b2c25]/70">
                      1 appareil connecté actuellement
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSessionsModalOpen(true)}
                  className="h-8 px-3.5 rounded-full border border-[#0b2c25] bg-white text-xs font-semibold text-[#0b2c25] flex items-center gap-1.5 hover:bg-stone-50 cursor-pointer shadow-xs active:scale-95 transition-all shrink-0"
                >
                  <span>Gérer</span>
                  <img src={iconeEdit} alt="" className="size-3.5" />
                </button>
              </div>

              {/* Row Mode de compte */}
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-start gap-3">
                  <img src={iconeUserCircle} alt="" className="size-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-[#0b2c25]">
                      Mode de compte
                    </p>
                    <p className="text-xs text-[#0b2c25]/70">
                      Commerçant actif · Passer en mode client
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModeModalOpen(true)}
                  className="h-8 px-3.5 rounded-full border border-[#0b2c25] bg-white text-xs font-semibold text-[#0b2c25] flex items-center gap-1.5 hover:bg-stone-50 cursor-pointer shadow-xs active:scale-95 transition-all shrink-0"
                >
                  <span>Changer ⇄</span>
                </button>
              </div>
            </div>
          </section>

          {/* CARTE 5 : Besoin d'aide ? (1150:28229) */}
          <section
            className="bg-[#eef7ec] border border-[#dbf0dd] rounded-[24px] p-6 sm:p-7 shadow-xs relative overflow-hidden min-h-[200px]"
            data-node-id="1150:28229"
          >
            <div className="relative z-10 max-w-[62%] sm:max-w-[65%]">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-9 rounded-full bg-white flex items-center justify-center p-2 shadow-2xs">
                  <img src={badgeAide} alt="" className="size-5" />
                </div>
                <h2 className="font-semibold text-xl text-[#0b2c25]" data-node-id="1150:28230">
                  Besoin d’aide ?
                </h2>
              </div>

              <p className="text-sm text-[#0b2c25]/80 mb-5 pl-1 leading-relaxed" data-node-id="1150:28232">
                Notre équipe est là pour vous aider.
              </p>

              <button
                type="button"
                onClick={handleSupport}
                className="bg-[#0b2c25] hover:bg-[#12443a] text-white rounded-xl px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                data-node-id="1150:28233"
              >
                <span>Contacter le support</span>
                <ArrowRight className="size-4" />
              </button>
            </div>

            {/* Illustration Support Client officielle Figma */}
            <img
              src={illustrationAide}
              alt="Assistance FORSA"
              className="absolute right-0 bottom-0 h-44 sm:h-48 object-contain pointer-events-none select-none"
            />
          </section>

          {/* Déconnexion Mobile (1187:22480) */}
          <div className="md:hidden pt-4">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-white border border-[#dbf0dd] text-[#b3261e] font-semibold py-3.5 rounded-2xl cursor-pointer hover:bg-red-50 transition-colors shadow-xs"
            >
              <LogOut className="size-5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals connectés au Backend */}
      <ChangeEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        currentEmail={profile.email}
        onSuccess={(newEmail) => setProfile((p) => ({ ...p, email: newEmail }))}
      />

      <ChangePhoneModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        currentPhone={profile.phone}
        onSuccess={(newPhone) => setProfile((p) => ({ ...p, phone: newPhone }))}
      />

      <SessionsModal
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
      />

      <PasswordRecoveryModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        email={profile.email}
      />

      <ModeSwitchModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
      />

      <EditCommerceModal
        isOpen={isCommerceModalOpen}
        onClose={() => setIsCommerceModalOpen(false)}
        initialData={{
          name: profile.shopName,
          category: profile.activityType,
          address: profile.address,
          openingHours: profile.openingHours,
        }}
        onSuccess={(updated) =>
          setProfile((p) => ({
            ...p,
            shopName: updated.name,
            activityType: updated.category,
            address: updated.address,
            openingHours: updated.openingHours,
          }))
        }
      />

      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        initialData={{
          fullName: profile.fullName,
          email: profile.email,
          phone: profile.phone,
          address: profile.city,
        }}
        onSuccess={(updated) =>
          setProfile((p) => ({
            ...p,
            fullName: updated.fullName,
            city: updated.address,
          }))
        }
      />
    </div>
  );
};
