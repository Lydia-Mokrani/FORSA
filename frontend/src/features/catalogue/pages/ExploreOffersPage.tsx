// frontend/src/features/catalogue/pages/ExploreOffersPage.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CatalogueApi } from '../services/api';
import { Category, Offer, OfferFilterParams } from '../types';
import { OfferCard } from '../components/OfferCard';
import { FilterSidebar } from '../components/FilterSidebar';
import { useLocation } from '../context/LocationContext';
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal, PackageSearch } from 'lucide-react';

export const ExploreOffersPage: React.FC = () => {
  const { location } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters state initialized from URL query params
  const [filters, setFilters] = useState<OfferFilterParams>({
    q: searchParams.get('q') || undefined,
    category: searchParams.get('category') || undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    minDiscount: searchParams.get('minDiscount') ? Number(searchParams.get('minDiscount')) : undefined,
    available: searchParams.get('available') ? searchParams.get('available') === 'true' : true,
    radius: searchParams.get('radius') ? Number(searchParams.get('radius')) : undefined,
    sort: (searchParams.get('sort') as OfferFilterParams['sort']) || 'deadline',
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    limit: 12,
  });

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Load categories
  useEffect(() => {
    CatalogueApi.getCategories().then(setCategories);
  }, []);

  // Fetch offers whenever filters change
  useEffect(() => {
    async function fetchFilteredOffers() {
      setLoading(true);
      try {
        const res = await CatalogueApi.getOffers({
          ...filters,
          lat: location.lat,
          lng: location.lng,
        });
        setOffers(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotalCount(res.pagination.total);
      } finally {
        setLoading(false);
      }
    }
    fetchFilteredOffers();
  }, [filters, location]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 12,
      sort: 'deadline',
      available: true,
    });
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Explorer les offres anti-gaspi</h1>
          <p className="text-xs text-gray-500 mt-1">
            {totalCount} paniers disponibles près de <strong className="text-gray-700">{location.label}</strong>
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="w-full md:w-80 relative">
          <input
            type="text"
            placeholder="Rechercher par mot-clé..."
            value={filters.q || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value || undefined, page: 1 }))}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </form>
      </div>

      {/* Main Grid: Sidebar + Offers */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden col-span-1">
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="w-full py-2.5 px-4 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 flex items-center justify-center gap-2 shadow-xs"
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            <span>{mobileFilterOpen ? 'Masquer les filtres' : 'Afficher les filtres de recherche'}</span>
          </button>
        </div>

        {/* Sidebar Filter */}
        <div className={`${mobileFilterOpen ? 'block' : 'hidden'} lg:block lg:col-span-1`}>
          <div className="sticky top-24">
            <FilterSidebar
              categories={categories}
              filters={filters}
              onChangeFilters={(newFilters) => setFilters(newFilters)}
              onReset={handleResetFilters}
            />
          </div>
        </div>

        {/* Offers Listing */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 rounded-2xl bg-gray-200/70 animate-pulse" />
              ))}
            </div>
          ) : offers.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {offers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-8 border-t border-gray-100">
                  <button
                    disabled={(filters.page || 1) <= 1}
                    onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))}
                    className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-semibold text-gray-700">
                    Page {filters.page || 1} sur {totalPages}
                  </span>

                  <button
                    disabled={(filters.page || 1) >= totalPages}
                    onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
                    className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <PackageSearch className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Aucun panier ne correspond à vos filtres</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                  Essayez d'augmenter le rayon de recherche, de changer de catégorie ou de réinitialiser vos filtres.
                </p>
              </div>
              <button
                onClick={handleResetFilters}
                className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-700 transition"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
