import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Header,
  Card,
  Banner,
  Button,
  Chip,
  Icon,
} from '../../components/ui';
import {
  getShopDocuments,
  ShopDocumentItem,
} from './services/authService';

const DOCUMENT_LABELS: Record<string, string> = {
  commercial_register: 'Registre du commerce (CNRC)',
  tax_id: 'Identifiant fiscal (NIF / NIS)',
  storefront: 'Photo de la devanture du commerce',
};

export const MerchantDocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<ShopDocumentItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadDocs() {
      try {
        const data = await getShopDocuments();
        if (mounted) setDocuments(data.documents || []);
      } catch (err: any) {
        if (mounted) {
          setError(
            err.message || 'Impossible de récupérer la liste de vos pièces justificatives.'
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadDocs();
    return () => {
      mounted = false;
    };
  }, []);

  const hasRejectedDocs = documents.some((d) => d.status === 'REJECTED');

  return (
    <div className="min-h-screen bg-ui-page p-4 sm:p-6 md:p-10 font-poppins text-ui-ink">
      <div className="max-w-3xl mx-auto space-y-6">
        <Header
          breadcrumb={['Espace Commerçant', 'Statut', 'Pièces justificatives']}
          title="Pièces justificatives"
          subtitle="Suivez la conformité de vos documents légaux transmis pour validation"
          mobileSubtitle="Documents légaux"
          onBack={() => navigate('/merchant/status')}
        />

        {error && (
          <Banner
            variant="error"
            title="Erreur de chargement"
            description={error}
          />
        )}

        {hasRejectedDocs && (
          <Banner
            variant="warn"
            title="Action requise sur votre dossier"
            description="Une ou plusieurs pièces ont été refusées lors de l'examen de votre dossier. Veuillez les téléverser à nouveau."
          />
        )}

        <Card
          icon={<Icon name="file" size={20} />}
          title="Documents de votre boutique"
        >
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3">
              <div className="size-8 border-3 border-ui-emerald border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-ui-text-70">Chargement des documents...</p>
            </div>
          ) : documents.length > 0 ? (
            <div className="divide-y divide-ui-field-border border border-ui-field-border rounded-ui-ctl overflow-hidden bg-white">
              {documents.map((doc, idx) => {
                const label = DOCUMENT_LABELS[doc.type] || doc.type;
                const isRejected = doc.status === 'REJECTED';
                const isValidated = doc.status === 'VALIDATED';

                return (
                  <div key={doc.id || idx} className="p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div
                          className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
                            isValidated
                              ? 'bg-ui-mint text-ui-emerald'
                              : isRejected
                              ? 'bg-ui-error-bg text-ui-error'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          <Icon
                            name={
                              isValidated
                                ? 'check-success'
                                : isRejected
                                ? 'alert-circle'
                                : 'clock'
                            }
                            size={20}
                          />
                        </div>
                        <div>
                          <h4 className="text-[15px] font-semibold text-ui-ink">{label}</h4>
                          <p className="text-xs text-ui-text-70">
                            {doc.uploadedAt
                              ? `Transmis le ${new Date(doc.uploadedAt).toLocaleDateString(
                                  'fr-DZ',
                                  {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  }
                                )}`
                              : 'Document fourni lors de l’inscription'}
                          </p>
                        </div>
                      </div>

                      <div className="self-start sm:self-center">
                        {isValidated ? (
                          <Chip variant="success">Validé</Chip>
                        ) : isRejected ? (
                          <Chip variant="error">Non conforme</Chip>
                        ) : (
                          <Chip variant="warn">En examen</Chip>
                        )}
                      </div>
                    </div>

                    {isRejected && doc.reason && (
                      <div className="p-3 rounded-ui-ctl bg-ui-error-bg border border-ui-error/20 text-xs text-ui-error space-y-1">
                        <strong className="block font-semibold">Motif de non-conformité :</strong>
                        <p>{doc.reason}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center space-y-3 bg-stone-50 rounded-ui-ctl border border-ui-field-border">
              <p className="text-sm text-ui-text-70">
                Aucun document n'a été trouvé pour votre boutique.
              </p>
              <Button
                variant="secondary"
                onClick={() => navigate('/merchant/documents/resubmit')}
              >
                Téléverser mes pièces justificatives
              </Button>
            </div>
          )}

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-ui-field-border mt-6">
            <Link
              to="/merchant/status"
              className="text-xs font-semibold text-ui-text-70 hover:text-ui-ink flex items-center gap-1"
            >
              &larr; Retour au statut de la boutique
            </Link>

            <Button
              variant="primary"
              onClick={() => navigate('/merchant/documents/resubmit')}
            >
              Mettre à jour les documents &rarr;
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
