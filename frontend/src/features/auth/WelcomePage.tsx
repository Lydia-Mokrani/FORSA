import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import loginBg from '../../assets/login-bg.png';

export const WelcomePage: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-6 py-8 sm:px-16 font-poppins selection:bg-forsa-leaf selection:text-white bg-[#c0b49b] overflow-x-hidden">
      {/* Fond photo bokeh feuille verte officiel Figma 1030:23455 */}
      <div aria-hidden className="absolute inset-0 pointer-events-none -z-10">
        <img src={loginBg} alt="Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FFFAF0]/28 backdrop-blur-[2px]" />
      </div>

      {/* En-tête Figma 1030:23456 */}
      <header className="w-full max-w-6xl flex items-center justify-between mb-8 z-10">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="text-[14px] font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 01 · Accueil · Carte centrale Figma 1030:23459 */}
      <main className="backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[36px] px-8 sm:px-[72px] py-10 sm:py-[56px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] flex flex-col gap-4 items-center text-center my-auto max-w-[680px] w-full z-10">
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
          className="bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[17px] rounded-[16px] h-[56px] w-full sm:w-[240px] flex items-center justify-center gap-2.5 transition shadow-md"
        >
          <span>C’est parti</span>
          <ArrowRight className="w-5 h-5 shrink-0" />
        </Link>
      </main>

      {/* Footer minimaliste */}
      <footer className="w-full max-w-6xl text-center text-xs text-[#0B2C25]/60 mt-8 py-2 z-10">
        © 2026 FORSA — Plateforme anti-gaspillage alimentaire DZ.
      </footer>
    </div>
  );
};
