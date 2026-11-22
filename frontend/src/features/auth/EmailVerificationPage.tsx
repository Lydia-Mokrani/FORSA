import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import loginBg from '../../assets/login-bg.png';
import mailSentIllustration from '../../assets/icons/illustration-mail-sent.svg';
import clockPendingIcon from '../../assets/icons/illustration-clock-pending.svg';
import checkmarkIcon from '../../assets/icons/checkmark-circle-02.svg';
import arrowRightIcon from '../../assets/icons/arrow-right.svg';
import arrowLeftIcon from '../../assets/icons/arrow-left.svg';

export const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialStatus = (searchParams.get('status') as 'pending' | 'verified' | 'expired') || 'pending';
  const [status, setStatus] = useState<'pending' | 'verified' | 'expired'>(initialStatus);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const token = searchParams.get('token');
  const [checking, setChecking] = useState(!!token);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Adresse e-mail de confirmation
  const targetEmail = () => {
    const fromUrl = searchParams.get('email');
    if (fromUrl) return fromUrl;
    try {
      return JSON.parse(localStorage.getItem('forsa_user') || 'null')?.email ?? 'votre adresse e-mail';
    } catch {
      return 'votre adresse e-mail';
    }
  };

  const emailDisplay = targetEmail();

  // Clic sur le lien reçu par e-mail : /verify-email?token=…
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setStatus('verified');
        } else if (data?.error?.code === 'TOKEN_EXPIRED') {
          setStatus('expired');
        } else {
          setStatus('expired');
          setErrorMessage(data?.error?.message || 'Lien de vérification invalide.');
        }
      } catch {
        setErrorMessage('Impossible de joindre le serveur. Réessayez.');
      } finally {
        setChecking(false);
      }
    })();
  }, [token]);

  const handleResend = async () => {
    setErrorMessage(null);
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailDisplay }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || 'Envoi impossible pour le moment.');
      setResent(true);
      setStatus('pending');
    } catch (err: any) {
      setErrorMessage(err.message || 'Envoi impossible pour le moment.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-4 py-8 sm:px-16 font-poppins selection:bg-forsa-leaf selection:text-white overflow-x-hidden">
      {/* Fond photo officiel Figma (Image bokeh feuille verte + overlay #FFFAF0 à 28%) */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img src={loginBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FFFAF0]/28" />
      </div>

      {/* En-tête Figma 1030:23847 */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-4">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-[14px] font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* Carte centrale multi-états (Figma Frames 13, 14, 15) */}
      <main className="relative z-10 w-full max-w-[520px] backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[32px] p-6 sm:p-12 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col items-center text-center gap-5 my-auto">
        
        {checking && <p className="text-sm text-[#0B2C25]/75">Vérification de votre e-mail…</p>}

        {errorMessage && (
          <div className="w-full bg-[#B22222]/10 border border-[#B22222]/20 text-[#B22222] text-xs sm:text-sm px-4 py-3 rounded-2xl">
            {errorMessage}
          </div>
        )}

        {/* 13 · Vérification de l'e-mail (Figma 1030:23847) */}
        {!checking && status === 'pending' && (
          <>
            <img src={mailSentIllustration} alt="" className="w-24 h-24 mx-auto" />

            <div className="flex flex-col gap-2">
              <h1 className="text-2xl sm:text-[32px] font-semibold text-[#0B2C25] leading-tight">
                Vérifiez votre e-mail
              </h1>
              <p className="text-xs sm:text-[14px] text-[#0B2C25]/70 leading-relaxed max-w-[400px]">
                Nous avons envoyé un lien de confirmation à <span className="font-semibold text-[#0B2C25]">{emailDisplay}</span>. Cliquez dessus pour activer votre compte.
              </p>
            </div>

            {resent && (
              <div className="w-full p-3 bg-emerald-500/15 border border-emerald-600/25 rounded-xl text-xs text-[#17664E] font-medium">
                Un nouvel e-mail de confirmation vient d’être envoyé !
              </div>
            )}

            <div className="w-full flex flex-col gap-3 pt-2">
              <a
                href="mailto:"
                className="w-full h-[56px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[16px] rounded-[16px] flex items-center justify-center gap-2.5 transition shadow-md cursor-pointer active:scale-[0.99]"
              >
                <span>Ouvrir ma boîte mail</span>
                <img src={arrowRightIcon} alt="" className="w-5 h-5" />
              </a>

              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="w-full h-[56px] bg-white/40 hover:bg-white/65 border border-[#0B2C25]/25 text-[#0B2C25] font-medium text-[16px] rounded-[16px] flex items-center justify-center transition cursor-pointer active:scale-[0.99]"
              >
                <span>{resending ? 'Renvoi en cours...' : 'Renvoyer l’e-mail'}</span>
              </button>
            </div>

            <Link
              to="/register"
              className="text-xs text-[#17664E] hover:underline font-medium pt-1"
            >
              Mauvaise adresse ? Modifier
            </Link>

            <p className="text-[12px] text-[#0B2C25]/55 pt-1">
              Sans e-mail vérifié, vous ne pouvez ni réserver ni publier d’offre.
            </p>
          </>
        )}

        {/* 14 · E-mail vérifié (Figma 1030:23863) */}
        {!checking && status === 'verified' && (
          <>
            <div className="size-16 sm:size-20 rounded-full bg-[#0B2C25] text-white flex items-center justify-center shadow-md">
              <img src={checkmarkIcon} alt="" className="w-8 h-8" />
            </div>

            <div className="flex flex-col gap-2">
              <h1 className="text-2xl sm:text-[32px] font-semibold text-[#0B2C25] leading-tight">
                E-mail vérifié !
              </h1>
              <p className="text-xs sm:text-[14px] text-[#0B2C25]/70 leading-relaxed">
                Votre adresse e-mail a été validée. Vous pouvez dès à présent profiter de tous les services FORSA.
              </p>
            </div>

            <Link
              to="/login"
              className="w-full h-[56px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[16px] rounded-[16px] flex items-center justify-center gap-2.5 transition shadow-md mt-2 active:scale-[0.99]"
            >
              <span>Continuer</span>
              <img src={arrowRightIcon} alt="" className="w-5 h-5" />
            </Link>
          </>
        )}

        {/* 15 · Lien de vérification expiré (Figma 1030:23876) */}
        {!checking && status === 'expired' && (
          <>
            <img src={clockPendingIcon} alt="" className="w-24 h-24 mx-auto" />

            <div className="flex flex-col gap-2">
              <h1 className="text-2xl sm:text-[32px] font-semibold text-[#0B2C25] leading-tight">
                Lien de vérification expiré
              </h1>
              <p className="text-xs sm:text-[14px] text-[#0B2C25]/70 leading-relaxed">
                Ce lien n’est plus valide. Demandez-en un nouveau pour activer votre compte.
              </p>
            </div>

            <div className="w-full flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="w-full h-[56px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[16px] rounded-[16px] flex items-center justify-center transition shadow-md cursor-pointer active:scale-[0.99]"
              >
                <span>{resending ? 'Envoi en cours...' : 'Renvoyer un lien'}</span>
              </button>

              <Link
                to="/login"
                className="w-full h-[56px] bg-white/40 hover:bg-white/65 border border-[#0B2C25]/25 text-[#0B2C25] font-medium text-[16px] rounded-[16px] flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.99]"
              >
                <img src={arrowLeftIcon} alt="" className="w-4 h-4" />
                <span>Retour à la connexion</span>
              </Link>
            </div>
          </>
        )}

      </main>

      {/* Spacer pour l'alignement vertical exact */}
      <div className="relative z-10 w-full max-w-6xl h-8" />
    </div>
  );
};
