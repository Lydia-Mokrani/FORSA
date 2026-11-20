// frontend/src/features/catalogue/pages/CreateOfferPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CatalogueApi } from '../services/api';
import { Category } from '../types';
import { ArrowLeft, Upload, Sparkles, AlertCircle, Calendar, Clock, DollarSign, Camera } from 'lucide-react';

export const CreateOfferPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [originalPrice, setOriginalPrice] = useState<number | ''>('');
  const [discountedPrice, setDiscountedPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(5);
  const [expiresAt, setExpiresAt] = useState(() => {
    // Default today at 19:30
    const d = new Date();
    d.setHours(19, 30, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [hasProductExpiry, setHasProductExpiry] = useState(false);
  const [productExpiryDate, setProductExpiryDate] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    CatalogueApi.getCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0) setCategoryId(cats[0].id);
    });
  }, []);

  // Calculate discount percentage automatically
  const discountPercent =
    typeof originalPrice === 'number' && typeof discountedPrice === 'number' && originalPrice > 0
      ? Math.round((1 - discountedPrice / originalPrice) * 100)
      : null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setSelectedPhotos(files);
    const urls = files.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(urls);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Veuillez renseigner le titre du panier.');
      return;
    }
    if (!originalPrice || !discountedPrice) {
      setError('Veuillez saisir les deux prix.');
      return;
    }
    if (discountedPrice >= originalPrice) {
      setError('Le prix anti-gaspi doit être strictement inférieur au prix original.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create offer record
      const payload = {
        shopId: 'shop-demo-00000000-0000-0000-0000-000000000001', // Demo shop ID
        categoryId,
        name,
        description,
        originalPrice: Number(originalPrice),
        discountedPrice: Number(discountedPrice),
        quantityAvailable: Number(quantity),
        expiresAt: new Date(expiresAt).toISOString(),
        productExpiryDate: hasProductExpiry && productExpiryDate ? new Date(productExpiryDate).toISOString() : undefined,
      };

      const created = await CatalogueApi.createOffer(payload);

      // 2. Upload photos if selected
      if (selectedPhotos.length > 0) {
        await CatalogueApi.uploadPhotos(created.id, selectedPhotos);
      }

      alert('Offre créée avec succès !');
      navigate('/merchant/my-offers');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la création de l’offre.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-5">
        <Link
          to="/merchant/my-offers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-emerald-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à mes offres</span>
        </Link>
        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
          Nouveau Panier Anti-Gaspi
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Error message banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Basic Info */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-xs space-y-5">
          <h2 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3">
            1. Informations générales du panier
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Nom de l'offre / Titre du panier *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Panier Surprise Boulangerie du Soir (Croissants & Pains)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  Catégorie du produit *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.nameFr} ({c.nameAr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  Quantité de paniers disponibles *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Description détaillée du contenu *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Décrivez les produits inclus, le poids approximatif ou toute consigne pour le client lors du retrait..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Pricing Section */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-xs space-y-5">
          <h2 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3">
            2. Tarification & Réduction
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Prix d'origine (Valeur réelle en DA) *
              </label>
              <input
                type="number"
                min="10"
                required
                placeholder="Ex: 800"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Prix Réduit Anti-Gaspi (DA) *
              </label>
              <input
                type="number"
                min="0"
                required
                placeholder="Ex: 300"
                value={discountedPrice}
                onChange={(e) => setDiscountedPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Discount calculation box */}
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase block">
                  Réduction calculée
                </span>
                <span className="text-xl font-black text-amber-900">
                  {discountPercent !== null && discountPercent > 0 ? `-${discountPercent}%` : '--'}
                </span>
              </div>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400">
            * Règle stricte : le prix anti-gaspi doit impérativement être inférieur au prix normal.
          </p>
        </div>

        {/* 3. Dates & Product Verification (MS4 OCR) */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-xs space-y-5">
          <h2 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3">
            3. Échéance & Traçabilité (DLUO)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Heure limite de retrait *
              </label>
              <input
                type="datetime-local"
                required
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Heure après laquelle le panier ne peut plus être récupéré en boutique.
              </span>
            </div>

            {/* Packaged Product DLUO Option */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/70 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasProductExpiry}
                  onChange={(e) => setHasProductExpiry(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-gray-800">
                  Ce panier contient des produits emballés avec DLUO
                </span>
              </label>

              {hasProductExpiry && (
                <div className="space-y-2 pt-1 animate-fadeIn">
                  <label className="text-[11px] font-semibold text-gray-600 block">
                    Date limite de consommation (DLUO) :
                  </label>
                  <input
                    type="date"
                    required={hasProductExpiry}
                    value={productExpiryDate}
                    onChange={(e) => setProductExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white"
                  />
                  <p className="text-[10px] text-purple-700 bg-purple-50 p-2 rounded-lg">
                    ℹ️ L'offre passera par la vérification automatique OCR (MS4) avant publication active.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Photos Upload */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-xs space-y-5">
          <h2 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3">
            4. Photos du produit
          </h2>

          <div className="border-2 border-dashed border-gray-200 hover:border-emerald-400 rounded-2xl p-6 text-center transition cursor-pointer relative bg-gray-50/50">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700">
                  Glissez-déposez vos photos ou <span className="text-emerald-600 underline">parcourez</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Formats acceptés : JPG, PNG, WebP (max 5 Mo par image). Compressé automatiquement par Sharp.
                </p>
              </div>
            </div>
          </div>

          {/* Previews */}
          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-2">
              {photoPreviews.map((src, i) => (
                <div key={i} className="h-24 rounded-xl overflow-hidden border border-gray-200 relative group">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            to="/merchant/my-offers"
            className="px-6 py-3 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
          >
            Annuler
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? 'Publication en cours...' : 'Publier le panier anti-gaspi'}
          </button>
        </div>
      </form>
    </div>
  );
};
