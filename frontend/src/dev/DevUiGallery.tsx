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

              <div className="flex flex-col gap-3 pt-2">
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
      </div>
    </div>
  );
}
