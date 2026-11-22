import React from 'react';
import { Link } from 'react-router-dom';
import loginBg from '../../assets/login-bg.png';
import arrowRightIcon from '../../assets/icons/arrow-right.svg';

export const WelcomePage: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-4 py-8 sm:px-16 font-poppins selection:bg-forsa-leaf selection:text-white overflow-x-hidden">
      {/* Fond photo officiel Figma (Image bokeh feuille verte + overlay #FFFAF0 à 28%) */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img src={loginBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FFFAF0]/28" />
      </div>

      {/* En-tête Figma 1030:23456 */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-4">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-[14px] font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 01 · Accueil · Carte centrale Figma 1030:23459 */}
      <main className="relative z-10 backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[36px] px-6 sm:px-[72px] py-10 sm:py-[56px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] flex flex-col gap-4 items-center text-center my-auto max-w-[680px] w-full">
        <h1 className="font-extrabold text-[#0B2C25] text-5xl sm:text-[72px] tracking-tight leading-none">
          FORSA
        </h1>

        <p className="font-semibold text-[#0B2C25] text-2xl sm:text-[30px] leading-tight">
          Donnons une 2ᵉ vie à vos invendus
        </p>

        <div className="font-normal text-[#0B2C25]/65 text-base sm:text-[18px] leading-relaxed">
          <p className="m-0">Moins de gaspillage, plus de bonnes affaires,</p>
          <p className="m-0">tout près de chez vous</p>
        </div>

        <div className="h-4 sm:h-6" />

        <Link
          to="/role-select"
          className="bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[17px] rounded-[16px] h-[56px] w-full sm:w-[240px] flex items-center justify-center gap-2.5 transition shadow-md active:scale-[0.99]"
        >
          <span>C’est parti</span>
          <img src={arrowRightIcon} alt="" className="w-5 h-5 shrink-0" />
        </Link>
      </main>

      {/* Spacer pour l'alignement vertical exact */}
      <div className="relative z-10 w-full max-w-6xl h-8" />
    </div>
  );
};
