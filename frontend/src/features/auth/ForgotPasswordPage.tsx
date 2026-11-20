import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import loginBg from '../../assets/login-bg.png';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      // Simulé ou appel API
      await new Promise((r) => setTimeout(r, 800));
      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage('Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-8 sm:px-8 font-poppins selection:bg-forsa-leaf selection:text-white overflow-x-hidden">
      <div aria-hidden className="absolute inset-0 pointer-events-none -z-10">
        <img src={loginBg} alt="Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FFFAF0]/25 backdrop-blur-[2px]" />
      </div>

      <header className="w-full max-w-6xl flex items-center justify-between mb-8 sm:mb-12 px-2 sm:px-6">
        <Link to="/" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-xs sm:text-sm font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      <main className="w-full max-w-[480px] backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[32px] p-6 sm:p-10 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col gap-6">
        
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-2xl sm:text-[32px] font-semibold text-[#0B2C25]">
            Mot de passe oublié ?
          </h1>
          <p className="text-xs sm:text-[15px] text-[#0B2C25]/65">
            Saisissez votre adresse e-mail, nous vous enverrons un lien pour le réinitialiser.
          </p>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-800 text-xs sm:text-sm px-4 py-3 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {submitted ? (
          <div className="text-center flex flex-col items-center gap-4 py-4 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-[#17664E] flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-[#0B2C25]">
              Un lien sécurisé de réinitialisation a été envoyé à <strong>{email}</strong>.
            </p>
            <p className="text-xs text-[#0B2C25]/60">
              Veuillez vérifier votre boîte de réception ou vos spams.
            </p>
            <Link
              to="/login"
              className="mt-2 text-xs sm:text-sm font-semibold text-[#17664E] hover:underline"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4">
              <Mail className="w-5 h-5 text-[#0B2C25]/50 mr-3" />
              <input
                type="email"
                required
                placeholder="Adresse e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-[#0B2C25] text-sm sm:text-[15px] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-[#0B2C25] hover:bg-[#0B2C25]/90 text-white font-medium text-base rounded-[16px] flex items-center justify-center gap-2 shadow-md transition"
            >
              {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
            </button>

            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 text-xs sm:text-[13px] text-[#0B2C25]/70 hover:text-[#0B2C25] pt-2 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à la connexion</span>
            </Link>
          </form>
        )}
      </main>

      <footer className="mt-8 sm:mt-12 text-center text-xs text-[#0B2C25]/60">
        © 2026 FORSA (فرصة) · Plateforme anti-gaspillage alimentaire
      </footer>
    </div>
  );
};
