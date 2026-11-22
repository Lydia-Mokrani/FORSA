// frontend/src/features/catalogue/components/OfferCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Offer } from '../types';
import { Clock, MapPin, Star, Package } from 'lucide-react';
import { useLocation } from '../context/LocationContext';

interface OfferCardProps {
  offer: Offer;
}

// Distance helper
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const OfferCard: React.FC<OfferCardProps> = ({ offer }) => {
  const { location } = useLocation();

  const distance = offer.shop?.latitude && offer.shop?.longitude
    ? calculateDistance(location.lat, location.lng, offer.shop.latitude, offer.shop.longitude)
    : null;

  // Format expiration time
  const expiryDate = new Date(offer.expiresAt);
  const isToday = expiryDate.toDateString() === new Date().toDateString();
  const timeString = expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const photoUrl =
    offer.photos && offer.photos.length > 0
      ? offer.photos[0].url
      : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';

  const stockRatio = (offer.quantityAvailable / (offer.quantityInitial || offer.quantityAvailable || 1)) * 100;
  const isLowStock = offer.quantityAvailable <= 3;

  return (
    <Link
      to={`/offers/${offer.id}`}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition duration-300 flex flex-col"
    >
      {/* Image container */}
      <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
        <img
          src={photoUrl}
          alt={offer.name}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          loading="lazy"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

        {/* Discount Badge */}
        <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
          <span>-{offer.discountPercent}%</span>
        </div>

        {/* Category Badge */}
        {offer.category && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-gray-800 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
            <span>{offer.category.icon}</span>
            <span>{offer.category.nameFr}</span>
          </div>
        )}

        {/* Expiration countdown pill */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[11px]">
            <Clock className="w-3 h-3 text-amber-300" />
            <span>
              {isToday ? `Aujourd'hui à ${timeString}` : expiryDate.toLocaleDateString([], { day: 'numeric', month: 'short' })}
            </span>
          </div>

          {distance !== null && (
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full text-[11px]">
              <MapPin className="w-3 h-3 text-emerald-300" />
              <span>{distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Shop name & Rating */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span className="font-medium text-gray-600 truncate max-w-[180px]">
              {offer.shop?.name || 'Commerce partenaire'}
            </span>
            <div className="flex items-center gap-1 text-amber-500 font-semibold">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{offer.shop?.averageRating?.toFixed(1) || '4.8'}</span>
            </div>
          </div>

          {/* Offer title */}
          <h3 className="text-sm font-bold text-gray-900 group-hover:text-emerald-600 transition line-clamp-1">
            {offer.name}
          </h3>

          {/* Offer description */}
          <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
            {offer.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100">
          {/* Stock bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className={`font-medium ${isLowStock ? 'text-rose-600' : 'text-gray-500'}`}>
                {offer.quantityAvailable} {offer.quantityAvailable > 1 ? 'paniers restants' : 'panier restant'}
              </span>
              {isLowStock && (
                <span className="text-[10px] font-bold text-rose-500 uppercase">Bientôt épuisé</span>
              )}
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isLowStock ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(10, stockRatio))}%` }}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-emerald-700">
                {offer.discountedPrice} <span className="text-xs font-semibold">DA</span>
              </span>
              <span className="text-xs text-gray-400 line-through">
                {offer.originalPrice} DA
              </span>
            </div>

            <span className="text-xs font-semibold text-emerald-600 group-hover:translate-x-0.5 transition inline-flex items-center gap-0.5">
              Voir &rarr;
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
