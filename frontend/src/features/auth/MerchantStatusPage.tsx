import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Stepper,
  Card,
  Banner,
  Button,
  Chip,
  Icon,
} from '../../components/ui';
import {
  getCurrentUser,
  getStoredUser,
  logout,
  getShopVerification,
  ShopInfo,
  ShopVerificationStatus,
} from './services/authService';

export const MerchantStatusPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [verification, setVerification] = useState<ShopVerificationStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const user = await getCurrentUser();
        if (user.status === 'SUSPENDED') {
          navigate('/account/suspended', { replace: true });
          return;
        }

        if (user.shop) {
          if (mounted) setShop(user.shop);
        } else {
          const stored = getStoredUser();
          if (stored?.shop && mounted) setShop(stored.shop);
        }

        // Récupérer le statut détaillé de vérification
        try {
          const verifData = await getShopVerification();
          if (mounted) setVerification(verifData);
        } catch {
          // Si l'endpoint n'est pas encore disponible, se baser sur user.shop
        }
      } catch {
        const stored = getStoredUser();
        if (stored?.shop && mounted) setShop(stored.shop);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStatus();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login?role=merchant');
  };

  const status =
    verification?.status ||
    shop?.verificationStatus ||
    (shop as any)?.status ||
    'PENDING';

  const rejectReason =
    verification?.rejectReason ||
    (shop as any)?.rejectReason ||
    null;

  const stepperSteps = [
    { title: 'Dossier soumis' },
    { title: 'Vérification en cours' },
    { title: 'Boutique activée' },
  ];

  return (
    <div className="relative min-h-screen w-full bg-ui-auth-bg flex flex-col items-center justify-between px-4 py-8 sm:px-16 font-poppins selection:bg-ui-emerald selection:text-white overflow-x-hidden">
      {/* En-tête officiel */}
      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between mb-8 px-2 sm:px-4">
        <Link
          to="/"
          className="text-[24px] font-extrabold tracking-tight text-ui-ink hover:opacity-90 transition"
        >
          FORSA
        </Link>
        <span className="hidden sm:inline text-[14px] font-medium text-ui-ink/80">
          Espace Commerçant
        </span>
      </header>

      {/* Carte Statut principale */}
      <main className="relative z-10 w-full max-w-[560px] bg-white border border-ui-field-border rounded-[32px] p-6 sm:p-10 shadow-sm flex flex-col items-center text-center gap-6 my-auto">
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="size-8 border-3 border-ui-emerald border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-ui-text-70">Chargement de votre dossier...</p>
          </div>
        ) : (
          <>
            {/* ── ÉTAT 1 : PENDING ── */}
            {status === 'PENDING' && (
              <div className="w-full flex flex-col items-center gap-6">
                <div className="size-20 rounded-full bg-ui-mint flex items-center justify-center text-ui-emerald">
                  <Icon name="clock" size={36} />
                </div>

                <div className="space-y-2">
                  <Chip variant="warn">Vérification en cours</Chip>
                  <h1 className="text-2xl sm:text-[28px] font-bold text-ui-ink leading-tight">
                    Votre dossier est entre nos mains !
                  </h1>
                  <p className="text-sm text-ui-text-70 max-w-md mx-auto leading-relaxed">
                    Notre équipe vérifie vos pièces justificatives sous{' '}
                    <strong className="text-ui-ink font-semibold">24h à 48h ouvrées</strong>.
                    Vous recevrez une notification dès validation.
                  </p>
                </div>

                {/* Stepper de progression R0b */}
                <div className="w-full pt-2 pb-1">
                  <Stepper steps={stepperSteps} current={1} />
                </div>

                {/* Récapitulatif commerce */}
                <div className="w-full bg-stone-50 border border-ui-field-border rounded-ui-ctl p-4 text-left space-y-2">
                  <div className="flex justify-between items-center text-xs text-ui-text-70">
                    <span>Commerce déclaré</span>
                    <span className="font-semibold text-ui-ink">
                      {shop?.name || 'Mon commerce'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-ui-text-70">
                    <span>Accès au tableau de bord</span>
                    <span className="font-medium text-amber-800">
                      En attente d'approbation
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 w-full">
                  <Button
                    variant="primary"
                    onClick={() => navigate('/')}
                  >
                    Explorer l'application FORSA
                  </Button>

                  <Link
                    to="/merchant/documents"
                    className="text-xs font-semibold text-ui-emerald hover:underline py-1"
                  >
                    Consulter les pièces justificatives transmises
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs text-ui-text-70 hover:text-ui-ink hover:underline transition pt-1"
                  >
                    Se déconnecter
                  </button>
                </div>
              </div>
            )}

            {/* ── ÉTAT 2 : APPROVED ── */}
            {status === 'APPROVED' && (
              <div className="w-full flex flex-col items-center gap-6">
                <div className="size-20 rounded-full bg-ui-mint flex items-center justify-center text-ui-emerald">
                  <Icon name="check-success" size={36} />
                </div>

                <div className="space-y-2">
                  <Chip variant="success">Boutique validée</Chip>
                  <h1 className="text-2xl sm:text-[30px] font-bold text-ui-ink leading-tight">
                    Félicitations !
                  </h1>
                  <p className="text-sm text-ui-text-70 max-w-md mx-auto leading-relaxed">
                    Votre dossier a été validé avec succès. Vous pouvez dès maintenant publier
                    vos premières offres anti-gaspillage.
                  </p>
                </div>

                <div className="flex flex-col gap-3 w-full pt-2">
                  <Button
                    variant="primary"
                    onClick={() => navigate('/merchant/dashboard')}
                  >
                    Accéder à mon tableau de bord &rarr;
                  </Button>

                  <Link
                    to="/merchant/documents"
                    className="text-xs font-semibold text-ui-emerald hover:underline"
                  >
                    Voir mes documents validés
                  </Link>
                </div>
              </div>
            )}

            {/* ── ÉTAT 3 : REJECTED ── */}
            {status === 'REJECTED' && (
              <div className="w-full flex flex-col items-center gap-6">
                <div className="size-20 rounded-full bg-ui-error-bg flex items-center justify-center text-ui-error">
                  <Icon name="alert-circle" size={36} />
                </div>

                <div className="space-y-2">
                  <Chip variant="error">Dossier non validé</Chip>
                  <h1 className="text-2xl sm:text-[28px] font-bold text-ui-ink leading-tight">
                    Votre dossier nécessite une correction
                  </h1>
                  <p className="text-sm text-ui-text-70 max-w-md mx-auto leading-relaxed">
                    Certaines pièces transmises ne sont pas conformes ou sont illisibles.
                    Veuillez mettre à jour vos documents pour finaliser votre inscription.
                  </p>
                </div>

                {/* Motif de rejet réel depuis l'API */}
                <div className="w-full text-left">
                  <Banner
                    variant="error"
                    title="Motif du rejet"
                    description={
                      rejectReason ||
                      'Certaines pièces transmises ne sont pas conformes ou illisibles. Veuillez vérifier vos documents et les soumettre à nouveau.'
                    }
                  />
                </div>

                <div className="flex flex-col gap-3 w-full">
                  {/* Correction bug : le lien pointe vers /merchant/documents/resubmit */}
                  <Button
                    variant="primary"
                    onClick={() => navigate('/merchant/documents/resubmit')}
                  >
                    Mettre à jour mes documents
                  </Button>

                  <Link
                    to="/merchant/documents"
                    className="text-xs font-semibold text-ui-emerald hover:underline"
                  >
                    Consulter le détail de mes pièces transmises
                  </Link>

                  <a
                    href="mailto:support@forsa-dz.com"
                    className="text-xs text-ui-text-70 hover:underline pt-1"
                  >
                    Contacter le support FORSA
                  </a>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs text-ui-text-70 hover:text-ui-ink hover:underline pt-1"
                  >
                    Se déconnecter
                  </button>
                </div>
              </div>
            )}

            {/* ── ÉTAT 4 : SUSPENDED ── */}
            {status === 'SUSPENDED' && (
              <div className="w-full flex flex-col items-center gap-6">
                <div className="size-20 rounded-full bg-ui-error-bg flex items-center justify-center text-ui-error">
                  <Icon name="alert-warn" size={36} />
                </div>

                <div className="space-y-2">
                  <Chip variant="error">Activité suspendue</Chip>
                  <h1 className="text-2xl sm:text-[28px] font-bold text-ui-ink leading-tight">
                    Boutique suspendue temporairement
                  </h1>
                  <p className="text-sm text-ui-text-70 max-w-md mx-auto leading-relaxed">
                    L'accès à votre espace commerçant a été suspendu par l'administration.
                    Veuillez contacter notre assistance pour régulariser votre situation.
                  </p>
                </div>

                <div className="w-full text-left">
                  <Banner
                    variant="warn"
                    title="Régularisation requise"
                    description="Vos offres ont été masquées temporairement. Contactez notre équipe pour réactiver votre boutique."
                  />
                </div>

                <div className="flex flex-col gap-3 w-full pt-2">
                  <a
                    href="mailto:support@forsa-dz.com?subject=Recours boutique suspendue"
                    className="w-full"
                  >
                    <Button variant="primary" fullWidth>
                      Contacter l'assistance FORSA
                    </Button>
                  </a>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs text-ui-text-70 hover:text-ui-ink hover:underline pt-1"
                  >
                    Se déconnecter
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <div className="relative z-10 w-full max-w-4xl h-8" />
    </div>
  );
};
