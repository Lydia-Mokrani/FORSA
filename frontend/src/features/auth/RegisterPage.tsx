import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Button,
  Field,
  Banner,
  Chip,
  Stepper,
  Dropzone,
  MapBox,
  Icon,
} from '../../components/ui';

import arrowRightIcon from '../../assets/icons/arrow-right.svg';
import arrowLeftIcon from '../../assets/icons/arrow-left.svg';
import badgeRoleIcon from '../../assets/icons/badge-role-icon.svg';
import figmaClock from '../../assets/icons/figma/icone-clock-01.svg';
import figmaRefresh from '../../assets/icons/figma/icone-refresh.svg';
import figmaSmartPhone from '../../assets/icons/figma/icone-smart-phone-01.svg';

import {
  startTelegramAuth,
  getTelegramChallengeStatus,
  verifyTelegramAuth,
  authFetch,
} from './services/authService';

import { SHOP_CATEGORIES } from '../shop/shopCategories';
import { useShopGeocode } from '../shop/useShopGeocode';
import { TermsModal } from './components/TermsModal';

type ClientStep = 'FORM' | 'WAITING_TELEGRAM' | 'VERIFY_OTP';
type MerchantStep = 1 | 2 | 3;
type MerchantAuthStep = 'FORM' | 'WAITING_TELEGRAM' | 'VERIFY_OTP' | 'AUTH_DONE';

interface DaySchedule {
  closed: boolean;
  open: string;
  close: string;
}

const DEFAULT_OPENING_HOURS: Record<string, DaySchedule> = {
  monday: { closed: false, open: '08:30', close: '19:00' },
  tuesday: { closed: false, open: '08:30', close: '19:00' },
  wednesday: { closed: false, open: '08:30', close: '19:00' },
  thursday: { closed: false, open: '08:30', close: '19:00' },
  friday: { closed: true, open: '08:30', close: '19:00' },
  saturday: { closed: false, open: '08:30', close: '19:00' },
  sunday: { closed: false, open: '08:30', close: '19:00' },
};

const DAY_LABELS: Record<string, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
};

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialRole = searchParams.get('role') === 'merchant' ? 'MERCHANT' : 'CUSTOMER';
  const initialStepParam = Number(searchParams.get('step'));
  const initialMerchantStep: MerchantStep =
    initialStepParam === 2 || initialStepParam === 3 ? (initialStepParam as MerchantStep) : 1;

  const [role, setRole] = useState<'CUSTOMER' | 'MERCHANT'>(initialRole);

  // États Client
  const [clientStep, setClientStep] = useState<ClientStep>('FORM');
  const [clientData, setClientData] = useState({
    fullName: '',
    email: '',
    phone: '',
    acceptTerms: false,
  });

  // États Commerçant
  const [merchantStep, setMerchantStep] = useState<MerchantStep>(initialMerchantStep);
  const [merchantAuthStep, setMerchantAuthStep] = useState<MerchantAuthStep>('FORM');
  const [merchantData, setMerchantData] = useState({
    // Étape 1 : Compte
    ownerName: '',
    email: '',
    phone: '',
    acceptTerms: false,
    // Étape 2 : Commerce
    shopName: '',
    category: 'Boulangerie & Pâtisserie',
    rcNumber: '',
    address: '',
    proPhone: '',
    latitude: 36.7588,
    longitude: 3.4756,
    openingHours: DEFAULT_OPENING_HOURS,
    // Étape 3 : Documents
    commercialRegisterFile: null as File | null,
    taxIdFile: null as File | null,
    storefrontFile: null as File | null,
    confirmDocuments: false,
  });

  // Géocodage réel pour l'Étape 2 Commerçant
  const {
    geoStatus,
    coordinates: geoCoordinates,
    displayName: geoDisplayName,
    setAddress: setGeoAddress,
    handleBlur: handleGeoBlur,
    handleKeyDown: handleGeoKeyDown,
    retry: retryGeocode,
  } = useShopGeocode({
    initialAddress: merchantData.address,
    initialCoordinates: { latitude: merchantData.latitude, longitude: merchantData.longitude },
  });

  // Synchroniser les coordonnées trouvées vers merchantData
  useEffect(() => {
    if (geoCoordinates) {
      setMerchantData((prev) => ({
        ...prev,
        latitude: geoCoordinates.latitude,
        longitude: geoCoordinates.longitude,
      }));
    }
  }, [geoCoordinates]);

  // États Telegram partagés (start / waiting / OTP)
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [normalizedPhone, setNormalizedPhone] = useState<string>('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timers & polling
  const [waitingCountdown, setWaitingCountdown] = useState<number>(600);
  const [otpCountdown, setOtpCountdown] = useState<number>(300);
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const pollingRef = useRef<any>(null);

  // Feedback UI
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setAttemptsLeft] = useState<number | null>(null);

  // Modal Conditions et Confidentialité
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsInitialTab, setTermsInitialTab] = useState<'cgu' | 'privacy'>('cgu');

  useEffect(() => {
    if (searchParams.get('role') === 'merchant') setRole('MERCHANT');
    if (searchParams.get('role') === 'client') setRole('CUSTOMER');
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Timer 10 min Telegram link
  useEffect(() => {
    let timer: any = null;
    const isWaiting =
      (role === 'CUSTOMER' && clientStep === 'WAITING_TELEGRAM') ||
      (role === 'MERCHANT' && merchantAuthStep === 'WAITING_TELEGRAM');

    if (isWaiting && waitingCountdown > 0) {
      timer = setInterval(() => {
        setWaitingCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [role, clientStep, merchantAuthStep, waitingCountdown]);

  // Timer 5 min OTP + 60s cooldown
  useEffect(() => {
    let timer: any = null;
    let resendTimer: any = null;
    const isVerifying =
      (role === 'CUSTOMER' && clientStep === 'VERIFY_OTP') ||
      (role === 'MERCHANT' && merchantAuthStep === 'VERIFY_OTP');

    if (isVerifying) {
      if (otpCountdown > 0) {
        timer = setInterval(() => {
          setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
      }
      if (resendCooldown > 0) {
        resendTimer = setInterval(() => {
          setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
      }
    }
    return () => {
      if (timer) clearInterval(timer);
      if (resendTimer) clearInterval(resendTimer);
    };
  }, [role, clientStep, merchantAuthStep, otpCountdown, resendCooldown]);

  const validateAndNormalizePhone = (input: string): string | null => {
    const raw = input.replace(/[\s.\-()]/g, '');
    const match = raw.match(/^(?:\+213|00213|0)?([567]\d{8})$/);
    if (!match) return null;
    return `+213${match[1]}`;
  };

  /**
   * Démarrer le flux Telegram (Client ou Commerçant)
   */
  const initiateTelegramAuth = async (rawPhone: string) => {
    const normalized = validateAndNormalizePhone(rawPhone);
    if (!normalized) {
      throw new Error('Numéro de mobile algérien invalide (ex: 05 XX XX XX XX, 06 XX... ou 07 XX...).');
    }

    setNormalizedPhone(normalized);
    try {
      const data = await startTelegramAuth(normalized);
      setChallengeId(data.challengeId);
      setDeepLink(data.deepLink);
      setWaitingCountdown(600);
      startPolling(data.challengeId);
    } catch (err: any) {
      if (err.status === 409 || err.code === 'CONFLICT' || err.message?.includes('already')) {
        throw new Error('Ce numéro de téléphone est déjà associé à un compte. Veuillez vous connecter.');
      }
      if (err.status === 429) {
        throw new Error('Trop de demandes. Veuillez patienter avant de réessayer.');
      }
      throw err;
    }
  };

  const startPolling = (cId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await getTelegramChallengeStatus(cId);
        if (res.codeSent || res.status === 'VERIFIED') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (role === 'CUSTOMER') {
            setClientStep('VERIFY_OTP');
          } else {
            setMerchantAuthStep('VERIFY_OTP');
          }
          setOtpCountdown(300);
          setResendCooldown(60);
          setErrorMessage(null);
          setTimeout(() => otpRefs.current[0]?.focus(), 150);
        }
      } catch {
        // Ignorer les erreurs réseau temporaires
      }
    }, 2000);
  };

  /**
   * Soumission du formulaire d'inscription Client (Étape Formulaire)
   */
  const handleClientFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!clientData.fullName.trim()) {
      setErrorMessage('Veuillez renseigner votre nom complet.');
      return;
    }
    // Validation e-mail obligatoire (spécification R0b/F1)
    if (!clientData.email.trim() || !clientData.email.includes('@')) {
      setErrorMessage('L’adresse e-mail est obligatoire et doit être valide.');
      return;
    }
    if (!clientData.acceptTerms) {
      setErrorMessage('Veuillez accepter les Conditions d’utilisation.');
      return;
    }

    setLoading(true);
    try {
      await initiateTelegramAuth(clientData.phone);
      setClientStep('WAITING_TELEGRAM');
    } catch (err: any) {
      setErrorMessage(err.message || 'Impossible d’initialiser l’inscription.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Saisie OTP
   */
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const clean = value.replace(/\D/g, '').slice(0, 6);
      if (clean.length > 0) {
        const newOtp = [...otp];
        clean.split('').forEach((digit, i) => {
          if (i < 6) newOtp[i] = digit;
        });
        setOtp(newOtp);
        const nextIndex = Math.min(clean.length, 5);
        otpRefs.current[nextIndex]?.focus();
        if (clean.length === 6) {
          submitOtp(clean);
        }
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    if (digit && index === 5) {
      const full = newOtp.join('');
      if (full.length === 6) {
        submitOtp(full);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  /**
   * Vérification du code OTP
   */
  const submitOtp = async (codeToSubmit?: string) => {
    const code = codeToSubmit || otp.join('');
    if (code.length !== 6 || !challengeId) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const targetRole = role === 'MERCHANT' ? 'MERCHANT' : 'CUSTOMER';
      await verifyTelegramAuth(challengeId, code, targetRole);

      // Mettre à jour le profil avec les infos saisies
      const fullName = role === 'CUSTOMER' ? clientData.fullName : merchantData.ownerName;
      const email = role === 'CUSTOMER' ? clientData.email : merchantData.email;

      if (fullName || email) {
        await authFetch('/api/users/me', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: fullName.trim() || undefined,
            email: email.trim() || undefined,
          }),
        }).catch((e) => console.warn('Mise à jour profil après OTP:', e));
      }

      if (role === 'CUSTOMER') {
        navigate('/', { replace: true });
      } else {
        // Commerçant : passer à l'étape 2 (Commerce)
        setMerchantAuthStep('AUTH_DONE');
        setMerchantStep(2);
      }
    } catch (err: any) {
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);

      if (err.attemptsLeft !== undefined) {
        setAttemptsLeft(err.attemptsLeft);
        setErrorMessage(`Code incorrect. Il vous reste ${err.attemptsLeft} essai(s).`);
      } else {
        setErrorMessage(err.message || 'Code de vérification invalide.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Commerçant Étape 1 : Soumission initiale
   */
  const handleMerchantStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!merchantData.ownerName.trim()) {
      setErrorMessage('Le nom complet du gérant est requis.');
      return;
    }
    // E-mail obligatoire pour commerçant
    if (!merchantData.email.trim() || !merchantData.email.includes('@')) {
      setErrorMessage('L’adresse e-mail est obligatoire et doit être valide.');
      return;
    }
    if (!merchantData.acceptTerms) {
      setErrorMessage('Veuillez accepter les Conditions d’utilisation.');
      return;
    }

    setLoading(true);
    try {
      await initiateTelegramAuth(merchantData.phone);
      setMerchantAuthStep('WAITING_TELEGRAM');
    } catch (err: any) {
      setErrorMessage(err.message || 'Impossible d’initialiser l’inscription commerçant.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Commerçant Étape 2 : Commerce & Horaires
   */
  const handleMerchantStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!merchantData.shopName.trim()) {
      setErrorMessage('Le nom du commerce est requis.');
      return;
    }
    if (!merchantData.address.trim()) {
      setErrorMessage('L’adresse physique de votre boutique est requise.');
      return;
    }

    setMerchantStep(3);
  };

  /**
   * Commerçant Étape 3 : Documents & Finalisation
   */
  const handleMerchantStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!merchantData.confirmDocuments) {
      setErrorMessage('Veuillez certifier l’exactitude de vos documents.');
      return;
    }

    setLoading(true);

    try {
      // 1. Création de la boutique
      const shopRes = await authFetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: merchantData.shopName.trim(),
          description: `Commerce dans la catégorie ${merchantData.category}${
            merchantData.rcNumber ? ` (RC: ${merchantData.rcNumber})` : ''
          }`,
          address: merchantData.address.trim(),
          latitude: merchantData.latitude,
          longitude: merchantData.longitude,
          phone: merchantData.proPhone || normalizedPhone || '+213555000000',
          openingHours: merchantData.openingHours,
        }),
      });

      const shopData = await shopRes.json();
      if (!shopRes.ok) {
        throw new Error(shopData?.error?.message || 'Impossible d’enregistrer votre commerce.');
      }

      // 2. Upload des documents justificatifs si fournis
      if (
        merchantData.commercialRegisterFile ||
        merchantData.taxIdFile ||
        merchantData.storefrontFile
      ) {
        const formData = new FormData();
        if (merchantData.commercialRegisterFile) {
          formData.append('commercial_register', merchantData.commercialRegisterFile);
        }
        if (merchantData.taxIdFile) {
          formData.append('tax_id', merchantData.taxIdFile);
        }
        if (merchantData.storefrontFile) {
          formData.append('storefront', merchantData.storefrontFile);
        }

        await authFetch('/api/shops/my/documents', {
          method: 'POST',
          body: formData,
        }).catch((docErr) => console.warn('Erreur envoi documents:', docErr));
      }

      // Redirection immédiate vers l'écran de statut commerçant
      navigate('/merchant/status', { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de la finalisation de votre inscription.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="relative min-h-screen w-full bg-ui-auth-bg flex flex-col items-center justify-between px-4 py-8 sm:px-16 font-poppins selection:bg-ui-emerald selection:text-white overflow-x-hidden">
      {/* En-tête */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-4">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-ui-ink hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-[14px] font-medium text-ui-text-80">
          Rejoignez le mouvement anti-gaspillage
        </span>
      </header>

      {/* Carte Blanche Conforme Figma [DECISION HYB: Fond uni #dce1d0] */}
      <main className="relative z-10 bg-white border-[1.5px] border-ui-card-border rounded-[32px] p-6 sm:p-10 shadow-[0px_16px_40px_rgba(11,44,37,0.08)] flex flex-col gap-[20px] my-auto max-w-[560px] w-full">
        {/* Toggle Rôle (uniquement à l'étape initiale) */}
        {((role === 'CUSTOMER' && clientStep === 'FORM') ||
          (role === 'MERCHANT' && merchantStep === 1 && merchantAuthStep === 'FORM')) && (
          <div className="flex items-center justify-start w-full">
            <button
              type="button"
              onClick={() => {
                setRole((r) => (r === 'CUSTOMER' ? 'MERCHANT' : 'CUSTOMER'));
                setErrorMessage(null);
              }}
              className="group inline-flex items-center gap-2 bg-ui-mint hover:bg-ui-mint/80 border border-ui-field-border h-[38px] px-3.5 rounded-full transition shadow-xs cursor-pointer"
            >
              <img src={badgeRoleIcon} alt="Rôle" className="size-4 shrink-0" />
              <span className="text-[13px] font-semibold text-ui-ink">
                {role === 'CUSTOMER' ? 'Compte client' : 'Compte commerçant'}
              </span>
              <span className="text-ui-text-70 text-[13px]">·</span>
              <span className="text-[13px] font-semibold text-ui-emerald group-hover:underline">
                Changer
              </span>
            </button>
          </div>
        )}

        {/* Stepper Commerçant */}
        {role === 'MERCHANT' && (
          <div className="w-full pb-2">
            <Stepper
              current={merchantStep - 1}
              steps={[
                { title: 'Compte' },
                { title: 'Commerce' },
                { title: 'Documents' },
              ]}
            />
          </div>
        )}

        {/* Message d'erreur via Banner */}
        {errorMessage && (
          <Banner
            variant="error"
            description={errorMessage}
            className="w-full text-left"
          />
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PARCOURS CLIENT                                                    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}

        {/* Client Étape 1 : Formulaire */}
        {role === 'CUSTOMER' && clientStep === 'FORM' && (
          <>
            <div className="text-center flex flex-col gap-1 w-full">
              <h1 className="font-semibold text-ui-ink text-2xl sm:text-[32px] leading-tight">
                Créer un compte
              </h1>
              <p className="font-normal text-[15px] text-ui-text-70 leading-normal">
                Profitez d'offres exclusives et sauvez des invendus
              </p>
            </div>

            <form onSubmit={handleClientFormSubmit} className="flex flex-col gap-4 w-full">
              <Field
                label="Nom complet"
                type="text"
                required
                placeholder="Ex : Mohamed Brahimi"
                value={clientData.fullName}
                onChange={(e) => setClientData({ ...clientData, fullName: e.target.value })}
                leftIcon={<Icon name="user" size={18} />}
              />

              <Field
                label="Adresse e-mail"
                type="email"
                required
                placeholder="nom@exemple.dz"
                value={clientData.email}
                onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                helperText="Obligatoire pour les notifications et vos reçus"
              />

              <Field
                label="Numéro de mobile"
                type="tel"
                required
                prefix="+213"
                leftIcon={<Icon name="phone" size={18} />}
                placeholder="05 / 06 / 07 XX XX XX XX"
                value={clientData.phone}
                onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                helperText="Validation sécurisée par code Telegram"
              />

              <div className="flex items-start gap-2.5 pt-1 text-[13px] text-ui-text-70 select-none">
                <input
                  type="checkbox"
                  id="client-terms-checkbox"
                  required
                  checked={clientData.acceptTerms}
                  onChange={(e) => setClientData({ ...clientData, acceptTerms: e.target.checked })}
                  className="mt-0.5 rounded border-ui-field-border text-ui-emerald focus:ring-ui-emerald cursor-pointer"
                />
                <label htmlFor="client-terms-checkbox" className="cursor-pointer leading-normal">
                  J’accepte les{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setTermsInitialTab('cgu');
                      setTermsModalOpen(true);
                    }}
                    className="text-ui-emerald underline font-medium hover:text-[#0b2c25] cursor-pointer inline"
                  >
                    Conditions d’utilisation
                  </button>{' '}
                  et la{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setTermsInitialTab('privacy');
                      setTermsModalOpen(true);
                    }}
                    className="text-ui-emerald underline font-medium hover:text-[#0b2c25] cursor-pointer inline"
                  >
                    Politique de confidentialité
                  </button>.
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                fullWidth
                rightIcon={<img src={arrowRightIcon} alt="" className="size-4 invert" />}
              >
                Continuer avec Telegram
              </Button>
            </form>

            <p className="text-center text-[14px] text-ui-text-70 pt-1">
              Vous avez déjà un compte ?{' '}
              <Link to="/login?role=client" className="font-semibold text-ui-emerald hover:underline">
                Se connecter
              </Link>
            </p>
          </>
        )}

        {/* Client & Commerçant Étape Telegram : Attente bot */}
        {((role === 'CUSTOMER' && clientStep === 'WAITING_TELEGRAM') ||
          (role === 'MERCHANT' && merchantAuthStep === 'WAITING_TELEGRAM')) && (
          <div className="flex flex-col items-center text-center gap-5 w-full">
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  if (pollingRef.current) clearInterval(pollingRef.current);
                  if (role === 'CUSTOMER') setClientStep('FORM');
                  else setMerchantAuthStep('FORM');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ui-text-70 hover:text-ui-ink transition cursor-pointer"
              >
                <img src={arrowLeftIcon} alt="" className="size-4" />
                <span>Modifier les informations</span>
              </button>
              <Chip variant="success">{normalizedPhone}</Chip>
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="font-semibold text-ui-ink text-2xl sm:text-[28px] leading-tight">
                Ouvrez Telegram
              </h2>
              <p className="text-xs sm:text-[14px] text-ui-text-70 max-w-sm mx-auto">
                Confirmez votre numéro avec le bot FORSA pour valider votre compte.
              </p>
            </div>

            {deepLink && (
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-[52px] bg-[#229ED9] hover:bg-[#1E88BE] text-white font-medium text-[16px] rounded-ui-ctl flex items-center justify-center gap-2.5 shadow-sm transition cursor-pointer"
              >
                <img src={figmaSmartPhone} alt="" className="size-5 invert" />
                <span>Ouvrir dans Telegram</span>
              </a>
            )}

            {deepLink && (
              <div className="bg-white p-4 rounded-ui-card border border-ui-card-border shadow-xs flex flex-col items-center gap-2">
                <QRCodeSVG value={deepLink} size={150} level="M" />
                <span className="text-[11px] text-ui-text-70">
                  Ou scannez avec votre smartphone
                </span>
              </div>
            )}

            <div className="flex flex-col items-center gap-2 pt-1 w-full">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-ui-ink bg-ui-mint px-3.5 py-1.5 rounded-full border border-ui-card-border">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex size-full rounded-full bg-ui-emerald opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-ui-emerald" />
                </span>
                <span>En attente de confirmation dans Telegram...</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-ui-text-70">
                <img src={figmaClock} alt="" className="size-3.5 opacity-60" />
                <span>Temps restant : {formatTimer(waitingCountdown)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Client & Commerçant Étape Telegram : Saisie OTP */}
        {((role === 'CUSTOMER' && clientStep === 'VERIFY_OTP') ||
          (role === 'MERCHANT' && merchantAuthStep === 'VERIFY_OTP')) && (
          <div className="flex flex-col items-center text-center gap-5 w-full">
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  if (role === 'CUSTOMER') setClientStep('FORM');
                  else setMerchantAuthStep('FORM');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ui-text-70 hover:text-ui-ink transition cursor-pointer"
              >
                <img src={arrowLeftIcon} alt="" className="size-4" />
                <span>Changer de numéro</span>
              </button>
              <Chip variant="success">{normalizedPhone}</Chip>
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="font-semibold text-ui-ink text-2xl sm:text-[28px] leading-tight">
                Code de confirmation
              </h2>
              <p className="text-xs sm:text-[14px] text-ui-text-70 max-w-sm mx-auto">
                Entrez le code à 6 chiffres reçu sur Telegram
              </p>
            </div>

            <div className="flex justify-center gap-2 sm:gap-3 w-full my-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="size-12 sm:size-14 text-center text-2xl font-bold bg-white border-[1.5px] border-ui-field-border focus:border-2 focus:border-ui-emerald focus:bg-white rounded-ui-ctl text-ui-ink shadow-xs focus:outline-none transition"
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-ui-text-70">
              <img src={figmaClock} alt="" className="size-3.5 opacity-60" />
              <span>Expire dans : <strong className="text-ui-ink">{formatTimer(otpCountdown)}</strong></span>
            </div>

            <Button
              type="button"
              variant="primary"
              disabled={loading || otp.join('').length !== 6}
              onClick={() => submitOtp()}
              loading={loading}
              fullWidth
              rightIcon={<img src={arrowRightIcon} alt="" className="size-4 invert" />}
            >
              Confirmer le compte
            </Button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PARCOURS COMMERÇANT                                                 */}
        {/* ═══════════════════════════════════════════════════════════════════ */}

        {/* Commerçant Étape 1 : Compte & Gérant */}
        {role === 'MERCHANT' && merchantStep === 1 && merchantAuthStep === 'FORM' && (
          <>
            <div className="text-center flex flex-col gap-1 w-full">
              <h1 className="font-semibold text-ui-ink text-2xl sm:text-[32px] leading-tight">
                Étape 1 : Votre compte gérant
              </h1>
              <p className="font-normal text-[15px] text-ui-text-70 leading-normal">
                Informations du responsable de l’établissement
              </p>
            </div>

            <form onSubmit={handleMerchantStep1Submit} className="flex flex-col gap-4 w-full">
              <Field
                label="Nom et prénom du gérant"
                type="text"
                required
                placeholder="Ex : Karim Meziane"
                value={merchantData.ownerName}
                onChange={(e) => setMerchantData({ ...merchantData, ownerName: e.target.value })}
                leftIcon={<Icon name="user" size={18} />}
              />

              <Field
                label="Adresse e-mail professionnelle"
                type="email"
                required
                placeholder="contact@boutique.dz"
                value={merchantData.email}
                onChange={(e) => setMerchantData({ ...merchantData, email: e.target.value })}
                helperText="Sert aux notifications administratives et de validation"
              />

              <Field
                label="Numéro de mobile personnel"
                type="tel"
                required
                prefix="+213"
                leftIcon={<Icon name="phone" size={18} />}
                placeholder="05 / 06 / 07 XX XX XX XX"
                value={merchantData.phone}
                onChange={(e) => setMerchantData({ ...merchantData, phone: e.target.value })}
                helperText="Ce numéro sera vérifié via Telegram"
              />

              <div className="flex items-start gap-2.5 pt-1 text-[13px] text-ui-text-70 select-none">
                <input
                  type="checkbox"
                  id="merchant-terms-checkbox"
                  required
                  checked={merchantData.acceptTerms}
                  onChange={(e) => setMerchantData({ ...merchantData, acceptTerms: e.target.checked })}
                  className="mt-0.5 rounded border-ui-field-border text-ui-emerald focus:ring-ui-emerald cursor-pointer"
                />
                <label htmlFor="merchant-terms-checkbox" className="cursor-pointer leading-normal">
                  J’accepte les{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setTermsInitialTab('cgu');
                      setTermsModalOpen(true);
                    }}
                    className="text-ui-emerald underline font-medium hover:text-[#0b2c25] cursor-pointer inline"
                  >
                    Conditions Générales Commerçant
                  </button>{' '}
                  et la{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setTermsInitialTab('privacy');
                      setTermsModalOpen(true);
                    }}
                    className="text-ui-emerald underline font-medium hover:text-[#0b2c25] cursor-pointer inline"
                  >
                    Politique de confidentialité
                  </button>.
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                fullWidth
                rightIcon={<img src={arrowRightIcon} alt="" className="size-4 invert" />}
              >
                Vérifier le numéro sur Telegram
              </Button>
            </form>

            <p className="text-center text-[14px] text-ui-text-70 pt-1">
              Déjà inscrit ?{' '}
              <Link to="/login?role=merchant" className="font-semibold text-ui-emerald hover:underline">
                Se connecter
              </Link>
            </p>
          </>
        )}

        {/* Commerçant Étape 2 : Commerce, Adresse & MapBox */}
        {role === 'MERCHANT' && merchantStep === 2 && (
          <>
            <div className="text-center flex flex-col gap-1 w-full">
              <h1 className="font-semibold text-ui-ink text-2xl sm:text-[32px] leading-tight">
                Étape 2 : Votre commerce
              </h1>
              <p className="font-normal text-[15px] text-ui-text-70 leading-normal">
                Localisation et détails de votre établissement
              </p>
            </div>

            <form onSubmit={handleMerchantStep2Submit} className="flex flex-col gap-4 w-full">
              <Field
                label="Nom de l'établissement"
                type="text"
                required
                placeholder="Ex : Boulangerie El Baraka"
                value={merchantData.shopName}
                onChange={(e) => setMerchantData({ ...merchantData, shopName: e.target.value })}
                leftIcon={<Icon name="building" size={18} />}
              />

              <Field
                as="select"
                label="Catégorie d'activité"
                value={merchantData.category}
                onChange={(e) => setMerchantData({ ...merchantData, category: e.target.value })}
                options={SHOP_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="N° Registre de commerce"
                  type="text"
                  placeholder="Ex : 16/00-0123456 B 21"
                  value={merchantData.rcNumber}
                  onChange={(e) => setMerchantData({ ...merchantData, rcNumber: e.target.value })}
                  leftIcon={<Icon name="file" size={18} />}
                />

                <Field
                  label="Téléphone du commerce"
                  type="tel"
                  prefix="+213"
                  placeholder="05 / 06 / 07 XX..."
                  value={merchantData.proPhone}
                  onChange={(e) => setMerchantData({ ...merchantData, proPhone: e.target.value })}
                  leftIcon={<Icon name="phone" size={18} />}
                />
              </div>

              {/* Adresse avec géocodage temps réel */}
              <div className="space-y-1">
                <Field
                  label="Adresse de la boutique"
                  type="text"
                  required
                  placeholder="Ex : 12 Rue des Frères Bouadou, Bir Mourad Raïs, Alger"
                  value={merchantData.address}
                  onChange={(e) => {
                    setMerchantData({ ...merchantData, address: e.target.value });
                    setGeoAddress(e.target.value);
                  }}
                  onBlur={handleGeoBlur}
                  onKeyDown={handleGeoKeyDown}
                  leftIcon={<Icon name="pin" size={18} />}
                  helperText="Appuyez sur Entrée ou cliquez hors du champ pour actualiser la position"
                />

                {/* Pastille de statut géocodage */}
                <div className="pt-1 flex items-center justify-between">
                  {geoStatus === 'found' && (
                    <Chip variant="success">Position détectée</Chip>
                  )}
                  {geoStatus === 'searching' && (
                    <Chip variant="neutral">Recherche de la position...</Chip>
                  )}
                  {geoStatus === 'notFound' && (
                    <Chip variant="error">Position non détectée</Chip>
                  )}
                  {geoStatus === 'unavailable' && (
                    <Chip variant="warn">Position à confirmer</Chip>
                  )}
                  {geoCoordinates && (
                    <span className="text-[11px] text-ui-text-70">
                      {geoCoordinates.latitude.toFixed(4)}, {geoCoordinates.longitude.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>

              {/* Aperçu cartographique MapBox */}
              <div className="pt-1">
                <MapBox
                  status={geoStatus === 'found' ? 'ok' : geoStatus === 'unavailable' ? 'down' : 'empty'}
                  position={geoCoordinates ? [geoCoordinates.latitude, geoCoordinates.longitude] : undefined}
                  address={geoDisplayName || merchantData.address}
                  onRetry={retryGeocode}
                />
              </div>

              {/* Horaires d'ouverture */}
              <div className="space-y-2 pt-2 border-t border-ui-field-border">
                <span className="text-[14px] font-medium text-ui-ink">
                  Horaires d'ouverture habituels
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(merchantData.openingHours).map(([dayKey, sched]) => (
                    <div
                      key={dayKey}
                      className="flex items-center justify-between p-2 rounded-ui-ctl bg-stone-50 border border-ui-field-border"
                    >
                      <span className="font-medium text-ui-ink">{DAY_LABELS[dayKey]}</span>
                      <span className="text-ui-text-70">
                        {sched.closed ? 'Fermé' : `${sched.open} - ${sched.close}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setMerchantStep(1)}
                  className="flex-1"
                >
                  Précédent
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  rightIcon={<img src={arrowRightIcon} alt="" className="size-4 invert" />}
                >
                  Continuer vers Documents
                </Button>
              </div>
            </form>
          </>
        )}

        {/* Commerçant Étape 3 : Documents & Dépôt */}
        {role === 'MERCHANT' && merchantStep === 3 && (
          <>
            <div className="text-center flex flex-col gap-1 w-full">
              <h1 className="font-semibold text-ui-ink text-2xl sm:text-[32px] leading-tight">
                Étape 3 : Justificatifs d'activité
              </h1>
              <p className="font-normal text-[15px] text-ui-text-70 leading-normal">
                Déposez vos documents officiels (PDF, JPG, PNG - 5 Mo max)
              </p>
            </div>

            <form onSubmit={handleMerchantStep3Submit} className="flex flex-col gap-4 w-full">
              <Dropzone
                label="1. Registre de commerce (C2)"
                helperText="Extrait du registre de commerce ou carte d'artisan"
                accept=".pdf,.jpg,.jpeg,.png"
                maxBytes={5 * 1024 * 1024}
                value={merchantData.commercialRegisterFile}
                onFile={(f) => setMerchantData({ ...merchantData, commercialRegisterFile: f })}
              />

              <Dropzone
                label="2. Identifiant fiscal (NIF / NIS)"
                helperText="Attestation fiscale ou document d'identification"
                accept=".pdf,.jpg,.jpeg,.png"
                maxBytes={5 * 1024 * 1024}
                value={merchantData.taxIdFile}
                onFile={(f) => setMerchantData({ ...merchantData, taxIdFile: f })}
              />

              <Dropzone
                label="3. Photo de la devanture du commerce"
                helperText="Vue claire de l'enseigne et de l'entrée de la boutique"
                accept=".jpg,.jpeg,.png"
                maxBytes={5 * 1024 * 1024}
                value={merchantData.storefrontFile}
                onFile={(f) => setMerchantData({ ...merchantData, storefrontFile: f })}
              />

              <label className="flex items-start gap-2.5 cursor-pointer select-none text-[13px] text-ui-text-70 pt-2">
                <input
                  type="checkbox"
                  required
                  checked={merchantData.confirmDocuments}
                  onChange={(e) => setMerchantData({ ...merchantData, confirmDocuments: e.target.checked })}
                  className="mt-0.5 rounded border-ui-field-border text-ui-emerald focus:ring-ui-emerald"
                />
                <span>
                  Je certifie sur l’honneur l’authenticité des informations et justificatifs fournis pour mon établissement.
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setMerchantStep(2)}
                  className="flex-1"
                >
                  Précédent
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={!merchantData.confirmDocuments}
                  className="flex-1"
                  rightIcon={<img src={arrowRightIcon} alt="" className="size-4 invert" />}
                >
                  Finaliser la demande
                </Button>
              </div>
            </form>
          </>
        )}
      </main>

      <TermsModal
        isOpen={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        initialTab={termsInitialTab}
        onAccept={() => {
          if (role === 'CUSTOMER') {
            setClientData((prev) => ({ ...prev, acceptTerms: true }));
          } else {
            setMerchantData((prev) => ({ ...prev, acceptTerms: true }));
          }
        }}
      />

      <div className="relative z-10 w-full max-w-6xl h-8" />
    </div>
  );
};
