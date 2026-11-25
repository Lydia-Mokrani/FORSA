import React from 'react';
import { Link } from 'react-router-dom';
import arrowRightIcon from '../../assets/icons/arrow-right.svg';

export const WelcomePage: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full bg-ui-auth-bg flex flex-col items-center justify-between px-4 py-8 sm:px-16 font-poppins selection:bg-ui-emerald selection:text-white overflow-x-hidden">
      {/* En-tête Figma 1030:23456 */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-4">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-ui-ink hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-[14px] font-medium text-ui-text-80">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 01 · Accueil · Carte centrale Figma 1030:23459 [DECISION HYB: Fond uni #dce1d0] */}
      <main className="relative z-10 bg-white border-[1.5px] border-ui-card-border rounded-[32px] px-6 sm:px-[72px] py-10 sm:py-[56px] shadow-[0px_16px_40px_rgba(11,44,37,0.08)] flex flex-col gap-4 items-center text-center my-auto max-w-[680px] w-full">
        <h1 className="font-extrabold text-ui-ink text-5xl sm:text-[72px] tracking-tight leading-none">
          FORSA
        </h1>

        <p className="font-semibold text-ui-ink text-2xl sm:text-[30px] leading-tight">
          Donnons une 2ᵉ vie à vos invendus
        </p>

        <div className="font-normal text-ui-text-70 text-base sm:text-[18px] leading-relaxed">
          <p className="m-0">Moins de gaspillage, plus de bonnes affaires,</p>
          <p className="m-0">tout près de chez vous</p>
        </div>

        <div className="h-4 sm:h-6" />

        <Link
          to="/role-select"
          className="bg-ui-ink hover:bg-ui-emerald text-white font-medium text-[16px] rounded-ui-ctl h-[52px] w-full sm:w-[240px] flex items-center justify-center gap-2.5 transition shadow-sm active:scale-[0.99]"
        >
          <span>C’est parti</span>
          <img src={arrowRightIcon} alt="" className="w-5 h-5 shrink-0" />
        </Link>
      </main>

      <div className="relative z-10 w-full max-w-6xl h-8" />
    </div>
  );
};
