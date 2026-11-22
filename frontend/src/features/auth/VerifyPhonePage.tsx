import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import loginBg from '../../assets/login-bg.png';
import { figmaSmartPhone01, figmaClock } from '../profile/figmaAssets';

const OTP_LENGTH = 6;

export const VerifyPhonePage: React.FC = () => {
  const navigate = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [codeError, setCodeError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [timer, setTimer] = useState(0);
  const [expireTimer, setExpireTimer] = useState(300);
  const [locked, setLocked] = useState(false);
  const [telegramLink, setTelegramLink] = useState('https://t.me/forsa_auth_bot');
  const [userPhone, setUserPhone] = useState<string>('');
  const [method, setMethod] = useState<'telegram' | 'sms'>('telegram');
  const [botOpened, setBotOpened] = useState(false);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('forsa_access_token')}`,
  });

  const requestOtp = async () => {
    setErrorMessage(null);
    setCodeError(false);
    setLocked(false);
    setDigits(Array(OTP_LENGTH).fill(''));
    try {
      const res = await fetch('/api/users/verify-phone/request', { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) {
        const code = data?.error?.code;
        if (code === 'OTP_COOLDOWN') setTimer(data?.error?.details?.[0]?.retryAfter ?? 60);
        if (code === 'PHONE_ALREADY_VERIFIED') {
          navigate('/profile?changePhone=1');
          return;
        }
        throw new Error(data?.error?.message || 'Impossible d’envoyer le code.');
      }
      setTimer(data.resendInSeconds ?? 60);
      setExpireTimer(data.expiresInSeconds ?? 300);
      if (data.telegramLink) setTelegramLink(data.telegramLink);
      if (data.phone) setUserPhone(data.phone);
    } catch (e: any) {
      setErrorMessage(e.message || 'Impossible d’envoyer le code. Vérifiez votre connexion.');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('forsa_access_token');
    if (token) {
      requestOtp();
    }
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
      setExpireTimer((prev) => {
        if (prev <= 1) {
          setLocked(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Détection automatique en temps réel de la validation Telegram
  useEffect(() => {
    if (success) return;
    const token = localStorage.getItem('forsa_access_token');
    if (!token) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/users/verify-phone/status', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.telegramMismatch) {
            setErrorMessage(`❌ Numéro non valide : Votre Telegram (${data.mismatchPhone || ''}) ne correspond pas au numéro inscrit.`);
          }
        }
      } catch {
        // ignorer erreurs réseau silencieuses
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [success, navigate]);

  const handleDigitChange = (index: number, raw: string) => {
    if (codeError) {
      setCodeError(false);
      setErrorMessage(null);
    }
    const value = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < OTP_LENGTH - 1) document.getElementById(`otp-input-${index + 1}`)?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (codeError && /^\d$/.test(e.key)) {
      setCodeError(false);
      setErrorMessage(null);
    }
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      document.getElementById(`otp-input-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (codeError) {
      setCodeError(false);
      setErrorMessage(null);
    }
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((d, i) => (next[i] = d));
    setDigits(next);
    document.getElementById(`otp-input-${Math.min(pasted.length, OTP_LENGTH - 1)}`)?.focus();
  };

  const formatTime = (seconds: number) => {
    const s = Math.max(0, seconds);
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expireTimer === 0 || locked) {
      setErrorMessage('Le code a expiré. Veuillez cliquer sur « Renvoyer un nouveau code ».');
      return;
    }

    const code = digits.join('');
    if (code.length !== OTP_LENGTH) {
      setErrorMessage(`Veuillez saisir le code complet à ${OTP_LENGTH} chiffres.`);
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const response = await fetch('/api/users/verify-phone/confirm', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ code }),
      });
      const data = await response.json();

      if (!response.ok) {
        const err = data?.error;
        if (err?.code === 'OTP_INVALID') {
          const left = err?.details?.[0]?.attemptsLeft;
          setCodeError(true);
          setDigits(Array(OTP_LENGTH).fill(''));
          document.getElementById('otp-input-0')?.focus();
          setErrorMessage(`Code incorrect.${left !== undefined ? ` Il vous reste ${left} essai${left > 1 ? 's' : ''}.` : ''}`);
          return;
        }
        if (err?.code === 'OTP_EXPIRED') {
          setLocked(true);
          setExpireTimer(0);
          setErrorMessage('Le code a expiré. Veuillez cliquer sur « Renvoyer un nouveau code ».');
          return;
        }
        if (err?.code === 'OTP_TOO_MANY_ATTEMPTS') {
          setLocked(true);
          setCodeError(true);
          setErrorMessage('Trop d’essais incorrects. Veuillez demander un nouveau code.');
          return;
        }
        throw new Error(err?.message || 'Code de vérification incorrect ou expiré.');
      }

      const refreshToken = localStorage.getItem('forsa_refresh_token');
      if (refreshToken) {
        try {
          const r = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (r.ok) {
            const t = await r.json();
            localStorage.setItem('forsa_access_token', t.accessToken);
            localStorage.setItem('forsa_refresh_token', t.refreshToken);
          }
        } catch {
          /* refresh token */
        }
      }

      setSuccess(true);
      setTimeout(() => navigate('/'), 1800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Code incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-4 py-8 sm:px-16 font-poppins selection:bg-forsa-leaf selection:text-white overflow-x-hidden">
      {/* Fond photo officiel Figma (Image bokeh feuille verte + overlay #FFFAF0 à 28%) */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img src={loginBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FFFAF0]/28" />
      </div>

      {/* En-tête Figma */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between mb-6 px-2 sm:px-4">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-[14px] font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 16 · Vérification du téléphone avec option Telegram en vedette */}
      <main className="relative z-10 w-full max-w-[500px] backdrop-blur-[20px] bg-white/40 border-[1.2px] border-white/70 rounded-[32px] p-6 sm:p-10 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col gap-5 text-center my-auto">
        
        {/* Pastille smartphone Figma 994:58331 */}
        <div className="size-20 mx-auto rounded-[22px] bg-[#ebeee1] flex items-center justify-center shadow-xs">
          <img src={figmaSmartPhone01} alt="" className="size-7" />
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-[24px] font-semibold text-[#0B2C25] leading-tight">
            Entrez le code reçu
          </h1>
          <p className="text-[13px] text-[#0B2C25]/75 leading-relaxed">
            {userPhone ? (
              <>Nous avons envoyé un code à 6 chiffres au <strong className="text-[#0B2C25]">{userPhone}</strong>.</>
            ) : (
              'Nous avons envoyé un code à 6 chiffres pour valider votre numéro.'
            )}
          </p>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 bg-[#B22222]/10 border border-[#B22222]/20 text-[#B22222] text-xs px-3 py-2.5 rounded-xl text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center gap-3 py-4 text-[#17664E]">
            <CheckCircle2 className="w-12 h-12" />
            <p className="font-semibold text-base sm:text-lg">Compte validé avec succès !</p>
            <p className="text-xs text-[#0B2C25]/60">Redirection en cours...</p>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#0B2C25]/80 text-left">
                Saisissez le code à 6 chiffres :
              </label>
              <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                {Array.from({ length: OTP_LENGTH }, (_, index) => index).map((index) => (
                  <input
                    key={index}
                    id={`otp-input-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    disabled={loading || locked || expireTimer === 0}
                    value={digits[index]}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    className={`w-11 sm:w-12 h-14 sm:h-16 rounded-[14px] text-center text-[22px] font-semibold focus:outline-none transition ${
                      codeError
                        ? 'border-2 border-[#B22222] bg-[#fff5f5] text-[#B22222]'
                        : digits[index]
                          ? 'bg-[#ebeee1] border border-black/10 text-[#0B2C25]'
                          : 'bg-white border border-black/15 focus:border-2 focus:border-[#0B2C25] text-[#0B2C25]'
                    } ${locked || expireTimer === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              {expireTimer > 0 ? (
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#0B2C25]/75">
                  <img src={figmaClock} alt="" className="size-3.5 opacity-70" />
                  <span>
                    Renvoyer le code dans <strong className="font-semibold text-[#0B2C25]">{formatTime(expireTimer)}</strong>
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-center bg-[#B22222]/10 border border-[#B22222]/20 rounded-xl p-3 w-full">
                  <p className="text-xs text-[#B22222] font-semibold flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Le code a expiré.
                  </p>
                  <p className="text-xs text-[#0B2C25]/85">
                    Veuillez cliquer sur{' '}
                    <button
                      type="button"
                      onClick={requestOtp}
                      className="font-bold text-[#17664E] underline hover:text-[#0B2C25] cursor-pointer"
                    >
                      « Renvoyer un nouveau code »
                    </button>
                    .
                  </p>
                </div>
              )}

              {expireTimer > 0 && timer === 0 && (
                <button
                  type="button"
                  onClick={requestOtp}
                  className="text-xs font-semibold text-[#17664E] hover:underline cursor-pointer"
                >
                  Renvoyer un nouveau code
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || locked || expireTimer === 0}
              className="w-full h-12 disabled:opacity-60 bg-[#0B2C25] hover:bg-[#17664E] text-white font-semibold text-[14px] rounded-[12px] flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              {loading ? 'Validation...' : 'Valider mon compte'}
            </button>

            {/* Accès discret Telegram */}
            <div className="flex flex-col items-center gap-1 pt-1 mt-1 border-t border-black/5">
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setBotOpened(true)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white border border-[#dbf0dd] text-[12px] font-medium text-[#0b2c25] transition shadow-2xs"
              >
                <svg className="size-3.5 fill-[#229ED9]" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                </svg>
                <span>Recevoir également le code via Telegram <strong>@forsa_auth_bot</strong></span>
              </a>
              <span className="text-[11px] text-[#0b2c25]/50">Validation automatique en direct dès réception</span>
            </div>
          </form>
        )}

        <Link
          to="/"
          className="inline-flex items-center justify-center gap-1.5 text-xs text-[#0B2C25]/60 hover:text-[#0B2C25] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Passer pour l’instant</span>
        </Link>
      </main>

      {/* Spacer pour l'alignement vertical exact */}
      <div className="relative z-10 w-full max-w-6xl h-6" />
    </div>
  );
};
