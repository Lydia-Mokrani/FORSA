import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

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
    <div className="bg-gradient-to-b from-[#dce1d0] from-[10.156%] via-[#f3e7c6] via-[66.797%] to-[#787b72] to-[106.64%] flex flex-col items-center justify-center min-h-screen pb-[54px] sm:pb-[66px] pt-[84px] sm:pt-[96px] px-[16px] sm:px-[64px] relative size-full font-poppins selection:bg-[#17664e] selection:text-white overflow-x-hidden">
      {/* En-tête Figma 1030:23466 / 1030:23587 */}
      <header className="absolute flex h-[32px] items-center justify-between left-[20px] sm:left-[64px] top-[24px] sm:top-[32px] right-[20px] sm:right-[64px] overflow-clip">
        <Link to="/" className="font-extrabold text-[#0b2c25] text-[20px] sm:text-[24px] tracking-tight hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline font-medium text-[14px] text-[rgba(11,44,37,0.85)]">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 02 · Choix du profil · Carte Figma 1030:23469 (Desktop 520px) / 1030:23589 (Mobile 358px) */}
      <main className="backdrop-blur-[20px] bg-[rgba(255,255,255,0.34)] border-[1.2px] border-[rgba(255,255,255,0.7)] border-solid rounded-[32px] p-[24px] sm:p-[48px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] flex flex-col gap-[18px] sm:gap-[22px] my-auto max-w-[520px] w-full">
        <div className="flex flex-col gap-[8px] text-center w-full">
          <h1 className="font-semibold text-[#0b2c25] text-[26px] sm:text-[34px] leading-tight">
            Bienvenue sur FORSA
          </h1>
          <p className="font-normal text-[14px] sm:text-[15px] text-[rgba(11,44,37,0.65)]">
            Pour commencer, dites-nous qui vous êtes
          </p>
        </div>

        {/* Choix du profil Figma 1030:23473 */}
        <div className="flex gap-[14px] items-start w-full">
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
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M7.12571 16.7717C10.7198 14.6316 15.2802 14.6316 18.8743 16.7717C20.407 17.6843 24.4255 19.5478 21.978 21.8796C20.7823 23.0186 19.4507 23.8333 17.7766 23.8333H8.22344C6.54928 23.8333 5.21767 23.0186 4.02205 21.8796C1.57448 19.5478 5.59304 17.6843 7.12571 16.7717Z"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  stroke={selectedRole === 'CUSTOMER' ? '#ffffff' : '#0b2c25'}
                />
                <path
                  d="M17.875 7.04163C17.875 9.73401 15.6924 11.9166 13 11.9166C10.3076 11.9166 8.125 9.73401 8.125 7.04163C8.125 4.34924 10.3076 2.16663 13 2.16663C15.6924 2.16663 17.875 4.34924 17.875 7.04163Z"
                  strokeWidth="1.5"
                  stroke={selectedRole === 'CUSTOMER' ? '#ffffff' : '#0b2c25'}
                />
              </svg>
            </div>
            <p className="font-medium text-[#0b2c25] text-[18px]">Client</p>
            <p className="font-normal text-[12px] text-[rgba(11,44,37,0.55)] text-center leading-normal">
              Je cherche des produits à prix réduit
            </p>
          </button>

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
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4.33398 23.8334L21.6673 23.8334"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  stroke={selectedRole === 'MERCHANT' ? '#ffffff' : '#0b2c25'}
                />
                <path
                  d="M18.4167 9.75L15.1667 9.75M19.5 14.0833H15.1667M19.5 18.4167H15.1667"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  stroke={selectedRole === 'MERCHANT' ? '#ffffff' : '#0b2c25'}
                />
                <path
                  d="M6.5 23.8333L6.5 3.46663C6.5 2.62579 7.01023 2.16663 7.8 2.16663C9.61156 2.16663 10.5173 2.16663 11.2752 2.28666C15.4472 2.94744 18.7192 6.21944 19.38 10.3914C19.5 11.1493 19.5 12.0551 19.5 13.8666V23.8333"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  stroke={selectedRole === 'MERCHANT' ? '#ffffff' : '#0b2c25'}
                />
              </svg>
            </div>
            <p className="font-medium text-[#0b2c25] text-[18px]">Commerçant</p>
            <p className="font-normal text-[12px] text-[rgba(11,44,37,0.55)] text-center leading-normal">
              Je valorise mes invendus
            </p>
          </button>
        </div>

        {/* Actions Figma 1030:23476 & 1030:23477 */}
        <div className="flex flex-col gap-3 w-full">
          <button
            type="button"
            onClick={handleLogin}
            className="bg-[#0b2c25] hover:bg-[#17664e] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-white font-medium text-[17px] transition shadow-sm cursor-pointer"
          >
            <span>Se connecter</span>
            <ArrowRight className="size-5 text-white stroke-[2.2] shrink-0" />
          </button>

          <button
            type="button"
            onClick={handleRegister}
            className="bg-[rgba(255,255,255,0.3)] hover:bg-white/50 border-[1.2px] border-[rgba(11,44,37,0.5)] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-[#0b2c25] font-medium text-[17px] transition cursor-pointer"
          >
            Créer un compte
          </button>
        </div>

        <p className="font-normal text-[14px] text-[rgba(11,44,37,0.65)] text-center w-full">
          Vous pourrez changer de profil avant de continuer.
        </p>
      </main>

      <div className="relative z-10 w-full max-w-6xl h-8" />
    </div>
  );
};
