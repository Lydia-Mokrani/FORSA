import React from 'react';
import { Link } from 'react-router-dom';
import clockIcon from '../../assets/icons/illustration-clock-pending.svg';
import checkmarkIcon from '../../assets/icons/checkmark-circle-02.svg';

export const MerchantPendingPage: React.FC = () => {
  return (
    <div className="flex-1 bg-[#fffaf0] min-h-screen p-4 sm:p-8 font-poppins selection:bg-[#17664e] selection:text-white">
      {/* Fil d'Ariane & Titre */}
      <div className="mb-6">
        <p className="text-xs text-[rgba(11,44,37,0.7)] font-medium mb-1">
          Mon espace / Ajouter une offre
        </p>
        <h1 className="text-3xl sm:text-[40px] font-bold text-[#0b2c25] tracking-tight">
          Ajouter une offre
        </h1>
        <p className="text-sm sm:text-base text-[rgba(11,44,37,0.7)] mt-1">
          Votre compte doit être validé avant de publier
        </p>
      </div>

      {/* Carte centrale 3B (Figma 1150:28278) */}
      <div className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 sm:p-12 shadow-sm flex flex-col items-center text-center max-w-4xl mx-auto my-6">
        {/* Pastille en attente */}
        <div className="size-24 rounded-full bg-[#fbe7bf] flex items-center justify-center mb-6">
          <img src={clockIcon} alt="" className="size-12" />
        </div>

        <h2 className="text-2xl sm:text-[28px] font-bold text-[#0b2c25] leading-tight mb-2">
          Votre compte est en cours de vérification
        </h2>

        <p className="text-sm sm:text-[15px] text-[rgba(11,44,37,0.65)] max-w-2xl leading-relaxed mb-10">
          Vous pourrez publier des offres dès que l’équipe FORSA aura validé vos documents. Délai habituel : 48 h. Vous serez prévenu par e-mail.
        </p>

        {/* Timeline 3 étapes (Figma 1150:28283 - 28290) */}
        <div className="w-full max-w-xl flex items-center justify-between relative mb-12 px-4">
          {/* Ligne 1-2 */}
          <div className="absolute left-[20%] right-[50%] top-6 h-0.5 bg-[#17664e]" />
          {/* Ligne 2-3 */}
          <div className="absolute left-[50%] right-[20%] top-6 h-0.5 bg-[rgba(11,44,37,0.2)]" />

          {/* Étape 1 : Soumis */}
          <div className="flex flex-col items-center gap-2 relative z-10">
            <div className="size-12 rounded-full bg-[#17664e] text-white flex items-center justify-center shadow-sm">
              <img src={checkmarkIcon} alt="" className="size-6" />
            </div>
            <span className="text-xs font-semibold text-[#0b2c25]">Documents soumis</span>
          </div>

          {/* Étape 2 : Vérification */}
          <div className="flex flex-col items-center gap-2 relative z-10">
            <div className="size-12 rounded-full bg-[#fbe7bf] border-2 border-[#17664e] text-[#0b2c25] flex items-center justify-center shadow-sm">
              <img src={clockIcon} alt="" className="size-6" />
            </div>
            <span className="text-xs font-semibold text-[#17664e]">Vérification en cours</span>
          </div>

          {/* Étape 3 : Compte activé */}
          <div className="flex flex-col items-center gap-2 relative z-10">
            <div className="size-12 rounded-full bg-[#fffaf0] border border-[rgba(11,44,37,0.2)] text-[rgba(11,44,37,0.35)] font-semibold text-lg flex items-center justify-center">
              3
            </div>
            <span className="text-xs font-medium text-[rgba(11,44,37,0.5)]">Compte activé</span>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-wrap gap-4 justify-center items-center">
          <Link
            to="/merchant/documents"
            className="bg-white border-[1.5px] border-[#0b2c25] hover:bg-stone-50 text-[#0b2c25] font-semibold text-base sm:text-[18px] px-6 py-3 rounded-[14px] transition cursor-pointer"
          >
            Voir mes documents
          </Link>

          <Link
            to="/merchant/dashboard"
            className="bg-[#0b2c25] hover:bg-[#17664e] text-white font-semibold text-base sm:text-[18px] px-6 py-3 rounded-[14px] transition shadow-sm"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
};
