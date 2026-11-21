import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import loginBg from '../../assets/login-bg.png';

const OTP_LENGTH = 6;

export const VerifyPhonePage: React.FC = () => {
  const navigate = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [locked, setLocked] = useState(false);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('forsa_access_token')}`,
  });

  const requestOtp = async () => {
    setErrorMessage(null);
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
      setSimulatedCode(data.simulatedCode ?? null);
    } catch (e: any) {
      setErrorMessage(e.message || 'Impossible d’envoyer le code. Vérifiez votre connexion.');
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('forsa_access_token')) {
      setErrorMessage('Session expirée. Veuillez vous reconnecter.');
    } else {
      requestOtp();
    }
    const interval = setInterval(() => setTimer((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDigitChange = (index: number, raw: string) => {
    const value = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < OTP_LENGTH - 1) document.getElementById(`otp-input-${index + 1}`)?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      document.getElementById(`otp-input-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((d, i) => (next[i] = d));
    setDigits(next);
    document.getElementById(`otp-input-${Math.min(pasted.length, OTP_LENGTH - 1)}`)?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
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
          setDigits(Array(OTP_LENGTH).fill(''));
          document.getElementById('otp-input-0')?.focus();
          throw new Error(`Code incorrect.${left !== undefined ? ` Il vous reste ${left} essai${left > 1 ? 's' : ''}.` : ''}`);
        }
        if (err?.code === 'OTP_EXPIRED' || err?.code === 'OTP_TOO_MANY_ATTEMPTS') setLocked(true);
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
          /* refresh token if possible */
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

      {/* En-tête Figma 1030:23892 */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-4">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-[14px] font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 16 · Vérification du téléphone (Figma 1030:23892) */}
      <main className="relative z-10 w-full max-w-[480px] backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[32px] p-6 sm:p-12 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col gap-6 text-center my-auto">
        
        <div className="size-16 mx-auto rounded-full bg-white/60 border border-[#0B2C25]/15 flex items-center justify-center text-[#17664E] shadow-sm">
          <Phone className="size-7" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-[32px] font-semibold text-[#0B2C25] leading-tight">
            Confirmez votre numéro
          </h1>
          <p className="text-xs sm:text-[14px] text-[#0B2C25]/65 leading-relaxed">
            Saisissez le code à 6 chiffres envoyé par SMS sur votre téléphone.
          </p>
        </div>

        {simulatedCode && (
          <div className="bg-emerald-500/10 border border-emerald-600/30 text-[#0B2C25] text-xs sm:text-sm p-3 rounded-2xl">
            💡 <strong>Code SMS de test :</strong> [ <span className="font-mono font-bold text-base text-[#17664E]">{simulatedCode}</span> ]
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 bg-[#B22222]/10 border border-[#B22222]/20 text-[#B22222] text-xs sm:text-sm px-4 py-3 rounded-2xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center gap-3 py-4 text-[#17664E]">
            <CheckCircle2 className="w-12 h-12" />
            <p className="font-semibold text-base sm:text-lg">Numéro validé avec succès !</p>
            <p className="text-xs text-[#0B2C25]/60">Redirection en cours...</p>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-6">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {Array.from({ length: OTP_LENGTH }, (_, index) => index).map((index) => (
                <input
                  key={index}
                  id={`otp-input-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digits[index]}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  className="w-10 h-14 sm:w-12 sm:h-16 bg-white/70 border-[1.5px] border-white/95 focus:border-[#17664E] rounded-2xl text-center text-xl sm:text-2xl font-bold text-[#0B2C25] focus:outline-none shadow-sm transition"
                />
              ))}
            </div>

            <p className="text-xs text-[#0B2C25]/70">
              {timer > 0 ? (
                <>Rien reçu ? Renvoyer le code (00:{timer < 10 ? `0${timer}` : timer})</>
              ) : (
                <button type="button" onClick={requestOtp} className="font-semibold text-[#17664E] hover:underline cursor-pointer">
                  Renvoyer un nouveau code
                </button>
              )}
            </p>

            <button
              type="submit"
              disabled={loading || locked}
              className="w-full h-[56px] disabled:opacity-60 bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[16px] rounded-[16px] flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-[0.99]"
            >
              {loading ? 'Validation...' : 'Valider'}
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
      <div className="relative z-10 w-full max-w-6xl h-8" />
    </div>
  );
};
