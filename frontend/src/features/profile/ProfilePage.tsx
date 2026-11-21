// frontend/src/features/profile/ProfilePage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Shield,
  KeyRound,
  MapPin,
  Check,
  AlertCircle,
  AlertTriangle,
  Camera,
  Trash2,
  Save,
  RefreshCw,
  LogOut,
  X,
  Edit3,
  Calendar,
  ShoppingBag,
  Coins,
  Settings,
  Bell,
  ArrowRight,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile } from './types';
import { useLocation } from '../catalogue/context/LocationContext';

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

  // Logout Modal State (Paramètres — Déconnexion · Confirmation)
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Resend Email State
  const [resendEmailSuccess, setResendEmailSuccess] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  // Fetch Current User Profile
  const fetchProfile = async () => {
    const token = localStorage.getItem('forsa_access_token');
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

    const token = localStorage.getItem('forsa_access_token');
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

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Le fichier est trop volumineux. La taille maximale est de 2 Mo.');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Format non supporté. Veuillez choisir une image JPG, PNG ou WebP.');
      return;
    }

    const token = localStorage.getItem('forsa_access_token');
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
      if (!res.ok) throw new Error(data?.message || 'Échec de l\'envoi de la photo.');

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
    const token = localStorage.getItem('forsa_access_token');
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

  // Resend Email
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
    const token = localStorage.getItem('forsa_access_token');
    if (!token) return;

    if (!phone) {
      setPhoneError('Veuillez d\'abord renseigner un numéro de téléphone.');
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

    const token = localStorage.getItem('forsa_access_token');
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
        const remaining = data?.error?.details?.[0]?.attemptsLeft ?? (otpAttemptsLeft - 1);
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

    const token = localStorage.getItem('forsa_access_token');
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

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('forsa_access_token');
    localStorage.removeItem('forsa_refresh_token');
    localStorage.removeItem('forsa_user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center font-poppins">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#17664E] animate-spin" />
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

  return (
    <div className="min-h-screen bg-[#FFFAF0] font-poppins text-[#0B2C25] pb-24">
      {/* ── WORKSPACE CONTENT ────────────────────────────────────────────── */}
      <div className="max-w-[1140px] mx-auto px-4 sm:px-8 pt-8">
        {/* ── PAGE HEADER (FIGMA FRAME 617:5057) ─────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="space-y-1">
            <p className="text-[11px] font-normal text-[#0B2C25]/70">
              {viewMode === 'edit' ? 'Mon espace / Profil / Modifier' : 'Mon espace / Profil'}
            </p>
            <h1 className="text-[36px] sm:text-[48px] font-semibold text-[#0B2C25] leading-tight tracking-tight">
              {viewMode === 'edit' ? 'Modifier le profil' : 'Mon profil'}
            </h1>
            <p className="text-sm sm:text-[18px] font-normal text-[#0B2C25]/70">
              {viewMode === 'edit'
                ? 'Mettez à jour vos informations personnelles.'
                : 'Vos informations, votre sécurité et vos préférences.'}
            </p>
          </div>

          {/* Account Actions (Top Right) */}
          <div className="flex items-center gap-3.5 self-start md:self-center">
            {/* Bouton Paramètres */}
            <button
              onClick={() => setShowPasswordModal(true)}
              className="h-[42px] px-4 rounded-[12px] border border-[#78847F] text-[#0B2C25] font-semibold text-[13px] flex items-center gap-2 hover:bg-white transition bg-transparent"
            >
              <Settings size={16} />
              <span>Paramètres</span>
            </button>

            {/* Current Location Badge */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#0B2C25] pr-2">
              <MapPin size={16} className="text-[#0B2C25]" />
              <span className="font-normal">{preferredLocation}</span>
            </div>

            {/* Notifications Entry */}
            <div className="relative size-[42px] rounded-full flex items-center justify-center text-[#0B2C25] hover:bg-white/60 transition cursor-pointer">
              <Bell size={20} />
              <div className="absolute top-2 right-2.5 size-[7px] rounded-full bg-[#CE5656]" />
            </div>

            {/* Circular user avatar photo */}
            <div className="size-[48px] rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 bg-emerald-800 flex items-center justify-center text-white font-bold">
              {avatarPreview ? (
                <img src={avatarPreview} alt={displayName} className="size-full object-cover" />
              ) : (
                <span>{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── SECTION B: ÉTATS FIGMA (E-MAIL, TÉLÉPHONE, SUSPENDU, INCOMPLET) ── */}
        <div className="space-y-3 mb-6">
          {/* État Compte Suspendu (Frame 785:21652) */}
          {isSuspended && (
            <div className="p-4 rounded-[20px] bg-[#B22222]/10 border border-[#B22222] text-[#B22222] flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="block font-bold text-sm">Compte suspendu par l'administration</strong>
                Votre compte a été restreint suite à un signalement. Vous ne pouvez plus passer de commande. Contactez le support à support@forsa.dz.
              </div>
            </div>
          )}

          {/* État E-mail non vérifié (Frame 785:20789) */}
          {!profile?.emailVerified && (
            <div className="p-4 rounded-[20px] bg-amber-50 border border-amber-200 text-amber-950 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold block text-sm">Adresse e-mail non vérifiée</span>
                  Cliquez sur le lien reçu à <strong>{profile?.email}</strong> pour sécuriser vos réservations.
                </div>
              </div>
              <button
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
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Lien de confirmation renvoyé avec succès à votre adresse e-mail.</span>
            </div>
          )}

          {/* État Téléphone non vérifié (Frame 785:21220) */}
          {!profile?.phoneVerified && (
            <div className="p-4 rounded-[20px] bg-emerald-50 border border-[#DBF0DD] text-emerald-950 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#17664E] shrink-0" />
                <div className="text-xs">
                  <span className="font-bold block text-sm">Numéro de téléphone non vérifié</span>
                  Vérifiez votre numéro par code SMS / Telegram pour recevoir vos codes de retrait.
                </div>
              </div>
              <button
                onClick={handleStartPhoneVerification}
                className="px-3.5 py-1.5 rounded-[10px] bg-[#0B2C25] hover:bg-[#17664E] text-white text-xs font-semibold transition"
              >
                Vérifier le numéro
              </button>
            </div>
          )}

          {/* État Profil incomplet (Frame 785:22075) */}
          {isProfileIncomplete && (
            <div className="p-3.5 rounded-[12px] bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="text-blue-600 shrink-0" />
              <span>Complétez votre profil en renseignant votre numéro de téléphone pour une expérience optimale.</span>
            </div>
          )}

          {/* Confirmation d'enregistrement Toast */}
          {saveSuccess && (
            <div className="p-3.5 rounded-[12px] bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg">
              <Check size={16} />
              <span>{saveSuccess}</span>
            </div>
          )}
        </div>

        {/* ── MODE 1 : DESKTOP · PROFIL — MON PROFIL (FRAME 617:5054) ──────── */}
        {viewMode === 'view' ? (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* ── COLONNE PRINCIPALE (758px) ─────────────────────────────────── */}
            <div className="flex-1 w-full space-y-6">
              {/* 1. CARTE PROFIL (FRAME 756:21199) */}
              <div className="w-full rounded-[24px] bg-gradient-to-r from-white to-[#EEF7EC] border-[1.5px] border-[#DBF0DD] p-7 shadow-sm flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                  {/* Photo de profil (128x128) + bouton caméra */}
                  <div className="relative size-[128px] shrink-0">
                    <div className="size-full rounded-full overflow-hidden bg-emerald-950 border-4 border-white shadow-md flex items-center justify-center text-white text-4xl font-bold">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt={displayName} className="size-full object-cover" />
                      ) : (
                        <span>{displayName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('edit');
                        setTimeout(() => fileInputRef.current?.click(), 100);
                      }}
                      className="absolute bottom-1 right-1 size-[38px] rounded-full bg-[#0B2C25] hover:bg-[#17664E] text-white flex items-center justify-center shadow-md border-2 border-white transition"
                      title="Changer la photo"
                    >
                      <Camera size={16} />
                    </button>
                  </div>

                  {/* Identité */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <h2 className="text-[26px] font-bold text-[#0B2C25] leading-none">
                        {displayName}
                      </h2>
                      <div className="size-[22px] rounded-full bg-[#17664E] text-white flex items-center justify-center shadow-xs">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    </div>

                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[14px] font-medium text-[#0B2C25]">
                      <MapPin size={16} className="text-[#17664E]" />
                      <span>{preferredLocation}</span>
                    </div>

                    {/* Pastilles de vérification */}
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap pt-1">
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                        profile?.emailVerified
                          ? 'bg-[#DBF0DD] text-[#0B2C25]'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        {profile?.emailVerified ? (
                          <Check size={12} className="text-[#17664E]" strokeWidth={2.5} />
                        ) : (
                          <AlertCircle size={12} className="text-amber-700" />
                        )}
                        <span>{profile?.emailVerified ? 'E-mail vérifié' : 'E-mail non vérifié'}</span>
                      </div>

                      <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                        profile?.phoneVerified
                          ? 'bg-[#DBF0DD] text-[#0B2C25]'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        {profile?.phoneVerified ? (
                          <Check size={12} className="text-[#17664E]" strokeWidth={2.5} />
                        ) : (
                          <AlertCircle size={12} className="text-amber-700" />
                        )}
                        <span>{profile?.phoneVerified ? 'Téléphone vérifié' : 'Téléphone non vérifié'}</span>
                      </div>

                      <div className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100/80 text-gray-700">
                        Membre depuis oct. 2026
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bouton Modifier le profil */}
                <button
                  onClick={() => setViewMode('edit')}
                  className="px-5 py-2.5 rounded-[12px] bg-[#0B2C25] hover:bg-[#17664E] text-white text-[14px] font-semibold flex items-center gap-2 transition shadow-sm shrink-0"
                >
                  <Edit3 size={16} />
                  <span>Modifier le profil</span>
                </button>
              </div>

              {/* 2. CARTE INFORMATIONS PERSONNELLES (FRAME 756:21242) */}
              <div className="w-full rounded-[24px] bg-white border-[1.5px] border-[#DBF0DD] p-7 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="size-[44px] rounded-full bg-[#FAF6ED] flex items-center justify-center text-[#0B2C25]">
                      <User size={22} />
                    </div>
                    <h3 className="text-[20px] font-semibold text-[#0B2C25]">
                      Informations personnelle
                    </h3>
                  </div>

                  <button
                    onClick={() => setViewMode('edit')}
                    className="px-4 py-2 rounded-[10px] border border-[#78847F] text-xs font-semibold text-[#0B2C25] hover:bg-gray-50 flex items-center gap-1.5 transition"
                  >
                    <Edit3 size={13} />
                    <span>Modifier</span>
                  </button>
                </div>

                {/* Grille Informations (2x2) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tuile Nom complet */}
                  <div className="p-4 rounded-[16px] bg-[#FAF6ED]/60 border border-gray-100 flex items-center gap-3.5">
                    <div className="size-[44px] rounded-full bg-white flex items-center justify-center text-[#0B2C25] shadow-xs shrink-0">
                      <User size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-[#0B2C25]/70">Nom complet</p>
                      <p className="text-[15px] font-semibold text-[#0B2C25] truncate">{displayName}</p>
                    </div>
                  </div>

                  {/* Tuile Téléphone */}
                  <div className="p-4 rounded-[16px] bg-[#FAF6ED]/60 border border-gray-100 flex items-center gap-3.5">
                    <div className="size-[44px] rounded-full bg-white flex items-center justify-center text-[#0B2C25] shadow-xs shrink-0">
                      <Phone size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#0B2C25]/70">Téléphone</p>
                        {profile?.phoneVerified && (
                          <span className="text-[10px] font-semibold text-[#17664E] flex items-center gap-0.5">
                            <Check size={10} strokeWidth={3} /> Vérifié
                          </span>
                        )}
                      </div>
                      <p className="text-[15px] font-semibold text-[#0B2C25] truncate">{displayPhone}</p>
                    </div>
                  </div>

                  {/* Tuile E-mail */}
                  <div className="p-4 rounded-[16px] bg-[#FAF6ED]/60 border border-gray-100 flex items-center gap-3.5">
                    <div className="size-[44px] rounded-full bg-white flex items-center justify-center text-[#0B2C25] shadow-xs shrink-0">
                      <Mail size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#0B2C25]/70">E-mail</p>
                        {profile?.emailVerified && (
                          <span className="text-[10px] font-semibold text-[#17664E] flex items-center gap-0.5">
                            <Check size={10} strokeWidth={3} /> Vérifié
                          </span>
                        )}
                      </div>
                      <p className="text-[15px] font-semibold text-[#0B2C25] truncate">{displayEmail}</p>
                    </div>
                  </div>

                  {/* Tuile Localisation préférée */}
                  <div className="p-4 rounded-[16px] bg-[#FAF6ED]/60 border border-gray-100 flex items-center gap-3.5">
                    <div className="size-[44px] rounded-full bg-white flex items-center justify-center text-[#0B2C25] shadow-xs shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-[#0B2C25]/70">Localisation préférée</p>
                      <p className="text-[15px] font-semibold text-[#0B2C25] truncate">{preferredLocation}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. CARTE ZONE DE RECHERCHE (FRAME 757:21306) */}
              <div className="w-full rounded-[24px] bg-white border-[1.5px] border-[#DBF0DD] p-7 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="size-[44px] rounded-full bg-[#FAF6ED] flex items-center justify-center text-[#0B2C25]">
                      <MapPin size={22} />
                    </div>
                    <h3 className="text-[20px] font-semibold text-[#0B2C25]">
                      Ma zone de recherche
                    </h3>
                  </div>

                  <button
                    onClick={() => setShowLocationModal(true)}
                    className="px-4 py-2 rounded-[10px] border border-[#78847F] text-xs font-semibold text-[#0B2C25] hover:bg-gray-50 flex items-center gap-1.5 transition"
                  >
                    <Edit3 size={13} />
                    <span>Modifier</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Mini-carte interactive / statique stylisée 210x150 */}
                  <div className="w-full sm:w-[210px] h-[140px] rounded-[16px] overflow-hidden bg-emerald-950 relative shadow-inner shrink-0 flex items-center justify-center text-white">
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#17664E_1px,transparent_1px)] [background-size:12px_12px]" />
                    <div className="relative flex flex-col items-center gap-1 z-10">
                      <div className="size-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <MapPin size={18} className="text-emerald-400" />
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-100">
                        Rayon : 5 km
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-[#0B2C25]/80">
                    <p className="text-sm font-bold text-[#0B2C25]">
                      {preferredLocation}
                    </p>
                    <p className="leading-relaxed">
                      Les offres et paniers anti-gaspillage sont automatiquement filtrés dans un rayon de 5 km autour de votre position enregistrée.
                    </p>
                    <button
                      onClick={requestCurrentPosition}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#17664E] hover:underline pt-1"
                    >
                      <Compass size={14} />
                      <span>Actualiser ma position GPS</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── COLONNE LATÉRALE (340px) ─────────────────────────────────── */}
            <div className="w-full lg:w-[340px] space-y-6 shrink-0">
              {/* 1. CARTE ACTIVITÉ (FRAME 756:21346) */}
              <div className="w-full rounded-[24px] bg-white border-[1.5px] border-[#DBF0DD] p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="size-[44px] rounded-full bg-[#FAF6ED] flex items-center justify-center text-[#0B2C25]">
                    <Calendar size={20} />
                  </div>
                  <h3 className="text-[18px] font-semibold text-[#0B2C25]">
                    Mon activité
                  </h3>
                </div>

                {/* 3 Tuiles Chiffres */}
                <div className="grid grid-cols-3 gap-2 text-center mb-6">
                  <div className="p-3 rounded-[14px] bg-[#FAF6ED]/70 border border-gray-100">
                    <p className="text-[20px] font-bold text-[#0B2C25]">12</p>
                    <p className="text-[10px] text-[#0B2C25]/70 mt-0.5 leading-tight">Réservations</p>
                  </div>

                  <div className="p-3 rounded-[14px] bg-[#FAF6ED]/70 border border-gray-100">
                    <p className="text-[20px] font-bold text-[#0B2C25]">8</p>
                    <p className="text-[10px] text-[#0B2C25]/70 mt-0.5 leading-tight">Paniers sauvés</p>
                  </div>

                  <div className="p-3 rounded-[14px] bg-[#FAF6ED]/70 border border-gray-100">
                    <p className="text-[16px] font-bold text-[#17664E] truncate">4 200 DA</p>
                    <p className="text-[10px] text-[#0B2C25]/70 mt-0.5 leading-tight">Économisés</p>
                  </div>
                </div>

                {/* Impact Note */}
                <div className="p-3 rounded-[14px] bg-[#DBF0DD]/60 border border-[#DBF0DD] text-xs text-[#0B2C25] flex items-center gap-2.5">
                  <span className="text-base">🌱</span>
                  <p className="leading-snug text-[11px] font-medium">
                    Moins de gaspillage, plus de bonnes choses.
                  </p>
                </div>
              </div>

              {/* 2. CARTE SÉCURITÉ & PARAMÈTRES (FRAME 790:32959) */}
              <div className="w-full rounded-[24px] bg-white border-[1.5px] border-[#DBF0DD] p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-[44px] rounded-full bg-[#FAF6ED] flex items-center justify-center text-[#0B2C25]">
                    <Shield size={20} />
                  </div>
                  <h3 className="text-[18px] font-semibold text-[#0B2C25]">
                    Sécurité du compte
                  </h3>
                </div>

                {/* Ligne Mot de passe */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100 text-xs">
                  <div>
                    <p className="font-semibold text-[#0B2C25]">Mot de passe</p>
                    <p className="text-[11px] text-[#0B2C25]/60">Modifié il y a 3 mois</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="text-xs font-bold text-[#17664E] hover:underline"
                  >
                    Modifier
                  </button>
                </div>

                {/* Ligne Déconnexion */}
                <div className="pt-2">
                  <button
                    onClick={() => setShowLogoutModal(true)}
                    className="w-full h-[44px] rounded-[12px] border border-[#B22222]/30 text-[#B22222] hover:bg-[#B22222]/5 text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <LogOut size={15} />
                    <span>Se déconnecter</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── MODE 2 : DESKTOP · PROFIL — MODIFIER LE PROFIL (FRAME 617:5150) ─ */
          <div className="max-w-[800px] mx-auto bg-white rounded-[24px] border-[1.5px] border-[#DBF0DD] p-8 shadow-sm">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Ligne Photo */}
              <div className="flex items-center gap-6 pb-6 border-b border-[#EBEEE1]">
                <div className="relative size-[99px] shrink-0">
                  <div className="size-full rounded-full overflow-hidden bg-emerald-950 border-3 border-white shadow-sm flex items-center justify-center text-white text-3xl font-bold">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt={fullName} className="size-full object-cover" />
                    ) : (
                      <span>{fullName ? fullName.charAt(0).toUpperCase() : 'U'}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#0B2C25]">Photo de profil</h3>
                    <p className="text-xs text-[#0B2C25]/70">JPG ou PNG, 2 Mo maximum.</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="px-4 py-2 rounded-[12px] border border-[#0B2C25] text-xs font-semibold text-[#0B2C25] hover:bg-gray-50 transition flex items-center gap-2"
                    >
                      <Camera size={14} />
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
                        className="px-4 py-2 rounded-[12px] border border-red-200 text-xs font-semibold text-[#17664E] hover:text-red-600 transition flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        <span>Supprimer</span>
                      </button>
                    )}
                  </div>

                  {avatarError && (
                    <p className="text-xs text-[#B22222] font-semibold">{avatarError}</p>
                  )}
                </div>
              </div>

              {/* Section Identité */}
              <div className="space-y-4">
                <h3 className="text-[15px] font-semibold text-[#0B2C25]">Identité</h3>

                {/* Champ Nom complet */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#0B2C25]">
                    Nom complet
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-[48px] pl-10 pr-4 rounded-[12px] border border-[#78847F] text-sm focus:outline-none focus:border-[#17664E] bg-white text-[#0B2C25]"
                      required
                    />
                    <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Champ Téléphone algérien */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#0B2C25]">
                    Numéro de téléphone
                  </label>
                  <div
                    className={`flex items-center h-[48px] rounded-[12px] border overflow-hidden ${
                      phoneError ? 'border-[#B22222] bg-[#B22222]/5' : 'border-[#78847F]'
                    }`}
                  >
                    <div className="flex items-center gap-1 px-3 bg-gray-50 border-r border-[#78847F]/40 text-xs font-semibold text-[#0B2C25] h-full shrink-0">
                      <span>🇩🇿</span>
                      <span>+213</span>
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 9);
                        setPhone(raw);
                        if (phoneError) setPhoneError(null);
                      }}
                      onBlur={() => {
                        if (phone) validatePhone(phone);
                      }}
                      placeholder="6 61 45 17 40"
                      className="w-full h-full px-3 text-sm focus:outline-none bg-transparent"
                    />
                  </div>
                  {phoneError ? (
                    <p className="text-xs text-[#B22222] font-semibold">{phoneError}</p>
                  ) : (
                    <p className="text-[11px] text-gray-400">
                      Doit comporter 9 chiffres et commencer par 5, 6 ou 7.
                    </p>
                  )}
                </div>

                {/* Champ E-mail */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#0B2C25]">
                    Adresse e-mail
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(null);
                      }}
                      className={`w-full h-[48px] pl-10 pr-4 rounded-[12px] border text-sm focus:outline-none ${
                        emailError
                          ? 'border-[#B22222] bg-[#B22222]/5 text-[#B22222]'
                          : 'border-[#78847F] text-[#0B2C25]'
                      }`}
                      required
                    />
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                  {emailError && (
                    <p className="text-xs text-[#B22222] font-semibold">{emailError}</p>
                  )}
                </div>

                {/* Champ Localisation préférée */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#0B2C25]">
                    Localisation préférée
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={preferredLocation}
                      onChange={(e) => setPreferredLocation(e.target.value)}
                      className="w-full h-[48px] pl-10 pr-4 rounded-[12px] border border-[#78847F] text-sm focus:outline-none focus:border-[#17664E] bg-white text-[#0B2C25]"
                    />
                    <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="pt-6 border-t border-[#EBEEE1] flex items-center justify-between flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => setViewMode('view')}
                  className="px-5 py-2.5 rounded-[12px] border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Annuler
                </button>

                <div className="flex items-center gap-3">
                  {hasUnsavedChanges && (
                    <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
                      <AlertCircle size={14} />
                      Modifications non enregistrées
                    </span>
                  )}

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-[12px] bg-[#0B2C25] hover:bg-[#17664E] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
                  >
                    {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Enregistrer les modifications</span>
                  </button>
                </div>
              </div>
            </form>
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
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="size-12 rounded-full bg-[#FAF6ED] text-[#0B2C25] flex items-center justify-center mb-3">
                <Phone size={22} />
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
                <span>Validité du code : <strong className="text-[#17664E]">{formatOtpTimer(otpSecondsLeft)}</strong></span>
              ) : (
                <span className="text-[#B22222] font-semibold">Le code a expiré. Demandez un nouveau code.</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirmOtp}
                disabled={isVerifyingOtp || otpSecondsLeft === 0}
                className="w-full h-11 rounded-[12px] bg-[#0B2C25] hover:bg-[#17664E] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:bg-gray-300"
              >
                {isVerifyingOtp && <RefreshCw size={14} className="animate-spin" />}
                <span>Confirmer le code</span>
              </button>

              <button
                type="button"
                onClick={handleStartPhoneVerification}
                className="w-full py-2 text-xs font-semibold text-[#17664E] hover:underline"
              >
                Renvoyer un nouveau code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE PARAMÈTRES / MOT DE PASSE (FRAME 787:22676) ──────────────── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-7 shadow-2xl relative">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-[#0B2C25] mb-1">Sécurité du compte</h3>
            <p className="text-xs text-gray-500 mb-5">Modifier votre mot de passe de connexion.</p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0B2C25] mb-1">
                  Mot de passe actuel
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-3.5 rounded-[12px] border border-gray-300 text-sm focus:outline-none focus:border-[#17664E]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B2C25] mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-3.5 rounded-[12px] border border-gray-300 text-sm focus:outline-none focus:border-[#17664E]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B2C25] mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-3.5 rounded-[12px] border border-gray-300 text-sm focus:outline-none focus:border-[#17664E]"
                  required
                />
              </div>

              {passwordError && (
                <p className="text-xs text-[#B22222] font-semibold">{passwordError}</p>
              )}

              {passwordSuccess && (
                <div className="p-2.5 rounded-[10px] bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-600" />
                  <span>Mot de passe modifié avec succès !</span>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 h-11 rounded-[12px] border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex-1 h-11 rounded-[12px] bg-[#0B2C25] hover:bg-[#17664E] text-white text-xs font-bold shadow-sm"
                >
                  {isChangingPassword ? 'Enregistrement...' : 'Mettre à jour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALE DÉCONNEXION (FRAME 787:25085) ────────────────────────────── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl relative text-center">
            <div className="size-12 rounded-full bg-red-100 text-[#B22222] mx-auto flex items-center justify-center mb-3">
              <LogOut size={22} />
            </div>
            <h3 className="text-base font-bold text-gray-900">Déconnexion</h3>
            <p className="text-xs text-gray-500 mt-1 mb-6">
              Êtes-vous sûr de vouloir vous déconnecter de votre compte FORSA ?
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 h-11 rounded-[12px] border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 h-11 rounded-[12px] bg-[#B22222] hover:bg-red-700 text-xs font-bold text-white shadow-sm"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE SÉLECTION ZONE DE RECHERCHE ─────────────────────────────── */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl relative">
            <button
              onClick={() => setShowLocationModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700"
            >
              <X size={18} />
            </button>
            <h3 className="text-base font-bold text-[#0B2C25] mb-1">Ma zone de recherche</h3>
            <p className="text-xs text-gray-500 mb-4">Sélectionnez votre commune ou wilaya :</p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {['Bab Ezzouar, Alger', 'Alger Centre, Alger', 'Hydra, Alger', 'Oran Centre, Oran', 'Constantine Ville', 'Boumerdès Centre'].map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    setPreferredLocation(loc);
                    setShowLocationModal(false);
                    setSaveSuccess(`Zone définie sur ${loc}`);
                    setTimeout(() => setSaveSuccess(null), 3000);
                  }}
                  className={`w-full p-3 rounded-[12px] border text-left text-xs font-medium flex items-center justify-between ${
                    preferredLocation === loc
                      ? 'bg-[#17664E] text-white border-[#17664E]'
                      : 'border-gray-200 hover:bg-gray-50 text-[#0B2C25]'
                  }`}
                >
                  <span>{loc}</span>
                  {preferredLocation === loc && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
