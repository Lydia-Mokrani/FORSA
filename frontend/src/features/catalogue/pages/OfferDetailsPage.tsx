// frontend/src/features/catalogue/pages/OfferDetailsPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CatalogueApi } from '../services/api';
import { Offer } from '../types';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Star,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Store,
  Share2,
} from 'lucide-react';
import { useLocation } from '../context/LocationContext';

export const OfferDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { location } = useLocation();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [reservationNotice, setReservationNotice] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    CatalogueApi.getOfferById(id)
      .then(setOffer)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-6 w-32 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-96 bg-gray-200 rounded-3xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded-lg w-3/4" />
            <div className="h-4 bg-gray-200 rounded-lg w-1/2" />
            <div className="h-24 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <span className="text-5xl">🔍</span>
        <h2 className="text-xl font-bold text-gray-900">Offre introuvable</h2>
        <p className="text-xs text-gray-500">
          Cette offre a peut-être expiré ou a été retirée par le commerçant.
        </p>
        <Link
          to="/explore"
          className="inline-flex px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl"
        >
          Retour aux offres
        </Link>
      </div>
    );
  }

  const photos =
    offer.photos && offer.photos.length > 0
      ? offer.photos
      : [
          {
            id: 'default',
            url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80',
            sortOrder: 0,
          },
        ];

  const expiryDate = new Date(offer.expiresAt);
  const isToday = expiryDate.toDateString() === new Date().toDateString();
  const timeString = expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const stockRatio = (offer.quantityAvailable / (offer.quantityInitial || offer.quantityAvailable || 1)) * 100;
  const isLowStock = offer.quantityAvailable <= 3;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-emerald-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux paniers</span>
        </Link>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Lien de l’offre copié dans le presse-papier !');
          }}
          className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1.5 p-2 rounded-lg hover:bg-gray-100 transition"
        >
          <Share2 className="w-4 h-4" />
          <span>Partager</span>
        </button>
      </div>

      {/* Main Grid: Gallery & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Photos (Col 7) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative h-96 sm:h-[420px] w-full rounded-3xl overflow-hidden bg-gray-100 border border-gray-100 shadow-md">
            <img
              src={photos[activePhotoIdx].url}
              alt={offer.name}
              className="w-full h-full object-cover"
            />
            {/* Discount Badge */}
            <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm px-3.5 py-1.5 rounded-full shadow-lg">
              -{offer.discountPercent}%
            </div>

            {/* Category */}
            {offer.category && (
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                <span>{offer.category.icon}</span>
                <span>{offer.category.nameFr}</span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {photos.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto py-1">
              {photos.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setActivePhotoIdx(idx)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition flex-shrink-0 ${
                    activePhotoIdx === idx ? 'border-emerald-600 scale-105 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info & Reservation (Col 5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-xs space-y-6">
            {/* Title & Shop preview */}
            <div>
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold mb-1.5">
                <Store className="w-3.5 h-3.5" />
                <span>{offer.shop?.name}</span>
                <span>•</span>
                <div className="flex items-center text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span className="ml-1 text-gray-700">{offer.shop?.averageRating?.toFixed(1) || '4.8'}</span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">
                {offer.name}
              </h1>
            </div>

            {/* Price section */}
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-800 font-semibold block">Prix anti-gaspi</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-800">
                    {offer.discountedPrice} <span className="text-sm font-bold">DA</span>
                  </span>
                  <span className="text-sm text-gray-400 line-through">
                    {offer.originalPrice} DA
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-extrabold text-amber-600 uppercase tracking-wider block">
                  Vous économisez
                </span>
                <span className="text-lg font-black text-amber-700">
                  {offer.originalPrice - offer.discountedPrice} DA
                </span>
              </div>
            </div>

            {/* Timing & Expiration */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2.5 text-gray-700">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>
                  À récupérer :{' '}
                  <strong className="text-gray-900">
                    {isToday ? `Aujourd'hui avant ${timeString}` : expiryDate.toLocaleDateString([], { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </strong>
                </span>
              </div>

              {/* DLUO (Packaged product verification) */}
              {offer.productExpiryDate && (
                <div className="flex items-center gap-2.5 text-blue-700 bg-blue-50/70 border border-blue-100 p-2.5 rounded-xl">
                  <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>
                    DLUO vérifiée par OCR (MS4) :{' '}
                    <strong>{new Date(offer.productExpiryDate).toLocaleDateString()}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Stock status */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className={isLowStock ? 'text-rose-600' : 'text-gray-700'}>
                  Quantité disponible : {offer.quantityAvailable} panier(s)
                </span>
                <span className="text-gray-400">{stockRatio.toFixed(0)}% restant</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isLowStock ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(10, stockRatio))}%` }}
                />
              </div>
            </div>

            {/* Action / Reserve button */}
            <div className="space-y-2">
              <button
                onClick={() => setReservationNotice(true)}
                disabled={offer.quantityAvailable === 0}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>{offer.quantityAvailable > 0 ? 'Réserver ce panier' : 'Panier épuisé'}</span>
              </button>

              <p className="text-[11px] text-gray-400 text-center">
                Paiement sur place lors du retrait • Réservation garantie par MS3
              </p>
            </div>

            {/* Notice modal when clicked */}
            {reservationNotice && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Module de Réservation (MS3)</span>
                </div>
                <p>
                  Dans l'architecture FORSA, la réservation appelle l'endpoint interne de MS2 :
                  <code className="block bg-white p-1 rounded font-mono text-[10px] text-gray-800 my-1">
                    POST /internal/offers/{offer.id}/reserve
                  </code>
                  qui décrémente le stock de façon atomique et sécurisée.
                </p>
                <button
                  onClick={() => setReservationNotice(false)}
                  className="text-emerald-700 font-bold underline hover:text-emerald-900"
                >
                  Fermer la notification
                </button>
              </div>
            )}
          </div>

          {/* Shop Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              <span>À propos du commerce</span>
            </h3>

            <div className="space-y-2 text-xs text-gray-600">
              <p className="font-semibold text-gray-800 text-sm">{offer.shop?.name}</p>
              <div className="flex items-start gap-2 text-gray-500">
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>{offer.shop?.address}</span>
              </div>
            </div>

            <Link
              to="/map"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
            >
              <span>Voir sur la carte interactive &rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Description section */}
      <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-gray-900">Description du panier</h2>
        <div className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-line">
          {offer.description}
        </div>
      </div>
    </div>
  );
};
