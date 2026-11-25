// frontend/src/features/profile/ProfilePage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { UserProfile } from './types';
import { useLocation } from '../catalogue/context/LocationContext';
import {
  ResponsiveDialog,
  Button,
  Banner,
  Chip,
} from '../../components/ui';
import { AvatarCropperModal } from '../account/AvatarCropperModal';
import {
  startPhoneChange,
  verifyPhoneChange,
  getTelegramChallengeStatus,
} from '../auth/services/authService';
import {
  defaultAvatar,
  figmaHeaderGear,
  figmaHeaderLocation,
  figmaHeaderBell,
  figmaUnreadIndicator,
  figmaCamera,
  figmaCameraWhite,
  figmaCrossPill,
  figmaEditBtnWhite,
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
  figmaClock,
  figmaSmartPhone01,
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
  const [searchParams] = useSearchParams();
  const { location, setLocation, requestCurrentPosition } = useLocation();

  useEffect(() => {
    if (searchParams.get('changePhone') === '1' || searchParams.get('action') === 'change-phone') {
      handleOpenChangePhoneModal();
    }
  }, [searchParams]);

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
  const [preferredLocation, setPreferredLocation] = useState<string>(() => {
    try {
      const cached = localStorage.getItem('forsa_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        const u = parsed.user || parsed;
        const loc = u.preferences?.preferredLocation || u.preferredLocation;
        if (loc) return loc;
      }
      const locSaved = localStorage.getItem('forsa_user_location');
      if (locSaved) {
        const parsed = JSON.parse(locSaved);
        if (parsed.label) return parsed.label;
      }
    } catch {}
    return 'Bab Ezzouar, Alger';
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Avatar Upload & Cropper
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showCropperModal, setShowCropperModal] = useState(false);
  const [cropperRawImage, setCropperRawImage] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  // Phone Change 2-Step Telegram Flow State
  const [showPhoneOtpModal, setShowPhoneOtpModal] = useState(false);
  const [phoneChangeStep, setPhoneChangeStep] = useState<1 | 2 | 3>(1); // 1: OTP Telegram actuel, 2: saisie nouveau numéro, 3: lien Telegram
  const [phoneChangeChallengeId, setPhoneChangeChallengeId] = useState<string | null>(null);
  const [phoneChangeStep2Id, setPhoneChangeStep2Id] = useState<string | null>(null);
  const [phoneChangeDeepLink, setPhoneChangeDeepLink] = useState<string | null>(null);
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [modalPhoneInput, setModalPhoneInput] = useState('');
  const [phoneChangeOtp, setPhoneChangeOtp] = useState(['', '', '', '', '', '']);
  const [phoneChangeSecondsLeft, setPhoneChangeSecondsLeft] = useState(300);
  const [phoneChangeError, setPhoneChangeError] = useState<string | null>(null);
  const [phoneChangeLoading, setPhoneChangeLoading] = useState(false);
  const [phoneChangeSuccess, setPhoneChangeSuccess] = useState(false);
  const phoneOtpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneChangePollRef = useRef<any>(null);

  // Email Change Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailModalError, setEmailModalError] = useState<string | null>(null);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Location Modal State (Zone de recherche)
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocationInput, setNewLocationInput] = useState('');

  // Resend Email State
  const [resendEmailSuccess, setResendEmailSuccess] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  // Unsaved Changes Confirmation Modal State
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);

  // Fetch Current User Profile
  const fetchProfile = async () => {
    const token =
      localStorage.getItem('forsa_access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('forsa_auth_token');

    if (!token) {
      const refreshToken = localStorage.getItem('forsa_refresh_token');
      const cachedUserStr = localStorage.getItem('forsa_user');
      if (!refreshToken && !cachedUserStr) {
        navigate('/login');
        return;
      }
    }

    try {
      setLoading(true);
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Tentative de renouvellement silencieux avec le refresh token
          const refreshToken = localStorage.getItem('forsa_refresh_token');
          if (refreshToken) {
            try {
              const refreshRes = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
              });
              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                if (refreshData.accessToken) {
                  localStorage.setItem('forsa_access_token', refreshData.accessToken);
                  if (refreshData.refreshToken) {
                    localStorage.setItem('forsa_refresh_token', refreshData.refreshToken);
                  }
                  const retryRes = await fetch('/api/users/me', {
                    headers: { Authorization: `Bearer ${refreshData.accessToken}` },
                  });
                  if (retryRes.ok) {
                    const retryData = await retryRes.json();
                    const u = retryData.user;
                    setProfile(u);
                    setInitialProfile(u);
                    setFullName(u.fullName || 'Mon Compte');
                    setEmail(u.email || '');
                    const clean = extractAlgerianMobile9(u.phone);
                    setPhone(clean);
                    setModalPhoneInput('');
                    setAvatarPreview(u.avatarUrl || null);
                    const loc = u.preferences?.preferredLocation || u.preferredLocation;
                    if (loc) setPreferredLocation(loc);
                    return;
                  }
                }
              }
            } catch {
              // ignore
            }
          }

          // Fallback gracieux sur les données locales persistantes : JAMAIS de déconnexion automatique
          const cachedUserStr = localStorage.getItem('forsa_user');
          if (cachedUserStr) {
            try {
              const u = JSON.parse(cachedUserStr);
              setProfile(u);
              setInitialProfile(u);
              setFullName(u.fullName || 'Mon Compte');
              setEmail(u.email || '');
              const clean = extractAlgerianMobile9(u.phone);
              setPhone(clean);
              setModalPhoneInput('');
              setModalPhoneInput(clean);
              setAvatarPreview(u.avatarUrl || null);
              const loc = u.preferences?.preferredLocation || u.preferredLocation;
              if (loc) setPreferredLocation(loc);
              return;
            } catch {
              // ignore
            }
          }
          return;
        }
        throw new Error('Impossible de charger votre profil.');
      }

      const data = await res.json();
      const user: UserProfile = data.user;
      setProfile(user);
      setInitialProfile(user);
      setFullName(user.fullName || (user.phone ? user.phone : 'Mon Compte'));
      setEmail(user.email || '');
      // S'il n'a pas de téléphone (ex: compte Google), la case reste vide
      const cleanPhone = extractAlgerianMobile9(user.phone);
      setPhone(cleanPhone);
      setModalPhoneInput(cleanPhone);
      setAvatarPreview(user.avatarUrl || null);
      const userLoc = user.preferences?.preferredLocation || user.preferredLocation;
      if (userLoc) {
        setPreferredLocation(userLoc);
      } else {
        const locSaved = localStorage.getItem('forsa_user_location');
        if (locSaved) {
          try {
            const parsed = JSON.parse(locSaved);
            if (parsed.label) setPreferredLocation(parsed.label);
          } catch {}
        }
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Erreur réseau lors du chargement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Timer pour la modale de changement de numéro
  useEffect(() => {
    let timer: any = null;
    if (showPhoneOtpModal && phoneChangeStep === 1 && phoneChangeSecondsLeft > 0) {
      timer = setInterval(() => {
        setPhoneChangeSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showPhoneOtpModal, phoneChangeStep, phoneChangeSecondsLeft]);

  // Polling Étape 3 (Liaison du nouveau Telegram)
  useEffect(() => {
    if (!showPhoneOtpModal || phoneChangeStep !== 3 || !phoneChangeStep2Id) return;

    if (phoneChangePollRef.current) clearInterval(phoneChangePollRef.current);

    phoneChangePollRef.current = setInterval(async () => {
      try {
        const res = await getTelegramChallengeStatus(phoneChangeStep2Id);
        if (res.status === 'VERIFIED') {
          if (phoneChangePollRef.current) clearInterval(phoneChangePollRef.current);
          setPhoneChangeSuccess(true);

          if (profile) {
            const updated = {
              ...profile,
              phone: newPhoneInput,
              phoneVerified: true,
            };
            setProfile(updated);
            setPhone(newPhoneInput);
            localStorage.setItem('forsa_user', JSON.stringify(updated));
          }

          setTimeout(() => {
            setShowPhoneOtpModal(false);
            setPhoneChangeSuccess(false);
            setSaveSuccess('Votre numéro de téléphone a été mis à jour avec succès !');
            setTimeout(() => setSaveSuccess(null), 4000);
          }, 1500);
        } else if (res.status === 'FAILED') {
          if (phoneChangePollRef.current) clearInterval(phoneChangePollRef.current);
          setPhoneChangeError('La confirmation Telegram a échoué (contact non concordant ou compte déjà lié).');
        }
      } catch {
        // Ignorer les erreurs réseau temporaires
      }
    }, 2000);

    return () => {
      if (phoneChangePollRef.current) clearInterval(phoneChangePollRef.current);
    };
  }, [showPhoneOtpModal, phoneChangeStep, phoneChangeStep2Id, newPhoneInput, profile]);

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

  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedChangesModal(true);
    } else {
      setViewMode('view');
    }
  };

  const handleConfirmDiscardChanges = () => {
    if (initialProfile) {
      setFullName(initialProfile.fullName || '');
      setEmail(initialProfile.email || '');
      setPhone(extractAlgerianMobile9(initialProfile.phone));
    }
    setShowUnsavedChangesModal(false);
    setViewMode('view');
  };

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
          preferredLocation: preferredLocation,
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

      const updatedUser = { ...data.user, preferredLocation };
      setProfile(updatedUser);
      setInitialProfile(updatedUser);
      localStorage.setItem('forsa_user', JSON.stringify(updatedUser));
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

  // Avatar Upload & Cropper
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setPendingAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setCropperRawImage(reader.result as string);
      setShowCropperModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAvatarAfterCrop = async (croppedImage: string) => {
    const token =
      localStorage.getItem('forsa_access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('forsa_auth_token');
    if (!token) return;

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      if (pendingAvatarFile) {
        formData.append('avatar', pendingAvatarFile);
      }

      const res = await fetch('/api/users/me/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Échec de l'envoi de la photo.");

      setAvatarPreview(data.avatarUrl || croppedImage);
      if (profile) {
        const updated = { ...profile, avatarUrl: data.avatarUrl || croppedImage };
        setProfile(updated);
        localStorage.setItem('forsa_user', JSON.stringify(updated));
      }
      setSaveSuccess('Photo de profil mise à jour avec succès.');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setAvatarError(err.message || 'Erreur lors du téléversement.');
    } finally {
      setIsUploadingAvatar(false);
      setPendingAvatarFile(null);
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

  // Ouvrir la modale en 2 étapes pour changer de numéro de téléphone
  const handleOpenChangePhoneModal = async () => {
    setPhoneChangeStep(1);
    setPhoneChangeOtp(['', '', '', '', '', '']);
    setNewPhoneInput('');
    setPhoneChangeError(null);
    setPhoneChangeSuccess(false);
    setPhoneChangeSecondsLeft(300);
    setPhoneChangeLoading(true);
    setShowPhoneOtpModal(true);

    try {
      const data = await startPhoneChange();
      setPhoneChangeChallengeId(data.challengeId);
    } catch (err: any) {
      setPhoneChangeError(err.message || 'Impossible d’envoyer le code de confirmation sur votre Telegram actuel.');
    } finally {
      setPhoneChangeLoading(false);
    }
  };

  const handlePhoneChangeOtpChange = (index: number, val: string) => {
    if (phoneChangeError) setPhoneChangeError(null);
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const nextDigits = [...phoneChangeOtp];
    nextDigits[index] = cleaned;
    setPhoneChangeOtp(nextDigits);

    if (cleaned && index < 5) {
      phoneOtpInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePhoneChangeOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !phoneChangeOtp[index] && index > 0) {
      phoneOtpInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePhoneChangeOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (phoneChangeError) setPhoneChangeError(null);
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const nextDigits = ['', '', '', '', '', ''];
    pasted.split('').forEach((d, i) => {
      if (i < 6) nextDigits[i] = d;
    });
    setPhoneChangeOtp(nextDigits);
    const targetIdx = Math.min(pasted.length, 5);
    phoneOtpInputRefs.current[targetIdx]?.focus();
  };

  // Validation Étape 1 : Passer à la saisie du nouveau numéro
  const handleConfirmStep1 = () => {
    const code = phoneChangeOtp.join('');
    if (code.length !== 6) {
      setPhoneChangeError('Veuillez saisir les 6 chiffres du code reçu sur Telegram.');
      return;
    }
    setPhoneChangeError(null);
    setPhoneChangeStep(2);
  };

  // Validation Étape 2 : Vérifier le code et le nouveau numéro
  const handleConfirmStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneChangeError(null);

    const raw = newPhoneInput.replace(/[\s.\-()]/g, '');
    const match = raw.match(/^(?:\+213|00213|0)?([567]\d{8})$/);
    if (!match) {
      setPhoneChangeError('Nouveau numéro de mobile algérien invalide (+213 5/6/7 xx xx xx).');
      return;
    }

    const normalizedNewPhone = `+213${match[1]}`;
    if (normalizedNewPhone === profile?.phone) {
      setPhoneChangeError('Le nouveau numéro doit être différent de votre numéro actuel.');
      return;
    }

    if (!phoneChangeChallengeId) {
      setPhoneChangeError('Session expirée. Veuillez recommencer.');
      return;
    }

    setPhoneChangeLoading(true);

    try {
      const code = phoneChangeOtp.join('');
      const data = await verifyPhoneChange(phoneChangeChallengeId, code, normalizedNewPhone);
      setPhoneChangeStep2Id(data.step2ChallengeId);
      setPhoneChangeDeepLink(data.deepLink);
      setPhoneChangeStep(3);
    } catch (err: any) {
      if (err.status === 409 || err.code === 'CONFLICT') {
        setPhoneChangeError('Ce numéro de téléphone est déjà associé à un autre compte FORSA.');
      } else {
        // Fix phone-change UX defect: keep user in the verification step so the error appears on the code field
        setPhoneChangeStep(1);
        setPhoneChangeError(err.message || 'Code de confirmation invalide ou expiré. Veuillez vérifier le code saisi.');
      }
    } finally {
      setPhoneChangeLoading(false);
    }
  };

  // Change Email Modal Save
  const handleSaveNewEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailModalError(null);

    const currentEmail = (profile?.email || email || '').trim().toLowerCase();
    const candidateEmail = newEmailInput.trim().toLowerCase();

    if (!candidateEmail || !candidateEmail.includes('@')) {
      setEmailModalError('Veuillez saisir une adresse e-mail valide.');
      return;
    }

    // Si l'e-mail est identique à l'e-mail actuel, ne rien changer et ne pas demander de vérification inutile
    if (candidateEmail === currentEmail) {
      setShowEmailModal(false);
      setSaveSuccess("L'adresse e-mail saisie est identique à votre e-mail actuel.");
      setTimeout(() => setSaveSuccess(null), 4000);
      return;
    }

    const token =
      localStorage.getItem('forsa_access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('forsa_auth_token');
    if (!token) return;

    setIsUpdatingEmail(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: candidateEmail }),
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
  const isMerchant = profile?.role === 'MERCHANT' || (profile as any)?.roles?.includes('MERCHANT');
  const isMerchantVerified = Boolean(isMerchant && profile?.shop?.status === 'APPROVED');

  const displayName = profile?.fullName || (profile?.phone ? profile.phone : 'Mon Compte');
  const displayEmail = profile?.email || '';
  const displayPhone = hasPhone ? `+213 ${formatAlgerianMobileDisplay(profile!.phone)}` : '';
  const currentAvatar = avatarPreview || profile?.avatarUrl || null;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'MC';

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
          <div className="flex items-center gap-[12px] flex-wrap self-start md:self-center shrink-0">
            {/* Bouton Changer de mode */}
            <button
              type="button"
              onClick={() => navigate('/settings/mode')}
              className="h-[42px] px-[16px] rounded-[12px] border border-ui-emerald/40 text-ui-emerald text-[13px] font-semibold flex items-center gap-[8px] hover:bg-ui-mint/30 transition cursor-pointer bg-white"
            >
              <span>{isMerchant ? 'Mode Commerçant' : 'Changer de mode'}</span>
            </button>

            {/* Bouton Paramètres (793:23356) */}
            <button
              type="button"
              onClick={() => navigate('/settings')}
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
            <div className="relative size-[48px] rounded-full overflow-hidden shrink-0 border border-black/5 shadow-xs bg-[#0B2C25] text-white flex items-center justify-center font-bold text-sm">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={displayName}
                  className="size-full object-cover rounded-full"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── SECTION B: ÉTATS FIGMA (E-MAIL, TÉLÉPHONE, SUSPENDU, INCOMPLET) ── */}
        <div className="space-y-3 mb-6">
          {/* État Compte Suspendu (Frame 785:21652) */}
          {isSuspended && (
            <div className="p-4 rounded-ui-card bg-ui-error-bg border border-ui-error/30 text-ui-error flex items-start gap-3">
              <div className="text-xs">
                <strong className="block font-bold text-sm">Compte suspendu par l'administration</strong>
                Votre compte a été restreint suite à un signalement. Vous ne pouvez plus passer de commande. Contactez le support à support@forsa.dz.
              </div>
            </div>
          )}

          {/* État E-mail non vérifié (Figma Frame 785:20789 - Bannière Vérifiez votre adresse e-mail) */}
          {!isEmailVerified && profile?.email && (
            <div className="bg-[#fdf3d8] border-[1.5px] border-[#dbf0dd] rounded-ui-card p-[18px] flex items-center justify-between gap-4 w-full flex-wrap">
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
            <div className="bg-[#fdf3d8] border-[1.5px] border-[#dbf0dd] rounded-ui-card p-[18px] flex items-center justify-between gap-4 w-full flex-wrap">
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
                      onClick={handleOpenChangePhoneModal}
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
              {/* 1. CARTE PROFIL (FRAME 994:13581) */}
              <div className="w-full bg-gradient-to-r from-white to-[#eef7ec] border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[28px] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-[28px]">
                <div className="flex flex-col sm:flex-row items-center gap-[28px] text-center sm:text-left flex-1 min-w-0">
                  {/* Photo de profil (128x128) + bouton caméra */}
                  <div className="relative size-[128px] shrink-0">
                    <div className="size-[120px] rounded-full overflow-hidden bg-[#0B2C25] text-white flex items-center justify-center font-bold text-3xl border-3 border-white shadow-md">
                      {currentAvatar ? (
                        <img
                          src={currentAvatar}
                          alt={displayName}
                          className="size-full object-cover rounded-full"
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
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
                      <img src={figmaCameraWhite} alt="" className="size-[18px]" />
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
                    <div className="flex items-center gap-[8px] flex-wrap sm:flex-nowrap pt-1 justify-center sm:justify-start">
                      {/* E-mail vérifié / non vérifié */}
                      <div className={`${isEmailVerified ? 'bg-[#dbf0dd] text-[#17664e]' : 'bg-[#f7dcd8] text-[#b13b3b]'} flex items-center gap-[6px] pl-[10px] pr-[12px] py-[5px] rounded-[100px] shrink-0`}>
                        {isEmailVerified ? (
                          <img src={figmaTickPill} alt="" className="size-[14px] shrink-0" />
                        ) : (
                          <img src={figmaCrossPill} alt="" className="size-[12px] shrink-0" />
                        )}
                        <span className="text-[12px] font-semibold">
                          {isEmailVerified ? 'E-mail vérifié' : 'E-mail non vérifié'}
                        </span>
                      </div>

                      {/* Téléphone vérifié / non vérifié */}
                      <div className={`${isPhoneVerified ? 'bg-[#dbf0dd] text-[#17664e]' : 'bg-[#f7dcd8] text-[#b13b3b]'} flex items-center gap-[6px] pl-[10px] pr-[12px] py-[5px] rounded-[100px] shrink-0`}>
                        {isPhoneVerified ? (
                          <img src={figmaTickPill} alt="" className="size-[14px] shrink-0" />
                        ) : (
                          <img src={figmaCrossPill} alt="" className="size-[12px] shrink-0" />
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

                      {/* Pastille Commerçant vérifié */}
                      {isMerchantVerified && (
                        <div className="bg-[#dbf0dd] text-[#17664e] flex items-center gap-[6px] pl-[10px] pr-[12px] py-[5px] rounded-[100px] shrink-0 font-semibold text-[12px]">
                          <img src={figmaTickPill} alt="" className="size-[14px] shrink-0" />
                          <span>Commerçant vérifié</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bouton Modifier le profil (994:13602) */}
                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  className="bg-[#0b2c25] hover:bg-[#17664e] flex items-center justify-center gap-[8px] pl-[18px] pr-[20px] py-[12px] rounded-[12px] text-white text-[14px] font-semibold transition cursor-pointer shadow-sm shrink-0 self-center"
                >
                  <img src={figmaEditBtnWhite} alt="" className="size-[18px] shrink-0" />
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

                    {/* Tuile Téléphone (Figma 994:13623) */}
                    <div className="flex-1 bg-[#fffaf0] border border-[#e8ebdf] rounded-[16px] p-[16px] flex items-center gap-[14px]">
                      <div className="size-[44px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0">
                        <img src={figmaSmartPhone} alt="" className="size-[22px]" />
                      </div>
                      <div className="flex flex-col gap-[3px] min-w-0 flex-1">
                        {/* Libellé + Badge d'état (Figma 994:13627) */}
                        <div className="flex items-center gap-[8px]">
                          <span className="text-[11px] font-normal text-[#0b2c25]">Téléphone</span>
                          {isPhoneVerified ? (
                            <div className="bg-[#dbf0dd] flex items-center gap-[4px] px-[8px] py-[2px] rounded-full">
                              <img src={figmaTickSmall} alt="" className="size-[11px]" />
                              <span className="text-[10px] font-semibold text-[#17664e]">Vérifié</span>
                            </div>
                          ) : hasPhone ? (
                            <button
                              type="button"
                              onClick={handleOpenChangePhoneModal}
                              className="bg-[#f7dcd8] hover:bg-[#fad4cf] flex items-center gap-[4px] px-[8px] py-[2px] rounded-full cursor-pointer transition"
                            >
                              <img src={figmaCrossPill} alt="" className="size-[9px] shrink-0" />
                              <span className="text-[10px] font-semibold text-[#b13b3b]">Non vérifié</span>
                            </button>
                          ) : (
                            <div className="bg-[#ebeee1] flex items-center gap-[4px] px-[8px] py-[2px] rounded-full">
                              <span className="text-[10px] font-medium text-[#78847f]">Non renseigné</span>
                            </div>
                          )}
                        </div>

                        {/* Numéro affiché (Figma 994:13632) */}
                        <p className="text-[14px] font-semibold text-[#0b2c25] truncate">
                          {hasPhone ? displayPhone : (
                            <span className="text-[#0b2c25]/45 italic font-normal text-[13px]">
                              Aucun numéro associé
                            </span>
                          )}
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
                          <span className="text-[11px] font-normal text-[#0b2c25]">E-mail</span>
                          {isEmailVerified ? (
                            <div className="bg-[#dbf0dd] flex items-center gap-[4px] px-[8px] py-[2px] rounded-full">
                              <img src={figmaTickSmall} alt="" className="size-[11px]" />
                              <span className="text-[10px] font-semibold text-[#17664e]">Vérifié</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResendEmail}
                              className="bg-[#f7dcd8] hover:bg-[#fad4cf] flex items-center gap-[4px] px-[8px] py-[2px] rounded-full cursor-pointer transition"
                            >
                              <img src={figmaCrossPill} alt="" className="size-[9px] shrink-0" />
                              <span className="text-[10px] font-semibold text-[#b13b3b]">Non vérifié</span>
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
                      navigate('/settings?tab=location');
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
                  onClick={() => navigate('/settings')}
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
                  onClick={() => navigate('/settings?tab=security')}
                  className="flex items-center gap-[12px] py-[12px] w-full cursor-pointer hover:bg-gray-50/60 rounded-[12px] px-1 transition"
                >
                  <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0">
                    <img src={figmaShield} alt="" className="size-[20px]" />
                  </div>
                  <div className="flex flex-col gap-px flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#0b2c25]">Sécurité du compte</p>
                    <p className="text-[11px] font-normal text-[#0b2c25]/70">Liaison Telegram, sécurité</p>
                  </div>
                  <img src={figmaChevronRight} alt="" className="size-[16px] shrink-0" />
                </div>

                {/* Séparateur */}
                <div className="w-full h-px bg-[#ebeee1]" />

                {/* Ligne Notifications */}
                <div
                  onClick={() => navigate('/notifications')}
                  className="flex items-center gap-[12px] py-[12px] w-full cursor-pointer hover:bg-gray-50/60 rounded-[12px] px-1 transition"
                >
                  <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0">
                    <img src={figmaCardBell} alt="" className="size-[20px]" />
                  </div>
                  <div className="flex flex-col gap-px flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#0b2c25]">Notifications</p>
                    <p className="text-[11px] font-normal text-[#0b2c25]/70">In-app et e-mail</p>
                  </div>
                  <img src={figmaChevronRight} alt="" className="size-[16px] shrink-0" />
                </div>

                {/* Séparateur */}
                <div className="w-full h-px bg-[#ebeee1]" />

                {/* Ligne Localisation */}
                <div
                  onClick={() => navigate('/settings?tab=location')}
                  className="flex items-center gap-[12px] py-[12px] w-full cursor-pointer hover:bg-gray-50/60 rounded-[12px] px-1 transition"
                >
                  <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0">
                    <img src={figmaCardPin} alt="" className="size-[20px]" />
                  </div>
                  <div className="flex flex-col gap-px flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#0b2c25]">Localisation</p>
                    <p className="text-[11px] font-normal text-[#0b2c25]/70">Rayon de recherche et GPS</p>
                  </div>
                  <img src={figmaChevronRight} alt="" className="size-[16px] shrink-0" />
                </div>

                {/* Bouton Tous les paramètres */}
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
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
                  <div className="relative size-[99px] shrink-0 rounded-full overflow-hidden bg-[#0B2C25] text-white flex items-center justify-center font-bold text-2xl border-3 border-white shadow-sm">
                    {currentAvatar ? (
                      <img
                        src={currentAvatar}
                        alt={displayName}
                        className="size-full object-cover rounded-full"
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
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
                          className="flex items-center justify-center gap-[8px] pl-[18px] pr-[20px] py-[12px] rounded-[12px] text-[14px] font-semibold text-[#17664e] hover:text-ui-error transition cursor-pointer"
                        >
                          <img src={figmaDeleteTrash} alt="" className="size-[18px]" />
                          <span>Supprimer</span>
                        </button>
                      )}
                    </div>

                    {avatarError && (
                      <p className="text-xs text-ui-error font-semibold">{avatarError}</p>
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
                  <div className={`w-full h-[48px] bg-[#fffaf0] border-[1.5px] ${phoneError ? 'border-ui-error' : 'border-[#78847f]'} rounded-[12px] px-[14px] flex items-center gap-[10px]`}>
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
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="bg-[#dbf0dd] flex items-center gap-[3px] pl-[6px] pr-[8px] py-[3px] rounded-[100px]">
                          <img src={figmaTickVerified} alt="" className="size-[12px]" />
                          <span className="text-[10px] font-semibold text-[#17664e]">Vérifié</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenChangePhoneModal}
                          className="text-[12px] font-semibold text-[#17664e] hover:underline cursor-pointer"
                        >
                          Changer
                        </button>
                      </div>
                    ) : phone ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="bg-amber-50 border border-amber-300 flex items-center gap-[3px] pl-[6px] pr-[8px] py-[3px] rounded-[100px]">
                          <span className="text-[10px] font-semibold text-amber-800">Non vérifié</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenChangePhoneModal}
                          className="text-[12px] font-semibold text-[#17664e] hover:underline cursor-pointer"
                        >
                          Vérifier
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {phoneError ? (
                    <p className="text-[11px] text-ui-error font-semibold">{phoneError}</p>
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
                      onClick={() => navigate('/settings?tab=location')}
                      className="text-[12px] font-semibold text-[#17664e] hover:underline shrink-0 cursor-pointer"
                    >
                      Modifier
                    </button>
                  </div>
                </div>



                {/* Pied de formulaire (797:29424) */}
                <div className="flex items-center justify-end gap-[12px] pt-[16px]">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
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
                  onClick={handleOpenChangePhoneModal}
                  className="flex items-center gap-[12px] py-[12px] w-full cursor-pointer hover:bg-gray-50/60 rounded-[12px] px-1 transition"
                >
                  <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0">
                    <img src={figmaSecurityPhone} alt="" className="size-[20px]" />
                  </div>
                  <div className="flex flex-col gap-px flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#0b2c25]">Changer le téléphone</p>
                    <p className="text-[11px] font-normal text-[#0b2c25]/70">
                      Validation sécurisée en 2 étapes via Telegram
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

      {/* ── MODALE CHANGEMENT DE NUMÉRO EN 2 ÉTAPES VIA TELEGRAM ───────────────── */}
      <ResponsiveDialog
        isOpen={showPhoneOtpModal}
        onClose={() => {
          setShowPhoneOtpModal(false);
          setPhoneChangeSuccess(false);
          setPhoneChangeError(null);
          if (phoneChangePollRef.current) clearInterval(phoneChangePollRef.current);
        }}
        title={
          phoneChangeSuccess
            ? 'Numéro mis à jour !'
            : phoneChangeStep === 1
            ? 'Confirmez votre identité'
            : phoneChangeStep === 2
            ? 'Votre nouveau mobile'
            : 'Confirmez sur votre Telegram'
        }
        description={
          phoneChangeSuccess
            ? 'Votre nouveau numéro est validé et lié à votre compte'
            : phoneChangeStep === 1
            ? 'Code à 6 chiffres envoyé sur votre compte Telegram actuel'
            : phoneChangeStep === 2
            ? 'Saisie de votre nouveau numéro mobile algérien'
            : 'Liaison de votre nouveau numéro avec le bot Telegram'
        }
      >
        <div className="w-full font-poppins flex flex-col items-center gap-[16px] py-1">
          {/* ÉTAT SUCCÈS */}
            {phoneChangeSuccess ? (
              <div className="flex flex-col items-center justify-center text-center py-4 space-y-3">
                <div className="size-[80px] rounded-[22px] bg-[#dbf0dd] border border-[#17664e]/20 flex items-center justify-center shadow-xs">
                  <img src={figmaTickVerified} alt="" className="size-9" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[20px] font-semibold text-[#0b2c25]">Numéro mis à jour !</h3>
                  <p className="text-[13px] font-semibold text-[#17664e]">
                    ✓ Votre nouveau numéro est validé et lié à votre profil.
                  </p>
                  <p className="text-[12px] text-[#0b2c25]/70 max-w-xs mt-1">
                    Nouveau numéro actif : <strong>{newPhoneInput}</strong>
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* ÉTAPE 1 : Code envoyé sur l'ancien Telegram */}
                {phoneChangeStep === 1 && (
                  <div className="w-full flex flex-col items-center gap-4 text-center">
                    <div className="bg-[#ebeee1] rounded-[22px] size-[72px] flex items-center justify-center shrink-0">
                      <img src={figmaSecurityPhone} alt="" className="size-[28px]" />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-[#17664E] uppercase tracking-wider">
                        Étape 1 sur 2 · Sécurité
                      </span>
                      <h3 className="text-[20px] font-semibold text-[#0b2c25] leading-tight">
                        Confirmez votre identité
                      </h3>
                      <p className="text-[13px] text-[#0b2c25]/70 max-w-[380px] leading-relaxed">
                        Un code à 6 chiffres a été envoyé par le bot FORSA sur votre compte Telegram actuel ({profile?.phone || 'associé'}).
                      </p>
                    </div>

                    {phoneChangeError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-ui-error-bg border border-ui-error/30 text-ui-error text-xs font-medium w-full text-left">
                        <img src={figmaAlertCircle} alt="" className="size-4 shrink-0" />
                        <span>{phoneChangeError}</span>
                      </div>
                    )}

                    {phoneChangeLoading ? (
                      <div className="py-6 flex flex-col items-center gap-2">
                        <div className="size-6 border-2 border-[#17664e] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-[#0b2c25]/70">Génération du code de sécurité...</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-[10px] items-center justify-center my-1">
                          {phoneChangeOtp.map((digit, idx) => (
                            <input
                              key={idx}
                              ref={(el) => { phoneOtpInputRefs.current[idx] = el; }}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handlePhoneChangeOtpChange(idx, e.target.value)}
                              onKeyDown={(e) => handlePhoneChangeOtpKeyDown(idx, e)}
                              onPaste={handlePhoneChangeOtpPaste}
                              className="w-[46px] sm:w-[52px] h-[58px] sm:h-[62px] text-center text-[22px] font-semibold rounded-[14px] border border-black/15 bg-white focus:border-2 focus:border-[#0b2c25] focus:outline-none transition"
                            />
                          ))}
                        </div>

                        <div className="flex items-center justify-center gap-1.5 text-xs text-[#0b2c25]/70">
                          <img src={figmaClock} alt="" className="size-3.5 opacity-60" />
                          <span>Code valide pendant : <strong>{formatOtpTimer(phoneChangeSecondsLeft)}</strong></span>
                        </div>

                        <div className="flex items-center gap-3 pt-2 w-full">
                          <button
                            type="button"
                            onClick={() => setShowPhoneOtpModal(false)}
                            className="flex-1 h-11 rounded-[12px] border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmStep1}
                            disabled={phoneChangeOtp.join('').length !== 6}
                            className="flex-1 h-11 rounded-[12px] bg-[#0b2c25] hover:bg-[#17664e] text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            Suivant
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ÉTAPE 2 : Saisie du nouveau numéro */}
                {phoneChangeStep === 2 && (
                  <form onSubmit={handleConfirmStep2} className="w-full flex flex-col items-center gap-4 text-center">
                    <div className="bg-[#ebeee1] rounded-[22px] size-[72px] flex items-center justify-center shrink-0">
                      <img src={figmaSmartPhone01} alt="" className="size-[28px]" />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-[#17664E] uppercase tracking-wider">
                        Étape 2 sur 2 · Nouveau numéro
                      </span>
                      <h3 className="text-[20px] font-semibold text-[#0b2c25] leading-tight">
                        Votre nouveau mobile
                      </h3>
                      <p className="text-[13px] text-[#0b2c25]/70 max-w-[380px] leading-relaxed">
                        Entrez votre nouveau numéro mobile algérien. Vous le confirmerez ensuite dans Telegram.
                      </p>
                    </div>

                    {phoneChangeError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-ui-error-bg border border-ui-error/30 text-ui-error text-xs font-medium w-full text-left">
                        <img src={figmaAlertCircle} alt="" className="size-4 shrink-0" />
                        <span>{phoneChangeError}</span>
                      </div>
                    )}

                    <div className="w-full max-w-[360px] space-y-1.5 text-left">
                      <label className="block text-xs font-semibold text-[#0b2c25]">
                        Nouveau numéro de téléphone
                      </label>
                      <div className="flex items-center h-12 rounded-[12px] border border-[#dbf0dd] bg-white focus-within:border-[#0b2c25] px-3.5 transition">
                        <img src={figmaPhoneInput} alt="" className="size-4 mr-2 opacity-80" />
                        <span className="text-xs font-bold text-[#0b2c25] mr-2 select-none">+213</span>
                        <input
                          type="tel"
                          required
                          value={newPhoneInput}
                          onChange={(e) => {
                            setNewPhoneInput(e.target.value);
                            if (phoneChangeError) setPhoneChangeError(null);
                          }}
                          placeholder="05 / 06 / 07 XX XX XX XX"
                          className="flex-1 h-full text-sm font-semibold text-[#0b2c25] focus:outline-none bg-transparent placeholder:font-normal placeholder:text-gray-400"
                        />
                      </div>
                      <p className="text-[11px] text-[#0b2c25]/60">
                        Format mobile algérien valide requis.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-2 w-full">
                      <button
                        type="button"
                        onClick={() => setPhoneChangeStep(1)}
                        className="flex-1 h-11 rounded-[12px] border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        Retour
                      </button>
                      <button
                        type="submit"
                        disabled={phoneChangeLoading || !newPhoneInput.trim()}
                        className="flex-1 h-11 rounded-[12px] bg-[#0b2c25] hover:bg-[#17664e] text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {phoneChangeLoading ? 'Validation...' : 'Continuer vers Telegram'}
                      </button>
                    </div>
                  </form>
                )}

                {/* ÉTAPE 3 : Liaison Telegram avec le nouveau numéro */}
                {phoneChangeStep === 3 && (
                  <div className="w-full flex flex-col items-center gap-4 text-center">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-[20px] font-semibold text-[#0b2c25] leading-tight">
                        Confirmez sur votre Telegram
                      </h3>
                      <p className="text-[13px] text-[#0b2c25]/70 max-w-[380px] leading-relaxed">
                        Ouvrez le lien ci-dessous ou scannez le QR code avec le compte Telegram associé à votre nouveau numéro.
                      </p>
                    </div>

                    {phoneChangeError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-ui-error-bg border border-ui-error/30 text-ui-error text-xs font-medium w-full text-left">
                        <img src={figmaAlertCircle} alt="" className="size-4 shrink-0" />
                        <span>{phoneChangeError}</span>
                      </div>
                    )}

                    {phoneChangeDeepLink && (
                      <a
                        href={phoneChangeDeepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-11 bg-[#229ED9] hover:bg-[#1E88BE] text-white text-xs font-semibold rounded-[12px] flex items-center justify-center gap-2 shadow-sm transition"
                      >
                        <span>Ouvrir dans Telegram</span>
                      </a>
                    )}

                    {phoneChangeDeepLink && (
                      <div className="bg-white/90 p-3 rounded-2xl border border-black/10 shadow-sm flex flex-col items-center gap-1.5">
                        <QRCodeSVG value={phoneChangeDeepLink} size={140} level="M" />
                        <span className="text-[11px] text-[#0b2c25]/60">Scannez pour valider la liaison</span>
                      </div>
                    )}

                    <div className="inline-flex items-center gap-2 text-xs font-medium text-[#0b2c25]/80 bg-[#f4f7f2] px-3.5 py-1.5 rounded-full border border-[#dbf0dd]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#17664E] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#17664E]" />
                      </span>
                      <span>En attente de partage de contact dans Telegram...</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowPhoneOtpModal(false);
                        if (phoneChangePollRef.current) clearInterval(phoneChangePollRef.current);
                      }}
                      className="text-xs text-gray-500 hover:text-gray-800 hover:underline pt-1"
                    >
                      Fermer
                    </button>
                  </div>
                )}
              </>
            )}
        </div>
      </ResponsiveDialog>

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
                onClick={async () => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      async (pos) => {
                        const lat = pos.coords.latitude;
                        const lng = pos.coords.longitude;
                        let label = '';
                        try {
                          const res = await fetch(
                            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=fr`
                          );
                          if (res.ok) {
                            const data = await res.json();
                            const loc = data.locality || data.city || data.principalSubdivision;
                            const reg = data.principalSubdivision
                              ? data.principalSubdivision.replace(/wilaya d['’e\s]*/i, '').trim()
                              : data.city || '';
                            if (loc && reg && loc.toLowerCase() !== reg.toLowerCase()) {
                              label = `${loc}, ${reg}`;
                            } else if (loc) {
                              label = loc;
                            }
                          }
                        } catch {}
                        if (!label) {
                          label = `Position (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
                        }
                        setLocation({ lat, lng, label });
                        setPreferredLocation(label);
                        localStorage.setItem('forsa_user_location', JSON.stringify({ lat, lng, label }));
                        setShowLocationModal(false);
                      },
                      () => {
                        setShowLocationModal(false);
                      },
                      { timeout: 7000, enableHighAccuracy: false, maximumAge: 60000 }
                    );
                  } else {
                    setShowLocationModal(false);
                  }
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
                      const val = newLocationInput.trim();
                      setPreferredLocation(val);
                      setLocation({ lat: location.lat, lng: location.lng, label: val });
                      localStorage.setItem('forsa_user_location', JSON.stringify({ lat: location.lat, lng: location.lng, label: val }));
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
      {/* ── MODALE MODIFICATIONS NON ENREGISTRÉES ───────────────────────── */}
      <ResponsiveDialog
        isOpen={showUnsavedChangesModal}
        onClose={() => setShowUnsavedChangesModal(false)}
        title="Modifications non enregistrées"
        description="Vous avez apporté des modifications à votre profil sans les enregistrer."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowUnsavedChangesModal(false)}
            >
              Continuer l'édition
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDiscardChanges}
            >
              Abandonner les modifications
            </Button>
          </>
        }
      >
        <p className="text-sm text-ui-text-70">
          Êtes-vous sûr de vouloir quitter le mode édition ? Toutes les données modifiées seront réinitialisées.
        </p>
      </ResponsiveDialog>

      {/* ── MODALE RECADRAGE AVATAR ───────────────────────────────────── */}
      {showCropperModal && cropperRawImage && (
        <AvatarCropperModal
          isOpen={showCropperModal}
          imageSrc={cropperRawImage}
          onClose={() => {
            setShowCropperModal(false);
            setCropperRawImage(null);
            setPendingAvatarFile(null);
          }}
          onCropComplete={(cropped) => {
            handleUploadAvatarAfterCrop(cropped);
          }}
        />
      )}
    </div>
  );
};

export default ProfilePage;
