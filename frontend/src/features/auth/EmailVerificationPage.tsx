import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

export const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialStatus = (searchParams.get('status') as 'pending' | 'verified' | 'expired') || 'pending';
  const [status, setStatus] = useState<'pending' | 'verified' | 'expired'>(initialStatus);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const token = searchParams.get('token');
  const [checking, setChecking] = useState(!!token);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Adresse à laquelle renvoyer le lien : ?email=… ou utilisateur connecté
  const knownEmail = (): string | null => {
    const fromUrl = searchParams.get('email');
    if (fromUrl) return fromUrl;
    try {
      return JSON.parse(localStorage.getItem('forsa_user') || 'null')?.email ?? null;
    } catch {
      return null;
    }
  };

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
          setStatus('verified'); // VERIFIED ou ALREADY_VERIFIED
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
    const email = knownEmail();
    if (!email) {
      setErrorMessage('Indiquez votre adresse e-mail en vous reconnectant pour recevoir un nouveau lien.');
      return;
    }
    setErrorMessage(null);
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-6 py-8 sm:px-16 font-poppins selection:bg-forsa-leaf selection:text-white bg-[#fffaf0] overflow-x-hidden">
      {/* En-tête Figma */}
      <header className="w-full max-w-6xl flex items-center justify-between mb-8">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="text-[14px] font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* Carte centrale multi-états (Frames 13, 14, 15) */}
      <main className="w-full max-w-[520px] backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[32px] p-8 sm:p-12 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col items-center text-center gap-6 my-auto">
        
        {checking && <p className="text-sm text-[#0B2C25]/75">Vérification de votre e-mail…</p>}

        {errorMessage && (
          <div className="w-full bg-red-500/10 border border-red-500/30 text-red-800 text-xs sm:text-sm px-4 py-3 rounded-xl">
            {errorMessage}
          </div>
        )}

        {/* État 13 · Vérification de l'e-mail */}
        {!checking && status === 'pending' && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 text-[#17664E] flex items-center justify-center border border-emerald-600/20 shadow-inner">
              <Mail className="w-10 h-10" />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2C25] mb-2">
                Vérifiez votre e-mail
              </h1>
              <p className="text-xs sm:text-sm text-[#0B2C25]/75 leading-relaxed">
                Un e-mail de confirmation contenant un lien de validation a été envoyé à votre adresse. Cliquez dessus pour activer votre compte.
              </p>
            </div>

            {resent && (
              <div className="w-full p-3 bg-emerald-500/15 border border-emerald-600/25 rounded-xl text-xs text-[#17664E] font-medium">
                Un nouvel e-mail de confirmation vient d'être envoyé !
              </div>
            )}

            <div className="w-full flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="w-full h-[56px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[16px] rounded-[16px] flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                <span>{resending ? 'Renvoi en cours...' : "Renvoyer l'e-mail"}</span>
              </button>
            </div>
          </>
        )}

        {/* État 14 · E-mail vérifié */}
        {!checking && status === 'verified' && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-[#17664E] flex items-center justify-center border border-emerald-600/30">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2C25] mb-2">
                E-mail vérifié avec succès !
              </h1>
              <p className="text-xs sm:text-sm text-[#0B2C25]/75 leading-relaxed">
                Votre adresse e-mail a été validée. Vous pouvez dès à présent profiter de tous les services FORSA.
              </p>
            </div>

            <Link
              to="/login"
              className="w-full h-12 bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition shadow-md mt-2"
            >
              <span>Se connecter à mon compte</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        )}

        {/* État 15 · Lien de vérification expiré */}
        {!checking && status === 'expired' && (
          <>
            <div className="w-20 h-20 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center border border-amber-600/30">
              <AlertTriangle className="w-10 h-10" />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2C25] mb-2">
                Lien de vérification expiré
              </h1>
              <p className="text-xs sm:text-sm text-[#0B2C25]/75 leading-relaxed">
                Le lien de sécurité a expiré (validité 24h). Cliquez ci-dessous pour recevoir un nouveau lien de validation valide.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full h-12 bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition shadow-md mt-2"
            >
              <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
              <span>{resending ? 'Envoi en cours...' : "Demander un nouveau lien"}</span>
            </button>
          </>
        )}

      </main>

      <footer className="w-full max-w-6xl text-center text-xs text-[#0B2C25]/60 mt-8 py-2">
        © 2026 FORSA — Plateforme anti-gaspillage alimentaire DZ.
      </footer>
    </div>
  );
};
