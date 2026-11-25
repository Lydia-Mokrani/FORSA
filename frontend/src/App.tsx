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
import { ShopEditPage } from './features/catalogue/pages/ShopEditPage';

// Hub Commerçant & Paramètres MS1 (Espace 3)
import {
  MerchantAccountPage,
  MerchantEditProfilePage,
  MerchantPreferencesPage,
  MerchantChangeEmailPage,
  MerchantPendingPage,
} from './features/account';

// Profil & Compte MS1 (Espace 2)
import {
  ProfilePage,
  EditProfilePage,
  EditPhotoPage,
  ChangeEmailPage,
  ChangePhonePage,
  LocationPage,
  NotificationsPage,
} from './features/profile';

import {
  SettingsPage,
  SecuritySettingsPage,
  ModeSwitchPage,
  AccountDangerPage,
  AccountDangerPage as DeleteAccountPage,
} from './features/settings';

// Suite Authentification Telegram & Profil MS1 (Espace 1)
import {
  WelcomePage,
  RoleChoicePage,
  LoginPage,
  RegisterPage,
  PendingValidationPage,
  VerifyEmailPage,
  VerifyPhonePage,
  ForgotPasswordPage,
  ResetPasswordPage,
  SocialChooseSpacePage,
  SocialAddPhonePage,
  SocialLinkedPage,
  SocialAccountExistsPage,
  MerchantStatusPage,
  AccountSuspendedPage,
  MerchantDocumentsPage,
  DocumentResubmitPage,
  AccessDeniedPage,
  SessionExpiredPage,
  TermsPage,
} from './features/auth';

// Dev Gallery (Lot R0) - STRICTEMENT réservé au mode développement
const DevUiGallery = import.meta.env.DEV
  ? React.lazy(() => import('./dev/DevUiGallery'))
  : null;

export const App: React.FC = () => {
  return (
    <LocationProvider>
      <BrowserRouter>
        <Routes>
          {/* MERCHANT LAYOUT (MS2 & MS1 - Espace 3) */}
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
            <Route
              path="/merchant/shop"
              element={<ShopEditPage />}
            />
            <Route
              path="/merchant/shop/edit"
              element={<ShopEditPage />}
            />
            <Route
              path="/merchant/account"
              element={<MerchantAccountPage />}
            />
            <Route
              path="/merchant/account/pending"
              element={<MerchantPendingPage />}
            />
            <Route
              path="/merchant/account/edit-profile"
              element={<MerchantEditProfilePage />}
            />
            <Route
              path="/merchant/account/preferences"
              element={<MerchantPreferencesPage />}
            />
            <Route
              path="/merchant/account/change-email"
              element={<MerchantChangeEmailPage />}
            />
            <Route
              path="/merchant/mode"
              element={<ModeSwitchPage />}
            />
            <Route
              path="/merchant/account/delete"
              element={<DeleteAccountPage />}
            />
          </Route>

          {/* CLIENT LAYOUT (MS2 & MS1 - Espace 2) */}
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
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/location" element={<LocationPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/profile/photo" element={<EditPhotoPage />} />
            <Route path="/profile/email" element={<ChangeEmailPage />} />
            <Route path="/profile/phone" element={<ChangePhonePage />} />
            <Route path="/profile/location" element={<LocationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/security" element={<SecuritySettingsPage />} />
            <Route path="/settings/mode" element={<ModeSwitchPage />} />
            <Route path="/settings/account" element={<AccountDangerPage />} />
            <Route path="/settings/danger" element={<AccountDangerPage />} />
            <Route path="/account/danger" element={<AccountDangerPage />} />
            <Route path="/mode-switch" element={<ModeSwitchPage />} />
          </Route>

          {/* AUTHENTICATION SUITE MS1 (Espace 1 - Screens 01 à 23) */}
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/role" element={<RoleChoicePage />} />
          <Route path="/role-select" element={<RoleChoicePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/merchant" element={<RegisterPage />} />
          <Route path="/register/merchant/shop" element={<RegisterPage />} />
          <Route path="/register/merchant/docs" element={<RegisterPage />} />
          <Route path="/register/pending" element={<PendingValidationPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/verify-phone" element={<VerifyPhonePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/social/choose" element={<SocialChooseSpacePage />} />
          <Route path="/auth/social/phone" element={<SocialAddPhonePage />} />
          <Route path="/auth/social/linked" element={<SocialLinkedPage />} />
          <Route path="/auth/social/exists" element={<SocialAccountExistsPage />} />

          {/* STATUTS & ACCÈS MARCHAND */}
          <Route path="/merchant/status" element={<MerchantStatusPage />} />
          <Route path="/merchant/documents" element={<MerchantDocumentsPage />} />
          <Route path="/merchant/documents/resubmit" element={<DocumentResubmitPage />} />
          <Route path="/account/suspended" element={<AccountSuspendedPage />} />
          <Route path="/403" element={<AccessDeniedPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />
          <Route path="/401" element={<SessionExpiredPage />} />
          <Route path="/session-expired" element={<SessionExpiredPage />} />

          {/* CONDITIONS & CONFIDENTIALITÉ (Loi 18-07) */}
          <Route path="/cgu" element={<TermsPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/conditions" element={<TermsPage />} />
          <Route path="/confidentialite" element={<TermsPage />} />

          {/* DEV ONLY ROUTE (Lot R0) */}
          {import.meta.env.DEV && DevUiGallery && (
            <Route
              path="/dev/ui"
              element={
                <React.Suspense fallback={<div className="p-8">Chargement de la galerie UI...</div>}>
                  <DevUiGallery />
                </React.Suspense>
              }
            />
          )}

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LocationProvider>
  );
};

export default App;
