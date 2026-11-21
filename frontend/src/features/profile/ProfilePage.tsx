// frontend/src/features/profile/ProfilePage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Shield,
  KeyRound,
  MapPin,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Camera,
  Trash2,
  Save,
  RefreshCw,
  LogOut,
  X,
  CreditCard,
  ChevronRight,
  Store,
  Compass,
} from 'lucide-react';
import { UserProfile, ProfileTab } from './types';
import { ProfileCard } from './ProfileCard';
import { useLocation } from '../catalogue/context/LocationContext';

const ALGERIAN_WILAYAS = [
  { code: '16', name: 'Alger (Centre, Bab El Oued, Kouba, Hydra, etc.)', lat: 36.7725, lng: 3.0588 },
  { code: '31', name: 'Oran (El Bahia, Bir El Djir, Es Senia)', lat: 35.6987, lng: -0.6349 },
  { code: '25', name: 'Constantine (Cirta, Ali Mendjeli, El Khroub)', lat: 36.3650, lng: 6.6147 },
  { code: '35', name: 'Boumerdès (Ville, Corso, Tidjelabine, Boudouaou)', lat: 36.7642, lng: 3.4731 },
  { code: '09', name: 'Blida (Ville des Roses, Ouled Yaïch, Boufarik)', lat: 36.4700, lng: 2.8300 },
  { code: '15', name: 'Tizi Ouzou (Nouvelle Ville, Azazga, Draa Ben Khedda)', lat: 36.7118, lng: 4.0459 },
  { code: '06', name: 'Béjaïa (Cap Carbon, Ihaddaden, Akbou)', lat: 36.7558, lng: 5.0843 },
  { code: '19', name: 'Sétif (Aïn El Fouara, El Eulma)', lat: 36.1905, lng: 5.4137 },
  { code: '13', name: 'Tlemcen (Mansourah, Chetouane)', lat: 34.8783, lng: -1.3150 },
  { code: '23', name: 'Annaba (Seybouse, El Bouni)', lat: 36.9000, lng: 7.7667 },
];

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { location, setLocation, requestCurrentPosition } = useLocation();

  // State Profile
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initialProfile, setInitialProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('info');

  // Form Profile State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Avatar State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Verification Banners
  const [resendEmailSuccess, setResendEmailSuccess] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  // Phone OTP Flow State
  const [showPhoneOtpModal, setShowPhoneOtpModal] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(300); // 5 min
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(5);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Logout Modal State
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Switch Mode State
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);

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
      setFullName(user.fullName || '');
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

  // OTP Countdown timer
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

  // Check unsaved changes
  const hasUnsavedChanges =
    initialProfile !== null &&
    (fullName !== (initialProfile.fullName || '') ||
      email !== (initialProfile.email || '') ||
      phone !== (initialProfile.phone || ''));

  // Strict Phone Validation (Algerian 9 digits starting with 5, 6, 7)
  const validatePhone = (raw: string): boolean => {
    const cleaned = raw.replace(/\D/g, '');
    if (!cleaned) return true; // optional if empty, but if provided must be strictly valid
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

      // Clear success message after 4s
      setTimeout(() => setSaveSuccess(null), 4000);
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

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Le fichier est trop volumineux. La taille maximale est de 2 Mo.');
      return;
    }

    // Validate type
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
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setAvatarError(err.message || 'Erreur lors du téléversement.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Avatar Delete
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
      setTimeout(() => setSaveSuccess(null), 4000);
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
      // generic ignore
    } finally {
      setIsResendingEmail(false);
    }
  };

  // Request Phone OTP
  const handleStartPhoneVerification = async () => {
    const token = localStorage.getItem('forsa_access_token');
    if (!token) return;

    if (!phone) {
      setPhoneError('Veuillez d\'abord enregistrer un numéro de téléphone.');
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
      // handled in backend
    }
  };

  // Handle OTP digit change
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

  // Confirm Phone OTP
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
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err: any) {
      setPasswordError(err.message || 'Échec du changement de mot de passe.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Switch Mode (Client <-> Commerçant)
  const handleSwitchMode = async () => {
    const token = localStorage.getItem('forsa_access_token');
    if (!token) return;

    setIsSwitchingMode(true);
    try {
      const res = await fetch('/api/users/me/switch-mode', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Échec du changement de mode.');

      if (data.accessToken) {
        localStorage.setItem('forsa_access_token', data.accessToken);
        if (data.refreshToken) localStorage.setItem('forsa_refresh_token', data.refreshToken);
        localStorage.setItem('forsa_user', JSON.stringify(data.user));
      }

      setProfile(data.user);
      setSaveSuccess(data.message);
      setTimeout(() => setSaveSuccess(null), 3000);

      // Redirect if switched to merchant
      if (data.user.role === 'MERCHANT') {
        navigate('/merchant/dashboard');
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Erreur lors du changement de mode.');
    } finally {
      setIsSwitchingMode(false);
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
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm font-medium text-[#0B2C25]">Chargement de votre profil FORSA...</p>
        </div>
      </div>
    );
  }

  const isSuspended = profile?.status === 'SUSPENDED';
  const isProfileIncomplete = !profile?.fullName || !profile?.phone;
  const isMerchant = profile?.role === 'MERCHANT';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 font-poppins text-[#0B2C25]">
      {/* ── TOP HERO BANNER: User Overview & Mode Switch ────────────────────── */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#0B2C25] to-[#17664E] text-white p-6 sm:p-8 shadow-xl shadow-emerald-950/10 mb-6">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Avatar with Camera Trigger */}
            <div className="relative group shrink-0">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden bg-emerald-900 border-4 border-white/20 shadow-md flex items-center justify-center text-white text-3xl font-bold">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{fullName ? fullName.charAt(0).toUpperCase() : 'U'}</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#0B2C25] flex items-center justify-center shadow-lg transition transform hover:scale-105"
                title="Modifier ma photo"
              >
                {isUploadingAvatar ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Camera size={15} />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {fullName || 'Mon Profil'}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  isMerchant 
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' 
                    : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                }`}>
                  {isMerchant ? 'Commerçant Partenaire' : 'Client Solidaire'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/80 mt-1">
                {email} • {phone ? `+213 ${phone}` : 'Téléphone non renseigné'}
              </p>
              <p className="text-[11px] text-emerald-200/60 mt-0.5">
                Membre depuis le {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('fr-FR') : '2026'}
              </p>
            </div>
          </div>

          {/* Action: Switch Mode & Logout */}
          <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
            <button
              onClick={handleSwitchMode}
              disabled={isSwitchingMode}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/20 flex items-center gap-2 transition"
            >
              {isSwitchingMode ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : isMerchant ? (
                <User size={14} />
              ) : (
                <Store size={14} />
              )}
              <span>{isMerchant ? 'Passer en Mode Client' : 'Passer en Mode Commerçant'}</span>
            </button>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-[#B22222]/80 text-white text-xs transition border border-white/20"
              title="Se déconnecter"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {avatarError && (
          <div className="mt-4 p-3 rounded-xl bg-[#B22222]/90 text-white text-xs flex items-center justify-between">
            <span>{avatarError}</span>
            <button onClick={() => setAvatarError(null)}><X size={14} /></button>
          </div>
        )}
      </div>

      {/* ── SECTION B: LES 4 ÉTATS CRITIQUES (FRAMES FIGMA SECTION B) ─────── */}
      <div className="space-y-3 mb-6">
        {/* 1. Compte Suspendu */}
        {isSuspended && (
          <div className="p-4 rounded-2xl bg-[#B22222]/10 border border-[#B22222] text-[#B22222] flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="block font-bold text-sm">Compte suspendu par l'administration</strong>
              Votre compte a été restreint suite à un signalement ou un manquement au règlement FORSA. Vous ne pouvez plus passer de commande. Contactez le support à support@forsa.dz pour régulariser votre statut.
            </div>
          </div>
        )}

        {/* 2. Email Non Vérifié */}
        {!profile?.emailVerified && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 flex-wrap">
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
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition shrink-0"
            >
              {isResendingEmail ? 'Envoi...' : 'Renvoyer le lien'}
            </button>
          </div>
        )}

        {resendEmailSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>Un nouveau lien de confirmation a été envoyé à votre adresse e-mail.</span>
          </div>
        )}

        {/* 3. Téléphone Non Vérifié */}
        {!profile?.phoneVerified && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-sm">Numéro de téléphone non vérifié</span>
                Vérifiez votre numéro algérien par code SMS / Telegram pour recevoir vos codes de retrait.
              </div>
            </div>
            <button
              onClick={handleStartPhoneVerification}
              className="px-3.5 py-1.5 rounded-lg bg-[#0B2C25] hover:bg-[#17664E] text-white text-xs font-semibold transition shrink-0"
            >
              Vérifier mon numéro
            </button>
          </div>
        )}

        {/* 4. Profil Incomplet */}
        {isProfileIncomplete && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-blue-600 shrink-0" />
            <span>Votre profil est incomplet. Renseignez votre nom et numéro de téléphone pour une meilleure expérience.</span>
          </div>
        )}

        {/* Notification Toast Confirmation d'enregistrement */}
        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg transition animate-fade-in">
            <CheckCircle2 size={16} />
            <span>{saveSuccess}</span>
          </div>
        )}

        {/* General Error */}
        {generalError && (
          <div className="p-3.5 rounded-xl bg-[#B22222] text-white text-xs font-semibold flex items-center justify-between shadow-lg">
            <span>{generalError}</span>
            <button onClick={() => setGeneralError(null)}><X size={14} /></button>
          </div>
        )}
      </div>

      {/* ── NAVIGATION PAR ONGLETS (RESPONSIVE PC & MOBILE) ─────────────────── */}
      <div className="flex items-center gap-2 border-b border-gray-200 mb-6 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'info'
              ? 'bg-[#0B2C25] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <User size={15} />
          <span>Mes Coordonnées</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'security'
              ? 'bg-[#0B2C25] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Shield size={15} />
          <span>Sécurité & Mot de passe</span>
        </button>

        <button
          onClick={() => setActiveTab('location')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'location'
              ? 'bg-[#0B2C25] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <MapPin size={15} />
          <span>Ma Localisation</span>
        </button>

        <button
          onClick={() => setActiveTab('card')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'card'
              ? 'bg-[#0B2C25] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <CreditCard size={15} />
          <span>Carte Profil (388×185)</span>
        </button>
      </div>

      {/* ── TAB 1 : MES COORDONNÉES (SECTION B) ────────────────────────────── */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-[28px] border border-gray-100 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Modifier mon profil</h2>
              <p className="text-xs text-gray-500">Mettez à jour vos informations de contact.</p>
            </div>
            {hasUnsavedChanges && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                <AlertCircle size={13} />
                Modifications non enregistrées
              </span>
            )}
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-5">
            {/* Nom Complet */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Nom complet
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Hiba Hambli"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                  required
                />
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
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
                  className={`w-full h-12 pl-10 pr-4 rounded-xl border text-sm focus:outline-none transition ${
                    emailError
                      ? 'border-[#B22222] bg-[#B22222]/5 text-[#B22222]'
                      : 'border-gray-200 bg-gray-50/50 focus:border-emerald-600 focus:bg-white'
                  }`}
                  required
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
              {emailError ? (
                <p className="text-xs text-[#B22222] font-medium mt-1">{emailError}</p>
              ) : (
                <p className="text-[11px] text-gray-400 mt-1">
                  Si vous modifiez votre e-mail, un nouveau lien de confirmation vous sera envoyé.
                </p>
              )}
            </div>

            {/* Numéro de Téléphone Algérien */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  Numéro de téléphone algérien
                </label>
                {profile?.phoneVerified ? (
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Numéro confirmé
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartPhoneVerification}
                    className="text-[11px] text-amber-600 font-semibold hover:underline"
                  >
                    Vérifier maintenant
                  </button>
                )}
              </div>

              <div
                className={`flex items-center h-12 rounded-xl border bg-gray-50/50 overflow-hidden transition ${
                  phoneError
                    ? 'border-[#B22222] bg-[#B22222]/5'
                    : 'border-gray-200 focus-within:border-emerald-600 focus-within:bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5 px-3 bg-gray-100/70 border-r border-gray-200 text-xs font-semibold text-gray-600 shrink-0 h-full">
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
                <p className="text-xs text-[#B22222] font-medium mt-1">{phoneError}</p>
              ) : (
                <p className="text-[11px] text-gray-400 mt-1">
                  Doit comporter 9 chiffres et commencer par 5, 6 ou 7.
                </p>
              )}
            </div>

            {/* Photo Avatar Action Buttons */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 hover:border-emerald-500 text-xs font-semibold text-gray-700 hover:text-emerald-700 transition flex items-center gap-1.5"
                >
                  <Camera size={14} />
                  <span>Changer la photo</span>
                </button>

                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleDeleteAvatar}
                    className="px-3 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition flex items-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    <span>Supprimer</span>
                  </button>
                )}
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={isSaving || !hasUnsavedChanges}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 shadow-sm ${
                  hasUnsavedChanges
                    ? 'bg-[#0B2C25] hover:bg-[#17664E]'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Enregistrer les modifications</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 2 : SÉCURITÉ & MOT DE PASSE (SECTION C) ────────────────────── */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[28px] border border-gray-100 p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Modifier le mot de passe</h2>
            <p className="text-xs text-gray-500 mb-6">
              Assurez la sécurité de votre compte avec un mot de passe robuste.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                    required
                  />
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                    required
                  />
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Confirmer le nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                    required
                  />
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Password Strength Checklist */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-1.5">
                <span className="font-semibold text-gray-700 block mb-1">Règles de sécurité :</span>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={14}
                    className={newPassword.length >= 8 ? 'text-emerald-600' : 'text-gray-300'}
                  />
                  <span className={newPassword.length >= 8 ? 'text-emerald-800' : 'text-gray-500'}>
                    Au moins 8 caractères
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={14}
                    className={/[A-Z]/.test(newPassword) ? 'text-emerald-600' : 'text-gray-300'}
                  />
                  <span className={/[A-Z]/.test(newPassword) ? 'text-emerald-800' : 'text-gray-500'}>
                    Au moins une lettre majuscule (A-Z)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={14}
                    className={/[0-9]/.test(newPassword) ? 'text-emerald-600' : 'text-gray-300'}
                  />
                  <span className={/[0-9]/.test(newPassword) ? 'text-emerald-800' : 'text-gray-500'}>
                    Au moins un chiffre (0-9)
                  </span>
                </div>
              </div>

              {passwordError && (
                <p className="text-xs text-[#B22222] font-semibold">{passwordError}</p>
              )}

              {passwordSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Mot de passe modifié avec succès !</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-6 py-2.5 rounded-xl bg-[#0B2C25] hover:bg-[#17664E] text-xs font-bold text-white transition flex items-center gap-2"
              >
                {isChangingPassword ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Mettre à jour le mot de passe</span>
              </button>
            </form>
          </div>

          {/* Danger Zone: Déconnexion */}
          <div className="bg-white rounded-[28px] border border-gray-100 p-6 sm:p-8 shadow-sm flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Session & Déconnexion</h3>
              <p className="text-xs text-gray-500">Mettez fin à votre session active sur cet appareil.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="px-4 py-2 rounded-xl border border-[#B22222] text-[#B22222] hover:bg-[#B22222]/5 text-xs font-bold transition flex items-center gap-1.5"
            >
              <LogOut size={14} />
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 3 : LOCALISATION & PRÉFÉRENCES (SECTION C) ─────────────────── */}
      {activeTab === 'location' && (
        <div className="bg-white rounded-[28px] border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Ma Localisation Préférée</h2>
            <p className="text-xs text-gray-500">
              Définissez votre zone par défaut pour filtrer les commerces et offres à proximité.
            </p>
          </div>

          {/* Current Location Badge */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <MapPin size={20} />
              </div>
              <div>
                <span className="text-xs text-emerald-800 font-semibold block">Position active :</span>
                <strong className="text-sm text-emerald-950 font-bold">{location.label}</strong>
              </div>
            </div>

            <button
              onClick={requestCurrentPosition}
              className="px-3.5 py-2 rounded-xl bg-[#0B2C25] hover:bg-[#17664E] text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <Compass size={14} />
              <span>Actualiser ma position GPS</span>
            </button>
          </div>

          {/* Wilaya Selection Grid */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
              Sélectionner une Wilaya :
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ALGERIAN_WILAYAS.map((w) => {
                const isSelected = location.label.startsWith(w.name.split(' ')[0]);
                return (
                  <button
                    key={w.code}
                    onClick={() => {
                      setLocation({ lat: w.lat, lng: w.lng, label: `${w.name}` });
                      setSaveSuccess(`Localisation définie sur ${w.name.split(' ')[0]}.`);
                      setTimeout(() => setSaveSuccess(null), 3000);
                    }}
                    className={`p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold'
                        : 'bg-gray-50/70 border-gray-200 text-gray-800 hover:bg-emerald-50 hover:border-emerald-200'
                    }`}
                  >
                    <div>
                      <span className="font-bold block">{w.name}</span>
                      <span className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-gray-400'}`}>
                        Wilaya {w.code}
                      </span>
                    </div>
                    {isSelected && <CheckCircle2 size={16} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4 : CARTE PROFIL (388 × 185) (SECTION C) ───────────────────── */}
      {activeTab === 'card' && (
        <div className="bg-white rounded-[28px] border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Composant « Carte Profil »</h2>
            <p className="text-xs text-gray-500">
              Composant officiel Figma (388 × 185 px) servant de badge numérique d'identité FORSA.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center">
            {profile && <ProfileCard user={profile} />}
            <span className="text-[11px] text-gray-400 mt-4 font-mono">
              Dimensions conformes Figma : 388 × 185 px
            </span>
          </div>
        </div>
      )}

      {/* ── MODALE VALIDATION OTP TÉLÉPHONE (SECTION B & D) ────────────────── */}
      {showPhoneOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 sm:p-8 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setShowPhoneOtpModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <Phone size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Vérification du téléphone</h3>
              <p className="text-xs text-gray-500 mt-1">
                Saisissez le code à 6 chiffres envoyé au <strong>+213 {phone}</strong>
              </p>
            </div>

            {/* 6 OTP BOXES */}
            <div className="flex justify-center gap-2 sm:gap-3 mb-4">
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
                  className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-xl font-bold rounded-xl border transition focus:outline-none ${
                    otpError
                      ? 'border-[#B22222] bg-[#B22222]/5 text-[#B22222]'
                      : 'border-gray-200 bg-gray-50 focus:border-emerald-600 focus:bg-white text-gray-900'
                  }`}
                />
              ))}
            </div>

            {/* Error state with remaining attempts */}
            {otpError && (
              <p className="text-xs text-[#B22222] font-semibold text-center mb-3">
                {otpError}
              </p>
            )}

            {/* Countdown timer */}
            <div className="text-center text-xs mb-6">
              {otpSecondsLeft > 0 ? (
                <span className="text-gray-500 font-medium">
                  Validité du code : <strong className="text-emerald-700">{formatOtpTimer(otpSecondsLeft)}</strong>
                </span>
              ) : (
                <span className="text-[#B22222] font-semibold block">
                  Le code a expiré. Veuillez en demander un nouveau.
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirmOtp}
                disabled={isVerifyingOtp || otpSecondsLeft === 0}
                className="w-full h-12 rounded-xl bg-[#0B2C25] hover:bg-[#17664E] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:bg-gray-300"
              >
                {isVerifyingOtp ? <RefreshCw size={14} className="animate-spin" /> : null}
                <span>Confirmer le code</span>
              </button>

              <button
                type="button"
                onClick={handleStartPhoneVerification}
                className="w-full py-2.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
              >
                Renvoyer un nouveau code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE CONFIRMATION DE DÉCONNEXION (SECTION C) ────────────────── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl relative animate-scale-up text-center">
            <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-3">
              <LogOut size={22} />
            </div>
            <h3 className="text-base font-bold text-gray-900">Déconnexion</h3>
            <p className="text-xs text-gray-500 mt-1 mb-6">
              Êtes-vous sûr de vouloir vous déconnecter de votre compte FORSA ?
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 h-11 rounded-xl bg-[#B22222] hover:bg-red-700 text-xs font-bold text-white transition shadow-sm"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
