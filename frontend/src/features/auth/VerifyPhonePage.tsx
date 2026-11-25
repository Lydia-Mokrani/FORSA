import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import arrowRightIcon from '../../assets/icons/arrow-right.svg';
import phoneIcon from '../../assets/icons/input-phone.svg';
import {
  verifyTelegramAuth,
  getTelegramChallengeStatus,
  getStoredUser,
  setStoredUser,
  getPostLoginRedirect,
} from './services/authService';

export const VerifyPhonePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const challengeId = searchParams.get('challengeId') || '';
  const phoneParam = searchParams.get('phone') || '05 •• •• •• ••';
  const roleParam = searchParams.get('role') === 'merchant' ? 'MERCHANT' : 'CUSTOMER';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(45);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<any>(null);

  // Polling du statut du défi Telegram
  useEffect(() => {
    if (!challengeId) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await getTelegramChallengeStatus(challengeId);
        if (res.status === 'VERIFIED') {
          clearInterval(pollingRef.current);
          const u = getStoredUser();
          navigate(u ? getPostLoginRedirect(u, roleParam) : '/');
        }
      } catch {
        // Ignorer les erreurs réseau temporaires en polling
      }
    }, 2500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [challengeId, navigate]);

  // Compte à rebours renvoi
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const updated = [...otp];
    updated[index] = clean;
    setOtp(updated);

    if (clean && index < 5) {
      document.getElementById(`phone-otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`phone-otp-${index - 1}`)?.focus();
    }
  };

  const handleValidate = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    if (!challengeId) {
      setError('Session d’authentification manquante. Veuillez recommencer.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await verifyTelegramAuth(challengeId, code, roleParam);
      setStoredUser(res.user);
      navigate(getPostLoginRedirect(res.user, roleParam));
    } catch (err: any) {
      setError(err?.message || 'Code erroné ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#dce1d0] from-[10.156%] via-[#f3e7c6] via-[66.797%] to-[#787b72] to-[106.64%] flex flex-col items-center justify-center min-h-screen pb-[66px] pt-[96px] px-[16px] sm:px-[64px] relative size-full font-poppins selection:bg-[#17664e] selection:text-white">
      {/* En-tête Figma 1030:23894 */}
      <header className="absolute flex h-[32px] items-center justify-between left-[20px] sm:left-[64px] top-[24px] sm:top-[32px] right-[20px] sm:right-[64px] overflow-clip">
        <Link to="/" className="font-extrabold text-[#0b2c25] text-[20px] sm:text-[24px] tracking-tight">
          FORSA
        </Link>
        <span className="hidden sm:inline font-medium text-[14px] text-[rgba(11,44,37,0.85)]">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 16 · Vérification du téléphone · Carte Figma 1030:23897 */}
      <main className="backdrop-blur-[20px] bg-[rgba(255,255,255,0.34)] border-[1.2px] border-[rgba(255,255,255,0.7)] flex flex-col gap-[22px] items-start p-[28px] sm:p-[48px] rounded-[32px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] w-full max-w-[520px]">
        {/* Pastille smartphone */}
        <div className="flex items-start justify-center w-full">
          <div className="bg-[#eaf6eb] flex items-center justify-center rounded-[48px] size-[80px] sm:size-[96px]">
            <img src={phoneIcon} alt="" className="size-[40px] sm:size-[48px]" />
          </div>
        </div>

        {/* Titre & Description */}
        <div className="flex flex-col gap-[8px] items-center text-center w-full">
          <h1 className="font-semibold text-[#0b2c25] text-[26px] sm:text-[34px] leading-tight">
            Confirmez votre numéro
          </h1>
          <p className="font-normal text-[14px] sm:text-[15px] text-[rgba(11,44,37,0.65)] leading-relaxed">
            Saisissez le code à 6 chiffres envoyé au <strong className="text-[#0b2c25]">{phoneParam}</strong>
          </p>
        </div>

        {error && (
          <div className="bg-[#fdecea] border border-[#b22222]/20 text-[#b22222] text-xs sm:text-sm rounded-xl p-3 w-full text-center">
            {error}
          </div>
        )}

        {/* 6 cases de chiffres Figma 1030:23904 */}
        <div className="flex gap-2 sm:gap-[8px] items-start w-full">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              id={`phone-otp-${idx}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="bg-white border border-[rgba(11,44,37,0.22)] focus:border-2 focus:border-[#17664e] flex-1 h-[56px] sm:h-[60px] text-center font-semibold text-[#0b2c25] text-[22px] sm:text-[24px] rounded-[14px] focus:outline-none transition"
            />
          ))}
        </div>

        {/* Renvoi code */}
        <div className="flex justify-center w-full text-[14px] text-[rgba(11,44,37,0.7)] text-center">
          {countdown > 0 ? (
            <span>
              Rien reçu ? <strong className="text-[#17664e]">Renvoyer le code (00:{countdown < 10 ? `0${countdown}` : countdown})</strong>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setCountdown(45);
                // Relance
              }}
              className="font-semibold text-[#17664e] hover:underline cursor-pointer"
            >
              Renvoyer le code
            </button>
          )}
        </div>

        {/* Bouton Valider Figma 1030:23916 */}
        <button
          type="button"
          onClick={handleValidate}
          disabled={loading || otp.join('').length !== 6}
          className="bg-[#0b2c25] hover:bg-[#17664e] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-white font-medium text-[16px] sm:text-[17px] transition shadow-sm cursor-pointer disabled:opacity-50"
        >
          <span>{loading ? 'Validation...' : 'Valider'}</span>
          <img src={arrowRightIcon} alt="" className="size-[20px]" />
        </button>
      </main>
    </div>
  );
};
