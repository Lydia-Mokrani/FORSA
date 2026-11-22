
import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';

import { LocationProvider } from './features/catalogue/context/LocationContext';

import { MerchantLayout } from './features/catalogue/components/MerchantLayout';
import { ClientLayout } from './features/catalogue/components/ClientLayout';

import { HomePage } from './features/catalogue/pages/HomePage';
import { ExploreOffersPage } from './features/catalogue/pages/ExploreOffersPage';
import { OfferDetailsPage } from './features/catalogue/pages/OfferDetailsPage';
import { ShopsMapViewPage } from './features/catalogue/pages/ShopsMapViewPage';

import { MerchantDashboardPage } from './features/catalogue/pages/MerchantDashboardPage';
import { MyOffersPage } from './features/catalogue/pages/MyOffersPage';
import { CreateOfferPage } from './features/catalogue/pages/CreateOfferPage';
import { EditOfferPage } from './features/catalogue/pages/EditOfferPage';
import { LoginPage } from './features/auth/LoginPage';
import { ReservationScreen } from './features/reservations/ReservationScreen';

export const App: React.FC = () => {
  return (
    <LocationProvider>
      <BrowserRouter>
        <Routes>

          {/* MERCHANT LAYOUT */}
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

          {/* CLIENT LAYOUT */}
          <Route element={<ClientLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExploreOffersPage />} />
            <Route path="/offers/:id" element={<OfferDetailsPage />} />
            <Route path="/map" element={<ShopsMapViewPage />} />
            <Route path="/my-reservations" element={<ReservationScreen />} />
          </Route>

          {/* AUTHENTICATION */}
          <Route path="/login" element={<LoginPage />} />

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </LocationProvider>
  );
};

export default App;
