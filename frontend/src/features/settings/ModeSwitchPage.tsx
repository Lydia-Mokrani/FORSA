import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Header,
  Card,
  Banner,
  Chip,
  Button,
  ResponsiveDialog,
  Icon,
} from '../../components/ui';
import {
  getCurrentUser,
  switchUserMode,
  AuthUser,
} from '../auth/services/authService';

export const ModeSwitchPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetRole, setTargetRole] = useState<'CUSTOMER' | 'MERCHANT' | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      try {
        const u = await getCurrentUser();
        if (mounted) setUser(u);
      } catch {
        const cached = localStorage.getItem('forsa_user');
        if (cached && mounted) {
          try {
            setUser(JSON.parse(cached));
          } catch {}
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  const roles = user?.roles || [];
  const isCurrentlyMerchant = roles.includes('MERCHANT') || user?.activeMode === 'merchant';
  const shopStatus = (user as any)?.shop?.status || (user as any)?.shopStatus || null;
  const isShopApproved = shopStatus === 'APPROVED';
  const hasPendingShop = shopStatus === 'PENDING';
  const hasRejectedShop = shopStatus === 'REJECTED';

  const handleRequestSwitch = (role: 'CUSTOMER' | 'MERCHANT') => {
    setError(null);
    if (role === 'MERCHANT' && !isShopApproved && !isCurrentlyMerchant) {
      // Disabled state
      return;
    }
    setTargetRole(role);
    setShowConfirmModal(true);
  };

  const handleConfirmSwitch = async () => {
    if (!targetRole) return;
    setSwitching(true);
    setError(null);
    try {
      const result = await switchUserMode(targetRole);
      // Mettre à jour l'utilisateur local
      if (user) {
        const updatedUser: AuthUser = {
          ...user,
          roles: targetRole === 'MERCHANT' ? ['MERCHANT'] : ['CUSTOMER'],
          activeMode: targetRole === 'MERCHANT' ? 'merchant' : 'customer',
        };
        setUser(updatedUser);
        localStorage.setItem('forsa_user', JSON.stringify(updatedUser));
      }

      setShowConfirmModal(false);

      if (targetRole === 'MERCHANT') {
        navigate('/merchant/dashboard');
      } else {
        navigate('/deals');
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de basculer de mode actuellement.');
      setShowConfirmModal(false);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="min-h-screen bg-ui-page p-4 sm:p-6 md:p-10 font-poppins text-ui-ink">
      <div className="max-w-3xl mx-auto space-y-6">
        <Header
          breadcrumb={['Mon compte', 'Paramètres', 'Mode']}
          title="Changement de mode"
          subtitle="Basculez entre votre profil client et votre espace commerçant"
          mobileSubtitle="Mode client / commerçant"
          onBack={() => navigate('/settings')}
        />

        {error && (
          <Banner
            variant="error"
            title="Erreur de bascule"
            description={error}
          />
        )}

        {/* State 4 : Boutique non approuvée */}
        {!isCurrentlyMerchant && !isShopApproved && (
          <Banner
            variant="warn"
            title="Espace commerçant restreint"
            description={
              hasPendingShop
                ? "Votre dossier commerçant est en cours de validation par l'équipe FORSA. Vous pourrez basculer en mode commerçant dès son approbation."
                : hasRejectedShop
                ? "Votre dossier commerçant a été refusé. Veuillez consulter le motif et téléverser les pièces requises."
                : "Vous n'avez pas encore enregistré de commerce sur FORSA. Pour accéder aux outils commerçants, enregistrez votre boutique."
            }
          />
        )}

        {/* Carte Mode Actuel & Sélection */}
        <Card
          icon={<Icon name="building" size={20} />}
          title="Mode actif actuel"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-ui-ctl bg-stone-50 border border-ui-field-border">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-ui-mint flex items-center justify-center text-ui-emerald">
                  <Icon name={isCurrentlyMerchant ? 'building' : 'user'} size={20} />
                </div>
                <div>
                  <h4 className="text-[15px] font-semibold text-ui-ink">
                    {isCurrentlyMerchant ? 'Mode Commerçant actif' : 'Mode Client actif'}
                  </h4>
                  <p className="text-xs text-ui-text-70">
                    {isCurrentlyMerchant
                      ? 'Vous gérez actuellement votre boutique et vos offres'
                      : 'Vous naviguez actuellement en tant que client'}
                  </p>
                </div>
              </div>
              <Chip variant="success">Actif</Chip>
            </div>

            <div className="space-y-3">
              <h4 className="text-[14px] font-semibold text-ui-ink">
                Modes disponibles
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option Mode Client */}
                <div
                  className={`p-4 rounded-ui-card border transition flex flex-col justify-between gap-4 ${
                    !isCurrentlyMerchant
                      ? 'border-ui-emerald bg-ui-mint/30 shadow-sm'
                      : 'border-ui-field-border bg-white hover:border-ui-ink/40'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name="user" size={18} className="text-ui-emerald" />
                        <h5 className="font-semibold text-[15px] text-ui-ink">Client</h5>
                      </div>
                      {!isCurrentlyMerchant && <Chip variant="success">Sélectionné</Chip>}
                    </div>
                    <p className="text-xs text-ui-text-70 leading-relaxed">
                      Explorez les offres à proximité, enregistrez des bons plans et réclamez vos réductions.
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    disabled={!isCurrentlyMerchant}
                    onClick={() => handleRequestSwitch('CUSTOMER')}
                  >
                    {!isCurrentlyMerchant ? 'Mode en cours' : 'Basculer en Client'}
                  </Button>
                </div>

                {/* Option Mode Commerçant */}
                <div
                  className={`p-4 rounded-ui-card border transition flex flex-col justify-between gap-4 ${
                    isCurrentlyMerchant
                      ? 'border-ui-emerald bg-ui-mint/30 shadow-sm'
                      : isShopApproved
                      ? 'border-ui-field-border bg-white hover:border-ui-ink/40'
                      : 'border-ui-field-border bg-stone-100 opacity-75'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name="building" size={18} className="text-ui-emerald" />
                        <h5 className="font-semibold text-[15px] text-ui-ink">Commerçant</h5>
                      </div>
                      {isCurrentlyMerchant ? (
                        <Chip variant="success">Sélectionné</Chip>
                      ) : !isShopApproved ? (
                        <Chip variant="neutral">Restreint</Chip>
                      ) : null}
                    </div>
                    <p className="text-xs text-ui-text-70 leading-relaxed">
                      Publiez des offres, gérez vos statistiques, scannez les coupons et suivez votre visibilité.
                    </p>
                  </div>

                  {isCurrentlyMerchant ? (
                    <Button variant="secondary" disabled>
                      Mode en cours
                    </Button>
                  ) : isShopApproved ? (
                    <Button
                      variant="primary"
                      onClick={() => handleRequestSwitch('MERCHANT')}
                    >
                      Basculer en Commerçant
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (hasPendingShop || hasRejectedShop) {
                          navigate('/merchant/status');
                        } else {
                          navigate('/register');
                        }
                      }}
                    >
                      {hasPendingShop || hasRejectedShop
                        ? 'Voir le statut'
                        : 'Créer une boutique'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* State 3 : Dialogue de confirmation */}
      <ResponsiveDialog
        isOpen={showConfirmModal}
        onClose={() => !switching && setShowConfirmModal(false)}
        title={
          targetRole === 'MERCHANT'
            ? 'Basculer en mode Commerçant'
            : 'Basculer en mode Client'
        }
        description={
          targetRole === 'MERCHANT'
            ? "Vous allez accéder à votre tableau de bord commerçant. Vos fonctionnalités d'administration et de gestion des offres seront activées."
            : "Vous allez revenir à l'interface client de découverte d'offres et d'achats."
        }
        actions={
          <>
            <Button
              variant="secondary"
              disabled={switching}
              onClick={() => setShowConfirmModal(false)}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              loading={switching}
              onClick={handleConfirmSwitch}
            >
              Confirmer la bascule
            </Button>
          </>
        }
      >
        <p className="text-sm text-ui-text-70">
          Cette action change votre rôle actif immédiat sans fermer votre session.
        </p>
      </ResponsiveDialog>
    </div>
  );
};
