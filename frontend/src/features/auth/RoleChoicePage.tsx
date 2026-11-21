import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Store, ArrowRight } from 'lucide-react';
import loginBg from '../../assets/login-bg.png';

export const RoleChoicePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'CUSTOMER' | 'MERCHANT'>('CUSTOMER');

  const handleLogin = () => {
    navigate(`/login?role=${selectedRole === 'MERCHANT' ? 'merchant' : 'client'}`);
  };

  const handleRegister = () => {
    navigate(`/register?role=${selectedRole === 'MERCHANT' ? 'merchant' : 'client'}`);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-4 py-8 sm:px-16 font-poppins selection:bg-forsa-leaf selection:text-white overflow-x-hidden">
      {/* Fond photo officiel Figma (Image bokeh feuille verte + overlay #FFFAF0 à 28%) */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img src={loginBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FFFAF0]/28" />
      </div>

      {/* En-tête Figma 1030:23466 */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-4">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-[14px] font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 02 · Choix du profil · Carte Figma 1030:23469 */}
      <main className="relative z-10 backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[32px] p-6 sm:p-12 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] flex flex-col gap-[22px] my-auto max-w-[520px] w-full">
        <div className="flex flex-col gap-2 text-center w-full">
          <h1 className="font-semibold text-[#0B2C25] text-2xl sm:text-[34px] leading-tight">
            Bienvenue sur FORSA
          </h1>
          <p className="font-normal text-[#0B2C25]/65 text-sm sm:text-[15px]">
            Pour commencer, dites-nous qui vous êtes
          </p>
        </div>

        {/* Choix du profil Figma 1030:23473 */}
        <div className="flex gap-3 sm:gap-[14px] w-full">
          {/* Carte Client */}
          <button
            type="button"
            onClick={() => setSelectedRole('CUSTOMER')}
            className={`flex-1 h-[170px] rounded-[22px] px-3 sm:px-4 py-4 flex flex-col items-center justify-center gap-2 transition-all text-center cursor-pointer ${
              selectedRole === 'CUSTOMER'
                ? 'bg-white/85 border-2 border-[#0B2C25] shadow-sm'
                : 'bg-white/50 border border-[#0B2C25]/20 hover:bg-white/70'
            }`}
          >
            <div
              className={`size-12 sm:size-[56px] rounded-full flex items-center justify-center transition-colors ${
                selectedRole === 'CUSTOMER' ? 'bg-[#0B2C25] text-white' : 'bg-[#FFFAF0] text-[#0B2C25]'
              }`}
            >
              <User className="size-6 shrink-0" />
            </div>
            <p className="font-medium text-[#0B2C25] text-base sm:text-[18px]">Client</p>
            <p className="font-normal text-[11px] sm:text-[12px] text-[#0B2C25]/55 leading-tight">
              Je cherche des produits à prix réduit
            </p>
          </button>

          {/* Carte Commerçant */}
          <button
            type="button"
            onClick={() => setSelectedRole('MERCHANT')}
            className={`flex-1 h-[170px] rounded-[22px] px-3 sm:px-4 py-4 flex flex-col items-center justify-center gap-2 transition-all text-center cursor-pointer ${
              selectedRole === 'MERCHANT'
                ? 'bg-white/85 border-2 border-[#0B2C25] shadow-sm'
                : 'bg-white/50 border border-[#0B2C25]/20 hover:bg-white/70'
            }`}
          >
            <div
              className={`size-12 sm:size-[56px] rounded-full flex items-center justify-center transition-colors ${
                selectedRole === 'MERCHANT' ? 'bg-[#0B2C25] text-white' : 'bg-[#FFFAF0] text-[#0B2C25]'
              }`}
            >
              <Store className="size-6 shrink-0" />
            </div>
            <p className="font-medium text-[#0B2C25] text-base sm:text-[18px]">Commerçant</p>
            <p className="font-normal text-[11px] sm:text-[12px] text-[#0B2C25]/55 leading-tight">
              Je valorise mes invendus
            </p>
          </button>
        </div>

        {/* Bouton Se connecter Figma 1030:23476 */}
        <button
          type="button"
          onClick={handleLogin}
          className="bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[17px] rounded-[16px] h-[56px] w-full flex items-center justify-center gap-2.5 transition shadow-md cursor-pointer active:scale-[0.99]"
        >
          <span>Se connecter</span>
          <ArrowRight className="w-5 h-5 shrink-0" />
        </button>

        {/* Bouton Créer un compte Figma 1030:23477 */}
        <button
          type="button"
          onClick={handleRegister}
          className="bg-white/30 hover:bg-white/55 border-[1.2px] border-[#0B2C25]/50 text-[#0B2C25] font-medium text-[17px] rounded-[16px] h-[56px] w-full flex items-center justify-center transition shadow-sm cursor-pointer active:scale-[0.99]"
        >
          Créer un compte
        </button>

        {/* Sous-titre Figma 1030:23478 */}
        <p className="font-normal text-[14px] text-[#0B2C25]/65 text-center w-full">
          Vous pourrez changer de profil avant de continuer.
        </p>
      </main>

      {/* Spacer pour l'alignement vertical exact */}
      <div className="relative z-10 w-full max-w-6xl h-8" />
    </div>
  );
};
