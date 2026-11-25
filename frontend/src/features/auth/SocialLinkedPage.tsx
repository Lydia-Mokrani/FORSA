import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import googleIcon from '../../assets/icons/google.svg';
import appleIcon from '../../assets/icons/apple.svg';
import { getStoredUser } from './services/authService';

export const SocialLinkedPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [googleLinked, setGoogleLinked] = useState(true);
  const [appleLinked, setAppleLinked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleToggleGoogle = () => {
    if (googleLinked) {
      if (window.confirm('Voulez-vous vraiment délier votre compte Google ?')) {
        setGoogleLinked(false);
        setMessage('Compte Google délié avec succès.');
      }
    } else {
      setGoogleLinked(true);
      setMessage('Compte Google lié avec succès.');
    }
  };

  const handleToggleApple = () => {
    if (appleLinked) {
      if (window.confirm('Voulez-vous vraiment délier votre compte Apple ?')) {
        setAppleLinked(false);
        setMessage('Compte Apple délié avec succès.');
      }
    } else {
      setMessage('La connexion Apple sera disponible prochainement.');
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#dce1d0] from-[10.156%] via-[#f3e7c6] via-[66.797%] to-[#787b72] to-[106.64%] flex flex-col items-center justify-center min-h-screen pb-[66px] pt-[96px] px-[16px] sm:px-[64px] relative size-full font-poppins selection:bg-[#17664e] selection:text-white">
      {/* En-tête Figma 1070:23579 */}
      <header className="absolute flex h-[32px] items-center justify-between left-[20px] sm:left-[64px] top-[24px] sm:top-[32px] right-[20px] sm:right-[64px] overflow-clip">
        <Link to="/" className="font-extrabold text-[#0b2c25] text-[20px] sm:text-[24px] tracking-tight">
          FORSA
        </Link>
        <span className="hidden sm:inline font-medium text-[14px] text-[rgba(11,44,37,0.85)]">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 22 · Sécurité du compte — Comptes liés · Carte Figma 1070:23582 */}
      <main className="backdrop-blur-[20px] bg-[rgba(255,255,255,0.34)] border-[1.2px] border-[rgba(255,255,255,0.7)] flex flex-col gap-[22px] items-start p-[28px] sm:p-[48px] rounded-[32px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] w-full max-w-[520px]">
        <div className="flex flex-col gap-[8px] items-center text-center w-full">
          <h1 className="font-semibold text-[#0b2c25] text-[26px] sm:text-[34px] leading-tight">
            Comptes liés
          </h1>
          <p className="font-normal text-[14px] sm:text-[15px] text-[rgba(11,44,37,0.65)] leading-relaxed">
            Connectez-vous plus vite avec Google ou Apple
          </p>
        </div>

        {message && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-xl p-3 w-full text-center">
            {message}
          </div>
        )}

        {/* Liste des comptes sociaux Figma 1070:23614 */}
        <div className="flex flex-col gap-[12px] w-full">
          {/* Compte Google */}
          <div className="bg-[rgba(255,255,255,0.58)] border-[1.2px] border-[rgba(255,255,255,0.9)] flex gap-[14px] items-center p-[16px] rounded-[16px] w-full">
            <img src={googleIcon} alt="" className="size-[28px] shrink-0" />
            <div className="flex flex-1 flex-col gap-[2px] min-w-0">
              <p className="font-semibold text-[#0b2c25] text-[15px]">Google</p>
              <p className="font-normal text-[13px] text-[rgba(11,44,37,0.65)] truncate">
                {googleLinked ? `${user?.email || 'amina@gmail.com'} · Connecté` : 'Non lié'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleGoogle}
              className="font-medium text-[#17664e] hover:underline text-[14px] cursor-pointer shrink-0"
            >
              {googleLinked ? 'Délier' : 'Lier'}
            </button>
          </div>

          {/* Compte Apple */}
          <div className="bg-[rgba(255,255,255,0.58)] border-[1.2px] border-[rgba(255,255,255,0.9)] flex gap-[14px] items-center p-[16px] rounded-[16px] w-full">
            <img src={appleIcon} alt="" className="size-[28px] shrink-0" />
            <div className="flex flex-1 flex-col gap-[2px] min-w-0">
              <p className="font-semibold text-[#0b2c25] text-[15px]">Apple</p>
              <p className="font-normal text-[13px] text-[rgba(11,44,37,0.65)]">
                {appleLinked ? 'Connecté' : 'Non lié'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleApple}
              className="font-medium text-[#17664e] hover:underline text-[14px] cursor-pointer shrink-0"
            >
              {appleLinked ? 'Délier' : 'Lier'}
            </button>
          </div>
        </div>

        {/* Bouton retour */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="bg-[rgba(255,255,255,0.3)] hover:bg-white/50 border-[1.2px] border-[rgba(11,44,37,0.5)] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-[#0b2c25] font-medium text-[16px] sm:text-[17px] transition cursor-pointer"
        >
          Retour à la sécurité du compte
        </button>

        <p className="font-normal text-[14px] text-[rgba(11,44,37,0.65)] text-center w-full">
          Votre mot de passe reste nécessaire en cas de problème.
        </p>
      </main>
    </div>
  );
};
