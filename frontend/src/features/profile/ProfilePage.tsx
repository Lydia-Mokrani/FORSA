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
  figmaMultiplicationSign,
  figmaAlertCircle,
  figmaRefresh,
} from './figmaAssets';

export const extractAlgerianMobile9 = (raw: string | null | undefined): string => {
  if (!raw) return '';
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('213') && d.length >= 11) d = d.slice(3);
  if (d.startsWith('0') && d.length === 10) d = d.slice(1);
  return d.slice(0, 9);
};

export const formatAlgerianMobileDisplay = (raw: string | null | undefined): string => {
  const d = extractAlgerianMobile9(raw);
  if (!d) return '';
  if (d.length <= 1) return d;
  if (d.length <= 3) return `${d.slice(0, 1)} ${d.slice(1)}`;
  if (d.length <= 5) return `${d.slice(0, 1)} ${d.slice(1, 3)} ${d.slice(3)}`;
  if (d.length <= 7) return `${d.slice(0, 1)} ${d.slice(1, 3)} ${d.slice(3, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 1)} ${d.slice(1, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
};

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

  // Phone OTP & Telegram Flow State
  const [showPhoneOtpModal, setShowPhoneOtpModal] = useState(false);
  const [modalPhoneInput, setModalPhoneInput] = useState('');
  const [telegramLink, setTelegramLink] = useState('https://t.me/forsa_auth_bot');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(300); // 5 minutes
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(5);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [telegramSuccess, setTelegramSuccess] = useState(false);
  const [telegramMismatch, setTelegramMismatch] = useState(false);
  const [mismatchPhone, setMismatchPhone] = useState('');
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
      // S'il n'a pas de téléphone (ex: compte Google), la case reste vide
      const cleanPhone = extractAlgerianMobile9(user.phone);
      setPhone(cleanPhone);
      setModalPhoneInput(cleanPhone);
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
    if (!showPhoneOtpModal || !otpSent) return;
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
  }, [showPhoneOtpModal, otpSent]);

  // Polling pour détecter la transmission du code sur Telegram ou un numéro discordant
  const [telegramCodeSent, setTelegramCodeSent] = useState(false);

  useEffect(() => {
    if (!showPhoneOtpModal) return;
    const token =
      localStorage.getItem('forsa_access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('forsa_auth_token');
    if (!token) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/users/verify-phone/status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.phoneVerified) {
            setTelegramSuccess(true);
            const verifiedPhone = data.phone || modalPhoneInput || profile?.phone || null;
            if (profile) {
              const updated = { ...profile, phone: verifiedPhone, phoneVerified: true };
              setProfile(updated);
              localStorage.setItem('forsa_user', JSON.stringify(updated));
            }
            setTimeout(() => {
              setShowPhoneOtpModal(false);
              setTelegramSuccess(false);
              setSaveSuccess('Numéro de téléphone vérifié avec succès via Telegram !');
              setTimeout(() => setSaveSuccess(null), 4000);
            }, 1800);
            return;
          }
          if (data.telegramSent) {
            setTelegramCodeSent(true);
          }
          if (data.telegramMismatch) {
            setTelegramMismatch(true);
            setMismatchPhone(data.mismatchPhone || '');
            setOtpError(`Numéro Telegram (${data.mismatchPhone || ''}) non concordant avec le numéro saisi sur FORSA.`);
          }
        }
      } catch {
        // silencieux
      }
    }, 2000);

    return () => clearInterval(poll);
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
    const cleaned = extractAlgerianMobile9(raw);
    if (!cleaned) return true;
    const isValid = cleaned.length === 9 && /^[567]/.test(cleaned);
    if (!isValid) {
      setPhoneError('Numéro de téléphone incorrect. Il doit comporter 9 chiffres et commencer par 5, 6 ou 7 (ex: 6 97 93 76 37).');
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
          phone: phone ? extractAlgerianMobile9(phone) : undefined,
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

  // Lancement du flux de vérification Téléphone (Telegram Bot + SMS)
  const handleStartPhoneVerification = async () => {
    const targetPhone = extractAlgerianMobile9(modalPhoneInput || phone || profile?.phone);
    if (!targetPhone) {
      // Ouvrir la modal en mode saisie de numéro
      setShowPhoneOtpModal(true);
      setOtpSent(false);
      return;
    }

    if (!validatePhone(targetPhone)) {
      setShowPhoneOtpModal(true);
      setOtpSent(false);
      return;
    }

    setShowPhoneOtpModal(true);
    setIsSendingOtp(true);
    setOtpError(null);
    setTelegramSuccess(false);

    const token =
      localStorage.getItem('forsa_access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('forsa_auth_token');
    if (!token) return;

    try {
      const res = await fetch('/api/users/verify-phone/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: targetPhone }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errCode = data?.error?.code || data?.code;
        if (errCode === 'PHONE_ALREADY_VERIFIED') {
          if (profile) {
            const updated = { ...profile, phoneVerified: true };
            setProfile(updated);
            localStorage.setItem('forsa_user', JSON.stringify(updated));
          }
          setShowPhoneOtpModal(false);
          setSaveSuccess('Ce numéro est déjà vérifié !');
          return;
        }
        if (errCode === 'PHONE_CONFLICT') {
          throw new Error('Ce numéro de téléphone est déjà associé à un autre compte FORSA.');
        }
        throw new Error(data?.error?.message || data?.message || 'Impossible d’envoyer le code.');
      }

      setOtpSent(true);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpSecondsLeft(data.expiresInSeconds || 300);
      setOtpAttemptsLeft(5);
      if (data.telegramLink) {
        setTelegramLink(data.telegramLink);
      }
    } catch (err: any) {
      setOtpError(err.message || 'Erreur lors de la demande de vérification.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const submitOtpCode = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6) {
      setOtpError('Veuillez saisir les 6 chiffres du code.');
      return;
    }

    const token =
      localStorage.getItem('forsa_access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('forsa_auth_token');
    if (!token) return;

    setIsVerifyingOtp(true);
    setOtpError(null);
    try {
      const res = await fetch('/api/users/verify-phone/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: codeToVerify }),
      });

      const data = await res.json();

      if (!res.ok) {
        const remaining = data?.error?.details?.[0]?.attemptsLeft ?? otpAttemptsLeft - 1;
        setOtpAttemptsLeft(Math.max(0, remaining));
        setOtpError(`Code incorrect. Il vous reste ${Math.max(0, remaining)} essai(s).`);
        return;
      }

      setTelegramSuccess(true);
      const verifiedPhone = modalPhoneInput || profile?.phone || null;
      if (profile) {
        const updated = {
          ...profile,
          phone: verifiedPhone,
          phoneVerified: true,
        };
        setProfile(updated);
        localStorage.setItem('forsa_user', JSON.stringify(updated));
      }

      setTimeout(() => {
        setShowPhoneOtpModal(false);
        setTelegramSuccess(false);
        setSaveSuccess('Numéro de téléphone vérifié avec succès !');
        setTimeout(() => setSaveSuccess(null), 4000);
      }, 1600);
    } catch (err: any) {
      setOtpError(err.message || 'Erreur lors de la validation du code.');
    } finally {
      setIsVerifyingOtp(false);
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

    // Auto-soumission dès que les 6 chiffres sont saisis
    if (cleaned && nextDigits.every((d) => d !== '')) {
      submitOtpCode(nextDigits.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (otpError) setOtpError(null);
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const nextDigits = ['', '', '', '', '', ''];
    pasted.split('').forEach((d, i) => {
      if (i < 6) nextDigits[i] = d;
    });
    setOtpDigits(nextDigits);
    const targetIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[targetIdx]?.focus();

    // Auto-soumission immédiate si 6 chiffres collés
    if (pasted.length === 6) {
      submitOtpCode(pasted);
    }
  };

  const handleConfirmOtp = () => {
    submitOtpCode(otpDigits.join(''));
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
  const hasPhone = Boolean(profile?.phone && profile.phone.trim().length > 0);
  const isPhoneVerified = Boolean(profile?.phoneVerified && hasPhone);
  const isEmailVerified = Boolean(profile?.emailVerified);
  const isProfileIncomplete = !profile?.fullName || !hasPhone;

  const displayName = profile?.fullName || 'Lydia Benali';
  const displayEmail = profile?.email || '';
  const displayPhone = hasPhone ? `+213 ${formatAlgerianMobileDisplay(profile!.phone)}` : '';
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

          {/* État E-mail non vérifié (Figma Frame 785:20789 - Bannière Vérifiez votre adresse e-mail) */}
          {!isEmailVerified && (
            <div className="bg-[#fdf3d8] border-[1.5px] border-[#dbf0dd] rounded-[20px] p-[18px] flex items-center justify-between gap-4 w-full flex-wrap">
              <div className="flex items-center gap-[16px]">
                <div className="size-[44px] rounded-full bg-[#edbd4d] flex items-center justify-center shrink-0">
                  <img src={figmaAlertCircle} alt="" className="size-[22px] text-[#0b2c25]" />
                </div>
                <div className="flex flex-col gap-[3px] text-[#0b2c25]">
                  <p className="font-semibold text-[15px]">Vérifiez votre adresse e-mail</p>
                  <p className="text-[12px] opacity-80">
                    Un lien d'activation a été envoyé à <strong>{profile?.email}</strong>. Cliquez dessus pour valider votre compte.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={isResendingEmail}
                  className="h-[44px] px-5 bg-[#0b2c25] hover:bg-[#17664e] text-white text-[14px] font-semibold rounded-[12px] transition"
                >
                  {isResendingEmail ? 'Envoi...' : 'Renvoyer l’e-mail'}
                </button>
              </div>
            </div>
          )}

          {resendEmailSuccess && (
            <div className="p-3.5 rounded-[12px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <img src={figmaTickPill} alt="" className="size-4" />
              <span>Lien de confirmation renvoyé avec succès à votre adresse e-mail.</span>
            </div>
          )}

          {/* État Téléphone non vérifié (Bannière d'alerte contextuelle) */}
          {!isPhoneVerified && (
            <div className="bg-[#fdf3d8] border-[1.5px] border-[#dbf0dd] rounded-[20px] p-[18px] flex items-center justify-between gap-4 w-full flex-wrap">
              <div className="flex items-center gap-[16px]">
                <div className="size-[44px] rounded-full bg-[#edbd4d] flex items-center justify-center shrink-0">
                  <img src={figmaAlertCircle} alt="" className="size-[22px] text-[#0b2c25]" />
                </div>
                <div className="flex flex-col gap-[3px] text-[#0b2c25]">
                  <p className="font-semibold text-[15px]">
                    {hasPhone ? 'Confirmez votre numéro de téléphone' : 'Ajoutez un numéro de téléphone'}
                  </p>
                  <p className="text-[12px] opacity-80">
                    {hasPhone
                      ? `Pour sécuriser votre compte, saisissez le code reçu par SMS ou Telegram au +213 ${formatAlgerianMobileDisplay(profile?.phone)}.`
                      : 'Pour sécuriser votre compte et finaliser vos réservations, renseignez votre numéro de téléphone.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-[10px] shrink-0">
                {hasPhone ? (
                  <>
                    <button
                      type="button"
                      onClick={handleStartPhoneVerification}
                      className="h-[44px] px-[20px] bg-[#0b2c25] hover:bg-[#17664e] text-white text-[14px] font-semibold rounded-[12px] flex items-center gap-2 transition cursor-pointer"
                    >
                      <img src={figmaSmartPhone} alt="" className="size-[18px] brightness-0 invert" />
                      <span>Valider le numéro</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('edit');
                        setModalPhoneInput(phone);
                      }}
                      className="h-[44px] px-[20px] border border-[#0b2c25] text-[#0b2c25] hover:bg-[#0b2c25]/5 text-[14px] font-semibold rounded-[12px] transition cursor-pointer"
                    >
                      Modifier
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('edit');
                    }}
                    className="h-[44px] px-[20px] bg-[#0b2c25] hover:bg-[#17664e] text-white text-[14px] font-semibold rounded-[12px] flex items-center gap-2 transition cursor-pointer"
                  >
                    <span>+ Ajouter un numéro</span>
                  </button>
                )}
              </div>
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
                      {/* E-mail vérifié / non vérifié */}
                      <div className={`${isEmailVerified ? 'bg-[#dbf0dd] text-[#17664e]' : 'bg-amber-100 text-amber-900 border border-amber-300'} flex items-center gap-[6px] pl-[10px] pr-[12px] py-[5px] rounded-[100px] shrink-0`}>
                        {isEmailVerified ? (
                          <img src={figmaTickPill} alt="" className="size-[14px] shrink-0" />
                        ) : (
                          <img src={figmaMultiplicationSign} alt="" className="size-[10px] shrink-0 text-amber-800" />
                        )}
                        <span className="text-[12px] font-semibold">
                          {isEmailVerified ? 'E-mail vérifié' : 'E-mail non vérifié'}
                        </span>
                      </div>

                      {/* Téléphone vérifié / non vérifié */}
                      <div className={`${isPhoneVerified ? 'bg-[#dbf0dd] text-[#17664e]' : 'bg-red-100 text-[#b22222] border border-red-300'} flex items-center gap-[6px] pl-[10px] pr-[12px] py-[5px] rounded-[100px] shrink-0`}>
                        {isPhoneVerified ? (
                          <img src={figmaTickPill} alt="" className="size-[14px] shrink-0" />
                        ) : (
                          <img src={figmaMultiplicationSign} alt="" className="size-[10px] shrink-0 text-[#b22222]" />
                        )}
                        <span className="text-[12px] font-semibold">
                          {isPhoneVerified
                            ? 'Téléphone vérifié'
                            : hasPhone
                            ? 'Téléphone non vérifié'
                            : 'Téléphone non renseigné'}
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
                      <div className="flex flex-col gap-[4px] min-w-0 flex-1">
                        {/* Ligne 1 : Titre + Badge d'état sobre */}
                        <div className="flex items-center justify-between gap-[8px]">
                          <p className="text-[11px] font-normal text-[#0b2c25]/70">Téléphone</p>
                          {isPhoneVerified ? (
                            <div className="bg-[#dbf0dd] flex items-center gap-[3px] px-[8px] py-[2px] rounded-full">
                              <img src={figmaTickSmall} alt="" className="size-[11px]" />
                              <span className="text-[10px] font-semibold text-[#17664e]">Vérifié</span>
                            </div>
                          ) : hasPhone ? (
                            <div className="bg-amber-50 border border-amber-200 flex items-center gap-[3px] px-[8px] py-[2px] rounded-full">
                              <span className="text-[10px] font-semibold text-amber-800">Non vérifié</span>
                            </div>
                          ) : (
                            <div className="bg-[#ebeee1]/70 flex items-center gap-[3px] px-[8px] py-[2px] rounded-full">
                              <span className="text-[10px] font-medium text-[#78847f]">Non renseigné</span>
                            </div>
                          )}
                        </div>

                        {/* Ligne 2 : Numéro affiché + Bouton d'action épuré */}
                        <div className="flex items-center justify-between gap-[8px]">
                          <p className="text-[14px] font-semibold text-[#0b2c25] truncate">
                            {hasPhone ? displayPhone : (
                              <span className="text-[#0b2c25]/45 italic font-normal text-[13px]">
                                Aucun numéro associé
                              </span>
                            )}
                          </p>

                          {isPhoneVerified ? (
                            <button
                              type="button"
                              onClick={() => {
                                setViewMode('edit');
                              }}
                              className="text-[11px] font-semibold text-[#0b2c25]/70 hover:text-[#0b2c25] hover:underline transition cursor-pointer"
                            >
                              Modifier
                            </button>
                          ) : hasPhone ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleStartPhoneVerification}
                                className="bg-[#0b2c25] hover:bg-[#17664e] text-white text-[11px] font-semibold px-2.5 py-1 rounded-[8px] transition cursor-pointer shadow-xs"
                              >
                                Vérifier
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setViewMode('edit');
                                }}
                                className="text-[11px] font-semibold text-[#0b2c25]/70 hover:text-[#0b2c25] hover:underline transition cursor-pointer"
                              >
                                Modifier
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setViewMode('edit');
                              }}
                              className="bg-[#0b2c25] hover:bg-[#17664e] text-white text-[11px] font-semibold px-3 py-1 rounded-[8px] transition cursor-pointer shadow-xs"
                            >
                              + Ajouter
                            </button>
                          )}
                        </div>
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
                        <div className="flex items-center justify-between gap-[8px]">
                          <p className="text-[11px] font-normal text-[#0b2c25]">E-mail</p>
                          {isEmailVerified ? (
                            <div className="bg-[#dbf0dd] flex items-center gap-[3px] pl-[5px] pr-[7px] py-[2px] rounded-[100px]">
                              <img src={figmaTickSmall} alt="" className="size-[11px]" />
                              <span className="text-[10px] font-semibold text-[#17664e]">Vérifié</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResendEmail}
                              className="bg-amber-100 hover:bg-amber-200 border border-amber-300 flex items-center gap-[3px] pl-[6px] pr-[8px] py-[2px] rounded-[100px] cursor-pointer transition"
                            >
                              <img src={figmaMultiplicationSign} alt="" className="size-[9px] shrink-0 text-amber-800" />
                              <span className="text-[10px] font-semibold text-amber-800">Non vérifié · Valider</span>
                            </button>
                          )}
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
                    {isEmailVerified ? (
                      <div className="bg-[#dbf0dd] flex items-center gap-[3px] pl-[6px] pr-[8px] py-[3px] rounded-[100px] shrink-0">
                        <img src={figmaTickVerified} alt="" className="size-[12px]" />
                        <span className="text-[10px] font-semibold text-[#17664e]">Vérifié</span>
                      </div>
                    ) : (
                      <div className="bg-amber-100 border border-amber-300 flex items-center gap-[3px] pl-[6px] pr-[8px] py-[3px] rounded-[100px] shrink-0">
                        <img src={figmaMultiplicationSign} alt="" className="size-[9px] shrink-0 text-amber-800" />
                        <span className="text-[10px] font-semibold text-amber-800">Non vérifié</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setNewEmailInput(email);
                        setShowEmailModal(true);
                      }}
                      className="text-[12px] font-semibold text-[#17664e] hover:underline shrink-0 cursor-pointer"
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
                  <div className={`w-full h-[48px] bg-[#fffaf0] border-[1.5px] ${phoneError ? 'border-[#b22222]' : 'border-[#78847f]'} rounded-[12px] px-[14px] flex items-center gap-[10px]`}>
                    <img src={figmaPhoneInput} alt="" className="size-[18px] shrink-0" />
                    <span className="text-xs font-semibold text-[#0b2c25]/80 select-none">🇩🇿 +213</span>
                    <input
                      type="tel"
                      value={formatAlgerianMobileDisplay(phone)}
                      onChange={(e) => {
                        const raw = extractAlgerianMobile9(e.target.value);
                        setPhone(raw);
                        setModalPhoneInput(raw);
                        if (phoneError) setPhoneError(null);
                      }}
                      placeholder="6 97 93 76 37"
                      className="flex-1 h-full text-[14px] font-medium text-[#0b2c25] focus:outline-none bg-transparent"
                    />

                    {/* Badge vérifié ou badge non vérifié si un numéro est saisi */}
                    {isPhoneVerified && phone === extractAlgerianMobile9(profile?.phone) ? (
                      <div className="bg-[#dbf0dd] flex items-center gap-[3px] pl-[6px] pr-[8px] py-[3px] rounded-[100px] shrink-0">
                        <img src={figmaTickVerified} alt="" className="size-[12px]" />
                        <span className="text-[10px] font-semibold text-[#17664e]">Vérifié</span>
                      </div>
                    ) : phone ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="bg-amber-50 border border-amber-300 flex items-center gap-[3px] pl-[6px] pr-[8px] py-[3px] rounded-[100px]">
                          <span className="text-[10px] font-semibold text-amber-800">Non vérifié</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleStartPhoneVerification}
                          className="text-[12px] font-semibold text-[#17664e] hover:underline cursor-pointer"
                        >
                          Vérifier
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {phoneError ? (
                    <p className="text-[11px] text-[#b22222] font-semibold">{phoneError}</p>
                  ) : (
                    <p className="text-[11px] font-normal text-[#0b2c25]/70">
                      Doit comporter 9 chiffres et commencer par 5, 6 ou 7 (ex: 6 61 45 17 40).
                    </p>
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
                      className="text-[12px] font-semibold text-[#17664e] hover:underline shrink-0 cursor-pointer"
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
                      className="text-[12px] font-semibold text-[#17664e] hover:underline shrink-0 cursor-pointer"
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
                      Code via Telegram & SMS
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

      {/* ── MODALE VALIDATION TÉLÉPHONE (TELEGRAM BOT & SMS) (FRAME 786:23506) ── */}
      {showPhoneOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-[440px] rounded-[28px] bg-white border-[1.5px] border-[#dbf0dd] p-7 sm:p-8 shadow-2xl relative font-poppins">
            {/* Bouton Fermer Figma */}
            <button
              type="button"
              onClick={() => {
                setShowPhoneOtpModal(false);
                setTelegramSuccess(false);
                setTelegramMismatch(false);
              }}
              className="absolute top-5 right-5 size-9 rounded-full border border-[#dbf0dd] bg-white hover:bg-[#FAF6ED] flex items-center justify-center text-[#0b2c25] transition shadow-xs cursor-pointer"
              aria-label="Fermer"
            >
              <img src={figmaMultiplicationSign} alt="" className="size-3 text-[#0b2c25]" />
            </button>

            {/* ÉTAT 1 : SUCCÈS VÉRIFIÉ (Auto-synchronisation Telegram ou validation code) */}
            {telegramSuccess ? (
              <div className="flex flex-col items-center justify-center text-center py-6 space-y-4">
                <div className="size-20 rounded-full bg-[#dbf0dd] border-4 border-[#17664e]/20 flex items-center justify-center shadow-md animate-bounce">
                  <img src={figmaTickVerified} alt="" className="size-10" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-2xl font-bold text-[#0b2c25]">Numéro vérifié !</h3>
                  <p className="text-sm font-semibold text-[#17664e]">
                    ✓ Votre compte est désormais certifié et sécurisé.
                  </p>
                  <p className="text-xs text-[#0b2c25]/70 max-w-xs mt-1">
                    Numéro validé : <strong>+213 {formatAlgerianMobileDisplay(modalPhoneInput || phone || profile?.phone)}</strong>
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPhoneOtpModal(false);
                      setTelegramSuccess(false);
                    }}
                    className="px-6 py-2.5 rounded-[12px] bg-[#0b2c25] hover:bg-[#17664e] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                  >
                    Continuer
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* En-tête officiel de la modale */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="size-14 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center mb-3 shadow-xs">
                    <img src={figmaSmartPhone} alt="" className="size-7" />
                  </div>
                  <h3 className="text-[22px] font-bold text-[#0B2C25] leading-tight">
                    Vérification du numéro
                  </h3>
                  <p className="text-xs text-[#0b2c25]/70 mt-1 max-w-xs leading-relaxed">
                    Validez votre numéro algérien via Telegram en 1 clic ou par code SMS.
                  </p>
                </div>

                {/* Étape 1 : Saisir le numéro si pas encore envoyé */}
                {!otpSent ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#0B2C25]">
                        Numéro de téléphone algérien
                      </label>
                      <div className={`flex items-center h-12 rounded-[14px] border-[1.5px] ${phoneError ? 'border-[#b22222] bg-[#fff5f5]' : 'border-[#dbf0dd] bg-[#fffaf0]'} px-3.5 transition focus-within:border-[#17664e] focus-within:bg-white`}>
                        <img src={figmaPhoneInput} alt="" className="size-4 mr-2 opacity-80" />
                        <span className="text-xs font-bold text-[#0b2c25] mr-2 select-none">🇩🇿 +213</span>
                        <input
                          type="tel"
                          value={formatAlgerianMobileDisplay(modalPhoneInput)}
                          onChange={(e) => {
                            const raw = extractAlgerianMobile9(e.target.value);
                            setModalPhoneInput(raw);
                            setPhone(raw);
                            if (otpError) setOtpError(null);
                            if (phoneError) setPhoneError(null);
                          }}
                          placeholder="6 97 93 76 37"
                          className="flex-1 h-full text-sm font-semibold text-[#0b2c25] focus:outline-none bg-transparent placeholder:font-normal placeholder:text-gray-400"
                        />
                      </div>
                      <p className="text-[11px] text-[#0b2c25]/60">
                        9 chiffres commençant par 5, 6 ou 7 (ex : 6 97 93 76 37).
                      </p>
                    </div>

                    {otpError && (
                      <div className="p-2.5 rounded-[12px] bg-red-50 border border-red-200 text-xs text-[#b22222] font-semibold text-center">
                        {otpError}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleStartPhoneVerification}
                      disabled={isSendingOtp}
                      className="w-full h-12 rounded-[14px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-semibold text-sm transition cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSendingOtp ? (
                        <>
                          <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Connexion en cours...</span>
                        </>
                      ) : (
                        <span>Recevoir le code de vérification</span>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Étape 2 : Vérification via Bot Telegram ou saisie du code */
                  <div className="space-y-4">
                    {/* Alerte Numéro Discordant (Telegram Mismatch) */}
                    {telegramMismatch && (
                      <div className="p-3.5 rounded-[16px] bg-[#fff5f5] border border-[#b22222]/30 text-center space-y-2">
                        <div className="flex items-center justify-center gap-1.5 text-[#b22222] font-bold text-xs">
                          <img src={figmaAlertCircle} alt="" className="size-4 shrink-0 text-[#b22222]" />
                          <span>Numéro Telegram non concordant</span>
                        </div>
                        <p className="text-[11px] text-[#0b2c25]/80 leading-relaxed">
                          Votre compte Telegram utilise le numéro <strong className="text-[#b22222]">{mismatchPhone}</strong>, différent du numéro saisi (+213 {formatAlgerianMobileDisplay(modalPhoneInput || phone)}).
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setTelegramMismatch(false);
                            setOtpSent(false);
                            setOtpError(null);
                          }}
                          className="px-3 py-1.5 rounded-[8px] bg-[#0b2c25] hover:bg-[#17664e] text-white text-[11px] font-semibold transition cursor-pointer"
                        >
                          Modifier mon numéro et recommencer
                        </button>
                      </div>
                    )}

                    {/* Bloc Telegram Option 1 (Recommandée) */}
                    <div className="p-4 rounded-[18px] bg-[#f5faf4] border-[1.5px] border-[#dbf0dd] text-center space-y-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="size-2 rounded-full bg-[#17664e] animate-pulse" />
                        <p className="text-xs text-[#0B2C25] font-semibold">
                          Option 1 · Validation instantanée sur Telegram
                        </p>
                      </div>

                      <a
                        href={telegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-12 rounded-[14px] bg-[#229ED9] hover:bg-[#1E88E5] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md transition cursor-pointer active:scale-[0.98]"
                      >
                        <svg className="size-5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                        </svg>
                        <span>Recevoir le code sur Telegram (@forsa_auth_bot)</span>
                      </a>

                      <p className="text-[10px] text-[#0b2c25]/70 leading-normal">
                        ⚡ Synchronisation en direct : dès confirmation sur Telegram, votre numéro se valide automatiquement sans avoir à taper le code !
                      </p>
                    </div>

                    {/* Séparateur élégant Option 2 */}
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 my-1">
                      <div className="h-px bg-[#dbf0dd] flex-1" />
                      <span className="font-medium text-[#0b2c25]/60">Option 2 · ou saisissez le code reçu</span>
                      <div className="h-px bg-[#dbf0dd] flex-1" />
                    </div>

                    {/* 6 OTP Boxes */}
                    <div className="flex justify-center gap-2 sm:gap-2.5">
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
                          disabled={otpSecondsLeft === 0 || isVerifyingOtp}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          onPaste={handleOtpPaste}
                          className={`size-11 sm:size-12 text-center text-xl font-bold rounded-[14px] border-[1.5px] transition focus:outline-none ${
                            otpError
                              ? 'border-[#B22222] bg-[#fff5f5] text-[#B22222]'
                              : 'border-[#dbf0dd] bg-[#fffaf0] focus:border-[#17664E] focus:bg-white text-[#0b2c25]'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Message d'erreur OTP */}
                    {otpError && (
                      <p className="text-xs text-[#B22222] font-semibold text-center animate-shake">
                        {otpError}
                      </p>
                    )}

                    {/* Compteur de validité */}
                    <div className="text-center text-xs text-[#0b2c25]/75">
                      {otpSecondsLeft > 0 ? (
                        <span>
                          Validité du code :{' '}
                          <strong className="text-[#17664E] font-semibold">{formatOtpTimer(otpSecondsLeft)}</strong>
                        </span>
                      ) : (
                        <span className="text-[#B22222] font-semibold">
                          Le code a expiré. Demandez un nouveau code ci-dessous.
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={handleConfirmOtp}
                        disabled={isVerifyingOtp || otpSecondsLeft === 0}
                        className="w-full h-12 rounded-[14px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-semibold text-sm transition cursor-pointer disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                      >
                        {isVerifyingOtp ? (
                          <>
                            <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Vérification...</span>
                          </>
                        ) : (
                          <span>Valider le code</span>
                        )}
                      </button>

                      <div className="flex items-center justify-between text-xs pt-1 px-1">
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setOtpError(null);
                            setTelegramMismatch(false);
                          }}
                          className="text-[#0b2c25]/70 hover:text-[#0b2c25] hover:underline"
                        >
                          ← Changer de numéro
                        </button>
                        <button
                          type="button"
                          onClick={handleStartPhoneVerification}
                          className="text-[#17664E] font-semibold hover:underline"
                        >
                          Renvoyer un nouveau code
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODALE CHANGER L'E-MAIL ────────────────────────────────────────── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-7 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowEmailModal(false)}
              className="absolute top-5 right-5 size-9 rounded-full border-[1.5px] border-[#e8ebdf] hover:bg-black/5 flex items-center justify-center text-[#0b2c25] transition"
              aria-label="Fermer"
            >
              <img src={figmaMultiplicationSign} alt="" className="size-3 text-[#0b2c25]" />
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="size-12 rounded-full bg-[#FAF6ED] text-[#0B2C25] flex items-center justify-center mb-3">
                <img src={figmaMail} alt="" className="size-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0B2C25]">Modifier l'adresse e-mail</h3>
              <p className="text-xs text-gray-500 mt-1">
                Un lien de vérification sera automatiquement envoyé à la nouvelle adresse pour la valider.
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
                  className="flex-1 h-11 rounded-[12px] bg-[#0B2C25] hover:bg-[#17664E] text-white text-xs font-bold transition shadow-sm cursor-pointer"
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
              type="button"
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-5 right-5 size-9 rounded-full border-[1.5px] border-[#e8ebdf] hover:bg-black/5 flex items-center justify-center text-[#0b2c25] transition"
              aria-label="Fermer"
            >
              <img src={figmaMultiplicationSign} alt="" className="size-3 text-[#0b2c25]" />
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
              type="button"
              onClick={() => setShowLocationModal(false)}
              className="absolute top-5 right-5 size-9 rounded-full border-[1.5px] border-[#e8ebdf] hover:bg-black/5 flex items-center justify-center text-[#0b2c25] transition"
              aria-label="Fermer"
            >
              <img src={figmaMultiplicationSign} alt="" className="size-3 text-[#0b2c25]" />
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
