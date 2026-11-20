// frontend/src/features/catalogue/components/FilterSidebar.tsx
import React from 'react';
import { Category, OfferFilterParams } from '../types';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';

interface FilterSidebarProps {
  categories: Category[];
  filters: OfferFilterParams;
  onChangeFilters: (newFilters: OfferFilterParams) => void;
  onReset: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  categories,
  filters,
  onChangeFilters,
  onReset,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
          <span>Filtres de recherche</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-gray-400 hover:text-emerald-600 flex items-center gap-1 transition"
          title="Réinitialiser tous les filtres"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Effacer</span>
        </button>
      </div>

      {/* Category selection */}
      <div>
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
          Catégorie
        </label>
        <select
          value={filters.category || ''}
          onChange={(e) => onChangeFilters({ ...filters, category: e.target.value || undefined, page: 1 })}
          className="w-full py-2 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.icon} {c.nameFr}
            </option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div>
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
          Budget max (DA)
        </label>
        <div className="space-y-2">
          <input
            type="range"
            min="100"
            max="3000"
            step="50"
            value={filters.maxPrice || 3000}
            onChange={(e) =>
              onChangeFilters({
                ...filters,
                maxPrice: Number(e.target.value) === 3000 ? undefined : Number(e.target.value),
                page: 1,
              })
            }
            className="w-full accent-emerald-600"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>100 DA</span>
            <span className="font-bold text-emerald-700">
              {filters.maxPrice ? `${filters.maxPrice} DA` : 'Tous les prix'}
            </span>
            <span>3000 DA</span>
          </div>
        </div>
      </div>

      {/* Minimum Discount */}
      <div>
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
          Réduction minimale
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {[30, 40, 50, 60].map((discount) => (
            <button
              key={discount}
              onClick={() =>
                onChangeFilters({
                  ...filters,
                  minDiscount: filters.minDiscount === discount ? undefined : discount,
                  page: 1,
                })
              }
              className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                filters.minDiscount === discount
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-amber-300'
              }`}
            >
              -{discount}%
            </button>
          ))}
        </div>
      </div>

      {/* Distance radius */}
      <div>
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
          Rayon de distance
        </label>
        <select
          value={filters.radius || ''}
          onChange={(e) =>
            onChangeFilters({
              ...filters,
              radius: e.target.value ? Number(e.target.value) : undefined,
              page: 1,
            })
          }
          className="w-full py-2 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        >
          <option value="">Toutes distances</option>
          <option value="2">Moins de 2 km</option>
          <option value="5">Moins de 5 km</option>
          <option value="10">Moins de 10 km</option>
          <option value="20">Moins de 20 km</option>
        </select>
      </div>

      {/* Availability toggle */}
      <div className="pt-2 border-t border-gray-100">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs font-semibold text-gray-700">En stock uniquement</span>
          <input
            type="checkbox"
            checked={filters.available ?? true}
            onChange={(e) => onChangeFilters({ ...filters, available: e.target.checked, page: 1 })}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
          />
        </label>
      </div>

      {/* Sort order */}
      <div className="pt-2 border-t border-gray-100">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
          Trier par
        </label>
        <select
          value={filters.sort || 'deadline'}
          onChange={(e) =>
            onChangeFilters({ ...filters, sort: e.target.value as OfferFilterParams['sort'], page: 1 })
          }
          className="w-full py-2 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        >
          <option value="deadline">Heure limite (le plus urgent)</option>
          <option value="distance">Distance (le plus proche)</option>
          <option value="price">Prix croissant</option>
          <option value="discount">Plus grande réduction</option>
        </select>
      </div>
    </div>
  );
};
