import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Banner,
  Button,
  Chip,
  Icon,
} from '../../components/ui';
import { logout } from './services/authService';

export const AccountSuspendedPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="bg-gradient-to-b from-[#dce1d0] from-[10.156%] via-[#f3e7c6] via-[66.797%] to-[#787b72] to-[106.64%] flex flex-col items-center justify-center min-h-screen pb-[54px] sm:pb-[66px] pt-[84px] sm:pt-[96px] px-[16px] sm:px-[64px] relative size-full font-poppins selection:bg-[#17664e] selection:text-white overflow-x-hidden">
      {/* En-tête */}
      <header className="absolute flex h-[32px] items-center justify-between left-[20px] sm:left-[64px] top-[24px] sm:top-[32px] right-[20px] sm:right-[64px] overflow-clip">
        <Link
          to="/"
          className="font-extrabold text-[#0b2c25] text-[20px] sm:text-[24px] tracking-tight hover:opacity-90 transition"
        >
          FORSA
        </Link>
        <span className="hidden sm:inline font-medium text-[14px] text-[rgba(11,44,37,0.85)]">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* Carte Verre Miroir Suspension */}
      <main className="backdrop-blur-[20px] bg-[rgba(255,255,255,0.34)] border-[1.2px] border-[rgba(255,255,255,0.7)] border-solid rounded-[32px] p-[24px] sm:p-[48px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] flex flex-col gap-[20px] sm:gap-[22px] items-center text-center my-auto max-w-[520px] w-full">
        <div className="size-20 rounded-full bg-[rgba(253,236,234,0.9)] border border-[#b22222]/30 flex items-center justify-center text-[#b22222] shadow-sm">
          <Icon name="alert-warn" size={36} />
        </div>

        <div className="flex flex-col gap-[8px] items-center text-center w-full">
          <span className="bg-[rgba(253,236,234,0.9)] border border-[#b22222]/30 text-[#b22222] text-xs font-semibold px-3 py-1 rounded-full">
            Sécurité du réseau FORSA
          </span>
          <h1 className="font-semibold text-[#0b2c25] text-[26px] sm:text-[34px] leading-tight">
            Compte suspendu
          </h1>
          <p className="font-normal text-[14px] sm:text-[15px] text-[rgba(11,44,37,0.65)] leading-relaxed max-w-sm mx-auto">
            Votre compte a été suspendu par notre équipe de modération en raison de signalements
            répétés ou d'une non-conformité avec les conditions d'utilisation de la plateforme.
          </p>
        </div>

        <div className="w-full text-left bg-[rgba(255,255,255,0.55)] border border-[rgba(11,44,37,0.18)] rounded-[14px] p-3.5 text-[13px] text-[rgba(11,44,37,0.8)]">
          <strong className="block text-[#0b2c25] font-semibold mb-1">Procédure de réexamen</strong>
          Pour toute réclamation ou demande de réexamen de votre dossier, transmettez vos justificatifs à l'adresse support@forsa-dz.com.
        </div>

        <div className="flex flex-col gap-3 w-full pt-1">
          <a
            href="mailto:support@forsa-dz.com?subject=Demande de recours compte suspendu"
            className="bg-[#0b2c25] hover:bg-[#17664e] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-white font-medium text-[16px] sm:text-[17px] transition shadow-sm"
          >
            Contacter l'assistance FORSA
          </a>

          <button
            type="button"
            onClick={handleLogout}
            className="bg-[rgba(255,255,255,0.3)] hover:bg-white/50 border-[1.2px] border-[rgba(11,44,37,0.5)] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-[#0b2c25] font-medium text-[16px] sm:text-[17px] transition cursor-pointer"
          >
            Retour à la connexion
          </button>
        </div>
      </main>

      <div className="relative z-10 w-full max-w-4xl h-8" />
    </div>
  );
};
