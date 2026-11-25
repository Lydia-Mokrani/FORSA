import React, { useState } from 'react';
import {
  Button,
  Field,
  Card,
  Banner,
  Chip,
  Avatar,
  Header,
  MapBox,
  Icon,
  Modal,
  BottomSheet,
  ResponsiveDialog,
  Stepper,
  Dropzone,
} from '../components/ui';

/**
 * Chaîne de preuve unique pour vérifier que ce module n'est JAMAIS inclus
 * dans le bundle de production (arborescence éliminée par Rollup/Vite via import.meta.env.DEV) :
 * PROOF_STRING: FORSA_DEV_UI_GALLERY_ISOLATED_SECRET_PROOFTAG_R0
 */
export const DEV_GALLERY_PROOF_TAG = 'FORSA_DEV_UI_GALLERY_ISOLATED_SECRET_PROOFTAG_R0';

export default function DevUiGallery() {
  const [btnLoading, setBtnLoading] = useState(false);
  const [mapStatus, setMapStatus] = useState<'ok' | 'empty' | 'down'>('ok');
  const [fieldVal, setFieldVal] = useState('Maison Gourmande');
  const [selectVal, setSelectVal] = useState('boulangerie');

  // États pour les nouveaux composants R0b
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isResponsiveOpen, setIsResponsiveOpen] = useState(false);
  const [stepperStep, setStepperStep] = useState(1);
  const [dropzoneFile, setDropzoneFile] = useState<File | null>(null);
  const [dropzoneError, setDropzoneError] = useState<string | undefined>(undefined);

  return (
    <div className="min-h-screen bg-ui-page p-6 md:p-12 font-sans text-ui-ink">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* En-tête de la galerie */}
        <div className="border-b border-ui-field-border pb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-ui-mint border border-ui-card-border rounded-full text-xs font-semibold text-ui-emerald">
              DEV ONLY
            </span>
            <span className="text-xs text-ui-text-70">
              Tag: {DEV_GALLERY_PROOF_TAG}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-ui-ink">
            Galerie des Composants UI FORSA (Lot R0)
          </h1>
          <p className="text-sm text-ui-text-70 mt-1">
            Visualisation de tous les tokens et composants partagés conformes aux maquettes Figma MS1.
          </p>
        </div>

        {/* Section 1 : Header */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-l-4 border-ui-emerald pl-3 text-ui-ink">
            1. Header (Desktop & Mobile unifié)
          </h2>
          <div className="p-6 bg-white rounded-ui-card border border-ui-card-border shadow-sm">
            <Header
              breadcrumb={['Mon espace', 'Ma boutique']}
              title="Ma boutique"
              subtitle="Présentez votre commerce et sa localisation à vos clients"
              mobileSubtitle="Modifiez les informations de votre commerce"
              onBack={() => alert('Bouton retour mobile cliqué')}
              hasNotifications
              onNotificationClick={() => alert('Notifications cliquées')}
              userAvatar={{ name: 'Maison Gourmande' }}
            />
          </div>
        </section>

        {/* Section 2 : Buttons */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-l-4 border-ui-emerald pl-3 text-ui-ink">
            2. Buttons & Variantes
          </h2>
          <div className="p-6 bg-white rounded-ui-card border border-ui-card-border space-y-6 shadow-sm">
            <div className="flex flex-wrap gap-4 items-center">
              <Button variant="primary" leftIcon={<Icon name="check" size={18} />}>
                Enregistrer les modifications
              </Button>
              <Button variant="secondary">Annuler</Button>
              <Button variant="secondary" leftIcon={<Icon name="refresh" size={18} />}>
                Réessayer
              </Button>
              <Button variant="danger">Supprimer</Button>
              <Button variant="dangerOutline">Désactiver</Button>
            </div>

            <div className="flex flex-wrap gap-4 items-center pt-4 border-t border-ui-field-border">
              <Button
                variant="primary"
                loading={btnLoading}
                onClick={() => {
                  setBtnLoading(true);
                  setTimeout(() => setBtnLoading(false), 2000);
                }}
              >
                {btnLoading ? 'Chargement...' : 'Tester le Loading'}
              </Button>
              <Button variant="primary" disabled leftIcon={<Icon name="check" size={18} />}>
                Désactivé (opacity-45)
              </Button>
              <Button variant="secondary" disabled>
                Annuler (désactivé)
              </Button>
            </div>
          </div>
        </section>

        {/* Section 3 : Form Fields */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-l-4 border-ui-emerald pl-3 text-ui-ink">
            3. Form Fields & États
          </h2>
          <div className="p-6 bg-white rounded-ui-card border border-ui-card-border grid grid-cols-1 md:grid-cols-2 gap-6 shadow-sm">
            <Field
              label="Nom du commerce"
              leftIcon={<Icon name="building" size={20} />}
              value={fieldVal}
              onChange={(e) => setFieldVal(e.target.value)}
              helperText="Nom affiché publiquement sur la plateforme."
            />

            <Field
              as="select"
              label="Catégorie"
              value={selectVal}
              onChange={(e) => setSelectVal(e.target.value)}
              options={[
                { value: 'boulangerie', label: 'Boulangerie – Pâtisserie' },
                { value: 'restaurant', label: 'Restaurant & Traiteur' },
                { value: 'epicerie', label: 'Épicerie & Alimentation' },
              ]}
            />

            <Field
              label="Adresse du commerce (État nominal / focus)"
              leftIcon={<Icon name="pin" size={20} />}
              defaultValue="12 Rue des Fleurs, Boumerdès"
              helperText="Le repère sur la carte est placé automatiquement à partir de cette adresse."
            />

            <Field
              label="Adresse du commerce (État Erreur)"
              leftIcon={<Icon name="pin" size={20} />}
              defaultValue="Rue inconnue 9999"
              error="Adresse introuvable. Vérifiez la rue et la ville, ou précisez la commune."
            />

            <Field
              label="N° de registre de commerce (Disabled)"
              leftIcon={<Icon name="file" size={20} />}
              defaultValue="16/00-0123456 B 21"
              disabled
              helperText="Non modifiable sans vérification préalable."
            />

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Ouverture"
                leftIcon={<Icon name="clock" size={20} />}
                defaultValue="08:00"
              />
              <Field
                label="Fermeture"
                leftIcon={<Icon name="clock" size={20} />}
                defaultValue="20:00"
              />
            </div>
          </div>
        </section>

        {/* Section 4 : Banners & Chips */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-l-4 border-ui-emerald pl-3 text-ui-ink">
            4. Bannières & Pastilles (Chips)
          </h2>
          <div className="p-6 bg-white rounded-ui-card border border-ui-card-border space-y-4 shadow-sm">
            <Banner
              variant="success"
              title="Votre boutique a été mise à jour."
              description="Les clients voient déjà vos nouvelles informations."
            />

            <Banner
              variant="warn"
              title="Le service de cartes est momentanément indisponible."
              description="Vous pouvez enregistrer vos informations : la position sur la carte sera confirmée plus tard."
            />

            <Banner
              variant="error"
              title="Une erreur est survenue lors de l'enregistrement."
              description="Veuillez vérifier les champs signalés en rouge."
            />

            <Banner
              variant="info"
              title="Information importante"
              description="Une mise à jour des conditions générales est en cours."
            />

            <div className="flex flex-wrap gap-3 pt-4 border-t border-ui-field-border">
              <Chip variant="success">Position détectée</Chip>
              <Chip variant="error">Position non détectée</Chip>
              <Chip variant="warn">Position à confirmer</Chip>
              <Chip variant="neutral">Brouillon</Chip>
            </div>
          </div>
        </section>

        {/* Section 5 : Avatar & Initiales */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-l-4 border-ui-emerald pl-3 text-ui-ink">
            5. Avatar & Monogrammes
          </h2>
          <div className="p-6 bg-white rounded-ui-card border border-ui-card-border flex flex-wrap items-center gap-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar name="Maison Gourmande" />
              <div className="text-xs">
                <p className="font-semibold">Maison Gourmande</p>
                <p className="text-ui-text-70">Initiales : MG</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Avatar name="Ahmed" />
              <div className="text-xs">
                <p className="font-semibold">Ahmed</p>
                <p className="text-ui-text-70">Initiales : AH</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Avatar name="" />
              <div className="text-xs">
                <p className="font-semibold">Vide / Inconnu</p>
                <p className="text-ui-text-70">Fallback : ?</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Avatar name="Forsa Shop" size={36} />
              <div className="text-xs">
                <p className="font-semibold">Taille compacte (36px)</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6 : MapBox Interactive */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold border-l-4 border-ui-emerald pl-3 text-ui-ink">
              6. MapBox & États Cartographiques
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setMapStatus('ok')}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  mapStatus === 'ok'
                    ? 'bg-ui-emerald text-white'
                    : 'bg-ui-mint text-ui-emerald border border-ui-card-border'
                }`}
              >
                État OK
              </button>
              <button
                onClick={() => setMapStatus('empty')}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  mapStatus === 'empty'
                    ? 'bg-ui-error text-white'
                    : 'bg-ui-error-bg text-ui-error border border-ui-error/20'
                }`}
              >
                État Empty
              </button>
              <button
                onClick={() => setMapStatus('down')}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  mapStatus === 'down'
                    ? 'bg-ui-warn text-white'
                    : 'bg-ui-warn-bg text-ui-warn border border-ui-warn-border'
                }`}
              >
                État Down
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card
              icon={<Icon name="pin" size={20} />}
              title="Localisation sur la carte (Interactif)"
            >
              <MapBox
                status={mapStatus}
                position={[36.7538, 3.0588]}
                address="12 Rue des Fleurs, Boumerdès"
                onRetry={() => alert('Réessayer cliqué')}
                onTileError={() => alert('Erreur tuile >= 3 détectée !')}
              />
            </Card>

            <Card
              icon={<Icon name="building" size={20} />}
              title="Informations du commerce (Exemple Card)"
            >
              <div className="space-y-4">
                <Field
                  label="Nom de l'établissement"
                  leftIcon={<Icon name="building" size={20} />}
                  defaultValue="Maison Gourmande"
                />
                <Field
                  label="Téléphone"
                  leftIcon={<Icon name="phone" size={20} />}
                  defaultValue="+213 555 12 34 56"
                />
              </div>
            </Card>
          </div>
        </section>

        {/* Section 7 : Vue Mobile Contrainte (390px) */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-l-4 border-ui-emerald pl-3 text-ui-ink">
            7. Simulation Vue Mobile (Contrainte exacte 390px)
          </h2>
          <div className="p-8 bg-neutral-200 rounded-ui-card flex justify-center">
            <div className="w-[390px] bg-ui-page rounded-[36px] border-[8px] border-neutral-800 shadow-2xl p-5 space-y-5 overflow-hidden">
              <Header
                title="Ma boutique"
                mobileSubtitle="Modifiez les informations de votre commerce"
                onBack={() => {}}
              />

              <Card
                icon={<Icon name="building" size={20} />}
                title="Informations du commerce"
              >
                <div className="space-y-3.5">
                  <Field
                    label="Nom du commerce"
                    leftIcon={<Icon name="building" size={20} />}
                    defaultValue="Maison Gourmande"
                  />
                  <Field
                    as="select"
                    label="Catégorie"
                    defaultValue="boulangerie"
                    options={[{ value: 'boulangerie', label: 'Boulangerie' }]}
                  />
                  <Field
                    label="Adresse"
                    leftIcon={<Icon name="pin" size={20} />}
                    defaultValue="12 Rue des Fleurs, Boumerdès"
                  />
                </div>
              </Card>

              <Card
                icon={<Icon name="pin" size={20} />}
                title="Localisation"
              >
                <MapBox
                  status="ok"
                  position={[36.7538, 3.0588]}
                  address="12 Rue des Fleurs, Boumerdès"
                />
              </Card>

              <Card
                icon={<Icon name="file" size={20} />}
                title="Documents & Stepper (Mobile)"
              >
                <div className="space-y-4">
                  <Stepper
                    current={stepperStep}
                    steps={[
                      { title: 'Compte' },
                      { title: 'Commerce' },
                      { title: 'Documents' },
                    ]}
                  />
                  <Dropzone
                    label="Registre de commerce"
                    value={dropzoneFile}
                    onFile={setDropzoneFile}
                    error={dropzoneError}
                  />
                </div>
              </Card>

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => setIsResponsiveOpen(true)}
                >
                  Ouvrir ResponsiveDialog (BottomSheet)
                </Button>
                <Button variant="primary" fullWidth leftIcon={<Icon name="check" size={18} />}>
                  Enregistrer les modifications
                </Button>
                <Button variant="secondary" fullWidth>
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 8 : Modal, BottomSheet & ResponsiveDialog (Lot R0b) */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-l-4 border-ui-emerald pl-3 text-ui-ink">
            8. Dialogues & Modales (Modal, BottomSheet, ResponsiveDialog)
          </h2>
          <div className="p-6 bg-white rounded-ui-card border border-ui-card-border space-y-4 shadow-sm">
            <p className="text-sm text-ui-text-70">
              Modales accessibles conformes Figma avec gestion Focus Trap, fermeture Échap / clic fond, et bascule responsive.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                Ouvrir Modal (Desktop)
              </Button>
              <Button variant="secondary" onClick={() => setIsSheetOpen(true)}>
                Ouvrir BottomSheet (Mobile)
              </Button>
              <Button variant="primary" onClick={() => setIsResponsiveOpen(true)}>
                Ouvrir ResponsiveDialog
              </Button>
            </div>
          </div>
        </section>

        {/* Section 9 : Stepper (Lot R0b) */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-l-4 border-ui-emerald pl-3 text-ui-ink">
            9. Stepper (Progression Inscription & Statuts)
          </h2>
          <div className="p-6 bg-white rounded-ui-card border border-ui-card-border space-y-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-ui-field-border">
              <span className="text-sm font-medium">Étape active : {stepperStep + 1} / 3</span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={stepperStep === 0}
                  onClick={() => setStepperStep((s) => Math.max(0, s - 1))}
                >
                  Précédent
                </Button>
                <Button
                  variant="primary"
                  disabled={stepperStep === 2}
                  onClick={() => setStepperStep((s) => Math.min(2, s + 1))}
                >
                  Suivant
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-ui-text-70 uppercase tracking-wide">
                Affichage Horizontal (Inscription Commerçant)
              </h3>
              <Stepper
                current={stepperStep}
                steps={[
                  { title: 'Compte', description: 'Informations gérant' },
                  { title: 'Commerce', description: 'Informations boutique' },
                  { title: 'Documents', description: 'Justificatifs légaux' },
                ]}
              />
            </div>

            <div className="space-y-2 pt-4 border-t border-ui-field-border">
              <h3 className="text-sm font-semibold text-ui-text-70 uppercase tracking-wide">
                Affichage Vertical (Statut Validation Commerçant)
              </h3>
              <Stepper
                orientation="vertical"
                current={stepperStep}
                steps={[
                  { title: 'Inscrit', description: 'Votre demande est enregistrée' },
                  { title: 'Documents envoyés', description: 'Pièces justificatives reçues' },
                  { title: 'En cours de vérification', description: 'Examen par nos équipes' },
                ]}
              />
            </div>
          </div>
        </section>

        {/* Section 10 : Dropzone (Lot R0b) */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-l-4 border-ui-emerald pl-3 text-ui-ink">
            10. Dropzone (Zone Drag-and-Drop & Pré-contrôle 5 Mo)
          </h2>
          <div className="p-6 bg-white rounded-ui-card border border-ui-card-border space-y-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-ui-ink mb-3">
                  Zone interactive (PDF, JPG, PNG - 5 Mo max)
                </h3>
                <Dropzone
                  label="Registre de commerce (C2)"
                  helperText="Format PDF ou image scannée lisible"
                  value={dropzoneFile}
                  onFile={setDropzoneFile}
                  error={dropzoneError}
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-ui-ink mb-3">
                  Contrôles de simulation d'erreur
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setDropzoneError('Le document est illisible ou tronqué.')}
                  >
                    Simuler Erreur Serveur
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setDropzoneError(undefined)}
                  >
                    Effacer Erreur
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setDropzoneFile(null)}
                  >
                    Vider Fichier
                  </Button>
                </div>
                <div className="p-3 bg-ui-mint rounded-ui-ctl text-xs text-ui-ink space-y-1">
                  <p><strong>Fichier actif :</strong> {dropzoneFile ? `${dropzoneFile.name} (${(dropzoneFile.size / 1024).toFixed(1)} Ko)` : 'Aucun'}</p>
                  <p><strong>Erreur affichée :</strong> {dropzoneError || 'Aucune'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 11 : Token ui.auth-bg */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-l-4 border-ui-emerald pl-3 text-ui-ink">
            11. Fond Solide Auth [DECISION HYB] (`ui.auth-bg` = #dce1d0)
          </h2>
          <div className="p-6 bg-white rounded-ui-card border border-ui-card-border shadow-sm space-y-4">
            <p className="text-sm text-ui-text-70">
              Remplacement du fond photo bokeh par la couleur unie <code>#dce1d0</code>.
            </p>
            <div className="p-6 rounded-ui-card bg-ui-auth-bg border border-ui-field-border flex items-center justify-between">
              <span className="font-semibold text-ui-ink">
                Aperçu fond bg-ui-auth-bg (#dce1d0) — Contraste texte WCAG AAA (11.28:1)
              </span>
              <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-ui-ink border border-ui-card-border">
                Token ui.auth-bg
              </span>
            </div>
          </div>
        </section>

        {/* Instances Modales */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Confirmation Modal (Desktop)"
          description="Ceci est une boîte de dialogue accessible avec focus trap et fermeture Échap."
          actions={
            <>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Annuler
              </Button>
              <Button variant="primary" onClick={() => setIsModalOpen(false)}>
                Confirmer
              </Button>
            </>
          }
        >
          <p className="text-sm text-ui-text-70">
            Contenu du modal interactif. Le focus est maintenu à l'intérieur tant que le modal est ouvert.
          </p>
        </Modal>

        <BottomSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title="Fiche Mobile (BottomSheet)"
          description="Glisse depuis le bas de l'écran avec poignée de glissement."
          actions={
            <>
              <Button variant="primary" fullWidth onClick={() => setIsSheetOpen(false)}>
                Action principale
              </Button>
              <Button variant="secondary" fullWidth onClick={() => setIsSheetOpen(false)}>
                Fermer
              </Button>
            </>
          }
        >
          <p className="text-sm text-ui-text-70">
            Composant dédié aux interactions mobiles confortables au pouce.
          </p>
        </BottomSheet>

        <ResponsiveDialog
          isOpen={isResponsiveOpen}
          onClose={() => setIsResponsiveOpen(false)}
          title="Dialogue Responsive Unifié"
          description="S'affiche en Modal sur grand écran et en BottomSheet sur mobile (< 768px)."
          actions={
            <>
              <Button variant="secondary" onClick={() => setIsResponsiveOpen(false)}>
                Fermer
              </Button>
              <Button variant="primary" onClick={() => setIsResponsiveOpen(false)}>
                Valider
              </Button>
            </>
          }
        >
          <p className="text-sm text-ui-text-70">
            Adapte son comportement et son animation selon la largeur du viewport.
          </p>
        </ResponsiveDialog>
      </div>
    </div>
  );
}
