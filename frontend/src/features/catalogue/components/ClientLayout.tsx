
import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  Home,
  MapPin,
  Ticket,
  Bell,
  UserRound,
  Leaf,
  ShoppingBasket,
} from 'lucide-react';
import { LocationModal } from './LocationModal';

export const ClientLayout: React.FC = () => {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-4 px-5 py-4 rounded-full text-sm font-semibold transition ${
      isActive
        ? 'bg-[#FFFAF0] text-[#0B2C25]'
        : 'text-white/90 hover:bg-white/10'
    }`;

  return (
    <div className="min-h-screen bg-[#FFFAF0] text-[#0B2C25] font-poppins">
      <LocationModal />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[238px] flex-col bg-[#0B2C25] text-white rounded-r-[28px]">
        <Link
          to="/"
          className="flex items-center justify-center h-[145px] text-2xl font-extrabold tracking-wide"
        >
          FORSA
        </Link>

        <nav className="flex flex-col gap-3 px-5">
          <NavLink to="/" end className={linkClass}>
            <Home size={21} strokeWidth={1.8} />
            <span>Accueil</span>
          </NavLink>

          <NavLink to="/map" className={linkClass}>
            <MapPin size={21} strokeWidth={1.8} />
            <span>Carte</span>
          </NavLink>

          <button
            type="button"
            disabled
            title="Cette page sera connectée prochainement"
            className="flex items-center gap-4 px-5 py-4 rounded-full text-sm font-semibold text-white/90 opacity-80 cursor-not-allowed"
          >
            <Ticket size={21} strokeWidth={1.8} />
            <span>Mes réservations</span>
          </button>

          <button
            type="button"
            disabled
            title="Cette page sera connectée prochainement"
            className="flex items-center gap-4 px-5 py-4 rounded-full text-sm font-semibold text-white/90 opacity-80 cursor-not-allowed"
          >
            <Bell size={21} strokeWidth={1.8} />
            <span>Notifications</span>
          </button>

          <button
            type="button"
            disabled
            title="Cette page sera connectée prochainement"
            className="flex items-center gap-4 px-5 py-4 rounded-full text-sm font-semibold text-white/90 opacity-80 cursor-not-allowed"
          >
            <UserRound size={21} strokeWidth={1.8} />
            <span>Profil</span>
          </button>
        </nav>

        <div className="mt-auto px-8 pb-10 flex items-start gap-3 text-sm leading-relaxed text-white/80">
          <Leaf size={23} className="shrink-0 mt-1" />
          <p>
            Moins de gaspillage,
            <br />
            plus de bonnes
            <br />
            choses.
          </p>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-40 bg-[#0B2C25] text-white px-5 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-extrabold tracking-wide">
          FORSA
        </Link>
        <div className="flex items-center gap-4">
          <NavLink to="/map" aria-label="Carte">
            <MapPin size={21} />
          </NavLink>
          <UserRound size={21} />
        </div>
      </header>

      {/* Customer pages */}
      <main className="md:ml-[238px] min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};
