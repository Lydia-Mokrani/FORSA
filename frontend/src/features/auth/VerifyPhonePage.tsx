import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ArrowLeft, MessageSquare, ShieldCheck } from 'lucide-react';
import loginBg from '../../assets/login-bg.png';

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
          setSuccess(true);
          setTimeout(() => navigate('/'), 1500);
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
        
        {/* Badge d'icône officiel parfaitement centré */}
        <div className="size-16 mx-auto rounded-full bg-white/85 border border-[#0B2C25]/15 flex items-center justify-center shadow-sm">
          {method === 'telegram' ? (
            <svg
              className="size-8 text-[#229ED9] -translate-x-[1px]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.673c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
            </svg>
          ) : (
            <MessageSquare className="size-7 text-[#17664E]" />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl sm:text-[28px] font-semibold text-[#0B2C25] leading-tight">
            Vérification de votre compte
          </h1>
          <p className="text-xs sm:text-[13px] text-[#0B2C25]/75 leading-relaxed">
            {userPhone ? (
              <>Pour le numéro <span className="font-semibold text-[#0B2C25]">{userPhone}</span></>
            ) : (
              'Validez votre numéro pour sécuriser votre compte'
            )}
          </p>
        </div>

        {/* Sélecteur de méthode : Telegram (Recommandé) / SMS */}
        <div className="grid grid-cols-2 gap-2 bg-[#0B2C25]/5 p-1 rounded-2xl border border-white/40">
          <button
            type="button"
            onClick={() => setMethod('telegram')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              method === 'telegram'
                ? 'bg-white text-[#229ED9] shadow-sm'
                : 'text-[#0B2C25]/70 hover:text-[#0B2C25]'
            }`}
          >
            <svg className="size-3.5 shrink-0 fill-current" viewBox="0 0 24 24">
              <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.673c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
            </svg>
            <span>Telegram (Rapide)</span>
          </button>
          <button
            type="button"
            onClick={() => setMethod('sms')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              method === 'sms'
                ? 'bg-white text-[#17664E] shadow-sm'
                : 'text-[#0B2C25]/70 hover:text-[#0B2C25]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>SMS classique</span>
          </button>
        </div>

        {/* Bloc interactif Telegram style RedotPay */}
        {method === 'telegram' ? (
          <div className="bg-white/60 border border-[#229ED9]/25 rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center shadow-sm">
            <div className="inline-flex items-center gap-2 bg-[#229ED9]/10 text-[#229ED9] px-3 py-1 rounded-full text-xs font-semibold">
              <span className="size-2 rounded-full bg-[#229ED9] animate-pulse" />
              <span>Code envoyé sur Telegram</span>
            </div>

            <p className="text-[12px] text-[#0B2C25]/75 leading-relaxed">
              Appuyez sur le code reçu sur Telegram pour le copier, puis collez-le ci-dessous.
            </p>

            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setBotOpened(true)}
              className="w-full py-3 px-4 bg-[#229ED9] hover:bg-[#1E88C7] text-white font-medium text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition cursor-pointer active:scale-[0.99]"
            >
              <svg className="size-4 shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.673c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
              </svg>
              <span>Ouvrir @forsa_auth_bot sur Telegram</span>
            </a>
          </div>
        ) : (
          <div className="bg-white/50 border border-white/80 rounded-2xl p-3 text-xs text-[#0B2C25]/75 text-center">
            Un SMS contenant votre code à 6 chiffres a été envoyé sur votre téléphone.
          </div>
        )}

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
                    className={`w-10 h-13 sm:w-11 sm:h-14 rounded-xl text-center text-xl font-bold focus:outline-none shadow-sm transition ${
                      codeError
                        ? 'border-[1.5px] border-[#B22222] bg-[#B22222]/5 text-[#B22222] focus:border-[#B22222]'
                        : 'bg-white/70 border-[1.5px] border-white/95 focus:border-[#229ED9] text-[#0B2C25]'
                    } ${locked || expireTimer === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              {expireTimer > 0 ? (
                <p className="text-xs text-[#0B2C25]/75">
                  Validité du code : <strong className="font-semibold text-[#0B2C25]">{formatTime(expireTimer)}</strong>
                </p>
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

              {expireTimer > 0 && (
                <p className="text-xs text-[#0B2C25]/70">
                  {timer > 0 ? (
                    <>Rien reçu ? Renvoyer le code (00:{timer < 10 ? `0${timer}` : timer})</>
                  ) : (
                    <button
                      type="button"
                      onClick={requestOtp}
                      className="font-semibold text-[#17664E] hover:underline cursor-pointer"
                    >
                      Renvoyer un nouveau code
                    </button>
                  )}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || locked || expireTimer === 0}
              className="w-full h-[52px] disabled:opacity-60 bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[15px] rounded-[16px] flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-[0.99]"
            >
              {loading ? 'Validation...' : 'Valider mon compte'}
            </button>
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
