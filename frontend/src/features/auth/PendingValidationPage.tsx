import React from 'react';
import { Link } from 'react-router-dom';
import arrowRightIcon from '../../assets/icons/arrow-right.svg';
import clockIcon from '../../assets/icons/illustration-clock-pending.svg';
import infoIcon from '../../assets/icons/information-circle.svg';

export const PendingValidationPage: React.FC = () => {
  return (
    <div className="bg-gradient-to-b from-[#dce1d0] from-[10.156%] via-[#f3e7c6] via-[66.797%] to-[#787b72] to-[106.64%] flex flex-col items-center justify-center min-h-screen pb-[66px] pt-[96px] px-[16px] sm:px-[64px] relative size-full font-poppins selection:bg-[#17664e] selection:text-white">
      {/* En-tête Figma 1030:23832 */}
      <header className="absolute flex h-[32px] items-center justify-between left-[20px] sm:left-[64px] top-[24px] sm:top-[32px] right-[20px] sm:right-[64px] overflow-clip">
        <Link to="/" className="font-extrabold text-[#0b2c25] text-[20px] sm:text-[24px] tracking-tight">
          FORSA
        </Link>
        <span className="hidden sm:inline font-medium text-[14px] text-[rgba(11,44,37,0.85)]">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 12 · Demande envoyée — en attente de validation · Carte Figma 1030:23835 */}
      <main className="backdrop-blur-[20px] bg-[rgba(255,255,255,0.34)] border-[1.2px] border-[rgba(255,255,255,0.7)] flex flex-col gap-[22px] items-start p-[28px] sm:p-[48px] rounded-[32px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] w-full max-w-[520px]">
        {/* Illustration pastille */}
        <div className="flex items-start justify-center w-full">
          <div className="bg-[#fbe7bf] flex items-center justify-center rounded-[48px] size-[80px] sm:size-[96px]">
            <img src={clockIcon} alt="" className="size-[40px] sm:size-[48px]" />
          </div>
        </div>

        {/* Titre & Description */}
        <div className="flex flex-col gap-[8px] items-center text-center w-full">
          <h1 className="font-semibold text-[#0b2c25] text-[26px] sm:text-[34px] leading-tight">
            Demande envoyée !
          </h1>
          <p className="font-normal text-[14px] sm:text-[15px] text-[rgba(11,44,37,0.65)] leading-relaxed">
            Nous vérifions vos documents (délai habituel : 48 h). Vous pourrez publier des offres dès l’approbation de votre compte.
          </p>
        </div>

        {/* Bloc information e-mail Figma 1030:23842 */}
        <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.8)] flex gap-[10px] items-center px-[14px] py-[12px] rounded-[14px] w-full">
          <img src={infoIcon} alt="" className="size-[20px] shrink-0" />
          <p className="font-normal text-[13px] text-[rgba(11,44,37,0.75)] leading-normal">
            Confirmez aussi votre adresse e-mail : sans e-mail vérifié, vous ne pouvez pas publier d’offre.
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col gap-3 w-full">
          <Link
            to="/verify-email"
            className="bg-[#0b2c25] hover:bg-[#17664e] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-white font-medium text-[16px] sm:text-[17px] transition shadow-sm"
          >
            <span>Vérifier mon e-mail</span>
            <img src={arrowRightIcon} alt="" className="size-[20px]" />
          </Link>

          <Link
            to="/"
            className="bg-[rgba(255,255,255,0.3)] hover:bg-white/50 border-[1.2px] border-[rgba(11,44,37,0.5)] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-[#0b2c25] font-medium text-[16px] sm:text-[17px] transition"
          >
            Retour à l’accueil
          </Link>
        </div>
      </main>
    </div>
  );
};
