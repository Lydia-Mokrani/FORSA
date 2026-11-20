// frontend/src/features/catalogue/pages/HomePage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CatalogueApi } from '../services/api';
import { Category, Offer } from '../types';
import { CategorySlider } from '../components/CategorySlider';
import { OfferCard } from '../components/OfferCard';
import { useLocation } from '../context/LocationContext';
import { Sparkles, ArrowRight, ShieldCheck, HeartHandshake, Leaf, MapPin, Clock } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { location, openModal } = useLocation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [nearbyOffers, setNearbyOffers] = useState<Offer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [cats, offersRes] = await Promise.all([
          CatalogueApi.getCategories(),
          CatalogueApi.getOffers({
            lat: location.lat,
            lng: location.lng,
            category: selectedCategory,
            limit: 8,
          }),
        ]);
        setCategories(cats);
        setNearbyOffers(offersRes.data);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [location, selectedCategory]);

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white rounded-3xl mx-4 sm:mx-6 lg:mx-8 mt-6 p-8 sm:p-12 lg:p-16 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 bg-emerald-700/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/30 text-emerald-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Sauvez les invendus du jour jusqu'à -70%</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Ne laissez rien se perdre, saisissez votre{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-emerald-300">
              فرصة (Chance)
            </span>
          </h1>

          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-xl">
            Rejoignez le mouvement anti-gaspillage en Algérie. Découvrez les paniers surprises préparés
            par vos commerçants de quartier préférés à prix réduits.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/explore"
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/30 transition flex items-center gap-2"
            >
              <span>Voir les paniers disponibles</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={openModal}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-semibold text-xs sm:text-sm rounded-xl transition flex items-center gap-2"
            >
              <MapPin className="w-4 h-4 text-emerald-300" />
              <span className="truncate max-w-[180px]">{location.label}</span>
            </button>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-10 top-10 w-72 h-72 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
      </section>

      {/* Categories section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900">Que souhaitez-vous sauver aujourd'hui ?</h2>
            <p className="text-xs text-gray-500">Parcourez par catégorie d'invendus</p>
          </div>
          <Link
            to="/explore"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition"
          >
            <span>Tout voir</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <CategorySlider
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={(slug) => setSelectedCategory(slug)}
        />
      </section>

      {/* Nearby Urgent Offers section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900">À sauver près de chez vous</h2>
              <p className="text-xs text-gray-500">
                Paniers disponibles à récupérer aujourd'hui près de {location.label}
              </p>
            </div>
          </div>
          <Link
            to="/explore"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition"
          >
            <span>Explorer tout ({nearbyOffers.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 rounded-2xl bg-gray-200/70 animate-pulse" />
            ))}
          </div>
        ) : nearbyOffers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {nearbyOffers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center space-y-3">
            <span className="text-4xl">🧺</span>
            <h3 className="text-sm font-bold text-gray-800">Aucun panier disponible dans cette zone</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Changez de localisation ou retirez les filtres pour voir d'autres commerces partenaires.
            </p>
            <button
              onClick={openModal}
              className="mt-2 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl"
            >
              Changer de position
            </button>
          </div>
        )}
      </section>

      {/* Trust & Impact 3 Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Leaf className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Écologique & Éco-responsable</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              En sauvant ces paniers, vous évitez la mise au rebut d'aliments sains et réduisez l'empreinte carbone.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Économique & Malin</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Bénéficiez de remises allant jusqu'à 70% sur des produits alimentaires et de première nécessité.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Qualité & Dates Vérifiées</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Pour les produits emballés, les dates de péremption sont systématiquement analysées par OCR (MS4).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
