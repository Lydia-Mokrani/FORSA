// frontend/src/features/catalogue/pages/EditOfferPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CatalogueApi } from '../services/api';
import { Category, Offer } from '../types';
import { ArrowLeft, Sparkles, AlertCircle, Save } from 'lucide-react';

export const EditOfferPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [originalPrice, setOriginalPrice] = useState<number | ''>('');
  const [discountedPrice, setDiscountedPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([CatalogueApi.getCategories(), CatalogueApi.getOfferById(id)])
      .then(([cats, offer]) => {
        setCategories(cats);
        if (offer) {
          setName(offer.name);
          setDescription(offer.description);
          setCategoryId(offer.categoryId || cats[0]?.id || '');
          setOriginalPrice(offer.originalPrice);
          setDiscountedPrice(offer.discountedPrice);
          setQuantity(offer.quantityAvailable);
          if (offer.expiresAt) {
            setExpiresAt(new Date(offer.expiresAt).toISOString().slice(0, 16));
          }
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const discountPercent =
    typeof originalPrice === 'number' && typeof discountedPrice === 'number' && originalPrice > 0
      ? Math.round((1 - discountedPrice / originalPrice) * 100)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);

    if (!originalPrice || !discountedPrice) {
      setError('Veuillez renseigner les deux prix.');
      return;
    }
    if (discountedPrice >= originalPrice) {
      setError('Le prix réduit doit être strictement inférieur au prix d’origine.');
      return;
    }

    setSaving(true);
    try {
      await CatalogueApi.updateOffer(id, {
        name,
        description,
        categoryId,
        originalPrice: Number(originalPrice),
        discountedPrice: Number(discountedPrice),
        quantityAvailable: Number(quantity),
        expiresAt: new Date(expiresAt).toISOString(),
      });

      alert('Offre mise à jour avec succès !');
      navigate('/merchant/my-offers');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour de l’offre.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-6 w-32 bg-gray-200 rounded-lg" />
        <div className="h-64 bg-gray-200 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-5">
        <Link
          to="/merchant/my-offers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-emerald-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à mes offres</span>
        </Link>
        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
          Modifier l’Offre #{id?.slice(0, 8)}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Titre de l’offre *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Catégorie *</label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.nameFr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Stock disponible *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Prix d’origine (DA) *</label>
                <input
                  type="number"
                  min="10"
                  required
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Prix Réduit Anti-Gaspi (DA) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={discountedPrice}
                  onChange={(e) => setDiscountedPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-700 uppercase block">Réduction</span>
                  <span className="text-xl font-black text-amber-900">
                    {discountPercent !== null ? `-${discountPercent}%` : '--'}
                  </span>
                </div>
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Échéance de retrait *</label>
              <input
                type="datetime-local"
                required
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Description *</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            to="/merchant/my-offers"
            className="px-6 py-3 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
