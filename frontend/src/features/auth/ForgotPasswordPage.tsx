import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, Lock, Eye, EyeOff } from 'lucide-react';
import loginBg from '../../assets/login-bg.png';

export const ForgotPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');
  const initialStep = resetToken ? 'reset' : (searchParams.get('step') as 'request' | 'sent' | 'reset') || 'request';

  const [step, setStep] = useState<'request' | 'sent' | 'reset'>(initialStep);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReset, setSuccessReset] = useState(false);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || 'Une erreur est survenue lors de l’envoi.');
      setStep('sent');
    } catch (err: any) {
      setErrorMessage(err.message || 'Une erreur est survenue lors de l’envoi.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!resetToken) {
      setErrorMessage('Lien invalide. Refaites une demande de réinitialisation.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || 'Impossible de réinitialiser le mot de passe.');
      setSuccessReset(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Impossible de réinitialiser le mot de passe.');
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

      {/* En-tête Figma 1030:23917 */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-4">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-[14px] font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* Carte centrale multi-états (Frames 17, 18, 19) */}
      <main className="relative z-10 w-full max-w-[520px] backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[32px] p-6 sm:p-12 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col gap-6 my-auto">
        
        {errorMessage && (
          <div className="flex items-center gap-2 bg-[#B22222]/10 border border-[#B22222]/20 text-[#B22222] text-xs sm:text-sm px-4 py-3 rounded-2xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 17 · Mot de passe oublié (Figma 1030:23917) */}
        {step === 'request' && (
          <>
            <div className="text-center flex flex-col gap-2">
              <h1 className="text-2xl sm:text-[34px] font-semibold text-[#0B2C25] leading-tight">
                Mot de passe oublié ?
              </h1>
              <p className="text-xs sm:text-[15px] text-[#0B2C25]/65 leading-relaxed">
                Saisissez votre adresse e-mail, nous vous enverrons un lien pour le réinitialiser.
              </p>
            </div>

            <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
              <div className="bg-white/60 focus-within:bg-white/85 border-[1.2px] border-white/90 focus-within:border-[#17664E] rounded-[14px] h-[56px] px-[18px] flex items-center gap-3 transition">
                <Mail className="w-5 h-5 text-[#0B2C25]/50 shrink-0" />
                <input
                  type="email"
                  required
                  placeholder="Adresse e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-[#0B2C25] text-[15px] placeholder:text-[#0B2C25]/50 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[56px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[17px] rounded-[16px] flex items-center justify-center gap-2.5 shadow-md transition cursor-pointer active:scale-[0.99] mt-2"
              >
                <span>{loading ? 'Envoi en cours...' : 'Envoyer le lien'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            <div className="flex items-center justify-center pt-2">
              <Link to="/login" className="flex items-center gap-2 text-sm text-[#0B2C25]/75 hover:text-[#0B2C25] hover:underline font-medium">
                <ArrowLeft className="w-4 h-4" />
                <span>Retour à la connexion</span>
              </Link>
            </div>
          </>
        )}

        {/* 18 · Lien de réinitialisation envoyé (Figma 1030:23932) */}
        {step === 'sent' && (
          <div className="text-center flex flex-col items-center gap-5 py-2">
            <div className="size-16 sm:size-20 rounded-full bg-emerald-500/15 text-[#17664E] flex items-center justify-center border border-emerald-600/20 shadow-inner">
              <CheckCircle2 className="size-8 sm:size-10" />
            </div>

            <div className="flex flex-col gap-2">
              <h1 className="text-2xl sm:text-[34px] font-semibold text-[#0B2C25] leading-tight">
                E-mail envoyé
              </h1>
              <p className="text-xs sm:text-[14px] text-[#0B2C25]/65 leading-relaxed max-w-[400px]">
                Si un compte existe pour <span className="font-semibold text-[#0B2C25]">{email || 'votre adresse e-mail'}</span>, vous recevrez un lien de réinitialisation dans quelques minutes.
              </p>
            </div>

            <div className="w-full flex flex-col gap-3 pt-2">
              <Link
                to="/login"
                className="w-full h-[56px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[16px] rounded-[16px] flex items-center justify-center gap-2.5 transition shadow-md active:scale-[0.99]"
              >
                <span>Retour à la connexion</span>
                <ArrowRight className="w-5 h-5" />
              </Link>

              <button
                type="button"
                onClick={handleRequestSubmit}
                disabled={loading}
                className="text-xs sm:text-sm text-[#17664E] hover:underline font-medium pt-1 cursor-pointer"
              >
                Rien reçu ? Renvoyer le lien
              </button>
            </div>
          </div>
        )}

        {/* 19 · Nouveau mot de passe (Figma 1030:23946) */}
        {step === 'reset' && (
          <>
            <div className="text-center flex flex-col gap-2">
              <h1 className="text-2xl sm:text-[34px] font-semibold text-[#0B2C25] leading-tight">
                Nouveau mot de passe
              </h1>
              <p className="text-xs sm:text-[15px] text-[#0B2C25]/65 leading-relaxed">
                Choisissez un mot de passe sécurisé.
              </p>
            </div>

            {successReset ? (
              <div className="text-center flex flex-col items-center gap-4 py-4">
                <div className="size-16 rounded-full bg-emerald-500/20 text-[#17664E] flex items-center justify-center">
                  <CheckCircle2 className="size-8" />
                </div>
                <p className="text-sm font-semibold text-[#0B2C25]">
                  Mot de passe mis à jour avec succès !
                </p>
                <Link
                  to="/login"
                  className="w-full h-[56px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[16px] rounded-[16px] flex items-center justify-center transition shadow-md active:scale-[0.99]"
                >
                  Se connecter
                </Link>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
                <div className="relative bg-white/60 focus-within:bg-white/85 border-[1.2px] border-white/90 focus-within:border-[#17664E] rounded-[14px] h-[56px] px-[18px] flex items-center gap-3 transition">
                  <Lock className="w-5 h-5 text-[#0B2C25]/50 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Nouveau mot de passe"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-transparent text-[#0B2C25] text-[15px] placeholder:text-[#0B2C25]/50 focus:outline-none pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-[#0B2C25]/50 hover:text-[#0B2C25] transition cursor-pointer"
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5 opacity-60" /> : <Eye className="w-5 h-5 opacity-60" />}
                  </button>
                </div>

                <div className="bg-white/60 focus-within:bg-white/85 border-[1.2px] border-white/90 focus-within:border-[#17664E] rounded-[14px] h-[56px] px-[18px] flex items-center gap-3 transition">
                  <Lock className="w-5 h-5 text-[#0B2C25]/50 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirmer le nouveau mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-transparent text-[#0B2C25] text-[15px] placeholder:text-[#0B2C25]/50 focus:outline-none"
                  />
                </div>

                <p className="text-xs text-[#0B2C25]/60 pl-1">
                  8 caractères minimum, avec au moins une lettre et un chiffre.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[56px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[16px] rounded-[16px] flex items-center justify-center gap-2.5 transition shadow-md active:scale-[0.99] cursor-pointer mt-2"
                >
                  {loading ? 'Enregistrement...' : 'Réinitialiser le mot de passe'}
                </button>
              </form>
            )}
          </>
        )}
      </main>

      {/* Spacer pour l'alignement vertical exact */}
      <div className="relative z-10 w-full max-w-6xl h-8" />
    </div>
  );
};
