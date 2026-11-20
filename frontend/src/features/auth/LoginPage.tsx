import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Store, Mail, Lock, Eye, EyeOff, ArrowRight, Info, AlertCircle } from 'lucide-react';
import loginBg from '../../assets/login-bg.png';
import googleSvg from '../../assets/google.svg';
import appleSvg from '../../assets/apple.svg';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<'CUSTOMER' | 'MERCHANT'>('CUSTOMER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleRole = () => {
    setRole((prev) => (prev === 'CUSTOMER' ? 'MERCHANT' : 'CUSTOMER'));
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Identifiants invalides');
      }

      // Stockage sécurisé des tokens
      if (data.accessToken) {
        localStorage.setItem('forsa_access_token', data.accessToken);
        if (rememberMe && data.refreshToken) {
          localStorage.setItem('forsa_refresh_token', data.refreshToken);
        }
        localStorage.setItem('forsa_user', JSON.stringify(data.user));
      }

      // Redirection selon le rôle
      if (data.user?.role === 'MERCHANT') {
        navigate('/merchant/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de la connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-8 sm:px-8 font-poppins selection:bg-forsa-leaf selection:text-white overflow-x-hidden">
      {/* Fond photo bokeh feuille verte officiel Figma */}
      <div aria-hidden className="absolute inset-0 pointer-events-none -z-10">
        <img
          src={loginBg}
          alt="Lush green leaf background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#FFFAF0]/25 backdrop-blur-[2px]" />
      </div>

      {/* En-tête officiel Desktop / Mobile */}
      <header className="w-full max-w-6xl flex items-center justify-between mb-8 sm:mb-12 px-2 sm:px-6">
        <Link to="/" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-xs sm:text-sm font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* Carte Glassmorphism fidèle au design Figma */}
      <main className="w-full max-w-[520px] backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[32px] p-6 sm:p-12 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col gap-5 sm:gap-6">
        
        {/* Pastille rôle : Espace client / Espace commerçant · Changer */}
        <div className="flex items-center justify-center w-full">
          <button
            type="button"
            onClick={toggleRole}
            className="group inline-flex items-center gap-2 bg-white/65 hover:bg-white/85 border border-[#0B2C25]/20 px-3.5 py-1.5 rounded-full transition-all duration-150 shadow-sm"
          >
            {role === 'CUSTOMER' ? (
              <User className="w-4 h-4 text-[#0B2C25]" />
            ) : (
              <Store className="w-4 h-4 text-[#0B2C25]" />
            )}
            <span className="text-xs sm:text-[13px] font-medium text-[#0B2C25]">
              {role === 'CUSTOMER' ? 'Espace client' : 'Espace commerçant'}
            </span>
            <span className="text-xs text-[#0B2C25]/40">·</span>
            <span className="text-xs sm:text-[13px] font-medium text-[#17664E] group-hover:underline">
              Changer
            </span>
          </button>
        </div>

        {/* Titre & Sous-titre */}
        <div className="text-center flex flex-col gap-1.5 sm:gap-2">
          <h1 className="text-2xl sm:text-[34px] font-semibold text-[#0B2C25] leading-tight">
            {role === 'CUSTOMER' ? 'Bon retour !' : 'Espace commerçant'}
          </h1>
          <p className="text-xs sm:text-[15px] text-[#0B2C25]/65 leading-relaxed">
            {role === 'CUSTOMER'
              ? 'Connectez-vous pour retrouver les offres près de chez vous'
              : 'Gérez vos offres et vos réservations'}
          </p>
        </div>

        {/* Bannière d'erreur si échec */}
        {errorMessage && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-800 text-xs sm:text-sm px-4 py-3 rounded-xl animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulaire de connexion */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 sm:gap-4">
          {/* Champ Email */}
          <div className="relative flex items-center bg-white/65 focus-within:bg-white/90 border-[1.2px] border-white/95 focus-within:border-[#17664E] rounded-[14px] h-14 px-4 transition-all duration-150">
            <Mail className="w-5 h-5 text-[#0B2C25]/50 shrink-0 mr-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === 'CUSTOMER' ? 'Adresse e-mail' : 'E-mail professionnel'}
              className="w-full bg-transparent text-[#0B2C25] placeholder-[#0B2C25]/50 text-sm sm:text-[15px] focus:outline-none"
            />
          </div>

          {/* Champ Mot de passe */}
          <div className="relative flex items-center bg-white/65 focus-within:bg-white/90 border-[1.2px] border-white/95 focus-within:border-[#17664E] rounded-[14px] h-14 px-4 transition-all duration-150">
            <Lock className="w-5 h-5 text-[#0B2C25]/50 shrink-0 mr-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full bg-transparent text-[#0B2C25] placeholder-[#0B2C25]/50 text-sm sm:text-[15px] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-[#0B2C25]/50 hover:text-[#0B2C25] p-1 transition"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Options : Se souvenir de moi & Mot de passe oublié */}
          <div className="flex items-center justify-between text-xs sm:text-[14px] pt-1">
            <label className="flex items-center gap-2.5 text-[#0B2C25]/85 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#0B2C25]/50 text-[#0B2C25] focus:ring-0 cursor-pointer"
              />
              <span>Se souvenir de moi</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-xs sm:text-[13px] font-medium text-[#17664E] hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          {/* Bouton Principal */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-[#0B2C25] hover:bg-[#0B2C25]/90 active:scale-[0.99] text-white font-medium text-base sm:text-[17px] rounded-[16px] flex items-center justify-center gap-2.5 shadow-[0_10px_20px_-5px_rgba(11,44,37,0.30)] transition-all duration-150 mt-1"
          >
            {loading ? (
              <span className="inline-block animate-spin mr-2">⏳</span>
            ) : null}
            <span>Se connecter</span>
            <ArrowRight className="w-5 h-5 shrink-0" />
          </button>
        </form>

        {/* Section Commerçant uniquement : Message d'information */}
        {role === 'MERCHANT' && (
          <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-600/20 text-[#0B2C25] text-xs sm:text-[13px] p-3.5 rounded-2xl">
            <Info className="w-4 h-4 text-[#17664E] shrink-0 mt-0.5" />
            <p className="leading-snug">
              Votre compte doit être approuvé par l’équipe FORSA avant de publier des offres.
            </p>
          </div>
        )}

        {/* Section Client uniquement : Séparateur et Connexion Sociale */}
        {role === 'CUSTOMER' && (
          <>
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-[#0B2C25]/15" />
              <span className="text-[12px] text-[#0B2C25]/50 uppercase tracking-wider">
                OU
              </span>
              <div className="flex-1 h-px bg-[#0B2C25]/15" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="h-12 bg-white/60 hover:bg-white/85 border border-[#0B2C25]/18 rounded-[16px] flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-[#0B2C25] transition shadow-sm"
              >
                <img src={googleSvg} alt="Google" className="w-5 h-5 shrink-0" />
                <span>Google</span>
              </button>

              <button
                type="button"
                className="h-12 bg-white/60 hover:bg-white/85 border border-[#0B2C25]/18 rounded-[16px] flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-[#0B2C25] transition shadow-sm"
              >
                <img src={appleSvg} alt="Apple" className="w-5 h-5 shrink-0" />
                <span>Apple</span>
              </button>
            </div>
          </>
        )}

        {/* Lien de redirection vers l'inscription */}
        <p className="text-center text-xs sm:text-[14px] text-[#0B2C25]/70 pt-2">
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
      </main>

      {/* Footer copyright */}
      <footer className="mt-8 sm:mt-12 text-center text-xs text-[#0B2C25]/60">
        © 2026 FORSA (فرصة) · Plateforme anti-gaspillage alimentaire
      </footer>
    </div>
  );
};
