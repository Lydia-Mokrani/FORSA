import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const WelcomePage: React.FC = () => {
  return (
    <div className="bg-gradient-to-b from-[#dce1d0] from-[10.156%] via-[#f3e7c6] via-[66.797%] to-[#787b72] to-[106.64%] flex flex-col items-center justify-center min-h-screen pb-[54px] sm:pb-[66px] pt-[84px] sm:pt-[96px] px-[16px] sm:px-[64px] relative size-full font-poppins selection:bg-[#17664e] selection:text-white overflow-x-hidden">
      {/* En-tête Figma 1030:23456 / 1030:23578 */}
      <header className="absolute flex h-[32px] items-center justify-between left-[20px] sm:left-[64px] top-[24px] sm:top-[32px] right-[20px] sm:right-[64px] overflow-clip">
        <Link to="/" className="font-extrabold text-[#0b2c25] text-[20px] sm:text-[24px] tracking-tight hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline font-medium text-[14px] text-[rgba(11,44,37,0.85)]">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 01 · Accueil · Carte centrale Figma 1030:23459 (Desktop) & 1030:23580 (Mobile) */}
      <main className="backdrop-blur-[20px] bg-[rgba(255,255,255,0.34)] border-[1.2px] border-[rgba(255,255,255,0.7)] border-solid rounded-[32px] sm:rounded-[36px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] px-[24px] sm:px-[72px] py-[48px] sm:py-[56px] flex flex-col gap-[16px] items-center text-center my-auto max-w-[680px] w-full">
        <h1 className="font-extrabold text-[#0b2c25] text-[56px] sm:text-[72px] tracking-tight leading-none">
          FORSA
        </h1>

        <p className="font-semibold text-[#0b2c25] text-[22px] sm:text-[30px] leading-tight max-w-[540px]">
          Donnons une 2ᵉ vie à vos invendus
        </p>

        <div className="font-normal text-[rgba(11,44,37,0.65)] text-[15px] sm:text-[18px] leading-relaxed max-w-[540px]">
          <p className="m-0">Moins de gaspillage, plus de bonnes affaires,</p>
          <p className="m-0">tout près de chez vous</p>
        </div>

        <div className="h-4 sm:h-6" />

        <Link
          to="/role-select"
          className="bg-[#0b2c25] hover:bg-[#17664e] text-white font-medium text-[17px] rounded-[16px] h-[56px] w-full sm:w-[240px] flex gap-[10px] items-center justify-center transition shadow-sm active:scale-[0.99]"
        >
          <span>C’est parti</span>
          <ArrowRight className="size-5 text-white stroke-[2.2] shrink-0" />
        </Link>
      </main>

      <div className="relative z-10 w-full max-w-6xl h-8" />
    </div>
  );
};
