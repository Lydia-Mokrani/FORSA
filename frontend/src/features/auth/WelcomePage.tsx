import React from 'react';
import { Link } from 'react-router-dom';
import loginBg from '../../assets/login-bg.png';
import { ArrowRight } from 'lucide-react';
import { FigmaGalleryBar } from './FigmaGalleryBar';

export const WelcomePage: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-4 py-8 sm:px-8 font-poppins selection:bg-forsa-leaf selection:text-white">
      {/* Fond photo bokeh feuille verte officiel Figma */}
      <div aria-hidden className="absolute inset-0 pointer-events-none -z-10">
        <img src={loginBg} alt="Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FFFAF0]/25 backdrop-blur-[2px]" />
      </div>

      {/* Galerie de sélection Figma (19 Écrans) */}
      <FigmaGalleryBar />

      {/* En-tête officiel Desktop / Mobile */}
      <header className="w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-6">
        <Link to="/" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-xs sm:text-sm font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 01 · Accueil · Carte centrale */}
      <main className="w-full max-w-[560px] backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[32px] p-8 sm:p-12 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col items-center text-center gap-6 my-auto">
        <div className="inline-flex items-center gap-2 bg-[#17664E]/10 border border-[#17664E]/20 px-4 py-1.5 rounded-full text-xs font-semibold text-[#17664E]">
          Plateforme Anti-Gaspillage Alimentaire
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B2C25] leading-tight">
          Moins de gaspillage,<br />plus de partage
        </h1>

        <p className="text-sm sm:text-base text-[#0B2C25]/80 max-w-md leading-relaxed">
          Rejoignez la communauté FORSA et achetez des repas et produits de qualité invendus à prix réduits auprès des commerçants de votre quartier.
        </p>

        <div className="w-full flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            to="/login"
            className="flex-1 h-12 bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition shadow-md"
          >
            <span>Se connecter</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/role-select"
            className="flex-1 h-12 bg-white/70 hover:bg-white/90 border border-[#0B2C25]/20 text-[#0B2C25] font-semibold rounded-2xl flex items-center justify-center transition shadow-sm"
          >
            Créer un compte
          </Link>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="w-full max-w-6xl text-center text-xs text-[#0B2C25]/60 mt-8">
        © 2026 FORSA (فرصة) · Frame 01 Accueil (Figma)
      </footer>
    </div>
  );
};
