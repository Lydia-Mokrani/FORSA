import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import arrowRightIcon from '../../assets/icons/arrow-right.svg';
import arrowLeftIcon from '../../assets/icons/arrow-left.svg';
import mailSentIcon from '../../assets/icons/illustration-mail-sent.svg';
import checkmarkIcon from '../../assets/icons/checkmark-circle-02.svg';
import {
  resendEmailCode,
  verifyEmailCode,
  getStoredUser,
} from './services/authService';

type EmailState = 'PENDING' | 'VERIFIED' | 'EXPIRED';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const user = getStoredUser();
  const userEmail = searchParams.get('email') || user?.email || 'votre adresse e-mail';

  const [state, setState] = useState<EmailState>(() => {
    const s = searchParams.get('status');
    if (s === 'verified') return 'VERIFIED';
    if (s === 'expired') return 'EXPIRED';
    return 'PENDING';
  });

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-verify si token présent dans l'URL (?token=...)
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setLoading(true);
      fetch(`/api/auth/verify-email/${token}`, { method: 'POST' })
        .then((res) => {
          if (res.ok) {
            setState('VERIFIED');
          } else {
            setState('EXPIRED');
          }
        })
        .catch(() => {
          setState('EXPIRED');
        })
        .finally(() => setLoading(false));
    }
  }, [searchParams]);

  const handleResend = async () => {
    setResending(true);
    setMessage(null);
    setError(null);
    try {
      await resendEmailCode();
      setMessage('Un nouvel e-mail de confirmation vous a été envoyé.');
      if (state === 'EXPIRED') setState('PENDING');
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du renvoi.');
    } finally {
      setResending(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const updated = [...otp];
    updated[index] = clean;
    setOtp(updated);

    if (clean && index < 5) {
      const nextInput = document.getElementById(`email-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      await verifyEmailCode(code);
      setState('VERIFIED');
    } catch (err: any) {
      setError(err?.message || 'Code de confirmation invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#dce1d0] from-[10.156%] via-[#f3e7c6] via-[66.797%] to-[#787b72] to-[106.64%] flex flex-col items-center justify-center min-h-screen pb-[66px] pt-[96px] px-[16px] sm:px-[64px] relative size-full font-poppins selection:bg-[#17664e] selection:text-white">
      {/* En-tête Figma 1030:23849 */}
      <header className="absolute flex h-[32px] items-center justify-between left-[20px] sm:left-[64px] top-[24px] sm:top-[32px] right-[20px] sm:right-[64px] overflow-clip">
        <Link to="/" className="font-extrabold text-[#0b2c25] text-[20px] sm:text-[24px] tracking-tight">
          FORSA
        </Link>
        <span className="hidden sm:inline font-medium text-[14px] text-[rgba(11,44,37,0.85)]">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* ─── ÉTAT 1 : 13 · Vérifiez votre e-mail (Figma 1030:23847) ─── */}
      {state === 'PENDING' && (
        <main className="backdrop-blur-[20px] bg-[rgba(255,255,255,0.34)] border-[1.2px] border-[rgba(255,255,255,0.7)] flex flex-col gap-[22px] items-start p-[28px] sm:p-[48px] rounded-[32px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] w-full max-w-[520px]">
          <div className="flex items-start justify-center w-full">
            <div className="bg-[#eaf6eb] flex items-center justify-center rounded-[48px] size-[80px] sm:size-[96px]">
              <img src={mailSentIcon} alt="" className="size-[40px] sm:size-[48px]" />
            </div>
          </div>

          <div className="flex flex-col gap-[8px] items-center text-center w-full">
            <h1 className="font-semibold text-[#0b2c25] text-[26px] sm:text-[34px] leading-tight">
              Vérifiez votre e-mail
            </h1>
            <p className="font-normal text-[14px] sm:text-[15px] text-[rgba(11,44,37,0.65)] leading-relaxed">
              Nous avons envoyé un lien et un code de confirmation à <strong className="text-[#0b2c25]">{userEmail}</strong>. Cliquez dessus pour activer votre compte.
            </p>
          </div>

          {message && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-xl p-3 w-full text-center">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-[#fdecea] border border-[#b22222]/20 text-[#b22222] text-xs sm:text-sm rounded-xl p-3 w-full text-center">
              {error}
            </div>
          )}

          {/* Saisie OTP 6 chiffres optionnelle si code reçu par email */}
          <div className="flex flex-col gap-2 w-full">
            <p className="text-xs text-[rgba(11,44,37,0.7)] text-center font-medium">
              Ou saisissez le code reçu par e-mail :
            </p>
            <div className="flex gap-2 justify-center w-full">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`email-otp-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  className="size-11 sm:size-12 text-center text-xl font-bold bg-white/90 border border-[rgba(11,44,37,0.22)] focus:border-2 focus:border-[#17664e] rounded-[12px] text-[#0b2c25] focus:outline-none transition"
                />
              ))}
            </div>
            {otp.join('').length === 6 && (
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading}
                className="mt-2 bg-[#0b2c25] hover:bg-[#17664e] text-white font-medium text-sm rounded-xl h-10 transition disabled:opacity-50"
              >
                {loading ? 'Validation...' : 'Valider le code'}
              </button>
            )}
          </div>

          {/* Boutons et Liens Figma 1030:23859 - 1030:23862 */}
          <div className="flex flex-col gap-3 w-full pt-1">
            <a
              href="mailto:"
              className="bg-[#0b2c25] hover:bg-[#17664e] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-white font-medium text-[16px] sm:text-[17px] transition shadow-sm"
            >
              <span>Ouvrir ma boîte mail</span>
              <img src={arrowRightIcon} alt="" className="size-[20px]" />
            </a>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="bg-[rgba(255,255,255,0.3)] hover:bg-white/50 border-[1.2px] border-[rgba(11,44,37,0.5)] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-[#0b2c25] font-medium text-[16px] sm:text-[17px] transition cursor-pointer disabled:opacity-50"
            >
              {resending ? 'Envoi en cours...' : 'Renvoyer l’e-mail'}
            </button>
          </div>

          <div className="flex flex-col gap-2 w-full text-center">
            <p className="font-normal text-[14px] text-[rgba(11,44,37,0.7)]">
              Mauvaise adresse ?{' '}
              <button
                type="button"
                onClick={() => navigate('/profile/email')}
                className="font-semibold text-[#17664e] hover:underline cursor-pointer"
              >
                Modifier
              </button>
            </p>
            <p className="font-normal text-[13px] sm:text-[14px] text-[rgba(11,44,37,0.65)]">
              Sans e-mail vérifié, vous ne pouvez ni réserver ni publier d’offre.
            </p>
          </div>
        </main>
      )}

      {/* ─── ÉTAT 2 : 14 · E-mail vérifié ! (Figma 1030:23863) ─── */}
      {state === 'VERIFIED' && (
        <main className="backdrop-blur-[20px] bg-[rgba(255,255,255,0.34)] border-[1.2px] border-[rgba(255,255,255,0.7)] flex flex-col gap-[22px] items-start p-[28px] sm:p-[48px] rounded-[32px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] w-full max-w-[520px]">
          <div className="flex items-start justify-center w-full">
            <div className="bg-[#eaf6eb] flex items-center justify-center rounded-[48px] size-[80px] sm:size-[96px]">
              <img src={checkmarkIcon} alt="" className="size-[40px] sm:size-[48px]" />
            </div>
          </div>

          <div className="flex flex-col gap-[8px] items-center text-center w-full">
            <h1 className="font-semibold text-[#0b2c25] text-[26px] sm:text-[34px] leading-tight">
              E-mail vérifié !
            </h1>
            <p className="font-normal text-[14px] sm:text-[15px] text-[rgba(11,44,37,0.65)] leading-relaxed">
              Votre adresse est confirmée. Vous pouvez maintenant vous connecter et profiter de FORSA.
            </p>
          </div>

          <Link
            to="/login"
            className="bg-[#0b2c25] hover:bg-[#17664e] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-white font-medium text-[16px] sm:text-[17px] transition shadow-sm"
          >
            <span>Se connecter</span>
            <img src={arrowRightIcon} alt="" className="size-[20px]" />
          </Link>
        </main>
      )}

      {/* ─── ÉTAT 3 : 15 · Lien expiré (Figma 1030:23876) ─── */}
      {state === 'EXPIRED' && (
        <main className="backdrop-blur-[20px] bg-[rgba(255,255,255,0.34)] border-[1.2px] border-[rgba(255,255,255,0.7)] flex flex-col gap-[22px] items-start p-[28px] sm:p-[48px] rounded-[32px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] w-full max-w-[520px]">
          <div className="flex items-start justify-center w-full">
            <div className="bg-[rgba(178,34,34,0.12)] flex items-center justify-center rounded-[48px] size-[80px] sm:size-[96px]">
              <svg className="size-[40px] sm:size-[48px] text-[#b22222]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>

          <div className="flex flex-col gap-[8px] items-center text-center w-full">
            <h1 className="font-semibold text-[#0b2c25] text-[26px] sm:text-[34px] leading-tight">
              Lien expiré
            </h1>
            <p className="font-normal text-[14px] sm:text-[15px] text-[rgba(11,44,37,0.65)] leading-relaxed">
              Ce lien de vérification n’est plus valide ou a déjà été utilisé.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="bg-[#0b2c25] hover:bg-[#17664e] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-white font-medium text-[16px] sm:text-[17px] transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {resending ? 'Envoi en cours...' : 'Renvoyer un lien'}
            </button>

            <Link
              to="/login"
              className="flex gap-[6px] items-center justify-center w-full text-[#17664e] hover:underline font-medium text-[14px] transition py-2"
            >
              <img src={arrowLeftIcon} alt="" className="size-[16px]" />
              <span>Retour à la connexion</span>
            </Link>
          </div>
        </main>
      )}
    </div>
  );
};
