import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
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

// Profil & Compte MS1 (Sections B, C, D)
import { ProfilePage } from './features/profile';

// Suite Complète Authentification MS1 (Design Figma - 19 Écrans)
import {
  WelcomePage,
  RoleChoicePage,
  LoginPage,
  RegisterPage,
  EmailVerificationPage,
  VerifyPhonePage,
  ForgotPasswordPage,
} from './features/auth';

export const App: React.FC = () => {
  return (
    <LocationProvider>
      <BrowserRouter>
        <Routes>
          {/* MERCHANT LAYOUT (MS2) */}
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

          {/* CLIENT LAYOUT (MS2) */}
          <Route element={<ClientLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExploreOffersPage />} />
            <Route path="/offers/:id" element={<OfferDetailsPage />} />
            <Route path="/map" element={<ShopsMapViewPage />} />
            <Route
              path="/reservations"
              element={
                <div className="p-8 max-w-4xl mx-auto">
                  <h1 className="text-2xl font-bold text-[#0B2C25]">Mes réservations</h1>
                  <p className="text-stone-500 mt-2">Vous n'avez aucune réservation en cours pour le moment.</p>
                </div>
              }
            />
            <Route
              path="/notifications"
              element={
                <div className="p-8 max-w-4xl mx-auto">
                  <h1 className="text-2xl font-bold text-[#0B2C25]">Notifications</h1>
                  <p className="text-stone-500 mt-2">Vous n'avez aucune nouvelle notification pour le moment.</p>
                </div>
              }
            />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* AUTHENTICATION SUITE MS1 (19 Écrans Figma) */}
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/role-select" element={<RoleChoicePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<EmailVerificationPage />} />
          <Route path="/verify-phone" element={<VerifyPhonePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ForgotPasswordPage />} />

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LocationProvider>
  );
};

export default App;
