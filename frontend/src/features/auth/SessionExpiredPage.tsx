import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const SessionExpiredPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleReconnect = () => {
    // Garder en mémoire la page d'origine pour rediriger après connexion
    const returnUrl = (location.state as { from?: string })?.from || '/';
    navigate('/login', { state: { from: returnUrl } });
  };

  return (
    <div
      className="min-h-screen bg-[#dce1d0] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative selection:bg-[#17664e] selection:text-white"
      data-node-id="1179:20947"
      data-name="Desktop · Session expirée"
    >
      {/* En-tête */}
      <header
        className="w-full max-w-6xl flex items-center justify-between py-6 px-4 sm:px-8 absolute top-0 left-0 right-0 mx-auto"
        data-node-id="1179:20949"
        data-name="En-tête"
      >
        <span
          onClick={() => navigate('/')}
          className="font-extrabold text-[#0b2c25] text-2xl tracking-tight cursor-pointer"
          data-node-id="1179:20950"
          data-name="Logo"
        >
          FORSA
        </span>
        <span
          className="hidden sm:inline font-medium text-sm text-[#0b2c25]/85"
          data-node-id="1179:20951"
          data-name="Slogan"
        >
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* Carte */}
      <main
        className="backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 p-6 sm:p-12 rounded-[28px] sm:rounded-[32px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] w-full max-w-[520px] flex flex-col items-center gap-5 sm:gap-6 text-center my-auto"
        data-node-id="1179:20952"
        data-name="Carte"
      >
        {/* Illustration */}
        <div
          className="w-full flex items-center justify-center"
          data-node-id="1179:20953"
          data-name="Illustration"
        >
          <div
            className="size-20 sm:size-24 rounded-full bg-[#fbe7bf] flex items-center justify-center shrink-0"
            data-node-id="1179:20954"
            data-name="Pastille"
          >
            <svg
              className="size-10 sm:size-12 text-[#8a5a00]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              data-node-id="1179:20955"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" stroke="#8a5a00" />
              <polyline points="12 6 12 12 16 14" stroke="#8a5a00" />
            </svg>
          </div>
        </div>

        {/* Titre et Sous-titre */}
        <div
          className="flex flex-col gap-2 items-center"
          data-node-id="1179:20956"
          data-name="Titre"
        >
          <h1
            className="font-semibold text-[#0b2c25] text-2xl sm:text-[34px] leading-tight"
            data-node-id="1179:20957"
          >
            Session expirée
          </h1>
          <p
            className="text-[14px] sm:text-[15px] text-[#0b2c25]/65 leading-relaxed max-w-[420px]"
            data-node-id="1179:20958"
          >
            Pour votre sécurité, vous avez été déconnecté après une période d’inactivité. Reconnectez-vous pour continuer.
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="w-full flex flex-col gap-3 sm:gap-4 mt-2">
          <button
            type="button"
            onClick={handleReconnect}
            className="bg-[#0b2c25] hover:bg-[#12443a] active:scale-[0.99] text-white font-medium text-base sm:text-[17px] h-14 rounded-2xl w-full flex items-center justify-center transition-all cursor-pointer shadow-sm"
            data-node-id="1179:20959"
            data-name="Bouton/Principal"
          >
            Se reconnecter
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="bg-white/30 hover:bg-white/50 active:scale-[0.99] border-[1.2px] border-[#0b2c25]/50 text-[#0b2c25] font-medium text-base sm:text-[17px] h-14 rounded-2xl w-full flex items-center justify-center transition-all cursor-pointer"
            data-node-id="1179:20960"
            data-name="Bouton/Secondaire"
          >
            Retour à l’accueil
          </button>
        </div>
      </main>
    </div>
  );
};
