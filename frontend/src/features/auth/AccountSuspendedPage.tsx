import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Banner,
  Button,
  Chip,
  Icon,
} from '../../components/ui';
import { logout } from './services/authService';

export const AccountSuspendedPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen w-full bg-ui-auth-bg flex flex-col items-center justify-between px-4 py-8 sm:px-16 font-poppins selection:bg-ui-emerald selection:text-white overflow-x-hidden">
      {/* En-tête */}
      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between mb-8 px-2 sm:px-4">
        <Link
          to="/"
          className="text-[24px] font-extrabold tracking-tight text-ui-ink hover:opacity-90 transition"
        >
          FORSA
        </Link>
      </header>

      {/* Carte Suspension */}
      <main className="relative z-10 w-full max-w-[500px] bg-white border border-ui-field-border rounded-[32px] p-6 sm:p-10 shadow-sm flex flex-col items-center text-center gap-6 my-auto">
        <div className="size-20 rounded-full bg-ui-error-bg flex items-center justify-center text-ui-error shadow-sm">
          <Icon name="alert-warn" size={36} />
        </div>

        <div className="space-y-2">
          <Chip variant="error">Sécurité du réseau FORSA</Chip>
          <h1 className="text-2xl sm:text-[30px] font-bold text-ui-ink leading-tight">
            Compte suspendu
          </h1>
          <p className="text-sm text-ui-text-70 leading-relaxed max-w-sm mx-auto">
            Votre compte a été suspendu par notre équipe de modération en raison de signalements
            répétés ou d'une non-conformité avec les conditions d'utilisation de la plateforme.
          </p>
        </div>

        <div className="w-full text-left">
          <Banner
            variant="warn"
            title="Procédure de réexamen"
            description="Pour toute réclamation ou demande de réexamen de votre dossier, transmettez vos justificatifs à l'adresse support@forsa-dz.com."
          />
        </div>

        <div className="flex flex-col gap-3 w-full pt-1">
          <a
            href="mailto:support@forsa-dz.com?subject=Demande de recours compte suspendu"
            className="w-full"
          >
            <Button variant="primary" fullWidth>
              Contacter l'assistance FORSA
            </Button>
          </a>

          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-ui-text-70 hover:text-ui-ink hover:underline transition pt-1"
          >
            Retour à la connexion
          </button>
        </div>
      </main>

      <div className="relative z-10 w-full max-w-4xl h-8" />
    </div>
  );
};
