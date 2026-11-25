import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import roleClientIcon from '../../assets/icons/role-client-icon.svg';
import roleMerchantIcon from '../../assets/icons/role-merchant-icon.svg';
import arrowRightIcon from '../../assets/icons/arrow-right.svg';

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
    <div className="relative min-h-screen w-full bg-ui-auth-bg flex flex-col items-center justify-between px-4 py-8 sm:px-16 font-poppins selection:bg-ui-emerald selection:text-white overflow-x-hidden">
      {/* En-tête Figma 1030:23466 */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-4">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-ui-ink hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-[14px] font-medium text-ui-text-80">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 02 · Choix du profil · Carte Figma 1030:23469 [DECISION HYB: Fond uni #dce1d0] */}
      <main className="relative z-10 bg-white border-[1.5px] border-ui-card-border rounded-[32px] p-6 sm:p-12 shadow-[0px_16px_40px_rgba(11,44,37,0.08)] flex flex-col gap-[22px] my-auto max-w-[520px] w-full">
        <div className="flex flex-col gap-2 text-center w-full">
          <h1 className="font-semibold text-ui-ink text-2xl sm:text-[34px] leading-tight">
            Bienvenue sur FORSA
          </h1>
          <p className="font-normal text-ui-text-70 text-sm sm:text-[15px]">
            Pour commencer, dites-nous qui vous êtes
          </p>
        </div>

        {/* Choix du profil Figma 1030:23473 */}
        <div className="flex gap-3 sm:gap-[14px] w-full">
          <button
            type="button"
            onClick={() => setSelectedRole('CUSTOMER')}
            className={`flex-1 flex flex-col items-center justify-center p-4 sm:p-5 rounded-ui-card border-[1.5px] transition cursor-pointer ${
              selectedRole === 'CUSTOMER'
                ? 'bg-ui-mint/60 border-ui-emerald text-ui-emerald shadow-xs'
                : 'bg-white border-ui-card-border text-ui-ink hover:border-ui-emerald/40'
            }`}
          >
            <div className={`size-12 rounded-full flex items-center justify-center mb-2.5 ${
              selectedRole === 'CUSTOMER' ? 'bg-ui-mint text-ui-emerald' : 'bg-stone-50 text-ui-ink'
            }`}>
              <img src={roleClientIcon} alt="" className="size-6" />
            </div>
            <span className="text-[15px] font-semibold">Client</span>
            <span className="text-[12px] text-ui-text-70 text-center mt-1">
              Profitez d'offres exclusives
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('MERCHANT')}
            className={`flex-1 flex flex-col items-center justify-center p-4 sm:p-5 rounded-ui-card border-[1.5px] transition cursor-pointer ${
              selectedRole === 'MERCHANT'
                ? 'bg-ui-mint/60 border-ui-emerald text-ui-emerald shadow-xs'
                : 'bg-white border-ui-card-border text-ui-ink hover:border-ui-emerald/40'
            }`}
          >
            <div className={`size-12 rounded-full flex items-center justify-center mb-2.5 ${
              selectedRole === 'MERCHANT' ? 'bg-ui-mint text-ui-emerald' : 'bg-stone-50 text-ui-ink'
            }`}>
              <img src={roleMerchantIcon} alt="" className="size-6" />
            </div>
            <span className="text-[15px] font-semibold">Commerçant</span>
            <span className="text-[12px] text-ui-text-70 text-center mt-1">
              Vendez vos invendus
            </span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full pt-2">
          {/* Bouton Se connecter Figma 1030:23476 */}
          <button
            type="button"
            onClick={handleLogin}
            className="w-full h-[52px] bg-ui-ink hover:bg-ui-emerald text-white font-medium text-[16px] rounded-ui-ctl flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
          >
            <span>Se connecter</span>
            <img src={arrowRightIcon} alt="" className="size-4" />
          </button>

          {/* Bouton Créer un compte Figma 1030:23477 */}
          <button
            type="button"
            onClick={handleRegister}
            className="w-full h-[52px] bg-white border-[1.5px] border-ui-ink text-ui-ink hover:bg-ui-mint font-medium text-[16px] rounded-ui-ctl flex items-center justify-center transition cursor-pointer"
          >
            Créer un compte
          </button>
        </div>

        {/* Sous-titre Figma 1030:23478 */}
        <p className="text-center text-[12px] text-ui-text-70">
          En continuant, vous acceptez les Conditions Générales de FORSA.
        </p>
      </main>

      <div className="relative z-10 w-full max-w-6xl h-8" />
    </div>
  );
};
