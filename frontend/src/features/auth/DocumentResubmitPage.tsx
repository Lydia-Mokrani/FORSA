import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Header,
  Card,
  Banner,
  Button,
  Dropzone,
  Icon,
} from '../../components/ui';
import { uploadShopDocuments } from './services/authService';

export const DocumentResubmitPage: React.FC = () => {
  const navigate = useNavigate();

  const [commercialRegisterFile, setCommercialRegisterFile] = useState<File | null>(null);
  const [taxIdFile, setTaxIdFile] = useState<File | null>(null);
  const [storefrontFile, setStorefrontFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!commercialRegisterFile && !taxIdFile && !storefrontFile) {
      setError('Veuillez sélectionner au moins un document à mettre à jour.');
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
      setSuccess(true);
      setTimeout(() => {
        navigate('/merchant/status');
      }, 2500);
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card
            icon={<Icon name="file" size={20} />}
            title="Pièces justificatives de votre commerce"
          >
            <div className="space-y-6">
              <p className="text-xs text-ui-text-70 leading-relaxed">
                Formats acceptés : PDF, JPG, PNG. Taille maximale : 5 Mo par fichier.
                Seuls les fichiers lisibles et complets seront validés.
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
                  onFile={(file) => setCommercialRegisterFile(file)}
                  helperText="Format PDF, JPG ou PNG (max 5 Mo)"
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
                  onFile={(file) => setTaxIdFile(file)}
                  helperText="Format PDF, JPG ou PNG (max 5 Mo)"
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
                  onFile={(file) => setStorefrontFile(file)}
                  helperText="Format JPG ou PNG (max 5 Mo) montrant clairement l'enseigne"
                />
              </div>

              <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-ui-field-border">
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
                  disabled={loading || (!commercialRegisterFile && !taxIdFile && !storefrontFile)}
                >
                  Soumettre pour vérification
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
};
