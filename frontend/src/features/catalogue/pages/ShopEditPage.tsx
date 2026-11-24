import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch, getStoredUser } from '../../auth/services/authService';
import {
  Header,
  Card,
  Field,
  Button,
  Banner,
  Chip,
  MapBox,
  Icon,
} from '../../../components/ui';
import { useShopGeocode, Coordinates } from '../../shop/useShopGeocode';
import { SHOP_CATEGORIES } from '../../shop/shopCategories';

export type DerivedUiState = 'addressNotFound' | 'mapUnavailable' | 'saved' | 'nominal';

interface ShopFormValues {
  name: string;
  category: string;
  registryNumber: string;
  phone: string;
  address: string;
  openTime: string;
  closeTime: string;
  description: string;
  logoUrl: string;
}

const EMPTY_FORM: ShopFormValues = {
  name: '',
  category: '',
  registryNumber: '',
  phone: '',
  address: '',
  openTime: '',
  closeTime: '',
  description: '',
  logoUrl: '',
};

/**
 * Extrait les heures d'ouverture/fermeture représentatives depuis l'objet openingHours backend.
 */
function extractHours(openingHours: any): { openTime: string; closeTime: string } {
  if (!openingHours || typeof openingHours !== 'object') {
    return { openTime: '08:00', closeTime: '20:00' };
  }
  if (typeof openingHours.open === 'string' && typeof openingHours.close === 'string') {
    return { openTime: openingHours.open, closeTime: openingHours.close };
  }
  for (const day of ['monday', 'tuesday', 'saturday', 'sunday', 'wednesday', 'thursday']) {
    if (openingHours[day] && openingHours[day].open && openingHours[day].close) {
      return { openTime: openingHours[day].open, closeTime: openingHours[day].close };
    }
  }
  return { openTime: '08:00', closeTime: '20:00' };
}

/**
 * Construit l'objet openingHours à persister en préservant le format d'origine.
 */
function buildOpeningHours(
  originalHours: any,
  openTime: string,
  closeTime: string,
  hoursEdited: boolean
): any {
  if (!hoursEdited && originalHours !== undefined) {
    return originalHours;
  }
  if (originalHours && typeof originalHours === 'object') {
    const updated: Record<string, any> = { ...originalHours };
    for (const key of Object.keys(updated)) {
      if (updated[key] && typeof updated[key] === 'object' && !updated[key].closed) {
        updated[key] = { ...updated[key], open: openTime, close: closeTime };
      }
    }
    return updated;
  }
  return { open: openTime, close: closeTime };
}

export const ShopEditPage: React.FC = () => {
  const navigate = useNavigate();
  // Récupération de l'utilisateur connecté via getStoredUser().
  // Remarque : Aucun AuthContext React n'existe dans ce projet (authentification gérée par localStorage dans authService.ts).
  const currentUser = getStoredUser();

  // États du formulaire
  const [form, setForm] = useState<ShopFormValues>(EMPTY_FORM);
  const [originalHours, setOriginalHours] = useState<any>(null);
  const [hoursEdited, setHoursEdited] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<ShopFormValues>(EMPTY_FORM);
  const [initialCoordinates, setInitialCoordinates] = useState<Coordinates | null>(null);

  // États applicatifs & API
  const [hasExistingShop, setHasExistingShop] = useState(false);
  const [isLoadingShop, setIsLoadingShop] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Détection tuiles Leaflet et remontage forcé
  const [tileErrorOccurred, setTileErrorOccurred] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  // Hook de géocodage sans debounce à la frappe
  const {
    address,
    setAddress,
    geoStatus,
    coordinates,
    handleBlur,
    handleKeyDown,
    retry,
    executeLookup,
    setInitialLocation,
  } = useShopGeocode();

  // Chargement initial des données de la boutique via GET /api/shops/me
  useEffect(() => {
    let isMounted = true;

    async function loadShop() {
      setIsLoadingShop(true);
      setServerError(null);

      try {
        const res = await authFetch('/api/shops/me', { method: 'GET' });

        if (!isMounted) return;

        if (res.status === 200) {
          const data = await res.json();
          const shop = data.shop || data;
          const { openTime, closeTime } = extractHours(shop.openingHours);

          const loadedValues: ShopFormValues = {
            name: shop.name || '',
            category: shop.category || '',
            registryNumber: shop.registryNumber || '',
            phone: shop.phone || '',
            address: shop.address || '',
            openTime,
            closeTime,
            description: shop.description || '',
            logoUrl: shop.logoUrl || '',
          };

          setForm(loadedValues);
          setSavedSnapshot(loadedValues);
          setOriginalHours(shop.openingHours || null);
          setHasExistingShop(true);

          if (
            typeof shop.latitude === 'number' &&
            typeof shop.longitude === 'number' &&
            shop.address
          ) {
            const coords: Coordinates = {
              latitude: shop.latitude,
              longitude: shop.longitude,
            };
            setInitialCoordinates(coords);
            setInitialLocation(shop.address, coords);
          } else if (shop.address) {
            setInitialCoordinates(null);
            setInitialLocation(shop.address, null);
          } else {
            setInitialCoordinates(null);
            setInitialLocation('', null);
          }
        } else if (res.status === 404) {
          // Utilisateur sans boutique : formulaire vierge
          setHasExistingShop(false);
          setForm(EMPTY_FORM);
          setSavedSnapshot(EMPTY_FORM);
          setInitialCoordinates(null);
          setInitialLocation('', null);
        } else {
          setServerError('Impossible de charger les données de votre commerce.');
        }
      } catch (err: any) {
        if (isMounted) {
          setServerError('Une erreur réseau est survenue lors du chargement de la boutique.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingShop(false);
        }
      }
    }

    loadShop();

    return () => {
      isMounted = false;
    };
  }, [setInitialLocation]);

  // Synchronisation de l'adresse du formulaire avec le hook de géocodage
  const onAddressInputChange = useCallback(
    (newAddr: string) => {
      setForm((prev) => ({ ...prev, address: newAddr }));
      setAddress(newAddr);
      setIsDirty(true);
      setIsSaved(false);
      if (fieldErrors.address) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.address;
          return next;
        });
      }
    },
    [setAddress, fieldErrors.address]
  );

  // Gestion des modifications génériques de champ
  const handleFieldChange = useCallback(
    (field: keyof ShopFormValues, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
      setIsSaved(false);
      if (field === 'openTime' || field === 'closeTime') {
        setHoursEdited(true);
      }
      if (fieldErrors[field]) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [fieldErrors]
  );

  // État UI calculé (dérivé de façon pure)
  const derivedState: DerivedUiState = useMemo(() => {
    if (geoStatus === 'notFound') {
      return 'addressNotFound';
    }
    if (geoStatus === 'unavailable' || tileErrorOccurred) {
      return 'mapUnavailable';
    }
    if (isSaved && !isDirty) {
      return 'saved';
    }
    return 'nominal';
  }, [geoStatus, tileErrorOccurred, isSaved, isDirty]);

  // Validation des champs obligatoires
  const isNameValid = form.name.trim().length >= 2;
  const isAddressValid = form.address.trim().length >= 5;
  const isPhoneValid = form.phone.trim().length >= 8;
  const areRequiredFieldsValid = isNameValid && isAddressValid && isPhoneValid;

  // Règles d'activation du bouton Enregistrer (Part B.4 : actif en 'idle')
  const isSaveEnabled =
    !isSubmitting &&
    geoStatus !== 'searching' &&
    geoStatus !== 'notFound' &&
    areRequiredFieldsValid;

  // Réinitialisation du formulaire (Annuler)
  const handleCancel = useCallback(() => {
    setForm(savedSnapshot);
    setIsDirty(false);
    setIsSaved(false);
    setServerError(null);
    setFieldErrors({});
    setTileErrorOccurred(false);
    setHoursEdited(false);
    setInitialLocation(
      savedSnapshot.address,
      initialCoordinates && savedSnapshot.address === address ? initialCoordinates : null
    );
  }, [savedSnapshot, setInitialLocation, initialCoordinates, address]);

  // Réessai carte / géocodage
  const handleRetryMap = useCallback(() => {
    setTileErrorOccurred(false);
    setMapKey((k) => k + 1);
    retry();
  }, [retry]);

  // Détection tuiles défaillantes (Part B.3 : ne modifie ni coordinates ni geoStatus)
  const handleTileError = useCallback(() => {
    setTileErrorOccurred(true);
  }, []);

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSaveEnabled) return;

    setIsSubmitting(true);
    setServerError(null);
    setFieldErrors({});

    const isAddressChanged = form.address.trim() !== savedSnapshot.address.trim();
    const hasStoredCoords = initialCoordinates !== null;

    let currentGeoStatus: 'idle' | 'searching' | 'found' | 'notFound' | 'unavailable' = geoStatus;
    let currentCoords: Coordinates | null = coordinates;

    // Part B.4 : Si l'adresse a changé et n'a pas été recherchée (idle), exécuter le lookup avant de sauvegarder
    if (isAddressChanged && currentGeoStatus === 'idle' && form.address.trim().length >= 5) {
      const lookupResult = await executeLookup(form.address.trim());
      currentGeoStatus = lookupResult.status;
      currentCoords = lookupResult.coordinates;

      if (lookupResult.status === 'notFound') {
        setIsSubmitting(false);
        return; // Bloque la sauvegarde et affiche l'erreur
      }
    }

    const payloadOpeningHours = buildOpeningHours(
      originalHours,
      form.openTime || '08:00',
      form.closeTime || '20:00',
      hoursEdited
    );

    // Construction du payload : JAMAIS de nulls explicites
    const payload: Record<string, any> = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      registryNumber: form.registryNumber.trim() || null,
      phone: form.phone.trim(),
      address: form.address.trim(),
      openingHours: payloadOpeningHours,
      description: form.description.trim() || null,
      logoUrl: form.logoUrl.trim() || null,
    };

    // Part B.2 & B.3 : Règle des coordonnées
    if (isAddressChanged) {
      if (currentGeoStatus === 'found' && currentCoords !== null) {
        payload.latitude = currentCoords.latitude;
        payload.longitude = currentCoords.longitude;
      }
      // Si non confirmé (notFound, unavailable, idle) : omission des clés (le serveur réinitialise à null)
    } else {
      // Adresse inchangée
      if (!hasStoredCoords && currentGeoStatus === 'found' && currentCoords !== null) {
        payload.latitude = currentCoords.latitude;
        payload.longitude = currentCoords.longitude;
      }
      // Si des coordonnées stockées existent : omission des clés (le serveur les conserve)
    }

    const targetUrl = '/api/shops/me';
    const method = hasExistingShop ? 'PUT' : 'POST';

    try {
      const res = await authFetch(targetUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        setIsSaved(true);
        setIsDirty(false);
        setHasExistingShop(true);
        setSavedSnapshot(form);
        if (payload.latitude && payload.longitude) {
          setInitialCoordinates({
            latitude: payload.latitude,
            longitude: payload.longitude,
          });
        }
        if (data?.shop?.openingHours) {
          setOriginalHours(data.shop.openingHours);
        }
      } else if (res.status === 400 && data?.errors) {
        const mappedErrors: Record<string, string> = {};
        if (Array.isArray(data.errors)) {
          data.errors.forEach((err: any) => {
            if (err.path && err.path[0]) {
              mappedErrors[err.path[0]] = err.message;
            }
          });
        }
        setFieldErrors(mappedErrors);
      } else {
        const errorMsg =
          data?.error?.message ||
          data?.message ||
          "Une erreur est survenue lors de l'enregistrement de la boutique.";
        setServerError(errorMsg);
      }
    } catch (err: any) {
      setServerError('Une erreur réseau est survenue. Veuillez vérifier votre connexion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Options pour le sélecteur de catégorie
  const categoryOptions = useMemo(() => {
    return [
      { value: '', label: 'Sélectionnez une catégorie' },
      ...SHOP_CATEGORIES.map((cat) => ({ value: cat, label: cat })),
    ];
  }, []);

  // Déterminer le statut à transmettre à MapBox
  const mapBoxStatus = useMemo(() => {
    if (tileErrorOccurred || geoStatus === 'unavailable') return 'down';
    if (derivedState === 'addressNotFound') return 'empty';
    if (coordinates) return 'ok';
    return 'empty';
  }, [tileErrorOccurred, geoStatus, derivedState, coordinates]);

  // [NOT IN FIGMA] Skeleton de chargement initial
  if (isLoadingShop) {
    return (
      <div className="w-full max-w-[1140px] mx-auto py-6 space-y-6 animate-pulse">
        <div className="h-14 bg-white/70 rounded-ui-card w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[28px]">
          <div className="lg:col-span-7 h-[480px] bg-white/70 rounded-ui-card" />
          <div className="lg:col-span-5 h-[480px] bg-white/70 rounded-ui-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1140px] mx-auto py-2 md:py-6 space-y-[28px]">
      {/* En-tête Responsive unifié */}
      <Header
        breadcrumb={['Mon espace', 'Ma boutique']}
        title="Ma boutique"
        subtitle="Présentez votre commerce et sa localisation à vos clients"
        mobileSubtitle="Modifiez les informations de votre commerce"
        onBack={() => navigate('/merchant/dashboard')}
        hasNotifications
        userAvatar={{
          name: currentUser?.fullName || form.name || '?',
          src: currentUser?.avatarUrl,
        }}
      />

      {/* Bannières contextuelles pleine largeur sous l'en-tête */}
      {derivedState === 'mapUnavailable' && (
        <Banner
          variant="warn"
          title="Le service de cartes est momentanément indisponible."
          description="Vous pouvez enregistrer vos informations : la position sur la carte sera confirmée plus tard."
        />
      )}

      {derivedState === 'saved' && (
        <Banner
          variant="success"
          title="Votre boutique a été mise à jour."
          description="Les clients voient déjà vos nouvelles informations."
        />
      )}

      {serverError && (
        <Banner
          variant="error"
          title="Une erreur technique est survenue."
          description={serverError}
        />
      )}

      {/* Formulaire principal en deux colonnes Figma */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col lg:flex-row gap-[28px] items-start">
          {/* Colonne 1 : Informations du commerce (640px) */}
          <div className="w-full lg:w-[640px] shrink-0">
            <Card
              icon={<Icon name="building" size={20} />}
              title="Informations du commerce"
            >
              <div className="space-y-[18px]">
                {/* 1. Nom du commerce */}
                <Field
                  label="Nom du commerce"
                  leftIcon={<Icon name="building" size={20} />}
                  value={form.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="Ex. : Boulangerie du Centre"
                  error={fieldErrors.name}
                  required
                />

                {/* 2. Catégorie & N° de registre de commerce */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                  <Field
                    as="select"
                    label="Catégorie"
                    value={form.category}
                    onChange={(e) => handleFieldChange('category', e.target.value)}
                    options={categoryOptions}
                    error={fieldErrors.category}
                  />

                  <Field
                    label="N° de registre de commerce"
                    leftIcon={<Icon name="file" size={20} />}
                    value={form.registryNumber}
                    onChange={(e) => handleFieldChange('registryNumber', e.target.value)}
                    placeholder="Ex. : 16/00-0123456 B 21"
                    error={fieldErrors.registryNumber}
                  />
                </div>

                {/* 3. Téléphone du commerce */}
                <Field
                  label="Téléphone du commerce"
                  leftIcon={<Icon name="phone" size={20} />}
                  value={form.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  placeholder="Ex. : +213 555 12 34 56"
                  error={fieldErrors.phone}
                  required
                />

                {/* 4. Adresse du commerce */}
                <Field
                  label="Adresse du commerce"
                  leftIcon={<Icon name="pin" size={20} />}
                  value={form.address}
                  onChange={(e) => onAddressInputChange(e.target.value)}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  placeholder="Ex. : 10 Rue Didouche Mourad, Alger"
                  helperText={
                    derivedState !== 'addressNotFound'
                      ? 'Le repère sur la carte est placé automatiquement à partir de cette adresse.'
                      : undefined
                  }
                  error={
                    derivedState === 'addressNotFound'
                      ? 'Adresse introuvable. Vérifiez la rue et la ville, ou précisez la commune.'
                      : fieldErrors.address
                  }
                  aria-invalid={derivedState === 'addressNotFound' || Boolean(fieldErrors.address)}
                  aria-describedby={
                    derivedState === 'addressNotFound'
                      ? 'address-error'
                      : 'address-helper'
                  }
                  required
                />

                {/* 5. Horaires (Ouverture & Fermeture) */}
                <div className="grid grid-cols-2 gap-[16px]">
                  <Field
                    label="Ouverture"
                    leftIcon={<Icon name="clock" size={20} />}
                    value={form.openTime}
                    onChange={(e) => handleFieldChange('openTime', e.target.value)}
                    placeholder="08:00"
                  />
                  <Field
                    label="Fermeture"
                    leftIcon={<Icon name="clock" size={20} />}
                    value={form.closeTime}
                    onChange={(e) => handleFieldChange('closeTime', e.target.value)}
                    placeholder="20:00"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Colonne 2 : Localisation sur la carte */}
          <div className="w-full lg:flex-1">
            <Card
              icon={<Icon name="pin" size={20} />}
              title="Localisation sur la carte"
            >
              <div className="flex flex-col gap-3">
                <MapBox
                  key={mapKey}
                  status={mapBoxStatus}
                  position={
                    coordinates ? [coordinates.latitude, coordinates.longitude] : null
                  }
                  address={form.address}
                  onRetry={handleRetryMap}
                  onTileError={handleTileError}
                  showFooter={false}
                />

                {/* Pastille d'état & Note explicative (responsive Figma) */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <div>
                    {geoStatus === 'searching' ? (
                      /* [NOT IN FIGMA] État transitoire lors de la requête de géocodage */
                      <Chip variant="neutral">Recherche de la position…</Chip>
                    ) : derivedState === 'addressNotFound' ? (
                      <Chip variant="error">Position non détectée</Chip>
                    ) : derivedState === 'mapUnavailable' ? (
                      <Chip variant="warn">Position à confirmer</Chip>
                    ) : (
                      <Chip variant="success">Position détectée</Chip>
                    )}
                  </div>

                  <p className="hidden md:block text-[13px] font-normal text-ui-text-70">
                    {derivedState === 'addressNotFound'
                      ? 'Corrigez l’adresse pour que les clients puissent vous trouver sur la carte.'
                      : 'Les clients proches de vous verront votre commerce sur la carte et dans les résultats.'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Boutons d'Action Principaux */}
        {/* Mobile : colonne inversée (Enregistrer en haut, Annuler en bas). Desktop : Annuler à gauche, Enregistrer à droite */}
        <div className="flex flex-col-reverse lg:flex-row justify-end items-stretch lg:items-center gap-3 pt-6">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="w-full lg:w-auto"
          >
            Annuler
          </Button>

          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={!isSaveEnabled}
            leftIcon={<Icon name="check" size={18} />}
            className="w-full lg:w-auto"
          >
            Enregistrer les modifications
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ShopEditPage;
