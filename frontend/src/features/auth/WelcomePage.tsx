import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const WelcomePage: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-6 py-8 sm:px-16 font-poppins selection:bg-forsa-leaf selection:text-white bg-[#c0b49b] overflow-x-hidden">
      {/* En-tête Figma 1023:37957 */}
      <header className="w-full max-w-6xl flex items-center justify-between mb-8">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="text-[14px] font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 01 · Accueil · Carte centrale Figma 1023:37960 */}
      <main className="backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[36px] px-8 sm:px-[72px] py-10 sm:py-[56px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] flex flex-col items-center text-center gap-4 my-auto max-w-[560px] w-full">
        <h1 className="font-extrabold text-[#0B2C25] text-5xl sm:text-[72px] tracking-tight leading-none">
          FORSA
        </h1>

        <p className="font-normal text-[#0B2C25]/65 text-base sm:text-[20px] leading-normal">
          Donnez une autre vie à vos produits invendus
        </p>

        <div className="h-4 sm:h-6" />

        <Link
          to="/role-select"
          className="bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[17px] rounded-[16px] h-[56px] w-full sm:w-[240px] flex items-center justify-center gap-2.5 transition shadow-md"
        >
          <span>Commencer</span>
          <ArrowRight className="w-5 h-5 shrink-0" />
        </Link>
      </main>

      {/* Footer minimaliste */}
      <footer className="w-full max-w-6xl text-center text-xs text-[#0B2C25]/60 mt-8 py-2">
        © 2026 FORSA — Plateforme anti-gaspillage alimentaire DZ.
      </footer>
    </div>
  );
};
