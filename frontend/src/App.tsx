
import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';

import { LocationProvider } from './features/catalogue/context/LocationContext';

import { Navbar } from './features/catalogue/components/Navbar';
import { Footer } from './features/catalogue/components/Footer';
import { LocationModal } from './features/catalogue/components/LocationModal';
import { MerchantLayout } from './features/catalogue/components/MerchantLayout';

// Customer pages
import { HomePage } from './features/catalogue/pages/HomePage';
import { ExploreOffersPage } from './features/catalogue/pages/ExploreOffersPage';
import { OfferDetailsPage } from './features/catalogue/pages/OfferDetailsPage';
import { ShopsMapViewPage } from './features/catalogue/pages/ShopsMapViewPage';

// Merchant pages
import { MerchantDashboardPage } from './features/catalogue/pages/MerchantDashboardPage';
import { MyOffersPage } from './features/catalogue/pages/MyOffersPage';
import { CreateOfferPage } from './features/catalogue/pages/CreateOfferPage';
import { EditOfferPage } from './features/catalogue/pages/EditOfferPage';

// Customer layout
const SiteLayout: React.FC = () => (
  <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
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

          {/* ALL MERCHANT PAGES USE THE SAME SIDEBAR LAYOUT */}
          <Route element={<MerchantLayout />}>

            <Route
              path="/merchant"
              element={<Navigate to="/merchant/dashboard" replace />}
            />

            <Route
              path="/merchant/dashboard"
              element={<MerchantDashboardPage />}
            />

            <Route
              path="/merchant/my-offers"
              element={<MyOffersPage />}
            />

            <Route
              path="/merchant/create-offer"
              element={<CreateOfferPage />}
            />

            <Route
              path="/merchant/edit-offer/:id"
              element={<EditOfferPage />}
            />

          </Route>

          {/* CUSTOMER PAGES KEEP THEIR OWN NAVBAR */}
          <Route element={<SiteLayout />}>

            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExploreOffersPage />} />
            <Route path="/offers/:id" element={<OfferDetailsPage />} />
            <Route path="/map" element={<ShopsMapViewPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />

          </Route>

        </Routes>
      </BrowserRouter>
    </LocationProvider>
  );
};

export default App;
