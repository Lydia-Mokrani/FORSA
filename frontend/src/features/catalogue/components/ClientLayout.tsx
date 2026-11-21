
import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { MapPin, UserRound } from 'lucide-react';
import { MerchantSidebar } from './MerchantSidebar';
import { LocationModal } from './LocationModal';

export const ClientLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FFFAF0] font-poppins text-[#0B2C25]">
      <LocationModal />

      <MerchantSidebar variant="client" />

      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-[#0B2C25] px-5 py-4 text-white md:hidden">
        <Link to="/" className="text-xl font-extrabold tracking-wide">
          FORSA
        </Link>

        <div className="flex items-center gap-5">
          <Link to="/map" aria-label="Carte">
            <MapPin size={21} />
          </Link>

          <Link to="/profile" aria-label="Mon Profil">
            <UserRound size={21} />
          </Link>
        </div>
      </header>

      <main className="min-h-screen md:ml-[238px]">
        <Outlet />
      </main>
    </div>
  );
};

export default ClientLayout;
