import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import loginBg from '../../assets/login-bg.png';
import googleSvg from '../../assets/icons/google.svg';
import appleSvg from '../../assets/icons/apple.svg';
import inputMailIcon from '../../assets/icons/input-mail.svg';
import inputLockIcon from '../../assets/icons/input-lock.svg';
import inputEyeIcon from '../../assets/icons/input-eye.svg';
import arrowRightIcon from '../../assets/icons/arrow-right.svg';
import badgeRoleIcon from '../../assets/icons/badge-role-icon.svg';
import infoCircleIcon from '../../assets/icons/information-circle.svg';
import checkmarkIcon from '../../assets/icons/checkmark-circle-02.svg';

declare global {
  interface Window {
    google?: any;
  }
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialRole = searchParams.get('role') === 'merchant' ? 'MERCHANT' : 'CUSTOMER';
  const initialState = searchParams.get('state');

  const [role, setRole] = useState<'CUSTOMER' | 'MERCHANT'>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('role') === 'merchant') setRole('MERCHANT');
    if (searchParams.get('role') === 'client') setRole('CUSTOMER');

    if (initialState === 'error') {
      setErrorMessage('Adresse e-mail ou mot de passe incorrect. Veuillez réessayer.');
      setIsSuspended(false);
      setIsSuccess(false);
    } else if (initialState === 'suspended') {
      setIsSuspended(true);
      setErrorMessage(null);
      setIsSuccess(false);
    } else if (initialState === 'success') {
      setIsSuccess(true);
    }
  }, [searchParams, initialState]);

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: response.credential,
          role: role === 'MERCHANT' ? 'MERCHANT' : 'CUSTOMER',
        }),
      });

      const data = await res.json();

      if (res.status === 200 || res.status === 201) {
        handleLoginSuccess(data);
      } else if (res.status === 409) {
        setErrorMessage(data.message || 'Un compte existe déjà avec cette adresse Google. Connectez-vous avec votre mot de passe.');
      } else {
        throw new Error(data?.error?.message || data?.message || 'Échec de connexion avec Google.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de la connexion Google.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '847323556063-cs5ali0pf79u63amoqv6rg7g57r2g74q.apps.googleusercontent.com';
    const initGoogle = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
        });
        const container = document.getElementById('google-hidden-btn');
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: 'outline',
            size: 'large',
          });
        }
        return true;
      }
      return false;
    };

    if (!initGoogle()) {
      const interval = setInterval(() => {
        if (initGoogle()) clearInterval(interval);
      }, 400);
      return () => clearInterval(interval);
    }
  }, [role]);

  const toggleRole = () => {
    const nextRole = role === 'CUSTOMER' ? 'MERCHANT' : 'CUSTOMER';
    setRole(nextRole);
    setErrorMessage(null);
    setIsSuspended(false);
  };

  const handleLoginSuccess = (data: any) => {
    setIsSuccess(true);
    setErrorMessage(null);
    setIsSuspended(false);

    if (data.accessToken) {
      localStorage.setItem('forsa_access_token', data.accessToken);
      if (rememberMe && data.refreshToken) {
        localStorage.setItem('forsa_refresh_token', data.refreshToken);
      }
      localStorage.setItem('forsa_user', JSON.stringify(data.user));
    }

    setTimeout(() => {
      if (data.user?.role === 'MERCHANT' || role === 'MERCHANT') {
        navigate('/merchant/dashboard');
      } else {
        navigate('/');
      }
    }, 1200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSuspended(false);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 || data?.error?.code === 'FORBIDDEN') {
          setIsSuspended(true);
          return;
        }
        throw new Error(data?.error?.message || 'Adresse e-mail ou mot de passe incorrect. Veuillez réessayer.');
      }

      handleLoginSuccess(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Adresse e-mail ou mot de passe incorrect. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'Google' | 'Apple') => {
    setErrorMessage(null);
    if (provider === 'Apple') {
      setErrorMessage('La connexion avec Apple nécessite un compte Apple Developer payant (99$/an). Pour votre démonstration, utilisez la connexion avec Google ou vos identifiants.');
      return;
    }
    if (provider === 'Google') {
      // 1. Tenter le clic direct sur le bouton Google officiel
      const googleBtn = document.querySelector('#google-hidden-btn div[role="button"]') as HTMLElement;
      if (googleBtn) {
        googleBtn.click();
        return;
      }
      // 2. Si non prêt, appeler prompt()
      if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt();
        return;
      }
      setErrorMessage('Initialisation du service Google en cours... Réessayez dans un instant.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-4 py-8 sm:px-16 font-poppins selection:bg-forsa-leaf selection:text-white overflow-x-hidden">
      {/* Fond photo officiel Figma (Image bokeh feuille verte + overlay #FFFAF0 à 28%) */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img src={loginBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FFFAF0]/28" />
      </div>

      {/* En-tête Figma 1030:23481 */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-4">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-[14px] font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 07 · Connexion réussie · Modal overlay */}
      {isSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-8 flex flex-col items-center text-center gap-4 shadow-2xl border border-emerald-500/30">
            <div className="w-16 h-16 rounded-full bg-[#0B2C25] text-white flex items-center justify-center shadow-md">
              <img src={checkmarkIcon} alt="" className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-[#0B2C25]">Connexion réussie !</h2>
            <p className="text-sm text-[#0B2C25]/75">
              Ravi de vous revoir sur FORSA. Redirection en cours...
            </p>
          </div>
        </div>
      )}

      {/* Carte Glassmorphism fidèle à 100% au design Figma 1030:23484 */}
      <main className="relative z-10 backdrop-blur-[20px] bg-white/40 border-[1.2px] border-white/70 rounded-[32px] p-6 sm:p-12 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] flex flex-col gap-[22px] my-auto max-w-[520px] w-full">
        
        {/* Pastille rôle : Espace client / Espace commerçant · Changer (Figma 1030:23486) */}
        <div className="flex items-center justify-start w-full">
          <button
            type="button"
            onClick={toggleRole}
            className="group inline-flex items-center gap-2 bg-white/65 hover:bg-white/85 border border-[#0B2C25]/20 h-[38px] px-3.5 rounded-full transition shadow-sm cursor-pointer"
          >
            <img src={badgeRoleIcon} alt="Rôle" className="w-4 h-4 shrink-0" />
            <span className="text-[13px] font-semibold text-[#0B2C25]">
              {role === 'CUSTOMER' ? 'Espace client' : 'Espace commerçant'}
            </span>
            <span className="text-[#0B2C25]/40 text-[13px]">·</span>
            <span className="text-[13px] font-semibold text-[#17664E] group-hover:underline">
              Changer
            </span>
          </button>
        </div>

        {/* Titres et sous-titres (Figma 1030:23487 pour client / 1030:23508 pour commerçant) */}
        <div className="text-center flex flex-col gap-2 w-full">
          <h1 className="font-semibold text-[#0B2C25] text-2xl sm:text-[34px] leading-tight">
            {role === 'CUSTOMER' ? 'Bon retour !' : 'Espace commerçant'}
          </h1>
          <p className="font-normal text-[15px] text-[#0B2C25]/65 leading-normal">
            {role === 'CUSTOMER'
              ? 'Connectez-vous pour retrouver les offres près de chez vous'
              : 'Gérez vos offres et vos réservations'}
          </p>
        </div>

        {/* 05 · Message d'erreur : Identifiants incorrects (Figma 1030:23527) */}
        {errorMessage && (
          <div className="flex items-center gap-3 bg-[#B22222]/10 border border-[#B22222]/20 text-[#B22222] text-xs sm:text-[13px] p-3.5 rounded-2xl">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 06 · Message d'alerte : Compte suspendu (Figma 1030:23549) */}
        {isSuspended && (
          <div className="flex items-start gap-3 bg-[#D96B43]/15 border border-[#D96B43]/30 text-[#8C3A1A] text-xs sm:text-[13px] p-3.5 rounded-2xl">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#D96B43]" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-[#8C3A1A]">Compte suspendu</span>
              <span>Votre compte a été suspendu suite à des signalements répétés. Contactez le support FORSA pour plus d’informations.</span>
            </div>
          </div>
        )}

        {/* Formulaire de connexion Figma 1030:23490 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-[14px] w-full">
          {/* Champ Email avec icône Figma */}
          <div className="bg-white/60 focus-within:bg-white/85 border-[1.2px] border-white/90 focus-within:border-[#17664E] rounded-[14px] h-[56px] px-[18px] flex items-center gap-3 transition">
            <img src={inputMailIcon} alt="Email" className="size-5 shrink-0 opacity-60" />
            <input
              type="email"
              required
              placeholder="Adresse e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-[#0B2C25] text-[15px] placeholder:text-[#0B2C25]/50 focus:outline-none"
            />
          </div>

          {/* Champ Mot de passe avec icône Figma */}
          <div className="relative bg-white/60 focus-within:bg-white/85 border-[1.2px] border-white/90 focus-within:border-[#17664E] rounded-[14px] h-[56px] px-[18px] flex items-center gap-3 transition">
            <img src={inputLockIcon} alt="Lock" className="size-5 shrink-0 opacity-60" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-[#0B2C25] text-[15px] placeholder:text-[#0B2C25]/50 focus:outline-none pr-8"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 text-[#0B2C25]/50 hover:text-[#0B2C25] transition cursor-pointer"
              aria-label={showPassword ? 'Masquer' : 'Afficher'}
            >
              <img src={inputEyeIcon} alt="Toggle visibility" className="size-5 opacity-60" />
            </button>
          </div>

          {/* Options : Se souvenir de moi & Mot de passe oublié (Figma 1030:23493) */}
          <div className="flex items-center justify-between w-full pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer text-[14px] text-[#0B2C25]/85 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-[20px] rounded-[6px] border-[1.2px] border-[#0B2C25]/50 bg-white/75 text-[#0B2C25] focus:ring-0 cursor-pointer"
              />
              <span>Se souvenir de moi</span>
            </label>

            <Link
              to="/forgot-password"
              className="text-[#17664E] font-medium text-[13px] hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          {/* Bouton CTA Principal Figma 1030:23496 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[56px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[17px] rounded-[16px] flex items-center justify-center gap-2.5 shadow-md transition mt-2 cursor-pointer active:scale-[0.99]"
          >
            {loading ? (
              <span>Connexion en cours...</span>
            ) : (
              <>
                <span>Se connecter</span>
                <img src={arrowRightIcon} alt="" className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Section Sociale (Client uniquement - Figma 1030:23479) OU Information (Commerçant - Figma 1030:23505) */}
        {role === 'CUSTOMER' ? (
          <>
            <div className="flex items-center gap-3 my-0.5">
              <div className="flex-1 h-px bg-[#0B2C25]/15" />
              <span className="text-[11px] text-[#0B2C25]/50 uppercase tracking-wider font-semibold">
                OU
              </span>
              <div className="flex-1 h-px bg-[#0B2C25]/15" />
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                type="button"
                onClick={() => handleSocialLogin('Google')}
                className="h-[52px] bg-white/60 hover:bg-white/85 border border-[#0B2C25]/18 rounded-[16px] flex items-center justify-center gap-2.5 text-[14px] font-medium text-[#0B2C25] transition shadow-sm cursor-pointer"
              >
                <img src={googleSvg} alt="Google" className="size-5 shrink-0" />
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin('Apple')}
                className="h-[52px] bg-white/60 hover:bg-white/85 border border-[#0B2C25]/18 rounded-[16px] flex items-center justify-center gap-2.5 text-[14px] font-medium text-[#0B2C25] transition shadow-sm cursor-pointer"
              >
                <img src={appleSvg} alt="Apple" className="size-5 shrink-0" />
                <span>Apple</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-start gap-2.5 bg-white/40 border border-[#0B2C25]/15 rounded-[16px] p-3.5 text-xs text-[#0B2C25]/75">
            <img src={infoCircleIcon} alt="" className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
            <span>Votre compte doit être approuvé par l’équipe FORSA avant de publier des offres.</span>
          </div>
        )}

        {/* Elément conteneur invisible pour Google Identity Services */}
        <div id="google-hidden-btn" className="hidden" aria-hidden="true" />

        {/* Lien de redirection vers l'inscription */}
        <p className="text-center text-[14px] text-[#0B2C25]/75 pt-1">
          {role === 'CUSTOMER' ? (
            <>
              Pas encore de compte ?{' '}
              <Link to="/register?role=client" className="font-semibold text-[#17664E] hover:underline">
                Créer un compte
              </Link>
            </>
          ) : (
            <>
              Nouveau commerçant ?{' '}
              <Link to="/register?role=merchant" className="font-semibold text-[#17664E] hover:underline">
                Créer un compte professionnel
              </Link>
            </>
          )}
        </p>
      </main>

      {/* Spacer pour l'alignement vertical exact */}
      <div className="relative z-10 w-full max-w-6xl h-8" />
    </div>
  );
};
