import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import arrowRightIcon from '../../assets/icons/arrow-right.svg';
import mailIcon from '../../assets/icons/input-mail.svg';
import lockIcon from '../../assets/icons/input-lock.svg';
import eyeIcon from '../../assets/icons/input-eye.svg';
import roleClientIcon from '../../assets/icons/role-client-icon.svg';
import roleMerchantIcon from '../../assets/icons/role-merchant-icon.svg';

export const SocialAccountExistsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const emailParam = searchParams.get('email') || 'amina@gmail.com';
  const provider = searchParams.get('provider') || 'Google';
  const roleParam = searchParams.get('role') || 'client';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginAndLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Veuillez entrer votre mot de passe.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Appel API connexion standard ou lien social
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Mot de passe incorrect.');
      }
      navigate('/profile');
    } catch (err: any) {
      setError(err?.message || 'Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#dce1d0] from-[10.156%] via-[#f3e7c6] via-[66.797%] to-[#787b72] to-[106.64%] flex flex-col items-center justify-center min-h-screen pb-[66px] pt-[96px] px-[16px] sm:px-[64px] relative size-full font-poppins selection:bg-[#17664e] selection:text-white">
      {/* En-tête Figma 1070:23522 */}
      <header className="absolute flex h-[32px] items-center justify-between left-[20px] sm:left-[64px] top-[24px] sm:top-[32px] right-[20px] sm:right-[64px] overflow-clip">
        <Link to="/" className="font-extrabold text-[#0b2c25] text-[20px] sm:text-[24px] tracking-tight">
          FORSA
        </Link>
        <span className="hidden sm:inline font-medium text-[14px] text-[rgba(11,44,37,0.85)]">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 23 · Google ou Apple — Compte déjà existant · Carte Figma 1070:23525 */}
      <main className="backdrop-blur-[20px] bg-[rgba(255,255,255,0.34)] border-[1.2px] border-[rgba(255,255,255,0.7)] flex flex-col gap-[22px] items-start p-[28px] sm:p-[48px] rounded-[32px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] w-full max-w-[520px]">
        {/* Pastille rôle Figma 1070:23527 */}
        <div className="flex items-start justify-center w-full">
          <div className="bg-[rgba(255,255,255,0.62)] border border-[rgba(11,44,37,0.2)] flex gap-[8px] items-center justify-center px-[14px] py-[8px] rounded-[24px]">
            <img src={roleParam === 'merchant' ? roleMerchantIcon : roleClientIcon} alt="" className="size-[16px]" />
            <span className="font-medium text-[#0b2c25] text-[13px]">
              {roleParam === 'merchant' ? 'Espace commerçant' : 'Espace client'}
            </span>
            <span className="font-normal text-[13px] text-[rgba(11,44,37,0.4)]">·</span>
            <Link
              to="/role-select"
              className="font-medium text-[#17664e] hover:underline text-[13px]"
            >
              Changer
            </Link>
          </div>
        </div>

        {/* Titre & Description */}
        <div className="flex flex-col gap-[8px] items-center text-center w-full">
          <h1 className="font-semibold text-[#0b2c25] text-[26px] sm:text-[34px] leading-tight">
            Ce compte existe déjà
          </h1>
          <p className="font-normal text-[14px] sm:text-[15px] text-[rgba(11,44,37,0.65)] leading-relaxed">
            Connectez-vous avec votre mot de passe pour lier votre compte {provider}
          </p>
        </div>

        {/* Message d’erreur Figma 1070:23531 */}
        <div className="bg-[rgba(178,34,34,0.1)] border border-[rgba(178,34,34,0.3)] flex gap-[10px] items-center px-[14px] py-[12px] rounded-[14px] w-full">
          <svg className="size-[20px] text-[#b22222] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="font-normal text-[#b22222] text-[13px] leading-normal">
            Un compte FORSA utilise déjà {emailParam}. Entrez votre mot de passe pour lier {provider}.
          </p>
        </div>

        {error && (
          <div className="bg-[#fdecea] border border-[#b22222]/20 text-[#b22222] text-xs sm:text-sm rounded-xl p-3 w-full text-center">
            {error}
          </div>
        )}

        {/* Formulaire Figma 1070:23534 */}
        <form onSubmit={handleLoginAndLink} className="flex flex-col gap-[14px] w-full">
          {/* Email (fixe/grisé) */}
          <div className="bg-[rgba(255,255,255,0.62)] border border-[rgba(11,44,37,0.22)] flex gap-[12px] h-[56px] items-center px-[18px] py-[16px] rounded-[14px] w-full opacity-80">
            <img src={mailIcon} alt="" className="size-[20px] opacity-70" />
            <span className="font-normal text-[#0b2c25] text-[15px]">{emailParam}</span>
          </div>

          {/* Mot de passe */}
          <div className="bg-[rgba(255,255,255,0.62)] border-[1.5px] border-[rgba(178,34,34,0.9)] flex gap-[12px] h-[56px] items-center px-[18px] py-[16px] rounded-[14px] w-full focus-within:border-[#17664e] focus-within:bg-white transition">
            <img src={lockIcon} alt="" className="size-[20px] opacity-70" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-[#0b2c25] placeholder:text-[rgba(11,44,37,0.5)] text-[15px]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="opacity-60 hover:opacity-100 transition cursor-pointer"
            >
              <img src={eyeIcon} alt="" className="size-[20px]" />
            </button>
          </div>

          {/* Options: se souvenir & mot de passe oublié */}
          <div className="flex items-center justify-between w-full">
            <label className="flex gap-[10px] items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 rounded border-[rgba(11,44,37,0.5)] text-[#17664e] focus:ring-[#17664e]"
              />
              <span className="font-normal text-[14px] text-[rgba(11,44,37,0.85)]">
                Se souvenir de moi
              </span>
            </label>

            <Link
              to="/forgot-password"
              className="font-medium text-[#17664e] hover:underline text-[13px]"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          {/* Bouton principal */}
          <button
            type="submit"
            disabled={loading}
            className="bg-[#0b2c25] hover:bg-[#17664e] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-white font-medium text-[16px] sm:text-[17px] transition shadow-sm cursor-pointer disabled:opacity-50 mt-1"
          >
            <span>{loading ? 'Connexion...' : 'Se connecter et lier'}</span>
            <img src={arrowRightIcon} alt="" className="size-[20px]" />
          </button>
        </form>

        <p className="font-normal text-[14px] text-[rgba(11,44,37,0.65)] text-center w-full">
          Votre mot de passe reste confidentiel.
        </p>
      </main>
    </div>
  );
};
