import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import loginBg from '../../assets/login-bg.png';
import googleSvg from '../../assets/icons/google.svg';
import appleSvg from '../../assets/icons/apple.svg';
import emailSvg from '../../assets/icons/email.svg';
import lockSvg from '../../assets/icons/lock.svg';
import eyeSvg from '../../assets/icons/eye.svg';
import arrowRightSvg from '../../assets/icons/arrow-right.svg';
import userSvg from '../../assets/icons/user.svg';

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
      setErrorMessage('Adresse e-mail ou mot de passe incorrect.');
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
        throw new Error(data?.error?.message || 'Identifiants invalides.');
      }

      handleLoginSuccess(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Adresse e-mail ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'Google' | 'Apple') => {
    setErrorMessage(null);
    if (provider === 'Apple') {
      setErrorMessage('La connexion avec Apple n\'est pas encore disponible.');
      return;
    }
    if (provider === 'Google') {
      setErrorMessage('Connexion Google bientôt disponible. En attendant, utilisez votre e-mail et mot de passe.');
      return;
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-6 py-8 sm:px-16 font-poppins selection:bg-forsa-leaf selection:text-white bg-[#fffaf0] overflow-x-hidden">
      {/* Fond photo bokeh feuille verte officiel Figma 1030:23480 */}
      <div aria-hidden className="absolute inset-0 pointer-events-none -z-10">
        <img src={loginBg} alt="Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FFFAF0]/28 backdrop-blur-[2px]" />
      </div>

      {/* En-tête Figma 1030:23481 */}
      <header className="w-full max-w-6xl flex items-center justify-between mb-8 z-10">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="text-[14px] font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* 07 · Connexion réussie · Modal overlay */}
      {isSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-8 flex flex-col items-center text-center gap-4 shadow-2xl border border-emerald-500/30">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-[#17664E] flex items-center justify-center">
              <CheckCircle className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-[#0B2C25]">Connexion réussie !</h2>
            <p className="text-sm text-[#0B2C25]/75">
              Ravi de vous revoir sur FORSA. Redirection en cours...
            </p>
          </div>
        </div>
      )}

      {/* Carte Glassmorphism fidèle à 100% au design Figma 1030:23484 */}
      <main className="backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[32px] p-8 sm:p-12 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] flex flex-col gap-[22px] my-auto max-w-[520px] w-full z-10">
        
        {/* Pastille rôle : Espace client / Espace commerçant · Changer (Figma 1030:23486) */}
        <div className="flex items-center justify-center w-full">
          <button
            type="button"
            onClick={toggleRole}
            className="group inline-flex items-center gap-2 bg-white/60 hover:bg-white/85 border border-[#0B2C25]/20 px-[14px] py-[8px] rounded-[24px] transition shadow-sm cursor-pointer"
          >
            <img src={userSvg} alt="User" className="size-4 shrink-0" />
            <span className="text-[13px] font-medium text-[#0B2C25]">
              {role === 'CUSTOMER' ? 'Espace client' : 'Espace commerçant'}
            </span>
            <span className="text-[#0B2C25]/40 text-[13px]">·</span>
            <span className="text-[13px] font-medium text-[#17664E] group-hover:underline">
              Changer
            </span>
          </button>
        </div>

        {/* Titres et sous-titres (Figma 1030:23487) */}
        <div className="text-center flex flex-col gap-2 w-full">
          <h1 className="font-semibold text-[#0B2C25] text-2xl sm:text-[34px] leading-tight">
            Bon retour !
          </h1>
          <p className="font-normal text-[15px] text-[#0B2C25]/65 leading-normal">
            {role === 'CUSTOMER'
              ? 'Connectez-vous pour retrouver les offres près de chez vous'
              : 'Gérez vos offres et valorisez vos invendus'}
          </p>
        </div>

        {/* 05 · Message d'erreur : Identifiants incorrects */}
        {errorMessage && (
          <div className="flex items-start gap-3 bg-red-500/15 border border-red-500/40 text-red-900 text-xs sm:text-[13px] p-3.5 rounded-2xl">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-semibold">Identifiants incorrects</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* 06 · Message d'alerte : Compte suspendu */}
        {isSuspended && (
          <div className="flex items-start gap-3 bg-amber-500/20 border border-amber-600/40 text-amber-950 text-xs sm:text-[13px] p-3.5 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-semibold">Compte temporairement suspendu</span>
              <span>Ce compte est temporairement suspendu pour non-respect des règles. Contactez le support FORSA.</span>
            </div>
          </div>
        )}

        {/* Formulaire de connexion Figma 1030:23490 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-[14px] w-full">
          {/* Champ Email avec icône Figma */}
          <div className="bg-white/60 focus-within:bg-white/85 border-[1.2px] border-white/90 focus-within:border-[#17664E] rounded-[14px] h-[56px] px-[18px] flex items-center gap-3 transition">
            <img src={emailSvg} alt="Email" className="size-5 shrink-0 opacity-70" />
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
            <img src={lockSvg} alt="Lock" className="size-5 shrink-0 opacity-70" />
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
              className="absolute right-4 text-[#0B2C25]/50 hover:text-[#0B2C25] transition"
              aria-label={showPassword ? 'Masquer' : 'Afficher'}
            >
              <img src={eyeSvg} alt="Toggle visibility" className="size-5 opacity-60" />
            </button>
          </div>

          {/* Options : Se souvenir de moi & Mot de passe oublié (Figma 1030:23493) */}
          <div className="flex items-center justify-between w-full pt-1">
            <label className="flex items-center gap-3 cursor-pointer text-[14px] text-[#0B2C25]/85 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-[22px] rounded-[6px] border-[1.2px] border-[#0B2C25]/50 bg-white/75 text-[#0B2C25] focus:ring-0 cursor-pointer"
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
            className="w-full h-[56px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[17px] rounded-[16px] flex items-center justify-center gap-2.5 shadow-md transition mt-2 cursor-pointer"
          >
            {loading ? (
              <span>Connexion en cours...</span>
            ) : (
              <>
                <span>Se connecter</span>
                <img src={arrowRightSvg} alt="Arrow" className="w-5 h-5 invert brightness-0" />
              </>
            )}
          </button>
        </form>

        {/* Section Connexion Sociale Figma */}
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

        {/* Lien de redirection vers l'inscription */}
        <p className="text-center text-[14px] text-[#0B2C25]/75 pt-1">
          {role === 'CUSTOMER' ? (
            <>
              Pas encore de compte ?{' '}
              <Link to="/register" className="font-semibold text-[#17664E] hover:underline">
                Créer un compte
              </Link>
            </>
          ) : (
            <>
              Nouveau commerçant ?{' '}
              <Link to="/register?role=merchant" className="font-semibold text-[#17664E] hover:underline">
                Créer un compte
              </Link>
            </>
          )}
        </p>
      </main>

      {/* Footer minimaliste */}
      <footer className="w-full max-w-6xl text-center text-xs text-[#0B2C25]/60 mt-8 py-2 z-10">
        © 2026 FORSA — Plateforme anti-gaspillage alimentaire DZ.
      </footer>
    </div>
  );
};
