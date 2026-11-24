import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import loginBg from '../../assets/login-bg.png';
import arrowRightIcon from '../../assets/icons/arrow-right.svg';
import arrowLeftIcon from '../../assets/icons/arrow-left.svg';
import uploadIcon from '../../assets/icons/upload-01.svg';
import infoCircleIcon from '../../assets/icons/information-circle.svg';
import inputStoreIcon from '../../assets/icons/input-store.svg';
import inputChevronDownIcon from '../../assets/icons/input-chevron-down.svg';
import inputFileTextIcon from '../../assets/icons/input-file-text.svg';
import inputPinIcon from '../../assets/icons/input-pin-location.svg';
import inputUserIcon from '../../assets/icons/input-user.svg';
import inputMailIcon from '../../assets/icons/input-mail.svg';
import inputPhoneIcon from '../../assets/icons/input-phone.svg';
import badgeRoleIcon from '../../assets/icons/badge-role-icon.svg';
import figmaAlertCircle from '../../assets/icons/figma/icone-alert-circle.svg';
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
    latitude: 36.7588, // Boumerdès / Alger par défaut
    longitude: 3.4756,
    openingHours: DEFAULT_OPENING_HOURS,
    // Étape 3 : Documents
    commercialRegisterFile: null as File | null,
    taxIdFile: null as File | null,
    storefrontFile: null as File | null,
    confirmDocuments: false,
  });

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
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

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
    const data = await startTelegramAuth(normalized);
    setChallengeId(data.challengeId);
    setDeepLink(data.deepLink);
    setWaitingCountdown(600);
    startPolling(data.challengeId);
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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-4 py-8 sm:px-16 font-poppins selection:bg-forsa-leaf selection:text-white overflow-x-hidden">
      {/* Fond photo bokeh */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img src={loginBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FFFAF0]/28" />
      </div>

      {/* En-tête officiel */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-4">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-[14px] font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* Carte Glassmorphism */}
      <main className="relative z-10 w-full max-w-[540px] backdrop-blur-[20px] bg-white/40 border-[1.2px] border-white/70 rounded-[32px] p-6 sm:p-10 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col gap-5 sm:gap-6 my-auto">
        {/* Toggle Client / Commerçant (uniquement à l'étape initiale) */}
        {clientStep === 'FORM' && merchantStep === 1 && merchantAuthStep === 'FORM' && (
          <div className="flex items-center justify-start w-full">
            <button
              type="button"
              onClick={() => {
                setRole((r) => (r === 'CUSTOMER' ? 'MERCHANT' : 'CUSTOMER'));
                setErrorMessage(null);
              }}
              className="group inline-flex items-center gap-2 bg-white/65 hover:bg-white/85 border border-[#0B2C25]/20 h-[38px] px-3.5 rounded-full transition shadow-sm cursor-pointer"
            >
              <img src={badgeRoleIcon} alt="Rôle" className="w-4 h-4 shrink-0" />
              <span className="text-[13px] font-semibold text-[#0B2C25]">
                {role === 'CUSTOMER' ? 'Compte Client' : 'Compte Professionnel'}
              </span>
              <span className="text-[#0B2C25]/40 text-[13px]">·</span>
              <span className="text-[13px] font-semibold text-[#17664E] group-hover:underline">
                Changer
              </span>
            </button>
          </div>
        )}

        {/* ─── INSCRIPTION CLIENT ────────────────────────────────────────── */}
        {role === 'CUSTOMER' && (
          <>
            {clientStep === 'FORM' && (
              <>
                <div className="text-center flex flex-col gap-1.5 w-full">
                  <h1 className="font-semibold text-[#0B2C25] text-2xl sm:text-[32px] leading-tight">
                    Créer mon compte
                  </h1>
                  <p className="font-normal text-[14px] text-[#0B2C25]/65">
                    Rejoignez la communauté FORSA et sauvez vos premiers paniers
                  </p>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-3 bg-[#B22222]/10 border border-[#B22222]/20 text-[#B22222] text-xs sm:text-[13px] p-3 rounded-2xl">
                    <img src={figmaAlertCircle} alt="" className="w-5 h-5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleClientFormSubmit} className="flex flex-col gap-3.5 w-full">
                  {/* Nom complet */}
                  <div className="bg-white/60 focus-within:bg-white/85 border-[1.2px] border-white/90 focus-within:border-[#17664E] rounded-[14px] h-[54px] px-[18px] flex items-center gap-3 transition">
                    <img src={inputUserIcon} alt="" className="size-5 opacity-60 shrink-0" />
                    <input
                      type="text"
                      required
                      placeholder="Nom et prénom"
                      value={clientData.fullName}
                      onChange={(e) => setClientData({ ...clientData, fullName: e.target.value })}
                      className="w-full bg-transparent text-[#0B2C25] text-[15px] placeholder:text-[#0B2C25]/50 focus:outline-none"
                    />
                  </div>

                  {/* Email optionnel */}
                  <div className="bg-white/60 focus-within:bg-white/85 border-[1.2px] border-white/90 focus-within:border-[#17664E] rounded-[14px] h-[54px] px-[18px] flex items-center gap-3 transition">
                    <img src={inputMailIcon} alt="" className="size-5 opacity-60 shrink-0" />
                    <input
                      type="email"
                      placeholder="Adresse e-mail (facultatif)"
                      value={clientData.email}
                      onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                      className="w-full bg-transparent text-[#0B2C25] text-[15px] placeholder:text-[#0B2C25]/50 focus:outline-none"
                    />
                  </div>

                  {/* Numéro de téléphone */}
                  <div className="bg-white/60 focus-within:bg-white/85 border-[1.2px] border-white/90 focus-within:border-[#17664E] rounded-[14px] h-[54px] px-[18px] flex items-center gap-3 transition">
                    <img src={inputPhoneIcon} alt="" className="size-5 opacity-60 shrink-0" />
                    <span className="text-sm font-semibold text-[#0B2C25]/80 select-none">+213</span>
                    <span className="text-[#0B2C25]/30">|</span>
                    <input
                      type="tel"
                      required
                      placeholder="05 / 06 / 07 XX XX XX XX"
                      value={clientData.phone}
                      onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                      className="w-full bg-transparent text-[#0B2C25] text-[15px] placeholder:text-[#0B2C25]/50 focus:outline-none font-medium"
                    />
                  </div>

                  {/* Conditions d'utilisation */}
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs sm:text-[13px] text-[#0B2C25]/80 pt-1">
                    <input
                      type="checkbox"
                      checked={clientData.acceptTerms}
                      onChange={(e) => setClientData({ ...clientData, acceptTerms: e.target.checked })}
                      className="mt-0.5 size-4 rounded border-gray-300 text-[#0B2C25] focus:ring-0 cursor-pointer"
                    />
                    <span>
                      J'accepte les{' '}
                      <span className="font-semibold text-[#17664E] underline">Conditions générales</span> et la{' '}
                      <span className="font-semibold text-[#17664E] underline">Politique de confidentialité</span>.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[54px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[16px] rounded-[16px] flex items-center justify-center gap-2 shadow-md transition mt-2 cursor-pointer active:scale-[0.99] disabled:opacity-60"
                  >
                    {loading ? (
                      <span>Initialisation...</span>
                    ) : (
                      <>
                        <span>Continuer avec Telegram</span>
                        <img src={arrowRightIcon} alt="" className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>

                <p className="text-center text-[13px] text-[#0B2C25]/75 pt-1">
                  Déjà inscrit ?{' '}
                  <Link to="/login?role=client" className="font-semibold text-[#17664E] hover:underline">
                    Se connecter
                  </Link>
                </p>
              </>
            )}

            {/* Étape Telegram Waiting (Client) */}
            {clientStep === 'WAITING_TELEGRAM' && (
              <div className="flex flex-col items-center text-center gap-5 w-full">
                <div className="flex items-center justify-between w-full">
                  <button
                    type="button"
                    onClick={() => {
                      if (pollingRef.current) clearInterval(pollingRef.current);
                      setClientStep('FORM');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B2C25]/70 hover:text-[#0B2C25] cursor-pointer"
                  >
                    <img src={arrowLeftIcon} alt="" className="w-4 h-4" />
                    <span>Retour au formulaire</span>
                  </button>
                  <span className="text-xs font-medium text-[#17664E] bg-[#17664E]/10 px-2.5 py-1 rounded-full">
                    {normalizedPhone}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h2 className="font-semibold text-[#0B2C25] text-2xl sm:text-[28px] leading-tight">
                    Validez sur Telegram
                  </h2>
                  <p className="text-xs sm:text-[14px] text-[#0B2C25]/70 max-w-sm mx-auto">
                    Partagez votre contact avec le bot FORSA pour vérifier votre numéro.
                  </p>
                </div>

                {deepLink && (
                  <a
                    href={deepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-[52px] bg-[#229ED9] hover:bg-[#1E88BE] text-white font-medium text-[15px] rounded-[16px] flex items-center justify-center gap-2.5 shadow-md transition cursor-pointer"
                  >
                    <img src={figmaSmartPhone} alt="" className="w-5 h-5 invert" />
                    <span>Ouvrir dans Telegram</span>
                  </a>
                )}

                {deepLink && (
                  <div className="bg-white/80 p-4 rounded-[20px] border border-[#0B2C25]/15 shadow-sm flex flex-col items-center gap-2">
                    <QRCodeSVG value={deepLink} size={150} level="M" />
                    <span className="text-[11px] text-[#0B2C25]/60">
                      Scannez avec votre téléphone
                    </span>
                  </div>
                )}

                <div className="flex flex-col items-center gap-2 pt-1">
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-[#0B2C25]/80 bg-white/50 px-3.5 py-1.5 rounded-full border border-[#0B2C25]/10">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#17664E] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#17664E]" />
                    </span>
                    <span>En attente de votre confirmation...</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-[#0B2C25]/60">
                    <img src={figmaClock} alt="" className="w-3.5 h-3.5 opacity-60" />
                    <span>Temps restant : {formatTimer(waitingCountdown)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Étape OTP (Client) */}
            {clientStep === 'VERIFY_OTP' && (
              <div className="flex flex-col items-center text-center gap-5 w-full">
                <div className="flex flex-col gap-1.5">
                  <h2 className="font-semibold text-[#0B2C25] text-2xl sm:text-[28px] leading-tight">
                    Code de vérification
                  </h2>
                  <p className="text-xs sm:text-[14px] text-[#0B2C25]/70 max-w-sm mx-auto">
                    Saisissez le code à 6 chiffres envoyé sur votre Telegram
                  </p>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-3 bg-[#B22222]/10 border border-[#B22222]/20 text-[#B22222] text-xs sm:text-[13px] p-3 rounded-2xl w-full text-left">
                    <img src={figmaAlertCircle} alt="" className="w-5 h-5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

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
                      className="w-11 sm:w-13 h-14 sm:h-16 text-center text-2xl font-bold bg-white/70 border-[1.5px] border-[#0B2C25]/25 focus:border-[#17664E] focus:bg-white rounded-2xl text-[#0B2C25] shadow-sm focus:outline-none transition"
                    />
                  ))}
                </div>

                <div className="flex flex-col items-center gap-2 w-full text-xs text-[#0B2C25]/70">
                  <div className="flex items-center gap-1.5">
                    <img src={figmaClock} alt="" className="w-3.5 h-3.5 opacity-60" />
                    <span>Expire dans : <strong className="text-[#0B2C25]">{formatTimer(otpCountdown)}</strong></span>
                  </div>
                  {resendCooldown > 0 ? (
                    <span className="text-[#0B2C25]/50">Renvoyer ({resendCooldown}s)</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => initiateTelegramAuth(clientData.phone)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#17664E] hover:underline cursor-pointer"
                    >
                      <img src={figmaRefresh} alt="" className="w-3.5 h-3.5" />
                      <span>Renvoyer un code</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={loading || otp.join('').length !== 6}
                  onClick={() => submitOtp()}
                  className="w-full h-[52px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[16px] rounded-[16px] flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loading ? <span>Finalisation...</span> : <span>Valider mon inscription</span>}
                </button>
              </div>
            )}
          </>
        )}

        {/* ─── INSCRIPTION COMMERÇANT (3 ÉTAPES) ──────────────────────────── */}
        {role === 'MERCHANT' && (
          <>
            {/* Barre de progression des 3 étapes */}
            <div className="flex items-center justify-between w-full px-2">
              {[
                { num: 1, label: 'Compte' },
                { num: 2, label: 'Commerce' },
                { num: 3, label: 'Documents' },
              ].map((s) => (
                <div key={s.num} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      merchantStep === s.num
                        ? 'bg-[#0B2C25] text-white shadow'
                        : merchantStep > s.num
                        ? 'bg-[#17664E] text-white'
                        : 'bg-white/60 text-[#0B2C25]/50 border border-[#0B2C25]/15'
                    }`}
                  >
                    {merchantStep > s.num ? '✓' : s.num}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:inline ${
                      merchantStep === s.num ? 'text-[#0B2C25]' : 'text-[#0B2C25]/50'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* ÉTAPE 1 COMMERÇANT : Compte gérant */}
            {merchantStep === 1 && (
              <>
                {merchantAuthStep === 'FORM' && (
                  <>
                    <div className="text-center flex flex-col gap-1 w-full">
                      <h1 className="font-semibold text-[#0B2C25] text-2xl sm:text-[30px] leading-tight">
                        Espace professionnel
                      </h1>
                      <p className="font-normal text-[14px] text-[#0B2C25]/65">
                        Étape 1/3 · Informations du responsable légal
                      </p>
                    </div>

                    {errorMessage && (
                      <div className="flex items-center gap-3 bg-[#B22222]/10 border border-[#B22222]/20 text-[#B22222] text-xs sm:text-[13px] p-3 rounded-2xl">
                        <img src={figmaAlertCircle} alt="" className="w-5 h-5 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <form onSubmit={handleMerchantStep1Submit} className="flex flex-col gap-3.5 w-full">
                      <div className="bg-white/60 focus-within:bg-white/85 border-[1.2px] border-white/90 focus-within:border-[#17664E] rounded-[14px] h-[54px] px-[18px] flex items-center gap-3 transition">
                        <img src={inputUserIcon} alt="" className="size-5 opacity-60 shrink-0" />
                        <input
                          type="text"
                          required
                          placeholder="Nom et prénom du gérant"
                          value={merchantData.ownerName}
                          onChange={(e) => setMerchantData({ ...merchantData, ownerName: e.target.value })}
                          className="w-full bg-transparent text-[#0B2C25] text-[15px] placeholder:text-[#0B2C25]/50 focus:outline-none"
                        />
                      </div>

                      <div className="bg-white/60 focus-within:bg-white/85 border-[1.2px] border-white/90 focus-within:border-[#17664E] rounded-[14px] h-[54px] px-[18px] flex items-center gap-3 transition">
                        <img src={inputMailIcon} alt="" className="size-5 opacity-60 shrink-0" />
                        <input
                          type="email"
                          required
                          placeholder="Email professionnel"
                          value={merchantData.email}
                          onChange={(e) => setMerchantData({ ...merchantData, email: e.target.value })}
                          className="w-full bg-transparent text-[#0B2C25] text-[15px] placeholder:text-[#0B2C25]/50 focus:outline-none"
                        />
                      </div>

                      <div className="bg-white/60 focus-within:bg-white/85 border-[1.2px] border-white/90 focus-within:border-[#17664E] rounded-[14px] h-[54px] px-[18px] flex items-center gap-3 transition">
                        <img src={inputPhoneIcon} alt="" className="size-5 opacity-60 shrink-0" />
                        <span className="text-sm font-semibold text-[#0B2C25]/80 select-none">+213</span>
                        <span className="text-[#0B2C25]/30">|</span>
                        <input
                          type="tel"
                          required
                          placeholder="05 / 06 / 07 XX XX XX XX"
                          value={merchantData.phone}
                          onChange={(e) => setMerchantData({ ...merchantData, phone: e.target.value })}
                          className="w-full bg-transparent text-[#0B2C25] text-[15px] placeholder:text-[#0B2C25]/50 focus:outline-none font-medium"
                        />
                      </div>

                      <label className="flex items-start gap-2.5 cursor-pointer text-xs sm:text-[13px] text-[#0B2C25]/80 pt-1">
                        <input
                          type="checkbox"
                          checked={merchantData.acceptTerms}
                          onChange={(e) => setMerchantData({ ...merchantData, acceptTerms: e.target.checked })}
                          className="mt-0.5 size-4 rounded border-gray-300 text-[#0B2C25] focus:ring-0 cursor-pointer"
                        />
                        <span>
                          Je certifie être le représentant légal du commerce et j'accepte les{' '}
                          <span className="font-semibold text-[#17664E] underline">Conditions commerçants</span>.
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-[54px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[16px] rounded-[16px] flex items-center justify-center gap-2 shadow-md transition mt-2 cursor-pointer disabled:opacity-60"
                      >
                        {loading ? <span>Initialisation...</span> : <><span>Vérifier mon numéro sur Telegram</span><img src={arrowRightIcon} alt="" className="w-5 h-5" /></>}
                      </button>
                    </form>

                    <p className="text-center text-[13px] text-[#0B2C25]/75 pt-1">
                      Déjà partenaire ?{' '}
                      <Link to="/login?role=merchant" className="font-semibold text-[#17664E] hover:underline">
                        Se connecter
                      </Link>
                    </p>
                  </>
                )}

                {merchantAuthStep === 'WAITING_TELEGRAM' && (
                  <div className="flex flex-col items-center text-center gap-5 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        setMerchantAuthStep('FORM');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B2C25]/70 hover:text-[#0B2C25] self-start cursor-pointer"
                    >
                      <img src={arrowLeftIcon} alt="" className="w-4 h-4" />
                      <span>Modifier les informations</span>
                    </button>

                    <div className="flex flex-col gap-1.5">
                      <h2 className="font-semibold text-[#0B2C25] text-2xl sm:text-[28px] leading-tight">
                        Validation Telegram
                      </h2>
                      <p className="text-xs sm:text-[14px] text-[#0B2C25]/70 max-w-sm mx-auto">
                        Ouvrez le bot FORSA pour vérifier votre ligne commerçant.
                      </p>
                    </div>

                    {deepLink && (
                      <a
                        href={deepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-[52px] bg-[#229ED9] hover:bg-[#1E88BE] text-white font-medium text-[15px] rounded-[16px] flex items-center justify-center gap-2.5 shadow-md transition cursor-pointer"
                      >
                        <img src={figmaSmartPhone} alt="" className="w-5 h-5 invert" />
                        <span>Ouvrir Telegram</span>
                      </a>
                    )}

                    {deepLink && (
                      <div className="bg-white/80 p-4 rounded-[20px] border border-[#0B2C25]/15 shadow-sm flex flex-col items-center gap-2">
                        <QRCodeSVG value={deepLink} size={150} level="M" />
                        <span className="text-[11px] text-[#0B2C25]/60">Scannez pour valider</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-[#0B2C25]/60">
                      <img src={figmaClock} alt="" className="w-3.5 h-3.5 opacity-60" />
                      <span>Temps restant : {formatTimer(waitingCountdown)}</span>
                    </div>
                  </div>
                )}

                {merchantAuthStep === 'VERIFY_OTP' && (
                  <div className="flex flex-col items-center text-center gap-5 w-full">
                    <h2 className="font-semibold text-[#0B2C25] text-2xl sm:text-[28px] leading-tight">
                      Code de confirmation
                    </h2>
                    <p className="text-xs sm:text-[14px] text-[#0B2C25]/70 max-w-sm mx-auto">
                      Entrez le code reçu sur Telegram pour débloquer l'étape suivante
                    </p>

                    {errorMessage && (
                      <div className="flex items-center gap-3 bg-[#B22222]/10 border border-[#B22222]/20 text-[#B22222] text-xs sm:text-[13px] p-3 rounded-2xl w-full text-left">
                        <img src={figmaAlertCircle} alt="" className="w-5 h-5 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

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
                          className="w-11 sm:w-13 h-14 sm:h-16 text-center text-2xl font-bold bg-white/70 border-[1.5px] border-[#0B2C25]/25 focus:border-[#17664E] focus:bg-white rounded-2xl text-[#0B2C25] shadow-sm focus:outline-none transition"
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={loading || otp.join('').length !== 6}
                      onClick={() => submitOtp()}
                      className="w-full h-[52px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[16px] rounded-[16px] flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <span>Vérification...</span> : <span>Valider & passer au commerce</span>}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ÉTAPE 2 COMMERÇANT : Commerce & Horaires */}
            {merchantStep === 2 && (
              <>
                <div className="text-center flex flex-col gap-1 w-full">
                  <h1 className="font-semibold text-[#0B2C25] text-2xl sm:text-[28px] leading-tight">
                    Votre commerce
                  </h1>
                  <p className="font-normal text-[14px] text-[#0B2C25]/65">
                    Étape 2/3 · Coordonnées et horaires d'ouverture
                  </p>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-3 bg-[#B22222]/10 border border-[#B22222]/20 text-[#B22222] text-xs sm:text-[13px] p-3 rounded-2xl">
                    <img src={figmaAlertCircle} alt="" className="w-5 h-5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleMerchantStep2Submit} className="flex flex-col gap-3.5 w-full">
                  {/* Nom du commerce */}
                  <div className="bg-white/60 focus-within:bg-white/85 border-[1.2px] border-white/90 focus-within:border-[#17664E] rounded-[14px] h-[54px] px-[18px] flex items-center gap-3 transition">
                    <img src={inputStoreIcon} alt="" className="size-5 opacity-60 shrink-0" />
                    <input
                      type="text"
                      required
                      placeholder="Nom de l'établissement (ex: Boulangerie El Yasmine)"
                      value={merchantData.shopName}
                      onChange={(e) => setMerchantData({ ...merchantData, shopName: e.target.value })}
                      className="w-full bg-transparent text-[#0B2C25] text-[15px] placeholder:text-[#0B2C25]/50 focus:outline-none"
                    />
                  </div>

                  {/* Catégorie */}
                  <div className="bg-white/60 focus-within:bg-white/85 border-[1.2px] border-white/90 focus-within:border-[#17664E] rounded-[14px] h-[54px] px-[18px] flex items-center justify-between transition">
                    <select
                      value={merchantData.category}
                      onChange={(e) => setMerchantData({ ...merchantData, category: e.target.value })}
                      className="w-full bg-transparent text-[#0B2C25] text-[15px] focus:outline-none cursor-pointer"
                    >
                      {SHOP_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <img src={inputChevronDownIcon} alt="" className="size-4 opacity-50 shrink-0 pointer-events-none" />
                  </div>

                  {/* Numéro de registre de commerce */}
                  <div className="bg-white/60 focus-within:bg-white/85 border-[1.2px] border-white/90 focus-within:border-[#17664E] rounded-[14px] h-[54px] px-[18px] flex items-center gap-3 transition">
                    <img src={inputFileTextIcon} alt="" className="size-5 opacity-60 shrink-0" />
                    <input
                      type="text"
                      placeholder="N° Registre de commerce (RC)"
                      value={merchantData.rcNumber}
                      onChange={(e) => setMerchantData({ ...merchantData, rcNumber: e.target.value })}
                      className="w-full bg-transparent text-[#0B2C25] text-[15px] placeholder:text-[#0B2C25]/50 focus:outline-none"
                    />
                  </div>

                  {/* Adresse complète */}
                  <div className="bg-white/60 focus-within:bg-white/85 border-[1.2px] border-white/90 focus-within:border-[#17664E] rounded-[14px] h-[54px] px-[18px] flex items-center gap-3 transition">
                    <img src={inputPinIcon} alt="" className="size-5 opacity-60 shrink-0" />
                    <input
                      type="text"
                      required
                      placeholder="Adresse complète (ex: 15 Rue Didouche Mourad, Alger)"
                      value={merchantData.address}
                      onChange={(e) => setMerchantData({ ...merchantData, address: e.target.value })}
                      className="w-full bg-transparent text-[#0B2C25] text-[15px] placeholder:text-[#0B2C25]/50 focus:outline-none"
                    />
                  </div>

                  {/* Horaires d'ouverture (Accordion / Liste Figma) */}
                  <div className="bg-white/50 border border-[#0B2C25]/15 rounded-2xl p-4 flex flex-col gap-2.5">
                    <span className="text-xs font-semibold text-[#0B2C25] flex items-center gap-1.5">
                      <img src={figmaClock} alt="" className="w-3.5 h-3.5 opacity-70" />
                      Horaires d'ouverture habituels
                    </span>

                    <div className="flex flex-col gap-2 pt-1">
                      {Object.entries(merchantData.openingHours).map(([dayKey, sched]) => (
                        <div key={dayKey} className="flex items-center justify-between text-xs py-1 border-b border-[#0B2C25]/5 last:border-0">
                          <span className="font-medium text-[#0B2C25] w-20">{DAY_LABELS[dayKey]}</span>

                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 text-[11px] text-[#0B2C25]/60 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={sched.closed}
                                onChange={(e) => {
                                  setMerchantData({
                                    ...merchantData,
                                    openingHours: {
                                      ...merchantData.openingHours,
                                      [dayKey]: { ...sched, closed: e.target.checked },
                                    },
                                  });
                                }}
                                className="size-3 rounded"
                              />
                              Fermé
                            </label>

                            {!sched.closed && (
                              <div className="flex items-center gap-1">
                                <input
                                  type="time"
                                  value={sched.open}
                                  onChange={(e) => {
                                    setMerchantData({
                                      ...merchantData,
                                      openingHours: {
                                        ...merchantData.openingHours,
                                        [dayKey]: { ...sched, open: e.target.value },
                                      },
                                    });
                                  }}
                                  className="bg-white/70 border border-[#0B2C25]/20 rounded px-1.5 py-0.5 text-xs text-[#0B2C25]"
                                />
                                <span>-</span>
                                <input
                                  type="time"
                                  value={sched.close}
                                  onChange={(e) => {
                                    setMerchantData({
                                      ...merchantData,
                                      openingHours: {
                                        ...merchantData.openingHours,
                                        [dayKey]: { ...sched, close: e.target.value },
                                      },
                                    });
                                  }}
                                  className="bg-white/70 border border-[#0B2C25]/20 rounded px-1.5 py-0.5 text-xs text-[#0B2C25]"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setMerchantStep(1)}
                      className="w-1/3 h-[52px] bg-white/60 hover:bg-white/80 border border-[#0B2C25]/20 text-[#0B2C25] font-medium text-[15px] rounded-[16px] transition cursor-pointer"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      className="flex-1 h-[52px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[15px] rounded-[16px] flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                    >
                      <span>Étape suivante</span>
                      <img src={arrowRightIcon} alt="" className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ÉTAPE 3 COMMERÇANT : Documents légaux */}
            {merchantStep === 3 && (
              <>
                <div className="text-center flex flex-col gap-1 w-full">
                  <h1 className="font-semibold text-[#0B2C25] text-2xl sm:text-[28px] leading-tight">
                    Pièces justificatives
                  </h1>
                  <p className="font-normal text-[14px] text-[#0B2C25]/65">
                    Étape 3/3 · Validation légale de votre dossier
                  </p>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-3 bg-[#B22222]/10 border border-[#B22222]/20 text-[#B22222] text-xs sm:text-[13px] p-3 rounded-2xl">
                    <img src={figmaAlertCircle} alt="" className="w-5 h-5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleMerchantStep3Submit} className="flex flex-col gap-3.5 w-full">
                  {/* Upload Registre de commerce */}
                  <div className="bg-white/60 border border-dashed border-[#0B2C25]/30 rounded-2xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-xs">
                        <img src={uploadIcon} alt="" className="w-5 h-5 text-[#17664E]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#0B2C25]">
                          Registre du Commerce (RC)
                        </span>
                        <span className="text-[11px] text-[#0B2C25]/60">
                          {merchantData.commercialRegisterFile
                            ? merchantData.commercialRegisterFile.name
                            : 'PDF ou image max 5 Mo'}
                        </span>
                      </div>
                    </div>
                    <label className="text-xs font-semibold text-[#17664E] bg-white/80 hover:bg-white px-3 py-1.5 rounded-xl border border-[#17664E]/30 cursor-pointer transition">
                      <span>Parcourir</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setMerchantData({ ...merchantData, commercialRegisterFile: e.target.files[0] });
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Upload Carte Fiscale / NIF / CNI */}
                  <div className="bg-white/60 border border-dashed border-[#0B2C25]/30 rounded-2xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-xs">
                        <img src={uploadIcon} alt="" className="w-5 h-5 text-[#17664E]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#0B2C25]">
                          Carte Fiscale (NIF) ou CNI
                        </span>
                        <span className="text-[11px] text-[#0B2C25]/60">
                          {merchantData.taxIdFile ? merchantData.taxIdFile.name : 'PDF ou image max 5 Mo'}
                        </span>
                      </div>
                    </div>
                    <label className="text-xs font-semibold text-[#17664E] bg-white/80 hover:bg-white px-3 py-1.5 rounded-xl border border-[#17664E]/30 cursor-pointer transition">
                      <span>Parcourir</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setMerchantData({ ...merchantData, taxIdFile: e.target.files[0] });
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Upload Devanture */}
                  <div className="bg-white/60 border border-dashed border-[#0B2C25]/30 rounded-2xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-xs">
                        <img src={uploadIcon} alt="" className="w-5 h-5 text-[#17664E]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#0B2C25]">
                          Photo de la devanture
                        </span>
                        <span className="text-[11px] text-[#0B2C25]/60">
                          {merchantData.storefrontFile ? merchantData.storefrontFile.name : 'Image JPG/PNG'}
                        </span>
                      </div>
                    </div>
                    <label className="text-xs font-semibold text-[#17664E] bg-white/80 hover:bg-white px-3 py-1.5 rounded-xl border border-[#17664E]/30 cursor-pointer transition">
                      <span>Parcourir</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setMerchantData({ ...merchantData, storefrontFile: e.target.files[0] });
                          }
                        }}
                      />
                    </label>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer text-xs sm:text-[13px] text-[#0B2C25]/80 pt-1">
                    <input
                      type="checkbox"
                      checked={merchantData.confirmDocuments}
                      onChange={(e) => setMerchantData({ ...merchantData, confirmDocuments: e.target.checked })}
                      className="mt-0.5 size-4 rounded border-gray-300 text-[#0B2C25] focus:ring-0 cursor-pointer"
                    />
                    <span>
                      Je confirme l'authenticité des pièces justificatives fournies et sollicite l'ouverture de mon compte commerçant.
                    </span>
                  </label>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setMerchantStep(2)}
                      className="w-1/3 h-[52px] bg-white/60 hover:bg-white/80 border border-[#0B2C25]/20 text-[#0B2C25] font-medium text-[15px] rounded-[16px] transition cursor-pointer"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 h-[52px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[15px] rounded-[16px] flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-60"
                    >
                      {loading ? <span>Envoi du dossier...</span> : <><span>Soumettre mon dossier</span><img src={arrowRightIcon} alt="" className="w-5 h-5" /></>}
                    </button>
                  </div>
                </form>
              </>
            )}
          </>
        )}
      </main>

      <div className="relative z-10 w-full max-w-6xl h-8" />
    </div>
  );
};
