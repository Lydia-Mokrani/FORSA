import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, Lock, Eye, EyeOff, Check } from 'lucide-react';
import loginBg from '../../assets/login-bg.png';
import { FigmaGalleryBar } from './FigmaGalleryBar';

export const ForgotPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  // Le lien reçu par e-mail ressemble à /forgot-password?token=… → on affiche directement « Nouveau mot de passe »
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
      setStep('sent'); // réponse identique que le compte existe ou non (pas d'énumération)
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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-4 py-8 sm:px-8 font-poppins selection:bg-forsa-leaf selection:text-white overflow-x-hidden">
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

      {/* Carte centrale multi-états (Frames 17, 18, 19) */}
      <main className="w-full max-w-[500px] backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[32px] p-8 sm:p-12 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col gap-6 my-auto">
        
        {errorMessage && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-800 text-xs sm:text-sm px-4 py-3 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Frame 17 · Mot de passe oublié */}
        {step === 'request' && (
          <>
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2C25] mb-2">
                Mot de passe oublié ?
              </h1>
              <p className="text-xs sm:text-sm text-[#0B2C25]/75">
                Saisissez votre adresse e-mail, nous vous enverrons un lien de réinitialisation.
              </p>
            </div>

            <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
              <div className="flex items-center bg-white/65 border border-white/95 rounded-2xl h-13 px-4 shadow-inner">
                <Mail className="w-5 h-5 text-[#0B2C25]/50 mr-3" />
                <input
                  type="email"
                  required
                  placeholder="Adresse e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition shadow-md"
              >
                {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
              </button>
            </form>

            <div className="flex justify-between items-center text-xs text-[#0B2C25]/70 pt-2">
              <Link to="/login" className="flex items-center gap-1.5 hover:underline">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour à la connexion</span>
              </Link>

              <button
                type="button"
                onClick={() => setStep('reset')}
                className="text-[#17664E] underline font-medium"
              >
                (Simuler: Nouveau MDP · Frame 19)
              </button>
            </div>
          </>
        )}

        {/* Frame 18 · Lien de réinitialisation envoyé */}
        {step === 'sent' && (
          <div className="text-center flex flex-col items-center gap-4 py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-[#17664E] flex items-center justify-center border border-emerald-600/30">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2C25] mb-2">
                Lien envoyé !
              </h1>
              <p className="text-xs sm:text-sm text-[#0B2C25]/75 leading-relaxed">
                Un lien sécurisé de réinitialisation a été envoyé à <strong>{email || 'votre adresse e-mail'}</strong>.
              </p>
            </div>

            <div className="w-full flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('reset')}
                className="w-full h-12 bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition shadow-md"
              >
                <span>Définir mon nouveau mot de passe</span>
              </button>

              <Link to="/login" className="text-xs text-[#0B2C25]/70 hover:underline pt-2">
                Retour à la connexion
              </Link>
            </div>
          </div>
        )}

        {/* Frame 19 · Nouveau mot de passe */}
        {step === 'reset' && (
          <>
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2C25] mb-2">
                Nouveau mot de passe
              </h1>
              <p className="text-xs sm:text-sm text-[#0B2C25]/75">
                Définissez votre nouveau mot de passe pour sécuriser votre compte.
              </p>
            </div>

            {successReset ? (
              <div className="text-center flex flex-col items-center gap-4 py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-[#17664E] flex items-center justify-center">
                  <Check className="w-8 h-8" />
                </div>
                <p className="text-sm font-semibold text-[#0B2C25]">
                  Mot de passe mis à jour avec succès !
                </p>
                <Link
                  to="/login"
                  className="w-full h-12 bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium rounded-2xl flex items-center justify-center transition shadow-md"
                >
                  Se connecter maintenant
                </Link>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
                <div className="relative flex items-center bg-white/65 border border-white/95 rounded-2xl h-13 px-4 shadow-inner">
                  <Lock className="w-5 h-5 text-[#0B2C25]/50 mr-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Nouveau mot de passe (min. 8 car.)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-[#0B2C25]/45 hover:text-[#0B2C25]"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="flex items-center bg-white/65 border border-white/95 rounded-2xl h-13 px-4 shadow-inner">
                  <Lock className="w-5 h-5 text-[#0B2C25]/50 mr-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirmer le nouveau mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition shadow-md"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
                </button>

                <div className="text-center pt-2">
                  <Link to="/login" className="text-xs text-[#0B2C25]/70 hover:underline">
                    Annuler et retourner à la connexion
                  </Link>
                </div>
              </form>
            )}
          </>
        )}
      </main>

      <footer className="w-full max-w-6xl text-center text-xs text-[#0B2C25]/60 mt-8">
        © 2026 FORSA (فرصة) · Frames 17, 18, 19 Réinitialisation de mot de passe (Figma)
      </footer>
    </div>
  );
};
