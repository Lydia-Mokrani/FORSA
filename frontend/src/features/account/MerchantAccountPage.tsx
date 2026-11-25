import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Mail,
  Phone,
  MapPin,
  Building,
  Store,
  Sliders,
  Shield,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  LogOut,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { logout } from '../auth/services/authService';

export const MerchantAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [reminderAlerts, setReminderAlerts] = useState(true);

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
      className="max-w-6xl mx-auto pb-16 font-poppins text-[#0B2C25]"
      data-node-id="1150:28079"
      data-name="Desktop · MS1 — Mon compte commerçant"
    >
      {/* Mobile Top Header (1187:22480) */}
      <div className="md:hidden flex items-center justify-between py-4 mb-4 border-b border-[#dbf0dd]">
        <button
          type="button"
          onClick={() => navigate('/merchant/dashboard')}
          className="size-10 rounded-full bg-white border border-[#dbf0dd] flex items-center justify-center text-[#0b2c25] hover:bg-stone-50 cursor-pointer"
          data-node-id="1187:22483"
          aria-label="Retour"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-semibold text-lg text-[#0B2C25]">Mon compte</h1>
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="size-10 rounded-full bg-white border border-[#dbf0dd] flex items-center justify-center text-[#0b2c25] hover:bg-stone-50 cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
        </button>
      </div>

      {/* Desktop En-tête (1150:28120) */}
      <header className="hidden md:flex items-start justify-between mb-8" data-node-id="1150:28120">
        <div>
          <p className="text-[11px] text-[#0b2c25] uppercase tracking-wider mb-1" data-node-id="1171:20916">
            Mon espace / Mon compte
          </p>
          <h1 className="font-semibold text-[44px] text-[#0b2c25] leading-tight" data-node-id="1150:28122">
            Mon compte
          </h1>
          <p className="text-lg text-[#0b2c25]/80 mt-1" data-node-id="1150:28123">
            Gérez vos informations et vos préférences
          </p>
        </div>

        <div className="flex items-center gap-4" data-node-id="1150:28124">
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="size-11 rounded-full bg-white border border-[#dbf0dd] flex items-center justify-center text-[#0b2c25] hover:bg-stone-50 cursor-pointer transition-colors shadow-xs"
            aria-label="Notifications"
            data-node-id="1150:28125"
          >
            <Bell className="size-5" />
          </button>
          <div
            className="size-12 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#17664e] font-semibold text-base shadow-xs"
            data-node-id="1171:20892"
            title="Maison Gourmande"
          >
            MG
          </div>
        </div>
      </header>

      {/* Grille des Cartes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Colonne Gauche (7 cols desktop) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* CARTE 1 : Informations du profil (1150:28128) */}
          <section
            className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 sm:p-7 shadow-xs relative"
            data-node-id="1150:28128"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#17664e]">
                  <Building className="size-5" />
                </div>
                <h2 className="font-medium text-xl text-[#0b2c25]" data-node-id="1150:28129">
                  Informations du profil
                </h2>
              </div>

              <button
                type="button"
                onClick={() => navigate('/merchant/account/edit-profile')}
                className="bg-white/80 hover:bg-stone-50 active:scale-95 border border-[#0b2c25]/60 text-[#0b2c25] rounded-full px-4 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                data-node-id="1150:28151"
              >
                <span>Modifier</span>
                <ArrowRight className="size-3" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pt-2">
              {/* Logo boutique */}
              <div
                className="size-24 sm:size-28 rounded-2xl bg-gradient-to-br from-[#eef7ec] to-[#dbf0dd] flex items-center justify-center text-[#17664e] font-bold text-3xl shadow-inner shrink-0"
                data-node-id="1150:28132"
              >
                MG
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <h3 className="font-medium text-2xl text-[#0b2c25]" data-node-id="1150:28135">
                    Maison Gourmande
                  </h3>
                  <span
                    className="inline-flex items-center justify-center gap-1 bg-[#eef7ec] text-[#17664e] border border-[#dbf0dd] rounded-full px-2.5 py-0.5 text-xs font-medium w-fit mx-auto sm:mx-0"
                    data-node-id="1150:28137"
                  >
                    <CheckCircle2 className="size-3.5 text-[#17664e]" />
                    Commerçant vérifié
                  </span>
                </div>

                <div className="flex flex-col gap-2 text-sm text-[#0b2c25]/85 mt-3" data-node-id="1150:28141">
                  <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                    <Mail className="size-4 text-[#17664e] shrink-0" />
                    <span>maison.gourmande@forsa.dz</span>
                  </div>
                  <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                    <Phone className="size-4 text-[#17664e] shrink-0" />
                    <span>+213 555 12 34 56</span>
                  </div>
                  <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                    <MapPin className="size-4 text-[#17664e] shrink-0" />
                    <span>Boumerdès, Algérie</span>
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
                <div className="size-10 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#17664e]">
                  <Store className="size-5" />
                </div>
                <h2 className="font-medium text-xl text-[#0b2c25]" data-node-id="1150:28155">
                  Informations du commerce
                </h2>
              </div>

              <button
                type="button"
                onClick={() => navigate('/merchant/shop')}
                className="bg-white/80 hover:bg-stone-50 active:scale-95 border border-[#0b2c25]/60 text-[#0b2c25] rounded-full px-4 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                data-node-id="1150:28158"
              >
                <span>Modifier</span>
                <ArrowRight className="size-3" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-sm" data-node-id="1150:28161">
              <div className="flex flex-col sm:flex-row sm:items-center py-1.5 border-b border-stone-100">
                <span className="font-medium text-[#0b2c25] w-48 text-[15px]">Nom du commerce :</span>
                <span className="text-[#0b2c25]/85">Maison Gourmande</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center py-1.5 border-b border-stone-100">
                <span className="font-medium text-[#0b2c25] w-48 text-[15px]">Type d’activité :</span>
                <span className="text-[#0b2c25]/85">Boulangerie – Pâtisserie</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center py-1.5 border-b border-stone-100">
                <span className="font-medium text-[#0b2c25] w-48 text-[15px]">Adresse :</span>
                <span className="text-[#0b2c25]/85">12 Rue des Fleurs, Boumerdès</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center py-1.5">
                <span className="font-medium text-[#0b2c25] w-48 text-[15px]">Horaire :</span>
                <span className="text-[#0b2c25]/85">8h00 – 20h00</span>
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
                <div className="size-10 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#17664e]">
                  <Sliders className="size-5" />
                </div>
                <h2 className="font-medium text-xl text-[#0b2c25]" data-node-id="1150:28168">
                  Préférences &amp; Notifications
                </h2>
              </div>

              <button
                type="button"
                onClick={() => navigate('/merchant/account/preferences')}
                className="bg-white/80 hover:bg-stone-50 active:scale-95 border border-[#0b2c25]/60 text-[#0b2c25] rounded-full px-4 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                data-node-id="1150:28171"
              >
                <span>Modifier</span>
                <ArrowRight className="size-3" />
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
                  onClick={() => setEmailNotifs(!emailNotifs)}
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
                  onClick={() => setReminderAlerts(!reminderAlerts)}
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

        {/* Colonne Droite (5 cols desktop) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* CARTE 4 : Sécurité (1150:28206) */}
          <section
            className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 sm:p-7 shadow-xs"
            data-node-id="1150:28206"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="size-10 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#17664e]">
                <Shield className="size-5" />
              </div>
              <h2 className="font-medium text-xl text-[#0b2c25]" data-node-id="1150:28207">
                Sécurité
              </h2>
            </div>

            <div className="flex flex-col gap-4">
              {/* Row Mot de passe */}
              <div className="flex items-center justify-between py-2.5 border-b border-stone-100">
                <div className="flex items-start gap-3">
                  <Lock className="size-4 text-[#17664e] mt-1 shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-[#0b2c25]" data-node-id="1150:28215">
                      Mot de passe
                    </p>
                    <p className="text-xs text-[#0b2c25]/70" data-node-id="1150:28216">
                      Authentification sans mot de passe (Telegram OTP)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="bg-white/80 hover:bg-stone-50 active:scale-95 border border-[#0b2c25]/60 text-[#0b2c25] rounded-full px-3.5 py-1 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                  data-node-id="1150:28217"
                >
                  <span>Gérer</span>
                  <ArrowRight className="size-3" />
                </button>
              </div>

              {/* Row Adresse e-mail */}
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-start gap-3">
                  <Mail className="size-4 text-[#17664e] mt-1 shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-[#0b2c25]" data-node-id="1150:28224">
                      Adresse e-mail
                    </p>
                    <p className="text-xs text-[#17664e] font-medium" data-node-id="1150:28225">
                      Vérifiée
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/merchant/account/change-email')}
                  className="bg-white/80 hover:bg-stone-50 active:scale-95 border border-[#0b2c25]/60 text-[#0b2c25] rounded-full px-3.5 py-1 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                  data-node-id="1150:28226"
                >
                  <span>Modifier</span>
                  <ArrowRight className="size-3" />
                </button>
              </div>
            </div>
          </section>

          {/* CARTE 5 : Besoin d'aide ? (1150:28229) */}
          <section
            className="bg-[#eef7ec] border border-[#dbf0dd] rounded-[24px] p-6 sm:p-7 shadow-xs relative overflow-hidden"
            data-node-id="1150:28229"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="size-9 rounded-full bg-white/70 flex items-center justify-center text-[#17664e]">
                <HelpCircle className="size-5" />
              </div>
              <h2 className="font-medium text-xl text-[#0b2c25]" data-node-id="1150:28230">
                Besoin d’aide ?
              </h2>
            </div>

            <p className="text-sm text-[#0b2c25]/80 mb-5 pl-1" data-node-id="1150:28232">
              Notre équipe est là pour vous aider à chaque étape.
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
          </section>

          {/* Déconnexion Mobile (1187:22480 bottom button) */}
          <div className="md:hidden pt-4">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-white border border-[#dbf0dd] text-[#b3261e] font-semibold py-3.5 rounded-2xl cursor-pointer hover:bg-red-50 transition-colors"
            >
              <LogOut className="size-5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
