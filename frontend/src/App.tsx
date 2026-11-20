import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { LocationProvider } from './features/catalogue/context/LocationContext';
import { Navbar } from './features/catalogue/components/Navbar';
import { Footer } from './features/catalogue/components/Footer';
import { LocationModal } from './features/catalogue/components/LocationModal';
import { MerchantLayout } from './features/catalogue/components/MerchantLayout';

// Pages
import { HomePage } from './features/catalogue/pages/HomePage';
import { ExploreOffersPage } from './features/catalogue/pages/ExploreOffersPage';
import { OfferDetailsPage } from './features/catalogue/pages/OfferDetailsPage';
import { ShopsMapViewPage } from './features/catalogue/pages/ShopsMapViewPage';
import { MerchantDashboardPage } from './features/catalogue/pages/MerchantDashboardPage';
import { MyOffersPage } from './features/catalogue/pages/MyOffersPage';
import { CreateOfferPage } from './features/catalogue/pages/CreateOfferPage';
import { EditOfferPage } from './features/catalogue/pages/EditOfferPage';

// Existing layout, unchanged (used by every page not yet redesigned)
const SiteLayout: React.FC = () => (
  <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-emerald-500 selection:text-white">
    <Navbar />
    <LocationModal />
    <main className="flex-1">
      <Outlet />
    </main>
    <Footer />
  </div>
);

export const App: React.FC = () => {
  return (
    <LocationProvider>
      <BrowserRouter>
        <Routes>
          {/* Merchant pages already redesigned from Figma: sidebar layout */}
          <Route element={<MerchantLayout />}>
            <Route path="/merchant/dashboard" element={<MerchantDashboardPage />} />
          </Route>

          {/* Everything else: existing layout */}
          <Route element={<SiteLayout />}>
            {/* Customer Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExploreOffersPage />} />
            <Route path="/offers/:id" element={<OfferDetailsPage />} />
            <Route path="/map" element={<ShopsMapViewPage />} />

            {/* Merchant Routes (not yet redesigned) */}
            <Route path="/merchant" element={<Navigate to="/merchant/dashboard" replace />} />
            <Route path="/merchant/my-offers" element={<MyOffersPage />} />
            <Route path="/merchant/create-offer" element={<CreateOfferPage />} />
            <Route path="/merchant/edit-offer/:id" element={<EditOfferPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LocationProvider>
  );
};

export default App;
