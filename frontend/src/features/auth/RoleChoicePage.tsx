import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import loginBg from '../../assets/login-bg.png';
import { User, Store, Check, ArrowRight } from 'lucide-react';
import { FigmaGalleryBar } from './FigmaGalleryBar';

export const RoleChoicePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'CUSTOMER' | 'MERCHANT'>('CUSTOMER');

  const handleContinue = () => {
    if (selectedRole === 'MERCHANT') {
      navigate('/register?role=merchant');
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-4 py-8 sm:px-8 font-poppins selection:bg-forsa-leaf selection:text-white">
      {/* Fond photo bokeh feuille verte */}
      <div aria-hidden className="absolute inset-0 pointer-events-none -z-10">
        <img src={loginBg} alt="Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FFFAF0]/25 backdrop-blur-[2px]" />
      </div>

      {/* Galerie de sélection Figma (19 Écrans) */}
      <FigmaGalleryBar />

      <header className="w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-6">
        <Link to="/" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-xs sm:text-sm font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 02 · Choix du profil · Carte centrale */}
      <main className="w-full max-w-[540px] backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[32px] p-8 sm:p-12 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col gap-6 my-auto">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2C25] mb-2">
            Bienvenue sur FORSA !
          </h1>
          <p className="text-xs sm:text-sm text-[#0B2C25]/75">
            Choisissez votre type de profil pour continuer
          </p>
        </div>

        {/* Grille de sélection des rôles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Carte Client */}
          <button
            type="button"
            onClick={() => setSelectedRole('CUSTOMER')}
            className={`relative p-5 rounded-2xl flex flex-col items-start text-left transition-all duration-200 border ${
              selectedRole === 'CUSTOMER'
                ? 'bg-white/85 border-[#17664E] shadow-md ring-2 ring-[#17664E]/30'
                : 'bg-white/45 border-white/80 hover:bg-white/60'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-[#17664E]/10 flex items-center justify-center text-[#17664E] mb-3">
              <User className="w-5 h-5" />
            </div>
            <div className="font-bold text-[#0B2C25] text-base mb-1 flex items-center justify-between w-full">
              <span>Client</span>
              {selectedRole === 'CUSTOMER' && (
                <div className="w-5 h-5 rounded-full bg-[#17664E] text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            <p className="text-xs text-[#0B2C25]/70 leading-relaxed">
              Achetez des paniers invendus auprès des commerçants à prix réduits.
            </p>
          </button>

          {/* Carte Commerçant */}
          <button
            type="button"
            onClick={() => setSelectedRole('MERCHANT')}
            className={`relative p-5 rounded-2xl flex flex-col items-start text-left transition-all duration-200 border ${
              selectedRole === 'MERCHANT'
                ? 'bg-white/85 border-[#17664E] shadow-md ring-2 ring-[#17664E]/30'
                : 'bg-white/45 border-white/80 hover:bg-white/60'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-[#17664E]/10 flex items-center justify-center text-[#17664E] mb-3">
              <Store className="w-5 h-5" />
            </div>
            <div className="font-bold text-[#0B2C25] text-base mb-1 flex items-center justify-between w-full">
              <span>Commerçant</span>
              {selectedRole === 'MERCHANT' && (
                <div className="w-5 h-5 rounded-full bg-[#17664E] text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            <p className="text-xs text-[#0B2C25]/70 leading-relaxed">
              Vendez vos surplus, réduisez le gaspillage et attirez de nouveaux clients.
            </p>
          </button>
        </div>

        <button
          type="button"
          onClick={handleContinue}
          className="w-full h-12 bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition shadow-md"
        >
          <span>Continuer</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-center text-xs text-[#0B2C25]/75">
          Vous avez déjà un compte ?{' '}
          <Link to={`/login?role=${selectedRole === 'MERCHANT' ? 'merchant' : 'client'}`} className="font-semibold text-[#17664E] hover:underline">
            Se connecter
          </Link>
        </p>
      </main>

      <footer className="w-full max-w-6xl text-center text-xs text-[#0B2C25]/60 mt-8">
        © 2026 FORSA (فرصة) · Frame 02 Choix du profil (Figma)
      </footer>
    </div>
  );
};
