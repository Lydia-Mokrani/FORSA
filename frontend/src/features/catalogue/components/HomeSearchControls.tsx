
import React, { useEffect, useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  RotateCcw,
  Check,
} from 'lucide-react';

import { Category, Offer, OfferFilterParams } from '../types';

interface HomeSearchControlsProps {
  categories: Category[];
  offers: Offer[];
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearch: (value: string) => void;
  selectedCategory?: string;
  onCategoryChange: (category?: string) => void;
  filters: OfferFilterParams;
  onApplyFilters: (filters: OfferFilterParams, category?: string) => void;
}

const SORT_OPTIONS = [
  { value: 'distance', label: 'Plus proches' },
  { value: 'price', label: 'Prix croissant' },
  { value: 'discount', label: 'Meilleures réductions' },
  { value: 'deadline', label: 'Expiration la plus proche' },
] as const;

const HomeSearchControls: React.FC<HomeSearchControlsProps> = ({
  categories,
  offers,
  searchInput,
  onSearchInputChange,
  onSearch,
  selectedCategory,
  onCategoryChange,
  filters,
  onApplyFilters,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [draftCategory, setDraftCategory] = useState(selectedCategory || '');
  const [minPrice, setMinPrice] = useState(filters.minPrice?.toString() || '');
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice?.toString() || '');
  const [minDiscount, setMinDiscount] = useState(filters.minDiscount ?? 0);
  const [available, setAvailable] = useState(filters.available ?? true);
  const [sort, setSort] = useState<OfferFilterParams['sort']>(
    filters.sort || 'distance',
  );

  useEffect(() => {
    if (!filterOpen) return;

    setDraftCategory(selectedCategory || '');
    setMinPrice(filters.minPrice?.toString() || '');
    setMaxPrice(filters.maxPrice?.toString() || '');
    setMinDiscount(filters.minDiscount ?? 0);
    setAvailable(filters.available ?? true);
    setSort(filters.sort || 'distance');
  }, [filterOpen, selectedCategory, filters]);

  useEffect(() => {
    if (!filterOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFilterOpen(false);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [filterOpen]);

  const matchingOffers = searchInput.trim()
    ? offers
        .filter((offer) => {
          const query = searchInput.toLowerCase();

          return (
            offer.name.toLowerCase().includes(query) ||
            offer.description.toLowerCase().includes(query) ||
            offer.shop?.name?.toLowerCase().includes(query) ||
            offer.category?.nameFr?.toLowerCase().includes(query)
          );
        })
        .slice(0, 4)
    : offers.slice(0, 3);

  const submitSearch = (value = searchInput) => {
    onSearch(value.trim());
    setSearchOpen(false);
  };

  const applyFilters = () => {
    const nextFilters: OfferFilterParams = {
      minPrice: minPrice.trim() ? Number(minPrice) : undefined,
      maxPrice: maxPrice.trim() ? Number(maxPrice) : undefined,
      minDiscount: minDiscount > 0 ? minDiscount : undefined,
      available,
      sort,
    };

    onApplyFilters(nextFilters, draftCategory || undefined);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraftCategory('');
    setMinPrice('');
    setMaxPrice('');
    setMinDiscount(0);
    setAvailable(true);
    setSort('distance');
  };

  return (
    <>
      {/* SEARCH BAR */}
      <div className="relative mb-6 flex max-w-[666px] gap-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
          className="relative flex h-[46px] min-w-0 flex-1 items-center gap-3 rounded-[13px] border border-[#E6E4DD] bg-white px-4"
        >
          <Search size={19} className="shrink-0 text-[#0B2C25]" />

          <input
            type="search"
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setSearchOpen(false);
            }}
            placeholder="Rechercher une offre, un produit..."
            className="h-full w-full bg-transparent text-sm text-[#0B2C25] outline-none placeholder:text-[#8A9088]"
          />

          {searchInput && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => {
                onSearchInputChange('');
                onSearch('');
              }}
              className="shrink-0 text-[#858B82] hover:text-[#0B2C25]"
            >
              <X size={16} />
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={() => {
            setSearchOpen(false);
            setFilterOpen(true);
          }}
          aria-label="Ouvrir les filtres"
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] border border-[#E6E4DD] bg-white text-[#0B2C25] transition hover:border-[#A8C6AD] hover:bg-[#F4F7EF]"
        >
          <SlidersHorizontal size={20} />
        </button>

        {/* SEARCH SUGGESTIONS */}
        {searchOpen && (
          <>
            <button
              type="button"
              aria-label="Fermer les suggestions"
              className="fixed inset-0 z-20 cursor-default"
              onClick={() => setSearchOpen(false)}
            />

            <div className="absolute left-0 right-[59px] top-[54px] z-30 overflow-hidden rounded-[16px] border border-[#E8E6DF] bg-[#FFFAF0] p-4 shadow-[0px_12px_32px_rgba(11,44,37,0.13)]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-poppins text-[13px] font-semibold text-[#0B2C25]">
                  {searchInput.trim()
                    ? 'Résultats correspondants'
                    : 'Offres disponibles'}
                </h3>

                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="text-[#78847F]"
                  aria-label="Fermer"
                >
                  <X size={16} />
                </button>
              </div>

              {matchingOffers.length > 0 ? (
                <div className="flex flex-col">
                  {matchingOffers.map((offer) => (
                    <button
                      type="button"
                      key={offer.id}
                      onClick={() => {
                        onSearchInputChange(offer.name);
                        submitSearch(offer.name);
                      }}
                      className="flex items-center gap-3 rounded-[11px] px-2 py-2 text-left transition hover:bg-[#EBEEE1]"
                    >
                      <img
                        src={
                          offer.photos?.[0]?.url ||
                          'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=120&q=80'
                        }
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-[9px] object-cover"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-[#0B2C25]">
                          {offer.name}
                        </span>
                        <span className="mt-1 block truncate text-[10px] text-[#78847F]">
                          {offer.shop?.name || offer.category?.nameFr}
                        </span>
                      </span>

                      <span className="shrink-0 text-[11px] font-semibold text-[#17664E]">
                        {new Intl.NumberFormat('fr-FR').format(
                          offer.discountedPrice,
                        )}{' '}
                        DA
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-[12px] text-[#78847F]">
                  Aucun résultat parmi les offres actuellement chargées.
                  Essayez de lancer la recherche.
                </p>
              )}

              <button
                type="button"
                onClick={() => submitSearch()}
                className="mt-3 flex w-full items-center justify-center rounded-[10px] bg-[#0B2C25] px-4 py-3 text-[12px] font-semibold text-[#FFFAF0] transition hover:bg-[#17664E]"
              >
                Rechercher {searchInput.trim() ? `"${searchInput}"` : 'des offres'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* FILTER DRAWER */}
      {filterOpen && (
        <div className="fixed inset-0 z-[120]">
          <button
            type="button"
            aria-label="Fermer les filtres"
            onClick={() => setFilterOpen(false)}
            className="absolute inset-0 bg-[rgba(55,58,55,0.38)] backdrop-blur-[2px]"
          />

          <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[440px] flex-col overflow-hidden rounded-l-[24px] bg-[#FFFAF0] shadow-[-12px_0px_40px_rgba(11,44,37,0.14)]">
            {/* DRAWER HEADER */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#EAE7DD] px-7 py-6">
              <div>
                <h2 className="font-poppins text-[21px] font-semibold text-[#0B2C25]">
                  Filtres
                </h2>
                <p className="mt-1 text-[11px] text-[#78847F]">
                  Affinez votre recherche
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                aria-label="Fermer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EBEEE1] text-[#0B2C25] transition hover:bg-[#DBF0DD]"
              >
                <X size={18} />
              </button>
            </div>

            {/* DRAWER CONTENT */}
            <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-7 py-6">
              {/* CATEGORY */}
              <section>
                <h3 className="mb-4 text-[14px] font-semibold text-[#0B2C25]">
                  Catégorie
                </h3>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftCategory('')}
                    className={`rounded-full border px-4 py-[9px] text-[11px] font-medium transition ${
                      !draftCategory
                        ? 'border-[#17664E] bg-[#DBF0DD] text-[#17664E]'
                        : 'border-[#E2E1D8] bg-white text-[#536159] hover:border-[#A8C6AD]'
                    }`}
                  >
                    Tout
                  </button>

                  {categories.map((category) => (
                    <button
                      type="button"
                      key={category.id}
                      onClick={() => setDraftCategory(category.slug)}
                      className={`rounded-full border px-4 py-[9px] text-[11px] font-medium transition ${
                        draftCategory === category.slug
                          ? 'border-[#17664E] bg-[#DBF0DD] text-[#17664E]'
                          : 'border-[#E2E1D8] bg-white text-[#536159] hover:border-[#A8C6AD]'
                      }`}
                    >
                      {category.nameFr}
                    </button>
                  ))}
                </div>
              </section>

              {/* PRICE RANGE */}
              <section>
                <h3 className="mb-4 text-[14px] font-semibold text-[#0B2C25]">
                  Prix (DA)
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-[10px] text-[#78847F]">
                      Prix minimum
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={minPrice}
                      onChange={(event) => setMinPrice(event.target.value)}
                      placeholder="0"
                      className="h-[43px] w-full rounded-[10px] border border-[#E2E1D8] bg-white px-3 text-[12px] text-[#0B2C25] outline-none focus:border-[#17664E]"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-[10px] text-[#78847F]">
                      Prix maximum
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={maxPrice}
                      onChange={(event) => setMaxPrice(event.target.value)}
                      placeholder="Sans limite"
                      className="h-[43px] w-full rounded-[10px] border border-[#E2E1D8] bg-white px-3 text-[12px] text-[#0B2C25] outline-none focus:border-[#17664E]"
                    />
                  </label>
                </div>
              </section>

              {/* MINIMUM DISCOUNT */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold text-[#0B2C25]">
                    Réduction minimale
                  </h3>
                  <span className="rounded-full bg-[#DBF0DD] px-3 py-1 text-[11px] font-semibold text-[#17664E]">
                    {minDiscount}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={minDiscount}
                  onChange={(event) =>
                    setMinDiscount(Number(event.target.value))
                  }
                  className="h-[5px] w-full cursor-pointer accent-[#17664E]"
                />

                <div className="mt-2 flex justify-between text-[10px] text-[#78847F]">
                  <span>0%</span>
                  <span>45%</span>
                  <span>90%</span>
                </div>
              </section>

              {/* AVAILABILITY */}
              <section className="flex items-center justify-between rounded-[13px] bg-[#EBEEE1] px-4 py-4">
                <div>
                  <h3 className="text-[13px] font-semibold text-[#0B2C25]">
                    Offres disponibles
                  </h3>
                  <p className="mt-1 text-[10px] text-[#78847F]">
                    Masquer les offres indisponibles
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={available}
                  onClick={() => setAvailable((current) => !current)}
                  className={`relative h-[24px] w-[43px] rounded-full transition ${
                    available ? 'bg-[#17664E]' : 'bg-[#B8BDB4]'
                  }`}
                >
                  <span
                    className={`absolute top-[3px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white transition ${
                      available ? 'left-[22px]' : 'left-[3px]'
                    }`}
                  >
                    {available && <Check size={11} className="text-[#17664E]" />}
                  </span>
                </button>
              </section>

              {/* SORT */}
              <section>
                <h3 className="mb-3 text-[14px] font-semibold text-[#0B2C25]">
                  Trier par
                </h3>

                <div className="relative">
                  <select
                    value={sort}
                    onChange={(event) =>
                      setSort(event.target.value as OfferFilterParams['sort'])
                    }
                    className="h-[46px] w-full appearance-none rounded-[11px] border border-[#E2E1D8] bg-white px-4 pr-10 text-[12px] text-[#0B2C25] outline-none focus:border-[#17664E]"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#78847F]"
                  />
                </div>
              </section>
            </div>

            {/* FIXED DRAWER FOOTER */}
            <div className="flex shrink-0 items-center gap-3 border-t border-[#EAE7DD] bg-[#FFFAF0] px-7 py-5">
              <button
                type="button"
                onClick={resetFilters}
                className="flex h-[48px] flex-1 items-center justify-center gap-2 rounded-[12px] border border-[#DADDD2] bg-white text-[12px] font-semibold text-[#0B2C25] transition hover:bg-[#EBEEE1]"
              >
                <RotateCcw size={15} />
                Réinitialiser
              </button>

              <button
                type="button"
                onClick={applyFilters}
                className="h-[48px] flex-[1.25] rounded-[12px] bg-[#0B2C25] px-4 text-[12px] font-semibold text-[#FFFAF0] transition hover:bg-[#17664E]"
              >
                Afficher les offres
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default HomeSearchControls;
