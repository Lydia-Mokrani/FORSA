import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Header,
  Card,
  Banner,
  Button,
  ResponsiveDialog,
  Icon,
} from '../../components/ui';

export const AccountDangerPage: React.FC = () => {
  const navigate = useNavigate();
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <div className="min-h-screen bg-ui-page p-4 sm:p-6 md:p-10 font-poppins text-ui-ink">
      <div className="max-w-3xl mx-auto space-y-6">
        <Header
          breadcrumb={['Mon compte', 'Paramètres', 'Gestion du compte']}
          title="Gestion du compte"
          subtitle="Désactivation temporaire ou suppression irréversible de votre compte FORSA"
          mobileSubtitle="Zone sensible du compte"
          onBack={() => navigate('/settings')}
        />

        <Banner
          variant="warn"
          title="Zone sensible"
          description="Ces actions impactent directement la disponibilité de vos données, de vos offres et de votre identifiant Telegram."
        />

        {/* Carte 1 : Désactivation temporaire */}
        <Card
          icon={<Icon name="clock" size={20} />}
          title="Désactivation temporaire"
        >
          <div className="space-y-4">
            <p className="text-sm text-ui-text-70 leading-relaxed">
              Mettre en pause votre compte masque temporairement votre profil et vos annonces.
              Vos coupons actifs resteront enregistrés. Vous pourrez réactiver votre compte à tout
              moment en vous reconnectant avec votre numéro Telegram vérifié.
            </p>

            <div className="pt-2 flex items-center justify-between gap-4 border-t border-ui-field-border">
              <span className="text-xs text-ui-text-70">
                La réactivation est immédiate dès la prochaine connexion.
              </span>
              <Button
                variant="secondary"
                disabled
                onClick={() => setShowDeactivateDialog(true)}
              >
                Désactiver le compte (Bientôt disponible)
              </Button>
            </div>
          </div>
        </Card>

        {/* Carte 2 : Suppression définitive */}
        <div className="rounded-ui-card border border-ui-error/30 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-ui-error-bg flex items-center justify-center text-ui-error shrink-0">
              <Icon name="alert-circle" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ui-error">
                Suppression définitive du compte
              </h3>
              <p className="text-xs text-ui-text-70">
                Action irréversible : suppression complète de vos données personnelles
              </p>
            </div>
          </div>

          <p className="text-sm text-ui-text-70 leading-relaxed">
            La suppression de votre compte effacera l'ensemble de votre historique, vos préférences,
            vos favoris et dissociera votre numéro de téléphone. Si vous êtes commerçant, votre boutique
            et vos catalogues seront définitivement archivés conformément aux obligations légales.
          </p>

          <div className="pt-3 border-t border-ui-field-border flex items-center justify-between gap-4">
            <span className="text-xs text-ui-error font-medium">
              [NOT WIRED] Cette action requiert une confirmation administrative.
            </span>
            <Button
              variant="danger"
              disabled
              onClick={() => setShowDeleteDialog(true)}
            >
              Supprimer mon compte (Bientôt disponible)
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog Désactivation */}
      <ResponsiveDialog
        isOpen={showDeactivateDialog}
        onClose={() => setShowDeactivateDialog(false)}
        title="Désactiver mon compte"
        description="Voulez-vous suspendre temporairement votre activité sur FORSA ?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowDeactivateDialog(false)}>
              Annuler
            </Button>
            <Button variant="primary" disabled>
              Bientôt disponible
            </Button>
          </>
        }
      >
        <p className="text-sm text-ui-text-70">
          Cette fonctionnalité sera disponible dans une prochaine mise à jour.
        </p>
      </ResponsiveDialog>

      {/* Dialog Suppression */}
      <ResponsiveDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Supprimer définitivement mon compte"
        description="Cette action est irréversible. Êtes-vous certain de vouloir supprimer vos données ?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
              Annuler
            </Button>
            <Button variant="danger" disabled>
              Bientôt disponible
            </Button>
          </>
        }
      >
        <p className="text-sm text-ui-text-70">
          Cette fonctionnalité sera disponible dans une prochaine mise à jour de sécurité.
        </p>
      </ResponsiveDialog>
    </div>
  );
};
