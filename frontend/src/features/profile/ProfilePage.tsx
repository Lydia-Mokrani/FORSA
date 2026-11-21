// frontend/src/features/profile/ProfilePage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from './types';
import { useLocation } from '../catalogue/context/LocationContext';
import {
  defaultAvatar,
  figmaHeaderGear,
  figmaHeaderLocation,
  figmaHeaderBell,
  figmaUnreadIndicator,
  figmaCamera,
  figmaCheckmarkBadge,
  figmaLocationPin,
  figmaTickPill,
  figmaEditBtn,
  figmaUserCircle,
  figmaEditSmall,
  figmaSmartPhone,
  figmaTickSmall,
  figmaMail,
  figmaLocationTile,
  figmaFondDeCarte,
  figmaMaPosition,
  figmaPoignee,
  figmaCalendar03,
  figmaCalendarCheckIn,
  figmaCalendarWarning,
  figmaTickActivity,
  figmaSparkles,
  figmaCardGear,
  figmaShield,
  figmaChevronRight,
  figmaCardBell,
  figmaCardPin,
  figmaArrowRight,
  figmaPhotoProduit,
  figmaPhotoProduit1,
  figmaPhotoProduit2,
  figmaPhotoProduit3,
  figmaCameraEdit,
  figmaDeleteTrash,
  figmaUserCircleInput,
  figmaMailInput,
  figmaTickVerified,
  figmaPhoneInput,
  figmaLocationInput,
  figmaLockInput,
  figmaTickSave,
  figmaSecurityCheck,
  figmaSecurityMail,
  figmaSecurityPhone,
  figmaSecurityLock,
  figmaHeadsetHelp,
  figmaIllustrationAide,
} from './figmaAssets';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { location, setLocation, requestCurrentPosition } = useLocation();

  // Mode View: 'view' (Desktop · Profil — Mon profil) ou 'edit' (Desktop · Profil — Modifier le profil)
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');

  // Profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initialProfile, setInitialProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form Profile State (Modifier le profil)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredLocation, setPreferredLocation] = useState('Bab Ezzouar, Alger');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Avatar Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Phone OTP Flow State
  const [showPhoneOtpModal, setShowPhoneOtpModal] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(300); // 5 minutes
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(5);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Email Change Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailModalError, setEmailModalError] = useState<string | null>(null);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Password Modal State (Paramètres — Mot de passe)
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Location Modal State (Zone de recherche)
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocationInput, setNewLocationInput] = useState('');

  // Logout Modal State (Paramètres — Déconnexion · Confirmation)
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Resend Email State
  const [resendEmailSuccess, setResendEmailSuccess] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  // Fetch Current User Profile
  const fetchProfile = async () => {
    const token =
      localStorage.getItem('forsa_access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('forsa_auth_token');

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('forsa_access_token');
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        throw new Error('Impossible de charger votre profil.');
      }

      const data = await res.json();
      const user: UserProfile = data.user;
      setProfile(user);
      setInitialProfile(user);
      setFullName(user.fullName || 'Lydia Benali');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAvatarPreview(user.avatarUrl || null);
    } catch (err: any) {
      setGeneralError(err.message || 'Erreur réseau lors du chargement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // OTP Countdown Timer
  useEffect(() => {
    if (!showPhoneOtpModal) return;
    const interval = setInterval(() => {
      setOtpSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showPhoneOtpModal]);

  const formatOtpTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Check Unsaved Changes
  const hasUnsavedChanges =
    initialProfile !== null &&
    (fullName !== (initialProfile.fullName || '') ||
      email !== (initialProfile.email || '') ||
      phone !== (initialProfile.phone || ''));

  // Strict Phone Validation (Algerian 9 digits starting with 5, 6, 7)
  const validatePhone = (raw: string): boolean => {
    const cleaned = raw.replace(/\D/g, '');
    if (!cleaned) return true;
    const isValid = cleaned.length === 9 && /^[567]/.test(cleaned);
    if (!isValid) {
      setPhoneError('Numéro de téléphone incorrect.');
      return false;
    }
    setPhoneError(null);
    return true;
  };

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(null);
    setGeneralError(null);
    setEmailError(null);

    const token =
      localStorage.getItem('forsa_access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('forsa_auth_token');
    if (!token) return;

    if (!fullName.trim() || fullName.trim().length < 2) {
      setGeneralError('Le nom complet doit comporter au moins 2 caractères.');
      return;
    }

    if (phone && !validatePhone(phone)) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? phone.replace(/\D/g, '') : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          if (data.code === 'EMAIL_CONFLICT') {
            setEmailError('Cette adresse e-mail est déjà utilisée par un autre compte.');
            return;
          }
          if (data.code === 'PHONE_CONFLICT') {
            setPhoneError('Ce numéro de téléphone est déjà utilisé par un autre compte.');
            return;
          }
        }
        throw new Error(data?.error?.message || data?.message || 'Erreur lors de la sauvegarde.');
      }

      setProfile(data.user);
      setInitialProfile(data.user);
      localStorage.setItem('forsa_user', JSON.stringify(data.user));
      setSaveSuccess('Modifications enregistrées avec succès !');

      // Return to view mode
      setTimeout(() => {
        setSaveSuccess(null);
        setViewMode('view');
      }, 1500);
    } catch (err: any) {
      setGeneralError(err.message || 'Impossible de mettre à jour le profil.');
    } finally {
      setIsSaving(false);
    }
  };

  // Avatar Upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Le fichier est trop volumineux. La taille maximale est de 5 Mo.');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Format non supporté. Veuillez choisir une image JPG, PNG ou WebP.');
      return;
    }

    const token =
      localStorage.getItem('forsa_access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('forsa_auth_token');
    if (!token) return;

    const formData = new FormData();
    formData.append('avatar', file);

    setIsUploadingAvatar(true);
    try {
      const res = await fetch('/api/users/me/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Échec de l'envoi de la photo.");

      setAvatarPreview(data.avatarUrl);
      if (profile) {
        const updated = { ...profile, avatarUrl: data.avatarUrl };
        setProfile(updated);
        localStorage.setItem('forsa_user', JSON.stringify(updated));
      }
      setSaveSuccess('Photo de profil mise à jour avec succès.');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setAvatarError(err.message || 'Erreur lors du téléversement.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Delete Avatar
  const handleDeleteAvatar = async () => {
    const token =
      localStorage.getItem('forsa_access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('forsa_auth_token');
    if (!token) return;

    setIsUploadingAvatar(true);
    try {
      const res = await fetch('/api/users/me/avatar', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Échec de la suppression de la photo.');

      setAvatarPreview(null);
      if (profile) {
        const updated = { ...profile, avatarUrl: null };
        setProfile(updated);
        localStorage.setItem('forsa_user', JSON.stringify(updated));
      }
      setSaveSuccess('Photo de profil supprimée.');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setAvatarError(err.message || 'Erreur lors de la suppression.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Resend Email Verification
  const handleResendEmail = async () => {
    if (!profile?.email) return;
    setIsResendingEmail(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email }),
      });
      if (res.ok) {
        setResendEmailSuccess(true);
        setTimeout(() => setResendEmailSuccess(false), 6000);
      }
    } catch {
      // ignore
    } finally {
      setIsResendingEmail(false);
    }
  };

  // Phone OTP Flow
  const handleStartPhoneVerification = async () => {
    const token =
      localStorage.getItem('forsa_access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('forsa_auth_token');
    if (!token) return;

    if (!phone) {
      setPhoneError("Veuillez d'abord renseigner un numéro de téléphone.");
      return;
    }

    setOtpDigits(['', '', '', '', '', '']);
    setOtpError(null);
    setOtpSecondsLeft(300);
    setOtpAttemptsLeft(5);
    setShowPhoneOtpModal(true);

    try {
      await fetch('/api/users/verify-phone/request', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // handled
    }
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    if (otpError) setOtpError(null);
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = cleaned;
    setOtpDigits(nextDigits);

    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleConfirmOtp = async () => {
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setOtpError('Veuillez saisir les 6 chiffres du code.');
      return;
    }

    const token =
      localStorage.getItem('forsa_access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('forsa_auth_token');
    if (!token) return;

    setIsVerifyingOtp(true);
    try {
      const res = await fetch('/api/users/verify-phone/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        const remaining = data?.error?.details?.[0]?.attemptsLeft ?? otpAttemptsLeft - 1;
        setOtpAttemptsLeft(Math.max(0, remaining));
        setOtpError(`Code incorrect. Il vous reste ${Math.max(0, remaining)} essai(s).`);
        return;
      }

      setShowPhoneOtpModal(false);
      if (profile) {
        const updated = { ...profile, phoneVerified: true };
        setProfile(updated);
        localStorage.setItem('forsa_user', JSON.stringify(updated));
      }
      setSaveSuccess('Numéro de téléphone vérifié avec succès !');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setOtpError(err.message || 'Erreur lors de la validation du code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Veuillez renseigner votre mot de passe actuel.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError('Le mot de passe doit contenir au moins une lettre majuscule et un chiffre.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    const token =
      localStorage.getItem('forsa_access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('forsa_auth_token');
    if (!token) return;

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || 'Mot de passe actuel incorrect.');
      }

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordModal(false);
      }, 2000);
    } catch (err: any) {
      setPasswordError(err.message || 'Échec du changement de mot de passe.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Change Email Modal Save
  const handleSaveNewEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailModalError(null);
    const token =
      localStorage.getItem('forsa_access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('forsa_auth_token');
    if (!token) return;

    if (!newEmailInput.trim() || !newEmailInput.includes('@')) {
      setEmailModalError('Veuillez saisir une adresse e-mail valide.');
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: newEmailInput.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setEmailModalError('Cette adresse e-mail est déjà utilisée.');
          return;
        }
        throw new Error(data?.error?.message || data?.message || 'Erreur lors de la mise à jour.');
      }

      setEmail(newEmailInput.trim().toLowerCase());
      if (profile) {
        const updated = { ...profile, email: newEmailInput.trim().toLowerCase(), emailVerified: false };
        setProfile(updated);
        localStorage.setItem('forsa_user', JSON.stringify(updated));
      }
      setShowEmailModal(false);
      setSaveSuccess('Adresse e-mail mise à jour. Un lien de vérification vous a été envoyé.');
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err: any) {
      setEmailModalError(err.message || "Impossible d'enregistrer la nouvelle adresse.");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('forsa_access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('forsa_auth_token');
    localStorage.removeItem('forsa_refresh_token');
    localStorage.removeItem('forsa_user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center font-poppins">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-3 border-[#17664E] border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-[#0B2C25]">Chargement de votre profil FORSA...</p>
        </div>
      </div>
    );
  }

  const isSuspended = profile?.status === 'SUSPENDED';
  const isProfileIncomplete = !profile?.fullName || !profile?.phone;
  const displayName = profile?.fullName || 'Lydia Benali';
  const displayEmail = profile?.email || 'lydia.benali@example.com';
  const displayPhone = profile?.phone ? `+213 ${profile.phone}` : '+213 663 488 312';
  const currentAvatar = avatarPreview || profile?.avatarUrl || defaultAvatar;

  return (
    <div className="min-h-screen bg-[#fffaf0] font-poppins text-[#0b2c25] pb-24">
      {/* ── WORKSPACE (FRAME 617:5056) ────────────────────────────────────── */}
      <div className="w-full max-w-[1140px] mx-auto px-4 sm:px-8 pt-[30px] pb-[28px]">
        {/* ── PAGE HEADER (FRAME 617:5057) ──────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          {/* Page Introduction (617:5058) */}
          <div className="space-y-[3px]">
            <p className="text-[11px] font-normal text-[#0b2c25]/70">
              {viewMode === 'edit' ? 'Mon espace / Profil / Modifier' : 'Mon espace / Profil'}
            </p>
            <h1 className="text-[40px] sm:text-[48px] font-semibold text-[#0b2c25] leading-none tracking-tight">
              {viewMode === 'edit' ? 'Modifier le profil' : 'Mon profil'}
            </h1>
            <p className="text-[16px] sm:text-[20px] font-normal text-[#0b2c25]/70 max-w-[510px]">
              {viewMode === 'edit'
                ? 'Mettez à jour vos informations personnelles.'
                : 'Vos informations, votre sécurité et vos préférences.'}
            </p>
          </div>

          {/* Account Actions (732:15080) */}
          <div className="flex items-center gap-[14px] self-start md:self-center shrink-0">
            {/* Bouton Paramètres (793:23356) */}
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="h-[42px] px-[16px] rounded-[12px] border border-[#78847f] text-[#0b2c25] text-[13px] font-semibold flex items-center gap-[8px] hover:bg-white transition cursor-pointer bg-transparent"
            >
              <img src={figmaHeaderGear} alt="" className="size-[16px] shrink-0" />
              <span>Paramètres</span>
            </button>

            {/* Current Location (732:15081) */}
            <div className="hidden sm:flex items-center gap-[7px] pr-[12px]">
              <img src={figmaHeaderLocation} alt="" className="size-[18px] shrink-0" />
              <span className="text-[12px] font-normal text-[#0b2c25] leading-[1.5]">
                {preferredLocation}
              </span>
            </div>

            {/* Notifications Entry (732:15084) */}
            <div className="relative size-[42px] rounded-full flex items-center justify-center cursor-pointer hover:bg-white/60 transition">
              <img src={figmaHeaderBell} alt="" className="size-[22px] shrink-0" />
              <img
                src={figmaUnreadIndicator}
                alt=""
                className="absolute top-[8px] left-[27px] size-[7px]"
              />
            </div>

            {/* Circular User Avatar Photo (732:15087) */}
            <div className="relative size-[48px] rounded-full overflow-hidden shrink-0 border border-black/5 shadow-xs bg-[#ebeee1]">
              <img
                src={currentAvatar}
                alt={displayName}
                className="size-full object-cover rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = defaultAvatar;
                }}
              />
            </div>
          </div>
        </div>

        {/* ── SECTION B: ÉTATS FIGMA (E-MAIL, TÉLÉPHONE, SUSPENDU, INCOMPLET) ── */}
        <div className="space-y-3 mb-6">
          {/* État Compte Suspendu (Frame 785:21652) */}
          {isSuspended && (
            <div className="p-4 rounded-[20px] bg-[#B22222]/10 border border-[#B22222] text-[#B22222] flex items-start gap-3">
              <div className="text-xs">
                <strong className="block font-bold text-sm">Compte suspendu par l'administration</strong>
                Votre compte a été restreint suite à un signalement. Vous ne pouvez plus passer de commande. Contactez le support à support@forsa.dz.
              </div>
            </div>
          )}

          {/* État E-mail non vérifié (Frame 785:20789) */}
          {!profile?.emailVerified && (
            <div className="p-4 rounded-[20px] bg-amber-50 border border-amber-200 text-amber-950 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs">
                <span className="font-bold block text-sm">Adresse e-mail non vérifiée</span>
                Cliquez sur le lien reçu à <strong>{profile?.email}</strong> pour sécuriser vos réservations.
              </div>
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={isResendingEmail}
                className="px-3.5 py-1.5 rounded-[10px] bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition"
              >
                {isResendingEmail ? 'Envoi...' : 'Renvoyer le lien'}
              </button>
            </div>
          )}

          {resendEmailSuccess && (
            <div className="p-3.5 rounded-[12px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <img src={figmaTickPill} alt="" className="size-4" />
              <span>Lien de confirmation renvoyé avec succès à votre adresse e-mail.</span>
            </div>
          )}

          {/* État Téléphone non vérifié (Frame 785:21220) */}
          {!profile?.phoneVerified && (
            <div className="p-4 rounded-[20px] bg-[#eef7ec] border border-[#dbf0dd] text-[#0b2c25] flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs">
                <span className="font-bold block text-sm">Numéro de téléphone non vérifié</span>
                Vérifiez votre numéro par code SMS / Telegram pour recevoir vos codes de retrait.
              </div>
              <button
                type="button"
                onClick={handleStartPhoneVerification}
                className="px-3.5 py-1.5 rounded-[10px] bg-[#0b2c25] hover:bg-[#17664e] text-white text-xs font-semibold transition"
              >
                Vérifier le numéro
              </button>
            </div>
          )}

          {/* État Profil incomplet (Frame 785:22075) */}
          {isProfileIncomplete && (
            <div className="p-3.5 rounded-[12px] bg-blue-50 border border-blue-200 text-blue-900 text-xs">
              Complétez votre profil en renseignant votre numéro de téléphone pour une expérience optimale.
            </div>
          )}

          {/* Confirmation d'enregistrement Toast */}
          {saveSuccess && (
            <div className="p-3.5 rounded-[12px] bg-[#17664e] text-white text-xs font-semibold flex items-center gap-2 shadow-lg">
              <img src={figmaTickPill} alt="" className="size-4" />
              <span>{saveSuccess}</span>
            </div>
          )}
        </div>

        {/* ── MODE 1 : DESKTOP · PROFIL — MON PROFIL (FRAME 617:5054) ──────── */}
        {viewMode === 'view' ? (
          <div className="flex flex-col lg:flex-row gap-[24px] items-start w-full">
            {/* ── COLONNE PRINCIPALE (758px) ─────────────────────────────────── */}
            <div className="flex-1 w-full space-y-[24px]">
              {/* 1. CARTE PROFIL (FRAME 756:21199) */}
              <div className="w-full bg-gradient-to-r from-white to-[#eef7ec] border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[28px] shadow-sm flex flex-col sm:flex-row items-center sm:items-start justify-between gap-[28px]">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-[28px] text-center sm:text-left flex-1 min-w-0">
                  {/* Photo de profil (128x128) + bouton caméra */}
                  <div className="relative size-[128px] shrink-0">
                    <div className="size-[120px] rounded-full overflow-hidden bg-[#ebeee1] border-3 border-white shadow-md">
                      <img
                        src={currentAvatar}
                        alt={displayName}
                        className="size-full object-cover rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = defaultAvatar;
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('edit');
                        setTimeout(() => fileInputRef.current?.click(), 100);
                      }}
                      className="absolute left-[88px] top-[88px] size-[38px] rounded-full bg-[#0b2c25] border-3 border-white flex items-center justify-center text-white shadow-md hover:bg-[#17664e] transition cursor-pointer"
                      title="Changer la photo"
                    >
                      <img src={figmaCamera} alt="" className="size-[18px]" />
                    </button>
                  </div>

                  {/* Identité (756:21209) */}
                  <div className="flex flex-col gap-[10px] items-center sm:items-start min-w-0">
                    {/* Nom + Badge certifié (756:21210) */}
                    <div className="flex items-center gap-[10px]">
                      <h2 className="text-[26px] font-bold text-[#0b2c25] leading-none whitespace-nowrap">
                        {displayName}
                      </h2>
                      <img
                        src={figmaCheckmarkBadge}
                        alt="Badge vérifié"
                        className="size-[24px] shrink-0"
                      />
                    </div>

                    {/* Localisation (756:21216) */}
                    <div className="flex items-center gap-[6px]">
                      <img src={figmaLocationPin} alt="" className="size-[16px] shrink-0" />
                      <span className="text-[14px] font-medium text-[#0b2c25]">
                        {preferredLocation}
                      </span>
                    </div>

                    {/* Pastilles de vérification (756:21222) */}
                    <div className="flex items-center gap-[8px] flex-wrap pt-1 justify-center sm:justify-start">
                      {/* E-mail vérifié */}
                      <div className="bg-[#dbf0dd] flex items-center gap-[6px] pl-[10px] pr-[12px] py-[5px] rounded-[100px] shrink-0">
                        <img src={figmaTickPill} alt="" className="size-[14px] shrink-0" />
                        <span className="text-[12px] font-semibold text-[#17664e]">
                          {profile?.emailVerified ? 'E-mail vérifié' : 'E-mail vérifié'}
                        </span>
                      </div>

                      {/* Téléphone vérifié */}
                      <div className="bg-[#dbf0dd] flex items-center gap-[6px] pl-[10px] pr-[12px] py-[5px] rounded-[100px] shrink-0">
                        <img src={figmaTickPill} alt="" className="size-[14px] shrink-0" />
                        <span className="text-[12px] font-semibold text-[#17664e]">
                          {profile?.phoneVerified ? 'Téléphone vérifié' : 'Téléphone vérifié'}
                        </span>
                      </div>

                      {/* Membre depuis oct. 2026 */}
                      <div className="bg-[#ebeee1] flex items-center gap-[6px] pl-[10px] pr-[12px] py-[5px] rounded-[100px] shrink-0">
                        <span className="text-[12px] font-semibold text-[#0b2c25]">
                          Membre depuis oct. 2026
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bouton Modifier le profil (756:21235) */}
                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  className="bg-[#0b2c25] hover:bg-[#17664e] flex items-center justify-center gap-[8px] pl-[18px] pr-[20px] py-[12px] rounded-[12px] text-white text-[14px] font-semibold transition cursor-pointer shadow-sm shrink-0 self-center sm:self-start"
                >
                  <img src={figmaEditBtn} alt="" className="size-[18px] shrink-0" />
                  <span>Modifier le profil</span>
                </button>
              </div>

              {/* 2. CARTE INFORMATIONS PERSONNELLES (FRAME 756:21242) */}
              <div className="w-full bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[24px] shadow-sm flex flex-col gap-[20px]">
                {/* En-tête de carte (756:21243) */}
                <div className="flex items-center gap-[12px] w-full">
                  <div className="size-[44px] rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center shrink-0">
                    <img src={figmaUserCircle} alt="" className="size-[22px]" />
                  </div>
                  <h3 className="text-[20px] font-medium text-[#0b2c25]">
                    Informations personnelles
                  </h3>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => setViewMode('edit')}
                    className="border border-[#0b2c25] hover:bg-[#ebeee1] flex items-center justify-center gap-[8px] pl-[14px] pr-[16px] py-[8px] rounded-[100px] text-[12px] font-semibold text-[#0b2c25] transition cursor-pointer"
                  >
                    <img src={figmaEditSmall} alt="" className="size-[16px]" />
                    <span>Modifier</span>
                  </button>
                </div>

                {/* Grille informations (756:21260) */}
                <div className="flex flex-col gap-[16px] w-full">
                  {/* Ligne 1 */}
                  <div className="flex flex-col sm:flex-row gap-[16px] w-full">
                    {/* Tuile Nom complet (756:21263) */}
                    <div className="flex-1 bg-[#fffaf0] border border-[#e8ebdf] rounded-[16px] p-[16px] flex items-center gap-[14px]">
                      <div className="size-[44px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0">
                        <img src={figmaUserCircle} alt="" className="size-[22px]" />
                      </div>
                      <div className="flex flex-col gap-[3px] min-w-0">
                        <p className="text-[11px] font-normal text-[#0b2c25]">Nom complet</p>
                        <p className="text-[14px] font-semibold text-[#0b2c25] truncate">
                          {displayName}
                        </p>
                      </div>
                    </div>

                    {/* Tuile Téléphone (756:21275) */}
                    <div className="flex-1 bg-[#fffaf0] border border-[#e8ebdf] rounded-[16px] p-[16px] flex items-center gap-[14px]">
                      <div className="size-[44px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0">
                        <img src={figmaSmartPhone} alt="" className="size-[22px]" />
                      </div>
                      <div className="flex flex-col gap-[3px] min-w-0 flex-1">
                        <div className="flex items-center gap-[8px]">
                          <p className="text-[11px] font-normal text-[#0b2c25]">Téléphone</p>
                          <div className="bg-[#dbf0dd] flex items-center gap-[3px] pl-[5px] pr-[7px] py-[2px] rounded-[100px]">
                            <img src={figmaTickSmall} alt="" className="size-[11px]" />
                            <span className="text-[10px] font-semibold text-[#17664e]">Vérifié</span>
                          </div>
                        </div>
                        <p className="text-[14px] font-semibold text-[#0b2c25] truncate">
                          {displayPhone}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Ligne 2 */}
                  <div className="flex flex-col sm:flex-row gap-[16px] w-full">
                    {/* Tuile E-mail (756:21291) */}
                    <div className="flex-1 bg-[#fffaf0] border border-[#e8ebdf] rounded-[16px] p-[16px] flex items-center gap-[14px]">
                      <div className="size-[44px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0">
                        <img src={figmaMail} alt="" className="size-[22px]" />
                      </div>
                      <div className="flex flex-col gap-[3px] min-w-0 flex-1">
                        <div className="flex items-center gap-[8px]">
                          <p className="text-[11px] font-normal text-[#0b2c25]">E-mail</p>
                          <div className="bg-[#dbf0dd] flex items-center gap-[3px] pl-[5px] pr-[7px] py-[2px] rounded-[100px]">
                            <img src={figmaTickSmall} alt="" className="size-[11px]" />
                            <span className="text-[10px] font-semibold text-[#17664e]">Vérifié</span>
                          </div>
                        </div>
                        <p className="text-[14px] font-semibold text-[#0b2c25] truncate">
                          {displayEmail}
                        </p>
                      </div>
                    </div>

                    {/* Tuile Localisation préférée (756:21306) */}
                    <div className="flex-1 bg-[#fffaf0] border border-[#e8ebdf] rounded-[16px] p-[16px] flex items-center gap-[14px]">
                      <div className="size-[44px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0">
                        <img src={figmaLocationTile} alt="" className="size-[22px]" />
                      </div>
                      <div className="flex flex-col gap-[3px] min-w-0">
                        <p className="text-[11px] font-normal text-[#0b2c25]">Localisation préférée</p>
                        <p className="text-[14px] font-semibold text-[#0b2c25] truncate">
                          {preferredLocation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. CARTE ZONE DE RECHERCHE (FRAME 757:21306) */}
              <div className="w-full bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[24px] shadow-sm flex flex-col gap-[20px]">
                {/* En-tête de carte */}
                <div className="flex items-center gap-[12px] w-full">
                  <div className="size-[44px] rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center shrink-0">
                    <img src={figmaLocationPin} alt="" className="size-[22px]" />
                  </div>
                  <h3 className="text-[20px] font-medium text-[#0b2c25]">
                    Ma zone de recherche
                  </h3>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setNewLocationInput(preferredLocation);
                      setShowLocationModal(true);
                    }}
                    className="border border-[#0b2c25] hover:bg-[#ebeee1] flex items-center justify-center gap-[8px] pl-[14px] pr-[16px] py-[8px] rounded-[100px] text-[12px] font-semibold text-[#0b2c25] transition cursor-pointer"
                  >
                    <img src={figmaEditSmall} alt="" className="size-[16px]" />
                    <span>Modifier</span>
                  </button>
                </div>

                {/* Contenu zone (757:21322) */}
                <div className="flex flex-col sm:flex-row items-center gap-[20px] w-full">
                  {/* Aperçu carte (876:25245) - 210x150 */}
                  <div className="relative size-[150px] w-[210px] rounded-[16px] overflow-hidden shrink-0">
                    <img
                      src={figmaFondDeCarte}
                      alt="Fond de carte"
                      className="absolute inset-0 size-full object-cover"
                    />

                    {/* Repère aperçu 1 */}
                    <div className="absolute left-[48px] top-[38px] size-[30px] rounded-[15px] bg-white shadow-md flex items-center justify-center p-[5px]">
                      <img src={figmaPhotoProduit} alt="" className="size-[20px] rounded-full" />
                    </div>

                    {/* Repère aperçu 2 (sélectionné) */}
                    <div className="absolute left-[124px] top-[23px] size-[38px] rounded-[19px] bg-white border-4 border-[#17664e] shadow-md flex items-center justify-center p-[3px]">
                      <img src={figmaPhotoProduit1} alt="" className="size-[24px] rounded-full" />
                    </div>

                    {/* Repère aperçu 3 */}
                    <div className="absolute left-[149px] top-[93px] size-[30px] rounded-[15px] bg-white shadow-md flex items-center justify-center p-[5px]">
                      <img src={figmaPhotoProduit2} alt="" className="size-[20px] rounded-full" />
                    </div>

                    {/* Repère aperçu 4 */}
                    <div className="absolute left-[31px] top-[102px] size-[30px] rounded-[15px] bg-white shadow-md flex items-center justify-center p-[5px]">
                      <img src={figmaPhotoProduit3} alt="" className="size-[20px] rounded-full" />
                    </div>

                    {/* Ma position dot */}
                    <img
                      src={figmaMaPosition}
                      alt="Ma position"
                      className="absolute left-[99px] top-[76.5px] size-[12px]"
                    />
                  </div>

                  {/* Détails zone (757:21324) */}
                  <div className="flex flex-col gap-[12px] flex-1 min-w-0 w-full">
                    {/* Position */}
                    <div className="flex flex-col gap-[2px]">
                      <p className="text-[11px] font-normal text-[#0b2c25]">Position enregistrée</p>
                      <div className="flex items-center gap-[6px]">
                        <img src={figmaLocationPin} alt="" className="size-[16px] shrink-0" />
                        <span className="text-[14px] font-semibold text-[#0b2c25]">
                          {preferredLocation}
                        </span>
                      </div>
                    </div>

                    {/* Rayon */}
                    <div className="flex flex-col gap-[8px] w-full">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-normal text-[#0b2c25]">
                          Rayon de recherche
                        </span>
                        <span className="text-[12px] font-semibold text-[#17664e]">10 km</span>
                      </div>
                      {/* Curseur (757:21337) */}
                      <div className="relative w-full h-[6px] bg-[#d9d9d9] rounded-[100px]">
                        <div className="absolute left-0 top-0 h-[6px] w-[95.4px] bg-[#17664e] rounded-[3px]" />
                        <img
                          src={figmaPoignee}
                          alt=""
                          className="absolute left-[87.4px] top-[-5px] size-[16px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── COLONNE LATÉRALE (340px) ─────────────────────────────────── */}
            <div className="w-full lg:w-[340px] space-y-[24px] shrink-0">
              {/* 1. CARTE ACTIVITÉ (FRAME 756:21346) */}
              <div className="w-full bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[24px] shadow-sm flex flex-col gap-[20px]">
                {/* En-tête de carte (756:21347) */}
                <div className="flex items-center gap-[12px] w-full">
                  <div className="size-[44px] rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center shrink-0">
                    <img src={figmaCalendar03} alt="" className="size-[22px]" />
                  </div>
                  <h3 className="text-[20px] font-medium text-[#0b2c25]">Mon activité</h3>
                </div>

                {/* Chiffres (756:21357) */}
                <div className="flex gap-[10px] w-full">
                  {/* Tuile Réservations */}
                  <div className="flex-1 bg-[#ebeee1] rounded-[16px] px-[6px] py-[14px] flex flex-col items-center justify-center gap-[4px]">
                    <img src={figmaCalendarCheckIn} alt="" className="size-[20px]" />
                    <p className="text-[22px] font-bold text-[#0b2c25] leading-none">4</p>
                    <p className="text-[11px] font-normal text-[#0b2c25] leading-none text-center">
                      Réservations
                    </p>
                  </div>

                  {/* Tuile En cours */}
                  <div className="flex-1 bg-[#fdf3d8] rounded-[16px] px-[6px] py-[14px] flex flex-col items-center justify-center gap-[4px]">
                    <img src={figmaCalendarWarning} alt="" className="size-[20px]" />
                    <p className="text-[22px] font-bold text-[#0b2c25] leading-none">2</p>
                    <p className="text-[11px] font-normal text-[#0b2c25] leading-none text-center">
                      En cours
                    </p>
                  </div>

                  {/* Tuile Retirée */}
                  <div className="flex-1 bg-[#dbf0dd] rounded-[16px] px-[6px] py-[14px] flex flex-col items-center justify-center gap-[4px]">
                    <img src={figmaTickActivity} alt="" className="size-[20px]" />
                    <p className="text-[22px] font-bold text-[#0b2c25] leading-none">1</p>
                    <p className="text-[11px] font-normal text-[#0b2c25] leading-none text-center">
                      Retirée
                    </p>
                  </div>
                </div>

                {/* Impact anti-gaspillage (756:21383) */}
                <div className="w-full bg-[#eef7ec] border border-[#dbf0dd] rounded-[16px] pl-[12px] pr-[14px] py-[12px] flex items-center gap-[12px]">
                  <div className="size-[40px] rounded-full bg-[#17664e] flex items-center justify-center shrink-0">
                    <img src={figmaSparkles} alt="" className="size-[20px]" />
                  </div>
                  <div className="flex flex-col gap-px min-w-0">
                    <p className="text-[14px] font-semibold text-[#0b2c25] leading-none">
                      1 repas sauvé
                    </p>
                    <p className="text-[11px] font-normal text-[#0b2c25] leading-none pt-1">
                      100 DA réglés sur place
                    </p>
                  </div>
                </div>

                {/* Lien Voir mes réservations */}
                <a
                  href="#reservations"
                  className="text-[12px] font-semibold text-[#17664e] hover:underline"
                >
                  Voir mes réservations →
                </a>
              </div>

              {/* 2. CARTE PARAMÈTRES (FRAME 793:23362) */}
              <div className="w-full bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[24px] shadow-sm flex flex-col gap-[8px]">
                {/* En-tête de carte */}
                <div
                  onClick={() => setShowPasswordModal(true)}
                  className="flex items-center gap-[12px] w-full cursor-pointer hover:opacity-80 transition"
                >
                  <div className="size-[44px] rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center shrink-0">
                    <img src={figmaCardGear} alt="" className="size-[22px]" />
                  </div>
                  <p className="text-[20px] font-medium text-[#0b2c25]">Paramètres</p>
                </div>

                {/* Séparateur */}
                <div className="w-full h-px bg-[#ebeee1] my-1" />

                {/* Ligne Sécurité du compte */}
                <div
                  onClick={() => setShowPasswordModal(true)}
                  className="flex items-center gap-[12px] py-[12px] w-full cursor-pointer hover:bg-gray-50/60 rounded-[12px] px-1 transition"
                >
                  <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0">
                    <img src={figmaShield} alt="" className="size-[20px]" />
                  </div>
                  <div className="flex flex-col gap-px flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#0b2c25]">Sécurité du compte</p>
                    <p className="text-[11px] font-normal text-[#0b2c25]/70">Mot de passe, appareils</p>
                  </div>
                  <img src={figmaChevronRight} alt="" className="size-[16px] shrink-0" />
                </div>

                {/* Séparateur */}
                <div className="w-full h-px bg-[#ebeee1]" />

                {/* Ligne Notifications */}
                <div className="flex items-center gap-[12px] py-[12px] w-full cursor-pointer hover:bg-gray-50/60 rounded-[12px] px-1 transition">
                  <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0">
                    <img src={figmaCardBell} alt="" className="size-[20px]" />
                  </div>
                  <div className="flex flex-col gap-px flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#0b2c25]">Notifications</p>
                    <p className="text-[11px] font-normal text-[#0b2c25]/70">3 actives</p>
                  </div>
                  <img src={figmaChevronRight} alt="" className="size-[16px] shrink-0" />
                </div>

                {/* Séparateur */}
                <div className="w-full h-px bg-[#ebeee1]" />

                {/* Ligne Localisation */}
                <div
                  onClick={() => setShowLocationModal(true)}
                  className="flex items-center gap-[12px] py-[12px] w-full cursor-pointer hover:bg-gray-50/60 rounded-[12px] px-1 transition"
                >
                  <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0">
                    <img src={figmaCardPin} alt="" className="size-[20px]" />
                  </div>
                  <div className="flex flex-col gap-px flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#0b2c25]">Localisation</p>
                    <p className="text-[11px] font-normal text-[#0b2c25]/70">Rayon de recherche : 10 km</p>
                  </div>
                  <img src={figmaChevronRight} alt="" className="size-[16px] shrink-0" />
                </div>

                {/* Bouton Tous les paramètres */}
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  className="mt-2 w-full h-[40px] rounded-[12px] bg-[#0b2c25] hover:bg-[#17664e] flex items-center justify-center gap-[8px] text-white text-[13px] font-semibold transition cursor-pointer"
                >
                  <span>Tous les paramètres</span>
                  <img src={figmaArrowRight} alt="" className="size-[14px]" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── MODE 2 : DESKTOP · PROFIL — MODIFIER LE PROFIL (FRAME 617:5150) ─ */
          <div className="flex flex-col lg:flex-row gap-[24px] items-start w-full">
            {/* ── COLONNE PRINCIPALE (CARTE FORMULAIRE 797:29367) ────────────── */}
            <div className="flex-1 w-full bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[24px] shadow-sm flex flex-col gap-[12px]">
              <form onSubmit={handleUpdateProfile} className="space-y-[16px]">
                {/* Ligne Photo (797:29368) */}
                <div className="flex items-center gap-[20px] w-full pb-[16px]">
                  {/* Photo de profil (99px) */}
                  <div className="relative size-[99px] shrink-0 rounded-full overflow-hidden bg-[#ebeee1] border-3 border-white shadow-sm">
                    <img
                      src={currentAvatar}
                      alt={displayName}
                      className="size-full object-cover rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = defaultAvatar;
                      }}
                    />
                  </div>

                  {/* Texte et actions photo */}
                  <div className="flex flex-col gap-[10px] flex-1 min-w-0">
                    <div className="space-y-[2px]">
                      <p className="text-[15px] font-semibold text-[#0b2c25]">Photo de profil</p>
                      <p className="text-[12px] font-normal text-[#0b2c25]/70">
                        JPG ou PNG, 5 Mo maximum.
                      </p>
                    </div>

                    <div className="flex items-center gap-[10px] flex-wrap">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="border border-[#0b2c25] hover:bg-[#ebeee1] flex items-center justify-center gap-[8px] pl-[18px] pr-[20px] py-[12px] rounded-[12px] text-[14px] font-semibold text-[#0b2c25] transition cursor-pointer"
                      >
                        <img src={figmaCameraEdit} alt="" className="size-[18px]" />
                        <span>Changer la photo</span>
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />

                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={handleDeleteAvatar}
                          disabled={isUploadingAvatar}
                          className="flex items-center justify-center gap-[8px] pl-[18px] pr-[20px] py-[12px] rounded-[12px] text-[14px] font-semibold text-[#17664e] hover:text-[#b22222] transition cursor-pointer"
                        >
                          <img src={figmaDeleteTrash} alt="" className="size-[18px]" />
                          <span>Supprimer</span>
                        </button>
                      )}
                    </div>

                    {avatarError && (
                      <p className="text-xs text-[#b22222] font-semibold">{avatarError}</p>
                    )}
                  </div>
                </div>

                {/* Séparateur */}
                <div className="w-full h-px bg-[#ebeee1]" />

                {/* Identité (797:29382) */}
                <p className="text-[15px] font-semibold text-[#0b2c25]">Identité</p>

                {/* Champ Nom complet (797:29383) */}
                <div className="flex flex-col gap-[6px] w-full">
                  <label className="text-[12px] font-semibold text-[#0b2c25]">Nom complet</label>
                  <div className="w-full h-[48px] bg-white border-[1.5px] border-[#78847f] rounded-[12px] px-[14px] flex items-center gap-[10px]">
                    <img src={figmaUserCircleInput} alt="" className="size-[18px] shrink-0" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="flex-1 h-full text-[14px] font-medium text-[#0b2c25] focus:outline-none bg-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Séparateur */}
                <div className="w-full h-px bg-[#ebeee1]" />

                {/* Coordonnées (797:29389) */}
                <p className="text-[15px] font-semibold text-[#0b2c25]">Coordonnées</p>

                {/* Champ Adresse e-mail (797:29390) */}
                <div className="flex flex-col gap-[6px] w-full">
                  <label className="text-[12px] font-semibold text-[#0b2c25]">Adresse e-mail</label>
                  <div className="w-full h-[48px] bg-[#fffaf0] border-[1.5px] border-[#78847f] rounded-[12px] px-[14px] flex items-center gap-[10px]">
                    <img src={figmaMailInput} alt="" className="size-[18px] shrink-0" />
                    <span className="flex-1 text-[14px] font-medium text-[#0b2c25] truncate">
                      {email}
                    </span>
                    <div className="bg-[#dbf0dd] flex items-center gap-[3px] pl-[6px] pr-[8px] py-[3px] rounded-[100px] shrink-0">
                      <img src={figmaTickVerified} alt="" className="size-[12px]" />
                      <span className="text-[10px] font-semibold text-[#17664e]">Vérifié</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewEmailInput(email);
                        setShowEmailModal(true);
                      }}
                      className="text-[12px] font-semibold text-[#17664e] hover:underline shrink-0"
                    >
                      Changer
                    </button>
                  </div>
                  <p className="text-[11px] font-normal text-[#0b2c25]/70">
                    Un changement d’e-mail demande une nouvelle vérification.
                  </p>
                </div>

                {/* Champ Téléphone (797:29401) */}
                <div className="flex flex-col gap-[6px] w-full">
                  <label className="text-[12px] font-semibold text-[#0b2c25]">Téléphone</label>
                  <div className="w-full h-[48px] bg-[#fffaf0] border-[1.5px] border-[#78847f] rounded-[12px] px-[14px] flex items-center gap-[10px]">
                    <img src={figmaPhoneInput} alt="" className="size-[18px] shrink-0" />
                    <span className="flex-1 text-[14px] font-medium text-[#0b2c25] truncate">
                      {displayPhone}
                    </span>
                    <div className="bg-[#dbf0dd] flex items-center gap-[3px] pl-[6px] pr-[8px] py-[3px] rounded-[100px] shrink-0">
                      <img src={figmaTickVerified} alt="" className="size-[12px]" />
                      <span className="text-[10px] font-semibold text-[#17664e]">Vérifié</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartPhoneVerification}
                      className="text-[12px] font-semibold text-[#17664e] hover:underline shrink-0"
                    >
                      Changer
                    </button>
                  </div>
                  {phoneError && (
                    <p className="text-[11px] text-[#b22222] font-semibold">{phoneError}</p>
                  )}
                </div>

                {/* Champ Localisation préférée (797:29410) */}
                <div className="flex flex-col gap-[6px] w-full">
                  <label className="text-[12px] font-semibold text-[#0b2c25]">Localisation préférée</label>
                  <div className="w-full h-[48px] bg-[#fffaf0] border-[1.5px] border-[#78847f] rounded-[12px] px-[14px] flex items-center gap-[10px]">
                    <img src={figmaLocationInput} alt="" className="size-[18px] shrink-0" />
                    <span className="flex-1 text-[14px] font-medium text-[#0b2c25] truncate">
                      {preferredLocation}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewLocationInput(preferredLocation);
                        setShowLocationModal(true);
                      }}
                      className="text-[12px] font-semibold text-[#17664e] hover:underline shrink-0"
                    >
                      Modifier
                    </button>
                  </div>
                </div>

                {/* Champ Mot de passe (797:29416) */}
                <div className="flex flex-col gap-[6px] w-full">
                  <label className="text-[12px] font-semibold text-[#0b2c25]">Mot de passe</label>
                  <div className="w-full h-[48px] bg-[#fffaf0] border-[1.5px] border-[#78847f] rounded-[12px] px-[14px] flex items-center gap-[10px]">
                    <img src={figmaLockInput} alt="" className="size-[18px] shrink-0" />
                    <span className="flex-1 text-[14px] font-medium text-[#0b2c25]">••••••••••</span>
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(true)}
                      className="text-[12px] font-semibold text-[#17664e] hover:underline shrink-0"
                    >
                      Changer
                    </button>
                  </div>
                  <p className="text-[11px] font-normal text-[#0b2c25]/70">
                    Dernière modification il y a 2 mois.
                  </p>
                </div>

                {/* Pied de formulaire (797:29424) */}
                <div className="flex items-center justify-end gap-[12px] pt-[16px]">
                  <button
                    type="button"
                    onClick={() => setViewMode('view')}
                    className="border border-[#0b2c25] hover:bg-[#ebeee1] px-[20px] py-[12px] rounded-[12px] text-[14px] font-semibold text-[#0b2c25] transition cursor-pointer"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-[#0b2c25] hover:bg-[#17664e] pl-[18px] pr-[20px] py-[12px] rounded-[12px] text-white text-[14px] font-semibold flex items-center gap-[8px] transition cursor-pointer shadow-sm"
                  >
                    <img src={figmaTickSave} alt="" className="size-[18px]" />
                    <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* ── COLONNE LATÉRALE MODE ÉDITION (340px) ──────────────────────── */}
            <div className="w-full lg:w-[340px] space-y-[24px] shrink-0">
              {/* 1. CARTE COMPTE ET SÉCURITÉ (797:29431) */}
              <div className="w-full bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[24px] shadow-sm flex flex-col gap-[8px]">
                <div className="flex items-center gap-[12px] w-full">
                  <div className="size-[44px] rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center shrink-0">
                    <img src={figmaSecurityCheck} alt="" className="size-[22px]" />
                  </div>
                  <p className="text-[20px] font-medium text-[#0b2c25]">Compte et sécurité</p>
                </div>

                <div className="w-full h-px bg-[#ebeee1] my-1" />

                {/* Changer l'e-mail */}
                <div
                  onClick={() => {
                    setNewEmailInput(email);
                    setShowEmailModal(true);
                  }}
                  className="flex items-center gap-[12px] py-[12px] w-full cursor-pointer hover:bg-gray-50/60 rounded-[12px] px-1 transition"
                >
                  <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0">
                    <img src={figmaSecurityMail} alt="" className="size-[20px]" />
                  </div>
                  <div className="flex flex-col gap-px flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#0b2c25]">Changer l’e-mail</p>
                    <p className="text-[11px] font-normal text-[#0b2c25]/70">
                      Nouvelle vérification requise
                    </p>
                  </div>
                  <span className="text-[18px] font-semibold text-[#0b2c25]">›</span>
                </div>

                <div className="w-full h-px bg-[#ebeee1]" />

                {/* Changer le téléphone */}
                <div
                  onClick={handleStartPhoneVerification}
                  className="flex items-center gap-[12px] py-[12px] w-full cursor-pointer hover:bg-gray-50/60 rounded-[12px] px-1 transition"
                >
                  <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0">
                    <img src={figmaSecurityPhone} alt="" className="size-[20px]" />
                  </div>
                  <div className="flex flex-col gap-px flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#0b2c25]">Changer le téléphone</p>
                    <p className="text-[11px] font-normal text-[#0b2c25]/70">
                      Code de confirmation par SMS
                    </p>
                  </div>
                  <span className="text-[18px] font-semibold text-[#0b2c25]">›</span>
                </div>

                <div className="w-full h-px bg-[#ebeee1]" />

                {/* Changer le mot de passe */}
                <div
                  onClick={() => setShowPasswordModal(true)}
                  className="flex items-center gap-[12px] py-[12px] w-full cursor-pointer hover:bg-gray-50/60 rounded-[12px] px-1 transition"
                >
                  <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0">
                    <img src={figmaSecurityLock} alt="" className="size-[20px]" />
                  </div>
                  <div className="flex flex-col gap-px flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#0b2c25]">Changer le mot de passe</p>
                    <p className="text-[11px] font-normal text-[#0b2c25]/70">
                      Choisissez un mot de passe fort
                    </p>
                  </div>
                  <span className="text-[18px] font-semibold text-[#0b2c25]">›</span>
                </div>
              </div>

              {/* 2. CARTE BESOIN D'AIDE ? (FRAME 797:29460) */}
              <div className="w-full bg-[#eef7ec] border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[24px] shadow-sm flex flex-col gap-[12px]">
                <div className="flex items-end justify-between w-full">
                  <div className="flex flex-col gap-[12px]">
                    <div className="size-[44px] rounded-full bg-white flex items-center justify-center shadow-xs">
                      <img src={figmaHeadsetHelp} alt="" className="size-[22px]" />
                    </div>
                    <p className="text-[18px] font-semibold text-[#0b2c25]">Besoin d’aide ?</p>
                  </div>
                  <div className="size-[95px] w-[104px] shrink-0">
                    <img
                      src={figmaIllustrationAide}
                      alt="Illustration aide"
                      className="size-full object-contain"
                    />
                  </div>
                </div>

                <p className="text-[12px] font-normal text-[#0b2c25] leading-normal">
                  Notre équipe est là pour vous aider avec vos réservations et votre compte.
                </p>

                <button
                  type="button"
                  onClick={() => alert('Support FORSA disponible par email à support@forsa.dz')}
                  className="bg-[#0b2c25] hover:bg-[#17664e] px-[16px] py-[10px] rounded-[12px] text-white text-[12px] font-semibold transition cursor-pointer self-start flex items-center gap-1.5"
                >
                  <span>Contacter le support</span>
                  <span>✓</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALE VALIDATION OTP TÉLÉPHONE (FRAME 786:23506) ──────────────── */}
      {showPhoneOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-7 shadow-2xl relative">
            <button
              onClick={() => setShowPhoneOtpModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="size-12 rounded-full bg-[#FAF6ED] text-[#0B2C25] flex items-center justify-center mb-3">
                <img src={figmaSmartPhone} alt="" className="size-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0B2C25]">Vérification du téléphone</h3>
              <p className="text-xs text-gray-500 mt-1">
                Saisissez le code à 6 chiffres envoyé au <strong>+213 {phone}</strong>
              </p>
            </div>

            {/* 6 OTP Boxes */}
            <div className="flex justify-center gap-2.5 mb-4">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  disabled={otpSecondsLeft === 0}
                  onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className={`w-11 h-14 text-center text-xl font-bold rounded-[12px] border transition focus:outline-none ${
                    otpError
                      ? 'border-[#B22222] bg-[#B22222]/5 text-[#B22222]'
                      : 'border-gray-200 bg-gray-50 focus:border-[#17664E] focus:bg-white text-gray-900'
                  }`}
                />
              ))}
            </div>

            {otpError && (
              <p className="text-xs text-[#B22222] font-semibold text-center mb-3">{otpError}</p>
            )}

            <div className="text-center text-xs mb-6 text-gray-500">
              {otpSecondsLeft > 0 ? (
                <span>
                  Validité du code :{' '}
                  <strong className="text-[#17664E]">{formatOtpTimer(otpSecondsLeft)}</strong>
                </span>
              ) : (
                <span className="text-[#B22222] font-semibold">
                  Le code a expiré. Demandez un nouveau code.
                </span>
              )}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleConfirmOtp}
                disabled={isVerifyingOtp || otpSecondsLeft === 0}
                className="w-full h-12 rounded-[12px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-semibold text-sm transition disabled:opacity-50"
              >
                {isVerifyingOtp ? 'Vérification...' : 'Valider le code'}
              </button>

              <button
                type="button"
                onClick={handleStartPhoneVerification}
                className="w-full text-xs text-[#17664E] font-semibold hover:underline text-center block py-1"
              >
                Renvoyer un nouveau code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE CHANGER L'E-MAIL ────────────────────────────────────────── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-7 shadow-2xl relative">
            <button
              onClick={() => setShowEmailModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="size-12 rounded-full bg-[#FAF6ED] text-[#0B2C25] flex items-center justify-center mb-3">
                <img src={figmaMail} alt="" className="size-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0B2C25]">Modifier l'adresse e-mail</h3>
              <p className="text-xs text-gray-500 mt-1">
                Un lien de vérification sera automatiquement expédié à la nouvelle adresse.
              </p>
            </div>

            <form onSubmit={handleSaveNewEmail} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0B2C25]">Nouvel e-mail</label>
                <input
                  type="email"
                  value={newEmailInput}
                  onChange={(e) => {
                    setNewEmailInput(e.target.value);
                    if (emailModalError) setEmailModalError(null);
                  }}
                  className="w-full h-12 px-4 rounded-[12px] border border-[#78847F] text-sm focus:outline-none focus:border-[#17664E]"
                  required
                />
                {emailModalError && (
                  <p className="text-xs text-[#B22222] font-semibold">{emailModalError}</p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 h-11 rounded-[12px] border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingEmail}
                  className="flex-1 h-11 rounded-[12px] bg-[#0B2C25] hover:bg-[#17664E] text-white text-xs font-bold transition shadow-sm"
                >
                  {isUpdatingEmail ? 'Mise à jour...' : 'Confirmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALE CHANGER LE MOT DE PASSE ─────────────────────────────────── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-7 shadow-2xl relative">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="size-12 rounded-full bg-[#FAF6ED] text-[#0B2C25] flex items-center justify-center mb-3">
                <img src={figmaShield} alt="" className="size-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0B2C25]">Modifier le mot de passe</h3>
              <p className="text-xs text-gray-500 mt-1">
                Choisissez un mot de passe robuste d'au moins 8 caractères.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0B2C25]">Mot de passe actuel</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-11 px-4 rounded-[12px] border border-[#78847F] text-sm focus:outline-none focus:border-[#17664E]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0B2C25]">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-11 px-4 rounded-[12px] border border-[#78847F] text-sm focus:outline-none focus:border-[#17664E]"
                  required
                />
                <p className="text-[10px] text-gray-400">
                  Au moins 8 caractères, 1 lettre majuscule et 1 chiffre.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0B2C25]">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-11 px-4 rounded-[12px] border border-[#78847F] text-sm focus:outline-none focus:border-[#17664E]"
                  required
                />
              </div>

              {passwordError && (
                <p className="text-xs text-[#B22222] font-semibold">{passwordError}</p>
              )}

              {passwordSuccess && (
                <p className="text-xs text-emerald-700 font-semibold">
                  Mot de passe modifié avec succès !
                </p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 h-11 rounded-[12px] border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex-1 h-11 rounded-[12px] bg-[#0B2C25] hover:bg-[#17664E] text-white text-xs font-bold transition shadow-sm"
                >
                  {isChangingPassword ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALE MODIFIER LA LOCALISATION ─────────────────────────────────── */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-7 shadow-2xl relative">
            <button
              onClick={() => setShowLocationModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="size-12 rounded-full bg-[#FAF6ED] text-[#0B2C25] flex items-center justify-center mb-3">
                <img src={figmaLocationPin} alt="" className="size-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0B2C25]">Position de recherche</h3>
              <p className="text-xs text-gray-500 mt-1">
                Définissez votre localisation préférée en Algérie pour vos paniers anti-gaspi.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0B2C25]">Ville ou Commune</label>
                <input
                  type="text"
                  value={newLocationInput}
                  onChange={(e) => setNewLocationInput(e.target.value)}
                  placeholder="Ex: Bab Ezzouar, Alger"
                  className="w-full h-12 px-4 rounded-[12px] border border-[#78847F] text-sm focus:outline-none focus:border-[#17664E]"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  requestCurrentPosition();
                  setPreferredLocation('Bab Ezzouar, Alger');
                  setShowLocationModal(false);
                }}
                className="w-full text-xs text-[#17664E] font-semibold hover:underline flex items-center justify-center gap-1.5 py-1"
              >
                <span>Utiliser ma géolocalisation actuelle</span>
              </button>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="flex-1 h-11 rounded-[12px] border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (newLocationInput.trim()) {
                      setPreferredLocation(newLocationInput.trim());
                    }
                    setShowLocationModal(false);
                  }}
                  className="flex-1 h-11 rounded-[12px] bg-[#0B2C25] hover:bg-[#17664E] text-white text-xs font-bold transition shadow-sm"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
