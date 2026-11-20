
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  Clock3,
  ImagePlus,
  Minus,
  Plus,
  UploadCloud,
  UserRound,
  Edit2,
} from 'lucide-react';

import { CatalogueApi } from '../services/api';
import { Category } from '../types';

const inputClass =
  'w-full h-[42px] rounded-[12px] border border-black/15 bg-white px-4 text-[13px] text-[#0B2C25] outline-none focus:border-[#0B2C25] focus:ring-2 focus:ring-[#0B2C25]/10';

const labelClass = 'mb-2 block text-[15px] font-medium text-black';

const cardClass = 'rounded-[30px] bg-white p-6 sm:p-8 lg:p-[43px]';

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
};

export const CreateOfferPage: React.FC = () => {
  const navigate = useNavigate();

  // General state
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shopId, setShopId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Product information
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Price and stock
  const [originalPrice, setOriginalPrice] = useState<number | ''>('');
  const [discountedPrice, setDiscountedPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [expiryDate, setExpiryDate] = useState(today());
  const [pickupStart, setPickupStart] = useState('16:00');
  const [pickupEnd, setPickupEnd] = useState('20:00');

  // Packaging information
  const [isPackaged, setIsPackaged] = useState(true);
  const [datePhoto, setDatePhoto] = useState<File | null>(null);

  // Load categories and the merchant's actual shop ID
  useEffect(() => {
    let active = true;

    Promise.all([
      CatalogueApi.getCategories(),
      CatalogueApi.getMerchantDashboard(),
    ])
      .then(([cats, dashboard]) => {
        if (!active) return;

        setCategories(cats);
        setCategoryId(cats[0]?.id ?? '');
        setShopId(dashboard.shops?.[0]?.id ?? '');
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger les informations nécessaires à la création de l'offre."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Clean up temporary photo preview URLs
  useEffect(() => {
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoPreviews]);

  // Calculate discount
  const discount = useMemo(() => {
    if (
      typeof originalPrice !== 'number' ||
      typeof discountedPrice !== 'number' ||
      originalPrice <= 0
    ) {
      return null;
    }

    return Math.round(
      (1 - discountedPrice / originalPrice) * 100
    );
  }, [originalPrice, discountedPrice]);

  // Product photo selection
  const handlePhotos = (files: FileList | null) => {
    if (!files) return;

    const selected = Array.from(files)
      .filter(
        (file) =>
          ['image/jpeg', 'image/png'].includes(file.type) &&
          file.size <= 5 * 1024 * 1024
      )
      .slice(0, 5);

    photoPreviews.forEach((url) => URL.revokeObjectURL(url));

    setPhotos(selected);
    setPhotoPreviews(
      selected.map((file) => URL.createObjectURL(file))
    );
  };

  // Validate each step before proceeding
  const validateStep = () => {
    setError(null);

    if (step === 1) {
      if (!name.trim()) {
        setError('Veuillez saisir le nom du produit.');
        return false;
      }

      if (!categoryId) {
        setError('Veuillez choisir une catégorie.');
        return false;
      }

      if (!description.trim()) {
        setError('Veuillez ajouter une description.');
        return false;
      }

      if (photos.length === 0) {
        setError('Veuillez ajouter au moins une photo du produit.');
        return false;
      }
    }

    if (step === 2) {
      if (
        originalPrice === '' ||
        originalPrice <= 0 ||
        discountedPrice === '' ||
        discountedPrice <= 0
      ) {
        setError('Veuillez saisir des prix valides.');
        return false;
      }

      if (discountedPrice >= originalPrice) {
        setError(
          "Le prix réduit doit être inférieur au prix d'origine."
        );
        return false;
      }

      if (!expiryDate || expiryDate < today()) {
        setError(
          'La date de péremption ne peut pas être dans le passé.'
        );
        return false;
      }

      if (pickupEnd <= pickupStart) {
        setError(
          "L'heure de fin doit être après l'heure de début."
        );
        return false;
      }

      if (isPackaged && !datePhoto) {
        setError(
          "Veuillez ajouter une photo de la date sur l'emballage."
        );
        return false;
      }
    }

    return true;
  };

  // Publish offer through the existing API
  const handlePublish = async () => {
    setError(null);

    if (!shopId) {
      setError(
        "Aucun commerce n'est associé à ce compte marchand."
      );
      return;
    }

    setSubmitting(true);

    try {
      const created = await CatalogueApi.createOffer({
        shopId,
        categoryId,
        name: name.trim(),
        description: description.trim(),
        originalPrice: Number(originalPrice),
        discountedPrice: Number(discountedPrice),
        quantityAvailable: quantity,
        expiresAt: new Date(
          `${expiryDate}T${pickupEnd}:00`
        ).toISOString(),
        productExpiryDate: new Date(
          `${expiryDate}T12:00:00`
        ).toISOString(),
      });

      if (photos.length > 0) {
        await CatalogueApi.uploadPhotos(created.id, photos);
      }

      navigate('/merchant/my-offers');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de la création de l'offre."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const categoryName =
    categories.find((category) => category.id === categoryId)
      ?.nameFr ?? '—';

  const formatPrice = (value: number | '') =>
    value === ''
      ? '—'
      : `${new Intl.NumberFormat('fr-FR').format(value)} DA`;

  return (
    <div className="mx-auto w-full max-w-[1066px] pb-10 text-[#0B2C25]">

      {/* Header */}
      <header className="mb-7 flex items-start justify-between gap-5">
        <div>
          <h1 className="font-poppins text-[clamp(30px,3.35vw,48px)] font-semibold leading-tight">
            Ajouter une offre
          </h1>

          <p className="mt-2 font-poppins text-[15px] text-[#0B2C25]/75 sm:text-[20px]">
            Donnez une autre vie à vos produits invendus
          </p>
        </div>

        <div className="mt-1 flex shrink-0 items-center gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="p-2"
          >
            <Bell size={28} />
          </button>

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E9E0D0]">
            <UserRound size={23} />
          </div>
        </div>
      </header>

      {/* Three-step progress indicator */}
      <div className="mb-8 flex items-center justify-between gap-2 px-0 sm:px-2">
        {[
          { number: 1, title: 'Produit' },
          { number: 2, title: 'Prix et stock' },
          { number: 3, title: 'Vérification' },
        ].map((item, index) => (
          <React.Fragment key={item.number}>
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-lg sm:h-[58px] sm:w-[58px] ${
                  step >= item.number
                    ? 'border-[#0B2C25] bg-[#0B2C25] text-white'
                    : 'border-[#0B2C25]/25 text-black/30'
                }`}
              >
                {step > item.number ? (
                  <Check size={27} />
                ) : (
                  item.number
                )}
              </div>

              <span
                className={`whitespace-nowrap text-[12px] sm:text-[17px] ${
                  step === item.number
                    ? 'font-medium text-[#0B2C25]'
                    : 'text-[#0B2C25]/55'
                }`}
              >
                {item.title}
              </span>
            </div>

            {index < 2 && (
              <div className="h-px min-w-[12px] flex-1 bg-[#0B2C25]/30 sm:mx-4" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* STEP 1: PRODUCT */}
      {step === 1 && (
        <section
          className={`${cardClass} grid gap-8 lg:grid-cols-[312px_minmax(0,1fr)] lg:items-center lg:gap-[58px]`}
        >
          {/* Photo upload */}
          <label className="relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[20px] border-[1.5px] border-dashed border-[#0B2C25]/45 bg-[#FFFAF0] p-5 text-center lg:h-[300px]">
            {photoPreviews.length > 0 ? (
              <div className="grid h-full w-full grid-cols-2 gap-2">
                {photoPreviews.map((src, index) => (
                  <img
                    key={src}
                    src={src}
                    alt={`Photo du produit ${index + 1}`}
                    className="h-full max-h-[260px] w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            ) : (
              <>
                <ImagePlus size={44} strokeWidth={1.4} />

                <span className="mt-3 text-[18px] font-medium">
                  Ajouter une photo
                </span>

                <span className="mt-2 max-w-[210px] text-[12px] leading-relaxed text-[#0B2C25]/60">
                  Glissez votre image ici ou cliquez pour parcourir
                </span>

                <span className="mt-3 rounded-full border border-[#0B2C25]/70 px-4 py-2 text-[12px] font-medium">
                  Choisir un fichier
                </span>

                <span className="mt-2 text-[11px] text-[#0B2C25]/45">
                  JPG ou PNG · 5 Mo max
                </span>
              </>
            )}

            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(event) => handlePhotos(event.target.files)}
            />
          </label>

          {/* Product fields */}
          <div className="space-y-5">
            <div>
              <label className={labelClass} htmlFor="offer-name">
                Nom du produit
              </label>

              <input
                id="offer-name"
                className={inputClass}
                placeholder="ex: Pain complet"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="offer-category">
                Catégorie
              </label>

              <div className="relative">
                <select
                  id="offer-category"
                  className={`${inputClass} appearance-none pr-10`}
                  value={categoryId}
                  onChange={(event) =>
                    setCategoryId(event.target.value)
                  }
                >
                  <option value="">
                    Choisir une catégorie
                  </option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.nameFr}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={17}
                  className="pointer-events-none absolute right-4 top-3"
                />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="offer-description">
                Description
              </label>

              <textarea
                id="offer-description"
                rows={3}
                className={`${inputClass} h-[90px] resize-none py-3`}
                placeholder="Écrivez ici"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
              />
            </div>
          </div>
        </section>
      )}

      {/* STEP 2: PRICE AND STOCK */}
      {step === 2 && (
        <section
          className={`${cardClass} grid gap-8 lg:grid-cols-[312px_minmax(0,1fr)] lg:gap-[58px]`}
        >
          {/* Product image preview */}
          <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-[20px] bg-[#FFFAF0]">
            {photoPreviews[0] ? (
              <img
                src={photoPreviews[0]}
                alt="Photo du produit"
                className="h-full max-h-[330px] w-full object-cover"
              />
            ) : (
              <Camera size={38} />
            )}

            <button
              type="button"
              onClick={() => setStep(1)}
              aria-label="Modifier la photo"
              className="absolute bottom-3 right-3 rounded-full bg-white/90 p-2 shadow"
            >
              <Edit2 size={18} />
            </button>
          </div>

          <div className="space-y-6">

            {/* Prices */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="original-price">
                  Prix initial
                </label>

                <input
                  id="original-price"
                  type="number"
                  min="1"
                  className={inputClass}
                  placeholder="300 DA"
                  value={originalPrice}
                  onChange={(event) =>
                    setOriginalPrice(
                      event.target.value === ''
                        ? ''
                        : Number(event.target.value)
                    )
                  }
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="discount-price">
                  Prix réduit
                </label>

                <input
                  id="discount-price"
                  type="number"
                  min="1"
                  className={inputClass}
                  placeholder="180 DA"
                  value={discountedPrice}
                  onChange={(event) =>
                    setDiscountedPrice(
                      event.target.value === ''
                        ? ''
                        : Number(event.target.value)
                    )
                  }
                />
              </div>
            </div>

            <p className="text-[11px] text-[#0B2C25]/65">
              {discount !== null && discount > 0
                ? `−${discount}% de réduction`
                : 'La réduction sera calculée automatiquement'}
            </p>

            {/* Quantity and expiry */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Quantité disponible
                </label>

                <div className="flex h-[45px] w-[154px] items-center rounded-lg border border-black/15 bg-white">
                  <button
                    type="button"
                    aria-label="Diminuer la quantité"
                    onClick={() =>
                      setQuantity((value) => Math.max(1, value - 1))
                    }
                    className="flex h-full w-12 items-center justify-center border-r border-black/10"
                  >
                    <Minus size={16} />
                  </button>

                  <span className="flex-1 text-center">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    aria-label="Augmenter la quantité"
                    onClick={() =>
                      setQuantity((value) => value + 1)
                    }
                    className="flex h-full w-12 items-center justify-center border-l border-black/10"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="expiry-date">
                  Date de péremption
                </label>

                <div className="relative">
                  <CalendarDays
                    size={16}
                    className="absolute left-3 top-3"
                  />

                  <input
                    id="expiry-date"
                    type="date"
                    min={today()}
                    className={`${inputClass} pl-10`}
                    value={expiryDate}
                    onChange={(event) =>
                      setExpiryDate(event.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Pickup time */}
            <div>
              <label className={labelClass}>
                Créneau de retrait
              </label>

              <p className="mb-2 text-[10px] text-[#0B2C25]/60">
                Quand les clients peuvent venir récupérer leur commande
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Clock3
                    size={15}
                    className="absolute left-3 top-3"
                  />

                  <input
                    aria-label="Heure de début du retrait"
                    type="time"
                    className={`${inputClass} pl-9`}
                    value={pickupStart}
                    onChange={(event) =>
                      setPickupStart(event.target.value)
                    }
                  />
                </div>

                <div className="relative">
                  <Clock3
                    size={15}
                    className="absolute left-3 top-3"
                  />

                  <input
                    aria-label="Heure de fin du retrait"
                    type="time"
                    className={`${inputClass} pl-9`}
                    value={pickupEnd}
                    onChange={(event) =>
                      setPickupEnd(event.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Packaged product toggle */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[15px] font-medium text-black">
                Produit emballé ?
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={isPackaged}
                onClick={() => {
                  setIsPackaged((value) => !value);
                  setDatePhoto(null);
                }}
                className={`relative h-7 w-[50px] rounded-full transition ${
                  isPackaged ? 'bg-[#0B2C25]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    isPackaged ? 'left-[26px]' : 'left-1'
                  }`}
                />
              </button>

              <span className="text-[13px]">
                {isPackaged ? 'Oui' : 'Non'}
              </span>
            </div>

            <p className="text-[10px] leading-relaxed text-[#0B2C25]/65">
              Désactivez pour les produits frais (pain, viennoiseries) :
              aucune photo de date n’est demandée.
            </p>

            {/* Date photo */}
            {isPackaged && (
              <label className="flex cursor-pointer flex-wrap items-center gap-4 rounded-2xl border-[1.5px] border-dashed border-[#0B2C25]/45 bg-[#FFFAF0] p-4">
                <UploadCloud size={30} />

                <span className="min-w-0 flex-1">
                  <strong className="block text-[13px] font-medium">
                    Photo de la date sur l’emballage
                  </strong>

                  <small className="mt-1 block text-[11px] text-[#0B2C25]/60">
                    Date bien visible (DLC, DDM ou EXP).
                    Elle sera lue automatiquement à l’étape suivante.
                  </small>

                  {datePhoto && (
                    <small className="mt-1 block text-[#0B2C25]">
                      {datePhoto.name}
                    </small>
                  )}
                </span>

                <span className="rounded-full border border-[#0B2C25]/70 px-4 py-2 text-[11px]">
                  Choisir un fichier
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="sr-only"
                  onChange={(event) =>
                    setDatePhoto(event.target.files?.[0] ?? null)
                  }
                />
              </label>
            )}
          </div>
        </section>
      )}

      {/* STEP 3: VERIFICATION */}
      {step === 3 && (
        <section
          className={`${cardClass} grid gap-8 lg:grid-cols-[312px_minmax(0,1fr)] lg:gap-[58px]`}
        >
          {/* Product image */}
          <div className="flex min-h-[300px] items-center justify-center overflow-hidden rounded-[20px] bg-[#FFFAF0]">
            {photoPreviews[0] ? (
              <img
                src={photoPreviews[0]}
                alt="Photo du produit"
                className="h-full max-h-[372px] w-full object-cover"
              />
            ) : (
              <Camera size={40} />
            )}
          </div>

          {/* Summary */}
          <div className="space-y-6">

            {/* Product summary */}
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-black/10 pb-3">
                <h2 className="text-[20px] font-medium">
                  Produit
                </h2>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[13px] font-medium text-[#17664E] underline"
                >
                  modifier
                </button>
              </div>

              <div className="space-y-3 text-[14px]">
                <div className="flex justify-between gap-4">
                  <span className="text-black/55">Nom</span>
                  <strong className="max-w-[60%] text-right font-medium">
                    {name}
                  </strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-black/55">Catégorie</span>
                  <strong className="font-medium">
                    {categoryName}
                  </strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-black/55">Description</span>
                  <strong className="max-w-[60%] text-right font-medium">
                    {description}
                  </strong>
                </div>
              </div>
            </div>

            {/* Offer summary */}
            <div className="border-t border-black/10 pt-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[20px] font-medium">
                  Offre
                </h2>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-[13px] font-medium text-[#17664E] underline"
                >
                  modifier
                </button>
              </div>

              <div className="space-y-3 text-[14px]">
                <div className="flex justify-between">
                  <span className="text-black/55">Prix initial</span>
                  <strong className="font-medium">
                    {formatPrice(originalPrice)}
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-black/55">Prix réduit</span>
                  <strong className="font-medium">
                    {formatPrice(discountedPrice)}
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-black/55">
                    Quantité disponible
                  </span>
                  <strong className="font-medium">
                    {quantity} pièces
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-black/55">Péremption</span>
                  <strong className="font-medium">
                    {expiryDate}
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-black/55">
                    Créneau de retrait
                  </span>
                  <strong className="font-medium">
                    {pickupStart} – {pickupEnd}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Navigation buttons */}
      <footer className="mt-8 flex flex-wrap items-center justify-end gap-3">
        <Link
          to="/merchant/my-offers"
          className="rounded-[10px] border border-black/30 px-5 py-3 text-[13px] font-medium text-[#0B2C25]/75 hover:bg-white"
        >
          Annuler
        </Link>

        {step > 1 && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep((value) => value - 1);
            }}
            className="rounded-[10px] border border-[#0B2C25]/30 px-5 py-3 text-[13px] font-medium"
          >
            Retour
          </button>
        )}

        {step < 3 ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (validateStep()) {
                setStep((value) => value + 1);
              }
            }}
            className="inline-flex items-center gap-3 rounded-[10px] bg-[#0B2C25] px-5 py-3 text-[13px] font-semibold text-white hover:bg-[#124438] disabled:opacity-50"
          >
            Suivant
            <ArrowRight size={18} />
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting || loading}
            onClick={handlePublish}
            className="rounded-[10px] bg-[#0B2C25] px-5 py-3 text-[13px] font-semibold text-white hover:bg-[#124438] disabled:opacity-50"
          >
            {submitting
              ? 'Publication en cours…'
              : 'Publier l’offre'}
          </button>
        )}
      </footer>

      {loading && (
        <p className="mt-3 text-right text-xs text-[#0B2C25]/55">
          Chargement des catégories et du commerce…
        </p>
      )}
    </div>
  );
};

export default CreateOfferPage;
