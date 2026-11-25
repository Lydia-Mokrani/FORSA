import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import phoneIcon from '../../assets/icons/input-phone.svg';
import { startTelegramAuth } from './services/authService';

export const SocialAddPhonePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'client';
  const email = searchParams.get('email') || '';

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Veuillez saisir votre numéro de téléphone.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const challenge = await startTelegramAuth(phone.trim());
      navigate(`/verify-phone?challengeId=${challenge.challengeId}&phone=${encodeURIComponent(phone.trim())}&role=${role}`);
    } catch (err: any) {
      setError(err?.message || 'Numéro invalide ou non reconnu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#dce1d0] from-[10.156%] via-[#f3e7c6] via-[66.797%] to-[#787b72] to-[106.64%] flex flex-col items-center justify-center min-h-screen pb-[66px] pt-[96px] px-[16px] sm:px-[64px] relative size-full font-poppins selection:bg-[#17664e] selection:text-white">
      {/* En-tête Figma 1070:23480 */}
      <header className="absolute flex h-[32px] items-center justify-between left-[20px] sm:left-[64px] top-[24px] sm:top-[32px] right-[20px] sm:right-[64px] overflow-clip">
        <Link to="/" className="font-extrabold text-[#0b2c25] text-[20px] sm:text-[24px] tracking-tight">
          FORSA
        </Link>
        <span className="hidden sm:inline font-medium text-[14px] text-[rgba(11,44,37,0.85)]">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 21 · Google ou Apple — Ajouter mon téléphone · Carte Figma 1070:23483 */}
      <main className="backdrop-blur-[20px] bg-[rgba(255,255,255,0.34)] border-[1.2px] border-[rgba(255,255,255,0.7)] flex flex-col gap-[22px] items-start p-[28px] sm:p-[48px] rounded-[32px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] w-full max-w-[520px]">
        {/* Pastille */}
        <div className="flex items-start justify-center w-full">
          <div className="bg-[#eaf6eb] flex items-center justify-center rounded-[48px] size-[80px] sm:size-[96px]">
            <img src={phoneIcon} alt="" className="size-[40px] sm:size-[48px]" />
          </div>
        </div>

        {/* Titre & Description */}
        <div className="flex flex-col gap-[8px] items-center text-center w-full">
          <h1 className="font-semibold text-[#0b2c25] text-[26px] sm:text-[34px] leading-tight">
            Ajoutez votre numéro
          </h1>
          <p className="font-normal text-[14px] sm:text-[15px] text-[rgba(11,44,37,0.65)] leading-relaxed">
            Il sert à sécuriser votre compte et à retirer vos commandes
          </p>
        </div>

        {error && (
          <div className="bg-[#fdecea] border border-[#b22222]/20 text-[#b22222] text-xs sm:text-sm rounded-xl p-3 w-full text-center">
            {error}
          </div>
        )}

        {/* Formulaire saisie téléphone Figma 1070:23507 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-[14px] w-full">
          <div className="bg-[rgba(255,255,255,0.62)] border-[1.2px] border-[rgba(255,255,255,0.9)] flex gap-[12px] h-[56px] items-center px-[18px] py-[16px] rounded-[14px] w-full focus-within:border-[#17664e] focus-within:bg-white transition">
            <img src={phoneIcon} alt="" className="size-[20px] opacity-70" />
            <input
              type="tel"
              required
              placeholder="Numéro de téléphone (05 50 12 34 56)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-[#0b2c25] placeholder:text-[rgba(11,44,37,0.5)] text-[15px]"
            />
          </div>

          <p className="font-normal text-[14px] text-[rgba(11,44,37,0.7)] text-center w-full">
            Nous vous enverrons un code par Telegram ou SMS
          </p>

          <button
            type="submit"
            disabled={loading}
            className="bg-[#0b2c25] hover:bg-[#17664e] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-white font-medium text-[16px] sm:text-[17px] transition shadow-sm cursor-pointer disabled:opacity-50 mt-1"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer le code'}
          </button>
        </form>
      </main>
    </div>
  );
};
