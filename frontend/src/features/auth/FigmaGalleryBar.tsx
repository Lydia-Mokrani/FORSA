import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';

export const FigmaGalleryBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const screens = [
    { num: '01', name: 'Accueil', path: '/welcome' },
    { num: '02', name: 'Choix Profil', path: '/role-select' },
    { num: '03', name: 'Connexion Client', path: '/login?role=client' },
    { num: '04', name: 'Connexion Commerçant', path: '/login?role=merchant' },
    { num: '05', name: 'Erreur Identifiants', path: '/login?state=error' },
    { num: '06', name: 'Compte Suspendu', path: '/login?state=suspended' },
    { num: '07', name: 'Connexion Réussie', path: '/login?state=success' },
    { num: '08', name: 'Inscription Client', path: '/register' },
    { num: '09', name: 'Inscr. Marchand (1 Compte)', path: '/register?role=merchant&step=1' },
    { num: '10', name: 'Inscr. Marchand (2 Commerce)', path: '/register?role=merchant&step=2' },
    { num: '11', name: 'Inscr. Marchand (3 Documents)', path: '/register?role=merchant&step=3' },
    { num: '12', name: 'Demande Envoyée', path: '/register?role=merchant&step=4' },
    { num: '13', name: 'Vérification Email', path: '/verify-email?status=pending' },
    { num: '14', name: 'Email Vérifié', path: '/verify-email?status=verified' },
    { num: '15', name: 'Lien Expiré', path: '/verify-email?status=expired' },
    { num: '16', name: 'SMS OTP Téléphone', path: '/verify-phone' },
    { num: '17', name: 'MDP Oublié', path: '/forgot-password?step=request' },
    { num: '18', name: 'Lien MDP Envoyé', path: '/forgot-password?step=sent' },
    { num: '19', name: 'Nouveau MDP', path: '/forgot-password?step=reset' },
  ];

  return (
    <div className="w-full max-w-6xl z-30 mb-4 px-2">
      <div className="bg-[#0B2C25]/90 backdrop-blur-md text-white rounded-2xl p-2.5 px-4 shadow-lg border border-white/10 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold tracking-wide text-emerald-300">
              Navigation Rapide Figma · Section Login (19 Écrans)
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 text-[11px] bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition"
          >
            <span>{isOpen ? 'Masquer la galerie' : 'Voir les 19 écrans'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isOpen && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-1.5 pt-2 border-t border-white/10">
            {screens.map((s) => {
              const active = location.pathname + location.search === s.path;
              return (
                <Link
                  key={s.num}
                  to={s.path}
                  className={`text-[11px] p-1.5 px-2 rounded-lg text-center font-medium transition truncate ${
                    active
                      ? 'bg-emerald-500 text-white shadow-sm font-bold'
                      : 'bg-white/5 hover:bg-white/15 text-white/80'
                  }`}
                  title={`${s.num} · ${s.name}`}
                >
                  <span className="text-emerald-300 font-mono mr-1">{s.num}</span>
                  {s.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
