import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const AccessDeniedPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSupportClick = () => {
    window.location.href = 'mailto:support@forsa.dz?subject=FORSA%20-%20Acc%C3%A8s%20refus%C3%A9';
  };

  return (
    <div
      className="min-h-screen bg-[#dce1d0] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative selection:bg-[#17664e] selection:text-white"
      data-node-id="1179:20925"
      data-name="Desktop · Accès refusé"
    >
      {/* En-tête */}
      <header
        className="w-full max-w-6xl flex items-center justify-between py-6 px-4 sm:px-8 absolute top-0 left-0 right-0 mx-auto"
        data-node-id="1179:20927"
        data-name="En-tête"
      >
        <span
          onClick={() => navigate('/')}
          className="font-extrabold text-[#0b2c25] text-2xl tracking-tight cursor-pointer"
          data-node-id="1179:20928"
          data-name="Logo"
        >
          FORSA
        </span>
        <span
          className="hidden sm:inline font-medium text-sm text-[#0b2c25]/85"
          data-node-id="1179:20929"
          data-name="Slogan"
        >
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* Carte */}
      <main
        className="backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 p-6 sm:p-12 rounded-[28px] sm:rounded-[32px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] w-full max-w-[520px] flex flex-col items-center gap-5 sm:gap-6 text-center my-auto"
        data-node-id="1179:20930"
        data-name="Carte"
      >
        {/* Illustration */}
        <div
          className="w-full flex items-center justify-center"
          data-node-id="1179:20931"
          data-name="Illustration"
        >
          <div
            className="size-20 sm:size-24 rounded-full bg-[rgba(178,34,34,0.12)] flex items-center justify-center shrink-0"
            data-node-id="1179:20932"
            data-name="Pastille"
          >
            <svg
              className="size-10 sm:size-12 text-[#b3261e]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              data-node-id="1179:20933"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" stroke="#b3261e" />
              <polyline points="12 6 12 12 16 14" stroke="#b3261e" />
            </svg>
          </div>
        </div>

        {/* Titre et Sous-titre */}
        <div
          className="flex flex-col gap-2 items-center"
          data-node-id="1179:20934"
          data-name="Titre"
        >
          <h1
            className="font-semibold text-[#0b2c25] text-2xl sm:text-[34px] leading-tight"
            data-node-id="1179:20935"
          >
            Accès refusé
          </h1>
          <p
            className="text-[14px] sm:text-[15px] text-[#0b2c25]/65 leading-relaxed max-w-[420px]"
            data-node-id="1179:20936"
          >
            Vous n’avez pas l’autorisation d’accéder à cette page. Si vous pensez qu’il s’agit d’une erreur, contactez l’équipe FORSA.
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="w-full flex flex-col gap-3 sm:gap-4 mt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="bg-[#0b2c25] hover:bg-[#12443a] active:scale-[0.99] text-white font-medium text-base sm:text-[17px] h-14 rounded-2xl w-full flex items-center justify-center transition-all cursor-pointer shadow-sm"
            data-node-id="1179:20937"
            data-name="Bouton/Principal"
          >
            Retour à l’accueil
          </button>

          <button
            type="button"
            onClick={handleSupportClick}
            className="bg-white/30 hover:bg-white/50 active:scale-[0.99] border-[1.2px] border-[#0b2c25]/50 text-[#0b2c25] font-medium text-base sm:text-[17px] h-14 rounded-2xl w-full flex items-center justify-center transition-all cursor-pointer"
            data-node-id="1179:20938"
            data-name="Bouton/Secondaire"
          >
            Contacter le support
          </button>
        </div>
      </main>
    </div>
  );
};
