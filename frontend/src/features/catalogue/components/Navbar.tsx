// frontend/src/features/catalogue/components/Navbar.tsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { MapPin, Search, Store, ShoppingBag, LayoutDashboard, Menu, X, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { location, openModal } = useLocation();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isMerchantArea = routerLocation.pathname.startsWith('/merchant');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/explore');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-500/20">
              ف
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-gray-900">
                FORSA <span className="text-emerald-600 font-bold">فرصة</span>
              </span>
              <span className="hidden sm:block text-[10px] text-gray-400 tracking-wider font-medium uppercase -mt-1">
                Anti-gaspillage solidaire
              </span>
            </div>
          </Link>

          {/* Location Picker Trigger */}
          <button
            onClick={openModal}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-emerald-50 border border-gray-200/80 hover:border-emerald-200 text-xs font-medium text-gray-700 hover:text-emerald-700 transition max-w-[200px]"
            title="Modifier ma localisation"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="truncate">{location.label}</span>
          </button>

          {/* Search bar (Customer view) */}
          {!isMerchantArea && (
            <form onSubmit={handleSearchSubmit} className="hidden lg:flex flex-1 max-w-md relative">
              <input
                type="text"
                placeholder="Rechercher un panier, viennoiserie, restaurant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </form>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5">
            {isMerchantArea ? (
              <>
                <Link
                  to="/merchant/dashboard"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    routerLocation.pathname === '/merchant/dashboard'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Tableau de bord
                </Link>
                <Link
                  to="/merchant/my-offers"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    routerLocation.pathname === '/merchant/my-offers'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Mes offres
                </Link>
                <Link
                  to="/merchant/create-offer"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                >
                  + Créer une offre
                </Link>
                <div className="h-4 w-px bg-gray-200 mx-1" />
                <Link
                  to="/"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Mode Client
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/explore"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    routerLocation.pathname === '/explore'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Explorer les offres
                </Link>
                <Link
                  to="/map"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    routerLocation.pathname === '/map'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Carte des commerces
                </Link>
                <Link
                  to="/profile"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    routerLocation.pathname === '/profile'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Mon Profil
                </Link>
                <div className="h-4 w-px bg-gray-200 mx-1" />
                <Link
                  to="/merchant/dashboard"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-600 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5 transition"
                >
                  <Store className="w-3.5 h-3.5" />
                  Espace Commerçant
                </Link>
              </>
            )}
          </nav>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-5 space-y-3">
          <button
            onClick={() => {
              openModal();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 text-xs font-medium text-gray-800"
          >
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span className="truncate">{location.label}</span>
          </button>

          {!isMerchantArea && (
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </form>
          )}

          <div className="pt-2 border-t border-gray-100 flex flex-col gap-1">
            <Link
              to="/explore"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Explorer les offres
            </Link>
            <Link
              to="/map"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Carte des commerces
            </Link>
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <User className="w-4 h-4 text-emerald-600" />
              Mon Profil
            </Link>
            <Link
              to="/merchant/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-emerald-700 bg-emerald-50 mt-1 flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              Espace Commerçant
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
