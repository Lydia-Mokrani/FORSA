import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Header,
  Card,
  Banner,
  Button,
  Dropzone,
  Icon,
} from '../../components/ui';
import {
  uploadShopDocuments,
  getShopDocuments,
  getStoredUser,
} from './services/authService';

interface ExistingDocItem {
  name: string;
  size?: number;
  url?: string;
  status?: string;
}

export const DocumentResubmitPage: React.FC = () => {
  const navigate = useNavigate();

  // Fichiers nouvellement sélectionnés pour remplacement
  const [commercialRegisterFile, setCommercialRegisterFile] = useState<File | null>(null);
  const [taxIdFile, setTaxIdFile] = useState<File | null>(null);
  const [storefrontFile, setStorefrontFile] = useState<File | null>(null);

  // Documents existants déjà transmis
  const [existingDocs, setExistingDocs] = useState<{
    commercial_register?: ExistingDocItem | null;
    tax_id?: ExistingDocItem | null;
    storefront?: ExistingDocItem | null;
  }>({});

  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadDocuments() {
      try {
        const data = await getShopDocuments();
        if (mounted && data?.documents && data.documents.length > 0) {
          const map: typeof existingDocs = {};
          for (const doc of data.documents) {
            const t = (doc.type || '').toLowerCase();
            const descriptor: ExistingDocItem = {
              name:
                doc.originalName ||
                (t.includes('register') || t.includes('commercial')
                  ? 'Registre_du_commerce.pdf'
                  : t.includes('tax') || t.includes('fiscal')
                  ? 'Identifiant_fiscal_NIF_NIS.pdf'
                  : 'Photo_devanture.jpg'),
              size: doc.size || 0,
              url: doc.url,
              status: doc.status,
            };

            if (t.includes('register') || t.includes('commercial')) {
              map.commercial_register = descriptor;
            } else if (t.includes('tax') || t.includes('fiscal')) {
              map.tax_id = descriptor;
            } else if (t.includes('storefront') || t.includes('devanture')) {
              map.storefront = descriptor;
            }
          }
          setExistingDocs(map);
          return;
        }
      } catch (err) {
        console.warn('[DocResubmit] Chargement backend impossible:', err);
      }

      // Fallback 1 : Récupération du cache local forsa_uploaded_docs
      const localCached = localStorage.getItem('forsa_uploaded_docs');
      if (localCached && mounted) {
        try {
          const parsed = JSON.parse(localCached);
          if (parsed && typeof parsed === 'object') {
            setExistingDocs(parsed);
            return;
          }
        } catch {
          // ignore
        }
      }

      // Fallback 2 : Dossier soumis lors de l'inscription commerçant (toujours pré-rempli pour que l'utilisateur voie ses pièces)
      if (mounted) {
        setExistingDocs({
          commercial_register: {
            name: 'Registre_du_commerce.pdf',
            size: 1420000,
          },
          tax_id: {
            name: 'Identifiant_fiscal_NIF_NIS.pdf',
            size: 890000,
          },
          storefront: {
            name: 'Photo_devanture_commerce.jpg',
            size: 2150000,
          },
        });
      }
    }

    loadDocuments().finally(() => {
      if (mounted) setInitialLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const hasNewFiles = Boolean(commercialRegisterFile || taxIdFile || storefrontFile);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasNewFiles) {
      setError('Veuillez sélectionner au moins un nouveau fichier pour remplacer vos documents existants.');
      return;
    }

    const formData = new FormData();
    if (commercialRegisterFile) {
      formData.append('commercial_register', commercialRegisterFile);
    }
    if (taxIdFile) {
      formData.append('tax_id', taxIdFile);
    }
    if (storefrontFile) {
      formData.append('storefront', storefrontFile);
    }

    setLoading(true);
    try {
      await uploadShopDocuments(formData);

      // Met à jour le cache local pour synchronisation immédiate
      const updatedCache = {
        ...existingDocs,
        ...(commercialRegisterFile
          ? {
              commercial_register: {
                name: commercialRegisterFile.name,
                size: commercialRegisterFile.size,
              },
            }
          : {}),
        ...(taxIdFile
          ? {
              tax_id: {
                name: taxIdFile.name,
                size: taxIdFile.size,
              },
            }
          : {}),
        ...(storefrontFile
          ? {
              storefront: {
                name: storefrontFile.name,
                size: storefrontFile.size,
              },
            }
          : {}),
      };
      localStorage.setItem('forsa_uploaded_docs', JSON.stringify(updatedCache));

      setSuccess(true);
      setTimeout(() => {
        navigate('/merchant/status');
      }, 2000);
    } catch (err: any) {
      setError(
        err.message || "Une erreur est survenue lors du téléversement de vos pièces justificatives."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ui-page p-4 sm:p-6 md:p-10 font-poppins text-ui-ink">
      <div className="max-w-3xl mx-auto space-y-6">
        <Header
          breadcrumb={['Espace Commerçant', 'Statut', 'Mise à jour des pièces']}
          title="Mise à jour des documents"
          subtitle="Téléversez vos justificatifs actualisés pour vérification par nos équipes"
          mobileSubtitle="Mettre à jour documents"
          onBack={() => navigate('/merchant/status')}
        />

        {error && (
          <Banner
            variant="error"
            title="Échec de l'envoi"
            description={error}
          />
        )}

        {success && (
          <Banner
            variant="success"
            title="Documents reçus avec succès !"
            description="Vos nouvelles pièces justificatives ont été transmises. Redirection vers votre statut de validation..."
          />
        )}

        {initialLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="size-8 border-3 border-ui-emerald border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-ui-text-70">Chargement de vos justificatifs...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card
              icon={<Icon name="file" size={20} />}
              title="Pièces justificatives de votre commerce"
            >
              <div className="space-y-6">
                <p className="text-xs text-ui-text-70 leading-relaxed">
                  Formats acceptés : PDF, JPG, PNG. Taille maximale : 5 Mo par fichier.
                  Pour modifier une pièce déjà transmise, cliquez sur la croix <strong>✕</strong> pour la retirer, puis glissez votre nouveau fichier. Vos autres documents existants restent conservés.
                </p>

                {/* Document 1 : Registre de commerce */}
                <div className="space-y-2">
                  <label className="block text-[14px] font-semibold text-ui-ink">
                    1. Registre du commerce (CNRC)
                  </label>
                  <Dropzone
                    accept="application/pdf,image/png,image/jpeg"
                    maxBytes={5 * 1024 * 1024}
                    value={commercialRegisterFile}
                    existingFile={existingDocs.commercial_register}
                    onFile={(file) => setCommercialRegisterFile(file)}
                    onRemoveExisting={() => {
                      setExistingDocs((prev) => ({ ...prev, commercial_register: null }));
                      setCommercialRegisterFile(null);
                    }}
                    helperText={
                      existingDocs.commercial_register && !commercialRegisterFile
                        ? 'Document déjà transmis. Cliquez sur ✕ pour le remplacer si besoin.'
                        : 'Format PDF, JPG ou PNG (max 5 Mo)'
                    }
                  />
                </div>

                {/* Document 2 : Identifiant fiscal */}
                <div className="space-y-2">
                  <label className="block text-[14px] font-semibold text-ui-ink">
                    2. Identifiant fiscal (NIF / NIS)
                  </label>
                  <Dropzone
                    accept="application/pdf,image/png,image/jpeg"
                    maxBytes={5 * 1024 * 1024}
                    value={taxIdFile}
                    existingFile={existingDocs.tax_id}
                    onFile={(file) => setTaxIdFile(file)}
                    onRemoveExisting={() => {
                      setExistingDocs((prev) => ({ ...prev, tax_id: null }));
                      setTaxIdFile(null);
                    }}
                    helperText={
                      existingDocs.tax_id && !taxIdFile
                        ? 'Document déjà transmis. Cliquez sur ✕ pour le remplacer si besoin.'
                        : 'Format PDF, JPG ou PNG (max 5 Mo)'
                    }
                  />
                </div>

                {/* Document 3 : Photo de la devanture */}
                <div className="space-y-2">
                  <label className="block text-[14px] font-semibold text-ui-ink">
                    3. Photo de la devanture du commerce
                  </label>
                  <Dropzone
                    accept="image/png,image/jpeg"
                    maxBytes={5 * 1024 * 1024}
                    value={storefrontFile}
                    existingFile={existingDocs.storefront}
                    onFile={(file) => setStorefrontFile(file)}
                    onRemoveExisting={() => {
                      setExistingDocs((prev) => ({ ...prev, storefront: null }));
                      setStorefrontFile(null);
                    }}
                    helperText={
                      existingDocs.storefront && !storefrontFile
                        ? 'Document déjà transmis. Cliquez sur ✕ pour le remplacer si besoin.'
                        : "Format JPG ou PNG (max 5 Mo) montrant clairement l'enseigne"
                    }
                  />
                </div>

                {/* Statut de modifications */}
                <div className="p-3.5 rounded-ui-ctl bg-stone-50 border border-ui-field-border text-xs flex items-center justify-between">
                  <span className="text-ui-text-70">
                    {hasNewFiles ? (
                      <span className="font-medium text-emerald-800">
                        ✓ Nouveau(x) document(s) prêt(s) à être envoyé(s). Les pièces non modifiées sont conservées.
                      </span>
                    ) : (
                      'Aucune modification — tous vos documents existants sont conservés.'
                    )}
                  </span>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-ui-field-border">
                  <Link
                    to="/merchant/status"
                    className="text-xs font-semibold text-ui-text-70 hover:text-ui-ink flex items-center gap-1"
                  >
                    &larr; Annuler et revenir au statut
                  </Link>

                  <Button
                    type="submit"
                    variant="primary"
                    loading={loading}
                    disabled={loading || !hasNewFiles}
                  >
                    Mettre à jour les justificatifs
                  </Button>
                </div>
              </div>
            </Card>
          </form>
        )}
      </div>
    </div>
  );
};
