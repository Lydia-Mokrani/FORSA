import React, { useState } from 'react';

export const LoginPage: React.FC = () => {
  const [role, setRole] = useState<'customer' | 'merchant'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <div className="relative min-h-screen w-full bg-forsa-cream overflow-hidden flex flex-col justify-between selection:bg-forsa-leaf selection:text-white">
      {/* 1. LUEURS ATMOSPHÉRIQUES (Donne la profondeur au Glassmorphism) */}
      <div 
        className="absolute -top-24 -left-24 w-96 h-96 lg:w-[650px] lg:h-[650px] rounded-full bg-forsa-leaf/20 blur-[100px] pointer-events-none" 
      />
      <div 
        className="absolute top-1/2 -right-24 w-80 h-80 lg:w-[550px] lg:h-[550px] rounded-full bg-amber-400/15 blur-[100px] pointer-events-none" 
      />

      {/* 2. EN-TÊTE / NAVBAR */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-forsa-dark text-white flex items-center justify-center text-lg shadow-sm">
            🌱
          </div>
          <span className="font-poppins font-extrabold text-2xl text-forsa-dark tracking-tight">
            FORSA <span className="text-xl font-bold font-arabic">فرصة</span>
          </span>
        </div>
        <p className="hidden md:block text-sm font-medium text-forsa-dark/65">
          Donnez une seconde vie à vos invendus
        </p>
      </header>

      {/* 3. CONTENU PRINCIPAL (Split screen Desktop / Centré Mobile) */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 lg:py-8 flex-1 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* COLONNE GAUCHE (Desktop uniquement : Message de marque & Impact) */}
        <div className="hidden lg:flex flex-col items-start max-w-xl space-y-7">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 border border-forsa-leaf/40 shadow-sm text-xs font-medium text-forsa-dark">
            <span className="w-2 h-2 rounded-full bg-forsa-leaf animate-pulse" />
            Plateforme solidaire anti-gaspillage alimentaire
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold text-forsa-dark leading-[1.18] tracking-tight">
            Sauvez des invendus.<br />
            <span className="text-forsa-emerald">Savourez à prix réduit.</span>
          </h1>

          <p className="text-base text-forsa-dark/70 leading-relaxed">
            Retrouvez chaque jour les surplus de vos commerçants locaux (boulangeries, restaurants, primeurs) à prix cassé. Réservez en ligne et retirez directement sur place.
          </p>

          {/* Cartes d'impact */}
          <div className="grid grid-cols-3 gap-4 w-full pt-2">
            <div className="p-4 rounded-2xl bg-white/65 border border-white/80 shadow-sm flex flex-col">
              <span className="text-lg font-bold text-forsa-dark">-50% à -70%</span>
              <span className="text-xs text-forsa-dark/60 mt-0.5">Sur vos paniers</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/65 border border-white/80 shadow-sm flex flex-col">
              <span className="text-lg font-bold text-forsa-dark">100% Frais</span>
              <span className="text-xs text-forsa-dark/60 mt-0.5">Contrôlé par OCR</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/65 border border-white/80 shadow-sm flex flex-col">
              <span className="text-lg font-bold text-forsa-dark">Retrait Simple</span>
              <span className="text-xs text-forsa-dark/60 mt-0.5">En boutique par QR</span>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : CARTE GLASSMORPHISM (Inspiration ScentCraft) */}
        <div className="w-full max-w-[460px] mx-auto forsa-glass-card p-7 sm:p-9 flex flex-col items-center">
          
          {/* Emblème végétal en haut de carte */}
          <div className="w-12 h-12 rounded-full bg-white/80 border border-forsa-emerald/25 shadow-sm flex items-center justify-center text-xl mb-3">
            🌿
          </div>

          {/* Pastille Sélecteur de Rôle (MS1 : Client vs Commerçant) */}
          <div className="forsa-role-pill mb-4 shadow-sm">
            <span>{role === 'customer' ? '👤 Espace Client' : '🏪 Espace Commerçant'}</span>
            <span className="text-forsa-dark/40">·</span>
            <button 
              type="button"
              onClick={() => setRole(r => r === 'customer' ? 'merchant' : 'customer')}
              className="text-forsa-emerald font-semibold hover:underline"
            >
              Passer en {role === 'customer' ? 'Commerçant' : 'Client'}
            </button>
          </div>

          {/* Titre & Sous-titre */}
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-semibold text-forsa-dark">
              Bon retour !
            </h2>
            <p className="text-xs sm:text-sm text-forsa-dark/65 mt-1">
              Connectez-vous pour retrouver vos offres à proximité
            </p>
          </div>

          {/* Formulaire */}
          <form className="w-full space-y-3.5" onSubmit={(e) => e.preventDefault()}>
            {/* Champ Email */}
            <div className="relative flex items-center">
              <span className="absolute left-4 text-forsa-dark/50 text-base">✉️</span>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Adresse e-mail"
                className="forsa-input w-full pl-11 text-sm placeholder:text-forsa-dark/45"
                required
              />
            </div>

            {/* Champ Mot de passe */}
            <div className="relative flex items-center">
              <span className="absolute left-4 text-forsa-dark/50 text-base">🔒</span>
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                className="forsa-input w-full pl-11 pr-11 text-sm placeholder:text-forsa-dark/45"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-forsa-dark/50 hover:text-forsa-dark text-sm transition-colors"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            {/* Options (Se souvenir de moi + Mot de passe oublié) */}
            <div className="flex items-center justify-between text-xs sm:text-sm pt-1 pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-forsa-dark/85">
                <input 
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-forsa-dark/30 text-forsa-emerald focus:ring-forsa-emerald"
                />
                <span>Se souvenir de moi</span>
              </label>

              <a 
                href="#forgot-password" 
                className="text-forsa-emerald font-medium hover:underline text-xs sm:text-sm"
              >
                Mot de passe oublié ?
              </a>
            </div>

            {/* Bouton CTA Principal */}
            <button 
              type="submit"
              className="forsa-btn-primary w-full h-14 text-base font-semibold gap-2 mt-2"
            >
              <span>Se connecter</span>
              <span>→</span>
            </button>

            {/* Séparateur OU */}
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-forsa-dark/15" />
              <span className="text-xs uppercase text-forsa-dark/45 tracking-wider">ou</span>
              <div className="flex-1 h-px bg-forsa-dark/15" />
            </div>

            {/* Boutons Sociaux */}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="forsa-btn-social text-xs sm:text-sm">
                <span>Google</span>
              </button>
              <button type="button" className="forsa-btn-social text-xs sm:text-sm">
                <span>Apple</span>
              </button>
            </div>

            {/* Lien d'inscription */}
            <div className="text-center pt-3 text-xs sm:text-sm text-forsa-dark/70">
              Pas encore de compte ?{' '}
              <a href="#register" className="text-forsa-emerald font-semibold hover:underline">
                Créer un compte
              </a>
            </div>
          </form>

        </div>
      </main>

      {/* 4. FOOTER DISCRET */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 text-center text-xs text-forsa-dark/40">
        © 2026 FORSA (فرصة) · Plateforme anti-gaspillage alimentaire
      </footer>
    </div>
  );
};

export default LoginPage;
