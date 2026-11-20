import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import loginBg from '../../assets/login-bg.png';
import { FigmaGalleryBar } from './FigmaGalleryBar';
import { Mail, CheckCircle, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

export const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialStatus = (searchParams.get('status') as 'pending' | 'verified' | 'expired') || 'pending';
  const [status, setStatus] = useState<'pending' | 'verified' | 'expired'>(initialStatus);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = () => {
    setResending(true);
    setTimeout(() => {
      setResending(false);
      setResent(true);
      setStatus('pending');
    }, 1000);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-4 py-8 sm:px-8 font-poppins selection:bg-forsa-leaf selection:text-white">
      {/* Fond photo bokeh feuille verte */}
      <div aria-hidden className="absolute inset-0 pointer-events-none -z-10">
        <img src={loginBg} alt="Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FFFAF0]/25 backdrop-blur-[2px]" />
      </div>

      {/* Galerie de sélection Figma (19 Écrans) */}
      <FigmaGalleryBar />

      <header className="w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-6">
        <Link to="/" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-xs sm:text-sm font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* Carte centrale multi-états (Frames 13, 14, 15) */}
      <main className="w-full max-w-[500px] backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[32px] p-8 sm:p-12 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col items-center text-center gap-6 my-auto">
        
        {/* État 13 · Vérification de l'e-mail */}
        {status === 'pending' && (
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
                className="w-full h-12 bg-white/70 hover:bg-white/90 border border-[#0B2C25]/20 text-[#0B2C25] font-semibold rounded-2xl flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                <span>{resending ? 'Renvoi en cours...' : "Renvoyer l'e-mail"}</span>
              </button>

              <div className="flex justify-center gap-4 text-xs text-[#0B2C25]/60 pt-2">
                <button
                  type="button"
                  onClick={() => setStatus('verified')}
                  className="underline hover:text-[#17664E]"
                >
                  (Simuler : E-mail vérifié · Frame 14)
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setStatus('expired')}
                  className="underline hover:text-amber-700"
                >
                  (Simuler : Lien expiré · Frame 15)
                </button>
              </div>
            </div>
          </>
        )}

        {/* État 14 · E-mail vérifié */}
        {status === 'verified' && (
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
        {status === 'expired' && (
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

        <Link to="/login" className="text-xs text-[#0B2C25]/70 hover:underline">
          Retour à la page de connexion
        </Link>
      </main>

      <footer className="w-full max-w-6xl text-center text-xs text-[#0B2C25]/60 mt-8">
        © 2026 FORSA (فرصة) · Frames 13, 14, 15 Vérification E-mail (Figma)
      </footer>
    </div>
  );
};
