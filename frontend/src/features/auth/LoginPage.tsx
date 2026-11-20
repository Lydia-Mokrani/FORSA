import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Store, AlertCircle, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import loginBg from '../../assets/login-bg.png';
import googleSvg from '../../assets/icons/google.svg';
import appleSvg from '../../assets/icons/apple.svg';
import emailSvg from '../../assets/icons/email.svg';
import lockSvg from '../../assets/icons/lock.svg';
import eyeSvg from '../../assets/icons/eye.svg';
import arrowRightSvg from '../../assets/icons/arrow-right.svg';
import userSvg from '../../assets/icons/user.svg';
import { FigmaGalleryBar } from './FigmaGalleryBar';

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
      setErrorMessage('Adresse e-mail ou mot de passe incorrect. Veuillez vérifier vos identifiants.');
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
    setRole((prev) => (prev === 'CUSTOMER' ? 'MERCHANT' : 'CUSTOMER'));
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
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 || data?.error?.message?.includes('suspendu')) {
          setIsSuspended(true);
          return;
        }
        throw new Error(data?.error?.message || 'Identifiants invalides');
      }

      handleLoginSuccess(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Adresse e-mail ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'Google' | 'Apple') => {
    setLoading(true);
    setErrorMessage(null);
    setIsSuspended(false);

    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `${provider.toLowerCase()}.user@forsa.dz`,
          fullName: `Utilisateur ${provider}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Échec de connexion');
      }

      handleLoginSuccess(data);
    } catch {
      // Fallback local direct
      handleLoginSuccess({
        accessToken: 'fake_jwt_token_demo',
        user: {
          id: `usr_${provider.toLowerCase()}`,
          email: `${provider.toLowerCase()}@forsa.dz`,
          fullName: `Hiba Hambli (${provider})`,
          role: 'CUSTOMER',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-4 py-6 sm:px-8 font-poppins selection:bg-forsa-leaf selection:text-white overflow-x-hidden">
      {/* Fond photo bokeh feuille verte officiel Figma */}
      <div aria-hidden className="absolute inset-0 pointer-events-none -z-10">
        <img
          src={loginBg}
          alt="Lush green leaf background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#FFFAF0]/25 backdrop-blur-[2px]" />
      </div>

      {/* Galerie de sélection Figma (19 Écrans) */}
      <FigmaGalleryBar />

      {/* En-tête officiel Desktop / Mobile */}
      <header className="w-full max-w-6xl flex items-center justify-between mb-4 px-2 sm:px-6">
        <Link to="/" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-xs sm:text-sm font-medium text-[#0B2C25]/85">
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
              Ravi de vous revoir sur FORSA. Redirection vers votre espace en cours...
            </p>
          </div>
        </div>
      )}

      {/* Carte Glassmorphism fidèle au design Figma (Frames 03, 04, 05, 06) */}
      <main className="w-full max-w-[520px] backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[32px] p-6 sm:p-10 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col gap-5 my-auto">
        
        {/* Pastille rôle : Espace client / Espace commerçant · Changer */}
        <div className="flex items-center justify-center w-full">
          <button
            type="button"
            onClick={toggleRole}
            className="group inline-flex items-center gap-2 bg-white/65 hover:bg-white/85 border border-[#0B2C25]/20 px-4 py-2 rounded-full transition-all duration-150 shadow-sm"
          >
            <img src={userSvg} alt="User" className="w-4 h-4" />
            <span className="text-xs sm:text-[13px] font-medium text-[#0B2C25]">
              {role === 'CUSTOMER' ? 'Espace client' : 'Espace commerçant'}
            </span>
            <span className="text-[#0B2C25]/40 text-xs">·</span>
            <span className="text-xs sm:text-[13px] font-semibold text-[#17664E] group-hover:underline">
              Changer
            </span>
          </button>
        </div>

        {/* Titres et sous-titres */}
        <div className="text-center flex flex-col gap-1.5">
          <h1 className="text-2xl sm:text-[32px] font-semibold text-[#0B2C25] tracking-tight">
            Bon retour !
          </h1>
          <p className="text-xs sm:text-[15px] text-[#0B2C25]/65">
            {role === 'CUSTOMER'
              ? 'Connectez-vous pour retrouver les offres près de chez vous'
              : 'Gérez vos paniers invendus et vos réservations quotidiennes'}
          </p>
        </div>

        {/* 05 · Message d'erreur : Identifiants incorrects */}
        {errorMessage && (
          <div className="flex items-start gap-3 bg-red-500/15 border border-red-500/40 text-red-900 text-xs sm:text-[13px] p-3.5 rounded-2xl animate-shake">
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
              <span>Ce compte commerçant est temporairement suspendu pour non-conformité. Contactez l'administration FORSA.</span>
            </div>
          </div>
        )}

        {/* Formulaire de connexion avec icônes Figma */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Champ Email avec icône Figma email.svg */}
          <div className="flex items-center bg-white/65 hover:bg-white/80 focus-within:bg-white/90 border-[1.2px] border-white/95 focus-within:border-[#17664E] rounded-[16px] h-13 px-4 transition-all duration-150 shadow-inner">
            <img src={emailSvg} alt="Email" className="w-5 h-5 mr-3 opacity-70" />
            <input
              type="email"
              required
              placeholder="Adresse e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-[#0B2C25] text-sm placeholder:text-[#0B2C25]/45 focus:outline-none"
            />
          </div>

          {/* Champ Mot de passe avec icône Figma lock.svg et eye.svg */}
          <div className="relative flex items-center bg-white/65 hover:bg-white/80 focus-within:bg-white/90 border-[1.2px] border-white/95 focus-within:border-[#17664E] rounded-[16px] h-13 px-4 transition-all duration-150 shadow-inner">
            <img src={lockSvg} alt="Lock" className="w-5 h-5 mr-3 opacity-70" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-[#0B2C25] text-sm placeholder:text-[#0B2C25]/45 focus:outline-none pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 text-[#0B2C25]/45 hover:text-[#0B2C25] transition"
              aria-label={showPassword ? 'Masquer' : 'Afficher'}
            >
              <img src={eyeSvg} alt="Toggle visibility" className="w-5 h-5 opacity-70" />
            </button>
          </div>

          {/* Options : Se souvenir de moi & Mot de passe oublié */}
          <div className="flex items-center justify-between text-xs sm:text-[13px] pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-[#0B2C25]/80 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#0B2C25]/30 text-[#17664E] focus:ring-[#17664E]"
              />
              <span>Se souvenir de moi</span>
            </label>

            <Link
              to="/forgot-password"
              className="text-[#17664E] font-medium hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          {/* Bouton CTA Principal avec flèche Figma */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-13 bg-[#0B2C25] hover:bg-[#17664E] active:scale-[0.99] text-white font-medium text-sm sm:text-base rounded-[16px] flex items-center justify-center gap-2 shadow-[0px_10px_20px_0px_rgba(11,44,37,0.30)] transition-all duration-200 mt-2"
          >
            {loading ? (
              <span>Connexion en cours...</span>
            ) : (
              <>
                <span>Se connecter</span>
                <img src={arrowRightSvg} alt="Arrow" className="w-4 h-4 invert brightness-0" />
              </>
            )}
          </button>
        </form>

        {/* Section Connexion Sociale avec vrais logos Google et Apple */}
        <div className="flex items-center gap-3 my-0.5">
          <div className="flex-1 h-px bg-[#0B2C25]/15" />
          <span className="text-[11px] text-[#0B2C25]/50 uppercase tracking-wider font-semibold">
            OU
          </span>
          <div className="flex-1 h-px bg-[#0B2C25]/15" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleSocialLogin('Google')}
            className="h-12 bg-white/60 hover:bg-white/85 active:scale-[0.99] border border-[#0B2C25]/18 rounded-[16px] flex items-center justify-center gap-2.5 text-xs sm:text-sm font-medium text-[#0B2C25] transition shadow-sm"
          >
            <img src={googleSvg} alt="Google" className="w-5 h-5 shrink-0" />
            <span>Google</span>
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin('Apple')}
            className="h-12 bg-white/60 hover:bg-white/85 active:scale-[0.99] border border-[#0B2C25]/18 rounded-[16px] flex items-center justify-center gap-2.5 text-xs sm:text-sm font-medium text-[#0B2C25] transition shadow-sm"
          >
            <img src={appleSvg} alt="Apple" className="w-5 h-5 shrink-0" />
            <span>Apple</span>
          </button>
        </div>

        {/* Lien de redirection vers l'inscription */}
        <p className="text-center text-xs sm:text-[14px] text-[#0B2C25]/75 pt-1">
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
                Créer un compte professionnel
              </Link>
            </>
          )}
        </p>

        {/* Comptes de test en 1 clic pour soutenance */}
        <div className="p-3 bg-white/30 rounded-xl border border-white/60 text-[11px] text-[#0B2C25]/70 flex flex-col gap-1">
          <span className="font-semibold text-[#0B2C25]">Comptes de test (cliquez pour remplir) :</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail('client@forsa.dz');
                setPassword('Password123!');
                setRole('CUSTOMER');
              }}
              className="px-2 py-0.5 bg-white/70 hover:bg-white rounded text-[#17664E] font-medium"
            >
              Client (client@forsa.dz)
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('merchant@forsa.dz');
                setPassword('Password123!');
                setRole('MERCHANT');
              }}
              className="px-2 py-0.5 bg-white/70 hover:bg-white rounded text-[#17664E] font-medium"
            >
              Commerçant (merchant@forsa.dz)
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('suspendu@forsa.dz');
                setPassword('Password123!');
                setRole('MERCHANT');
              }}
              className="px-2 py-0.5 bg-white/70 hover:bg-white rounded text-amber-800 font-medium"
            >
              Suspendu (Frame 06)
            </button>
          </div>
        </div>
      </main>

      <footer className="w-full max-w-6xl text-center text-xs text-[#0B2C25]/60 mt-4">
        © 2026 FORSA (فرصة) · Plateforme anti-gaspillage alimentaire
      </footer>
    </div>
  );
};
