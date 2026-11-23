import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import loginBg from '../../assets/login-bg.png';
import infoCircleIcon from '../../assets/icons/information-circle.svg';
import { logout } from './services/authService';

export const AccountSuspendedPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-4 py-8 sm:px-16 font-poppins selection:bg-forsa-leaf selection:text-white overflow-x-hidden">
      {/* Fond photo bokeh */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img src={loginBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FFFAF0]/28" />
      </div>

      {/* En-tête */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-4">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
      </header>

      {/* Carte Suspension */}
      <main className="relative z-10 w-full max-w-[500px] backdrop-blur-[20px] bg-white/40 border-[1.2px] border-white/70 rounded-[32px] p-6 sm:p-10 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col items-center text-center gap-6 my-auto">
        <div className="w-20 h-20 rounded-full bg-[#D96B43]/15 border border-[#D96B43]/30 flex items-center justify-center shadow-md">
          <img src={infoCircleIcon} alt="Avertissement" className="w-10 h-10 text-[#D96B43]" />
        </div>

        <div className="flex flex-col gap-2">
          <span className="inline-block mx-auto text-xs font-semibold px-3 py-1 rounded-full bg-[#D96B43]/15 text-[#8C3A1A] border border-[#D96B43]/30">
            Sécurité du réseau FORSA
          </span>
          <h1 className="font-semibold text-[#0B2C25] text-2xl sm:text-[30px] leading-tight">
            Compte suspendu
          </h1>
          <p className="text-[14px] text-[#0B2C25]/75 leading-relaxed">
            Votre compte a été suspendu par notre équipe de modération en raison de signalements répétés ou d'une non-conformité avec les conditions d'utilisation de la plateforme.
          </p>
        </div>

        <div className="w-full bg-white/60 border border-[#0B2C25]/10 rounded-2xl p-4 text-left flex flex-col gap-1.5 text-xs text-[#0B2C25]/70">
          <p>Pour toute réclamation ou demande de réexamen de votre dossier :</p>
          <a
            href="mailto:support@forsa-dz.com"
            className="font-medium text-[#17664E] hover:underline"
          >
            ✉ support@forsa-dz.com
          </a>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <a
            href="mailto:support@forsa-dz.com?subject=Demande de recours compte suspendu"
            className="w-full h-[50px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[15px] rounded-[16px] flex items-center justify-center gap-2 transition shadow-md"
          >
            <span>Contacter l'assistance</span>
          </a>

          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-medium text-[#0B2C25]/60 hover:text-[#0B2C25] hover:underline"
          >
            Retour à la connexion
          </button>
        </div>
      </main>

      <div className="relative z-10 w-full max-w-6xl h-8" />
    </div>
  );
};
