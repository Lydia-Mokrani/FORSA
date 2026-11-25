import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import arrowRightIcon from '../../assets/icons/arrow-right.svg';
import roleClientIcon from '../../assets/icons/role-client-icon.svg';
import roleClientIconWhite from '../../assets/icons/role-client-icon-white.svg';
import roleMerchantIcon from '../../assets/icons/role-merchant-icon.svg';
import roleMerchantIconWhite from '../../assets/icons/role-merchant-icon-white.svg';

export const SocialChooseSpacePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || 'votre compte';
  const provider = searchParams.get('provider') || 'Google';

  const [selectedRole, setSelectedRole] = useState<'CUSTOMER' | 'MERCHANT'>('CUSTOMER');

  const handleContinue = () => {
    // Redirige vers ajout de téléphone ou finalisation
    navigate(`/auth/social/phone?role=${selectedRole === 'MERCHANT' ? 'merchant' : 'client'}&email=${encodeURIComponent(email)}&provider=${encodeURIComponent(provider)}`);
  };

  return (
    <div className="bg-gradient-to-b from-[#dce1d0] from-[10.156%] via-[#f3e7c6] via-[66.797%] to-[#787b72] to-[106.64%] flex flex-col items-center justify-center min-h-screen pb-[66px] pt-[96px] px-[16px] sm:px-[64px] relative size-full font-poppins selection:bg-[#17664e] selection:text-white">
      {/* En-tête Figma 1070:23443 */}
      <header className="absolute flex h-[32px] items-center justify-between left-[20px] sm:left-[64px] top-[24px] sm:top-[32px] right-[20px] sm:right-[64px] overflow-clip">
        <Link to="/" className="font-extrabold text-[#0b2c25] text-[20px] sm:text-[24px] tracking-tight">
          FORSA
        </Link>
        <span className="hidden sm:inline font-medium text-[14px] text-[rgba(11,44,37,0.85)]">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 20 · Google ou Apple — Choisir mon espace · Carte Figma 1070:23446 */}
      <main className="backdrop-blur-[20px] bg-[rgba(255,255,255,0.34)] border-[1.2px] border-[rgba(255,255,255,0.7)] flex flex-col gap-[22px] items-start p-[28px] sm:p-[48px] rounded-[32px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] w-full max-w-[520px]">
        <div className="flex flex-col gap-[8px] items-center text-center w-full">
          <h1 className="font-semibold text-[#0b2c25] text-[26px] sm:text-[34px] leading-tight">
            Choisissez votre espace
          </h1>
          <p className="font-normal text-[14px] sm:text-[15px] text-[rgba(11,44,37,0.65)] leading-relaxed">
            Compte {provider} connecté · {email}
          </p>
        </div>

        {/* Choix du profil Figma 1070:23450 */}
        <div className="flex gap-[14px] items-start w-full">
          {/* Option Client */}
          <button
            type="button"
            onClick={() => setSelectedRole('CUSTOMER')}
            className={`flex-1 flex flex-col gap-[10px] h-[170px] items-center justify-center px-[16px] py-[22px] rounded-[22px] transition cursor-pointer ${
              selectedRole === 'CUSTOMER'
                ? 'bg-[rgba(255,255,255,0.82)] border-2 border-[#0b2c25]'
                : 'bg-[rgba(255,255,255,0.5)] border border-[rgba(11,44,37,0.2)]'
            }`}
          >
            <div className={`flex items-center justify-center rounded-full size-[56px] w-[56px] h-[56px] shrink-0 aspect-square transition-colors ${
              selectedRole === 'CUSTOMER' ? 'bg-[#0b2c25]' : 'bg-[#fffaf0]'
            }`}>
              <img
                src={selectedRole === 'CUSTOMER' ? roleClientIconWhite : roleClientIcon}
                alt="Client"
                className="size-[26px]"
              />
            </div>
            <p className="font-medium text-[#0b2c25] text-[18px]">Client</p>
            <p className="font-normal text-[12px] text-[rgba(11,44,37,0.55)] text-center">
              Je cherche des produits à prix réduit
            </p>
          </button>

          {/* Option Commerçant */}
          <button
            type="button"
            onClick={() => setSelectedRole('MERCHANT')}
            className={`flex-1 flex flex-col gap-[10px] h-[170px] items-center justify-center px-[16px] py-[22px] rounded-[22px] transition cursor-pointer ${
              selectedRole === 'MERCHANT'
                ? 'bg-[rgba(255,255,255,0.82)] border-2 border-[#0b2c25]'
                : 'bg-[rgba(255,255,255,0.5)] border border-[rgba(11,44,37,0.2)]'
            }`}
          >
            <div className={`flex items-center justify-center rounded-full size-[56px] w-[56px] h-[56px] shrink-0 aspect-square transition-colors ${
              selectedRole === 'MERCHANT' ? 'bg-[#0b2c25]' : 'bg-[#fffaf0]'
            }`}>
              <img
                src={selectedRole === 'MERCHANT' ? roleMerchantIconWhite : roleMerchantIcon}
                alt="Commerçant"
                className="size-[26px]"
              />
            </div>
            <p className="font-medium text-[#0b2c25] text-[18px]">Commerçant</p>
            <p className="font-normal text-[12px] text-[rgba(11,44,37,0.55)] text-center">
              Je valorise mes invendus
            </p>
          </button>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col gap-3 w-full">
          <button
            type="button"
            onClick={handleContinue}
            className="bg-[#0b2c25] hover:bg-[#17664e] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-white font-medium text-[16px] sm:text-[17px] transition shadow-sm cursor-pointer"
          >
            <span>Continuer</span>
            <img src={arrowRightIcon} alt="" className="size-[20px]" />
          </button>

          <Link
            to="/login"
            className="bg-[rgba(255,255,255,0.3)] hover:bg-white/50 border-[1.2px] border-[rgba(11,44,37,0.5)] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-[#0b2c25] font-medium text-[16px] sm:text-[17px] transition text-center justify-center"
          >
            Changer de compte {provider}
          </Link>
        </div>

        <p className="font-normal text-[14px] text-[rgba(11,44,37,0.65)] text-center w-full">
          Vous pourrez changer d’espace plus tard dans Paramètres.
        </p>
      </main>
    </div>
  );
};
