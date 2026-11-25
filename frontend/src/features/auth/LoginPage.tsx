import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowRight } from 'lucide-react';
import {
  Button,
  Field,
  Banner,
  Chip,
  Icon,
} from '../../components/ui';

import arrowRightIcon from '../../assets/icons/arrow-right.svg';
import arrowLeftIcon from '../../assets/icons/arrow-left.svg';
import roleClientIcon from '../../assets/icons/role-client-icon.svg';
import roleMerchantIcon from '../../assets/icons/role-merchant-icon.svg';
import googleIcon from '../../assets/icons/google.svg';
import appleIcon from '../../assets/icons/apple.svg';
import figmaClock from '../../assets/icons/figma/icone-clock-01.svg';
import figmaRefresh from '../../assets/icons/figma/icone-refresh.svg';
import figmaSmartPhone from '../../assets/icons/figma/icone-smart-phone-01.svg';

import {
  startTelegramAuth,
  getTelegramChallengeStatus,
  verifyTelegramAuth,
  loginWithGoogle,
  getPostLoginRedirect,
  switchUserMode,
  setStoredUser,
  AuthUser,
} from './services/authService';
import { mapGoogleAuthError } from './utils/googleAuthError';
import { loadGoogleIdentityScript } from './utils/googleIdentity';

type Step = 'PHONE' | 'WAITING_TELEGRAM' | 'VERIFY_OTP' | 'LOCKED';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialRole = searchParams.get('role') === 'merchant' ? 'MERCHANT' : 'CUSTOMER';
  const [role, setRole] = useState<'CUSTOMER' | 'MERCHANT'>(initialRole);

  // Étape du flux
  const [step, setStep] = useState<Step>('PHONE');

  // Champs & États
  const [phoneInput, setPhoneInput] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);

  // OTP 6 chiffres
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timers & polling
  const [waitingCountdown, setWaitingCountdown] = useState<number>(600); // 10 min
  const [otpCountdown, setOtpCountdown] = useState<number>(300); // 5 min
  const [resendCooldown, setResendCooldown] = useState<number>(60); // 60s
  const pollingRef = useRef<any>(null);

  // Feedback UI
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setAttemptsLeft] = useState<number | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Social Login (Google & Apple - Décisions Hyb)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const [isGisReady, setIsGisReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleErrorLink, setGoogleErrorLink] = useState<{ text: string; href: string } | null>(null);

  // Le bouton Google reste désactivé avec "Bientôt disponible" tant que VITE_GOOGLE_CLIENT_ID
  // est vide ou que le script GIS n'a pas pu être chargé (pas de crash, pas d'erreur console).
  const isGoogleAvailable = Boolean(googleClientId.trim()) && isGisReady;

  const onGoogleCredentialRef = useRef<(cred: string) => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    let isMounted = true;
    if (!googleClientId.trim()) {
      setIsGisReady(false);
      return;
    }

    loadGoogleIdentityScript().then((loaded) => {
      if (!isMounted) return;
      if (loaded && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId.trim(),
            callback: (response) => {
              if (response?.credential) {
                onGoogleCredentialRef.current(response.credential);
              }
            },
          });
          setIsGisReady(true);
        } catch {
          setIsGisReady(false);
        }
      } else {
        setIsGisReady(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [googleClientId]);

  useEffect(() => {
    if (searchParams.get('role') === 'merchant') setRole('MERCHANT');
    if (searchParams.get('role') === 'client') setRole('CUSTOMER');
  }, [searchParams]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Timer 10 min pour l'étape WAITING_TELEGRAM
  useEffect(() => {
    let timer: any = null;
    if (step === 'WAITING_TELEGRAM' && waitingCountdown > 0) {
      timer = setInterval(() => {
        setWaitingCountdown((prev) => {
          if (prev <= 1) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setErrorMessage('Le délai de confirmation Telegram de 10 minutes a expiré. Veuillez réessayer.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, waitingCountdown]);

  // Timer 5 min pour l'étape VERIFY_OTP + Cooldown renvoi 60s
  useEffect(() => {
    let timer: any = null;
    let resendTimer: any = null;

    if (step === 'VERIFY_OTP') {
      if (otpCountdown > 0) {
        timer = setInterval(() => {
          setOtpCountdown((prev) => {
            if (prev <= 1) {
              setErrorMessage('Le code de vérification a expiré.');
              return 0;
            }
            return prev - 1;
          });
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
  }, [step, otpCountdown, resendCooldown]);

  const toggleRole = () => {
    setRole((prev) => (prev === 'CUSTOMER' ? 'MERCHANT' : 'CUSTOMER'));
    setErrorMessage(null);
    setGoogleErrorLink(null);
  };

  /**
   * Validation & normalisation téléphone algérien mobile
   */
  const validateAndNormalizePhone = (input: string): string | null => {
    const raw = input.replace(/[\s.\-()]/g, '');
    const match = raw.match(/^(?:\+213|00213|0)?([567]\d{8})$/);
    if (!match) return null;
    return `+213${match[1]}`;
  };

  /**
   * Étape 1 : Envoi du numéro et initiation Telegram
   */
  const handleStartTelegram = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setGoogleErrorLink(null);

    const normalized = validateAndNormalizePhone(phoneInput);
    if (!normalized) {
      setErrorMessage('Numéro de mobile algérien invalide. Ex : 05 XX XX XX XX, 06 XX... ou 07 XX...');
      return;
    }

    setNormalizedPhone(normalized);
    setLoading(true);

    try {
      const data = await startTelegramAuth(normalized);
      setChallengeId(data.challengeId);
      setDeepLink(data.deepLink);

      // Passer à l'étape d'attente Telegram
      setStep('WAITING_TELEGRAM');
      setWaitingCountdown(600); // 10 min
      setErrorMessage(null);

      // Lancer le polling sur challenges/:id toutes les 2s
      startPollingChallenge(data.challengeId);
    } catch (err: any) {
      if (err.status === 429) {
        const mins = Math.ceil((err.retryAfter || 60) / 60);
        setErrorMessage(`Trop de demandes. Veuillez patienter ${mins} minute(s) avant de réessayer.`);
      } else {
        setErrorMessage(err.message || 'Impossible de contacter le serveur. Vérifiez votre connexion.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Polling statut du défi toutes les 2s
   */
  const startPollingChallenge = (cId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await getTelegramChallengeStatus(cId);

        if (res.status === 'FAILED') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setErrorMessage('La vérification Telegram a échoué. Le contact n’a pas pu être validé.');
          setStep('PHONE');
        } else if (res.status === 'EXPIRED') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setErrorMessage('Le lien Telegram a expiré. Veuillez relancer la connexion.');
          setStep('PHONE');
        } else if (res.codeSent || res.status === 'VERIFIED') {
          // Contact validé dans Telegram -> connexion automatique si autoCode disponible
          if (pollingRef.current) clearInterval(pollingRef.current);
          if ((res as any).autoCode) {
            submitOtp((res as any).autoCode);
            return;
          }
          setStep('VERIFY_OTP');
          setOtpCountdown(300); // 5 min
          setResendCooldown(60);
          setErrorMessage(null);
          // Focus 1er input
          setTimeout(() => otpRefs.current[0]?.focus(), 150);
        }
      } catch {
        // En cas d'erreur réseau temporaire, continuer le polling
      }
    }, 2000);
  };

  /**
   * Gestion de la saisie OTP à 6 chiffres
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
      const fullCode = newOtp.join('');
      if (fullCode.length === 6) {
        submitOtp(fullCode);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const clean = pasted.replace(/\D/g, '').slice(0, 6);
    if (clean.length > 0) {
      const newOtp = ['', '', '', '', '', ''];
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
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  /**
   * Étape 3 : Soumission du code de vérification
   */
  const submitOtp = async (codeToSubmit?: string) => {
    const code = codeToSubmit || otp.join('');
    if (code.length !== 6) {
      setErrorMessage('Veuillez saisir l’intégralité des 6 chiffres du code.');
      return;
    }

    if (!challengeId) {
      setErrorMessage('Session expirée. Veuillez recommencer.');
      setStep('PHONE');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await verifyTelegramAuth(challengeId, code, role);

      // Vérification statut du compte
      if (data.user?.status === 'SUSPENDED') {
        navigate('/account/suspended');
        return;
      }

      handleAuthSuccess(data.user);
    } catch (err: any) {
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);

      if (err.status === 403 || err.code === 'FORBIDDEN') {
        navigate('/account/suspended');
        return;
      }

      if (err.status === 429) {
        setErrorMessage('Trop de demandes. Réessayez dans quelques minutes.');
        return;
      }

      if (err.attemptsLeft !== undefined && err.attemptsLeft <= 0) {
        setStep('LOCKED');
        setErrorMessage('Trop de tentatives incorrectes. Le défi a été verrouillé.');
        return;
      }

      if (err.attemptsLeft !== undefined) {
        setAttemptsLeft(err.attemptsLeft);
        setErrorMessage(`Code incorrect. Il vous reste ${err.attemptsLeft} essai(s).`);
        return;
      }

      setErrorMessage(err.message || 'Code de vérification incorrect ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Renvoi d'un nouveau code / relance
   */
  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return;
    setOtp(['', '', '', '', '', '']);
    setErrorMessage(null);
    setAttemptsLeft(null);
    await handleStartTelegram();
  };

  /**
   * Succès de connexion & redirection
   */
  const handleAuthSuccess = (user: AuthUser) => {
    setIsSuccess(true);
    setErrorMessage(null);

    // Mettre à jour activeMode en local pour synchronisation immédiate
    const targetMode = role === 'MERCHANT' ? 'merchant' : 'customer';
    const updatedUser: AuthUser = {
      ...user,
      activeMode: targetMode,
    };
    setStoredUser(updatedUser);

    // Prévenir le backend du changement de mode actif
    switchUserMode(role).catch(() => {});

    const redirectPath = getPostLoginRedirect(updatedUser, role);

    setTimeout(() => {
      navigate(redirectPath, { replace: true });
    }, 1200);
  };

  /**
   * Câblage Google Identity Services (Lot G1 préparé)
   */
  const onGoogleCredential = async (credential: string) => {
    setGoogleLoading(true);
    setErrorMessage(null);
    setGoogleErrorLink(null);

    try {
      const data = await loginWithGoogle(credential);
      if (data.user?.status === 'SUSPENDED') {
        navigate('/account/suspended');
        return;
      }
      handleAuthSuccess(data.user);
    } catch (err: any) {
      const registerPath = role === 'MERCHANT' ? '/register?role=merchant' : '/register?role=client';
      const mapped = mapGoogleAuthError(err, registerPath);
      setErrorMessage(mapped.message);
      if (mapped.link) {
        setGoogleErrorLink(mapped.link);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    onGoogleCredentialRef.current = onGoogleCredential;
  });

  const handleGoogleLogin = () => {
    if (!isGoogleAvailable || googleLoading) return;
    setErrorMessage(null);
    setGoogleErrorLink(null);
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="bg-gradient-to-b from-[#dce1d0] from-[10.156%] via-[#f3e7c6] via-[66.797%] to-[#787b72] to-[106.64%] flex flex-col items-center justify-center min-h-screen pb-[54px] sm:pb-[66px] pt-[84px] sm:pt-[96px] px-[16px] sm:px-[64px] relative size-full font-poppins selection:bg-[#17664e] selection:text-white overflow-x-hidden">
      {/* En-tête Figma 1030:23481 */}
      <header className="absolute flex h-[32px] items-center justify-between left-[20px] sm:left-[64px] top-[24px] sm:top-[32px] right-[20px] sm:right-[64px] overflow-clip">
        <Link to="/" className="font-extrabold text-[#0b2c25] text-[20px] sm:text-[24px] tracking-tight hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline font-medium text-[14px] text-[rgba(11,44,37,0.85)]">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* Modal overlay de succès conforme Figma */}
      {isSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b2c25]/40 backdrop-blur-xs">
          <div className="w-full max-w-md backdrop-blur-[20px] bg-white/90 border-[1.2px] border-[rgba(255,255,255,0.7)] rounded-[28px] p-8 flex flex-col items-center text-center gap-4 shadow-xl">
            <div className="size-16 rounded-full bg-[#eaf6eb] border border-[#17664e]/20 text-[#17664e] flex items-center justify-center shadow-xs">
              <Icon name="check-success" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-[#0b2c25]">Connexion réussie !</h2>
            <p className="text-sm text-[rgba(11,44,37,0.7)]">
              Bienvenue sur FORSA. Redirection en cours...
            </p>
          </div>
        </div>
      )}

      {/* Carte Verre Miroir Conforme Figma 1030:23484 */}
      <main className="backdrop-blur-[20px] bg-[rgba(255,255,255,0.34)] border-[1.2px] border-[rgba(255,255,255,0.7)] border-solid rounded-[32px] p-[24px] sm:p-[48px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] flex flex-col gap-[20px] sm:gap-[22px] my-auto max-w-[520px] w-full">
        {/* Pastille Toggle Rôle Figma 1030:23486 */}
        {step === 'PHONE' && (
          <div className="flex items-start justify-center w-full">
            <button
              type="button"
              onClick={toggleRole}
              className="bg-[rgba(255,255,255,0.62)] hover:bg-white/80 border border-[rgba(11,44,37,0.2)] flex gap-[8px] items-center justify-center px-[14px] py-[8px] rounded-[24px] transition cursor-pointer"
            >
              <img src={role === 'CUSTOMER' ? roleClientIcon : roleMerchantIcon} alt="" className="size-[16px]" />
              <span className="font-medium text-[#0b2c25] text-[13px]">
                {role === 'CUSTOMER' ? 'Espace client' : 'Espace commerçant'}
              </span>
              <span className="text-[13px] text-[rgba(11,44,37,0.4)]">·</span>
              <span className="font-medium text-[#17664e] hover:underline text-[13px]">
                Changer
              </span>
            </button>
          </div>
        )}

        {/* ─── ÉTAPE 1 : Saisie Téléphone ───────────────────────────────────── */}
        {step === 'PHONE' && (
          <>
            <div className="flex flex-col gap-[8px] items-center text-center w-full">
              <h1 className="font-semibold text-[#0b2c25] text-[26px] sm:text-[34px] leading-tight">
                {role === 'CUSTOMER' ? 'Bon retour !' : 'Espace commerçant'}
              </h1>
              <p className="font-normal text-[14px] sm:text-[15px] text-[rgba(11,44,37,0.65)] leading-relaxed">
                {role === 'CUSTOMER'
                  ? 'Connectez-vous pour retrouver les offres près de chez vous'
                  : 'Gérez vos offres et vos réservations'}
              </p>
            </div>

            {/* Message d'erreur */}
            {errorMessage && (
              <div className="bg-[rgba(253,236,234,0.9)] border border-[#b22222]/30 rounded-[14px] p-3.5 text-[13px] text-[#b22222] w-full text-left">
                <p>{errorMessage}</p>
                {googleErrorLink && (
                  <div className="mt-2">
                    <Link
                      to={googleErrorLink.href}
                      className="text-[13px] font-semibold text-[#17664e] hover:underline inline-flex items-center gap-1"
                    >
                      {googleErrorLink.text} →
                    </Link>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleStartTelegram} className="flex flex-col gap-4 w-full">
              <div className="flex flex-col gap-[6px] w-full text-left">
                <label htmlFor="login-phone" className="text-[13px] font-medium text-[#0b2c25]">
                  Numéro de mobile <span className="text-[#b3261e]">*</span>
                </label>
                <div className="bg-[rgba(255,255,255,0.62)] focus-within:bg-[rgba(255,255,255,0.85)] border-[1.2px] border-[rgba(255,255,255,0.9)] focus-within:border-[#17664e] flex gap-[12px] h-[56px] items-center px-[18px] py-[16px] rounded-[14px] w-full transition shadow-xs">
                  <span className="text-[15px] font-medium text-[#0b2c25] border-r border-[rgba(11,44,37,0.15)] pr-3">
                    +213
                  </span>
                  <input
                    id="login-phone"
                    type="tel"
                    required
                    placeholder="05 / 06 / 07 XX XX XX XX"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-[#0b2c25] text-[15px] placeholder:text-[rgba(11,44,37,0.5)]"
                  />
                </div>
                <p className="text-[12px] text-[rgba(11,44,37,0.55)]">
                  Vous recevrez un code de confirmation sur Telegram
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-[#0b2c25] hover:bg-[#17664e] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-white font-medium text-[16px] sm:text-[17px] transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Chargement...' : 'Continuer avec Telegram'}</span>
                <ArrowRight className="size-5 text-white stroke-[2.2] shrink-0" />
              </button>
            </form>

            {role === 'MERCHANT' && (
              <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.8)] flex gap-[10px] items-center px-[14px] py-[12px] rounded-[14px] w-full text-[13px] text-[rgba(11,44,37,0.75)] leading-normal">
                L’accès commerçant requiert une boutique enregistrée et approuvée par l’équipe FORSA.
              </div>
            )}

            {/* Séparateur Social Login Figma 1030:23497 */}
            <div className="flex gap-[12px] items-center w-full my-1">
              <div className="bg-[rgba(11,44,37,0.15)] flex-1 h-px" />
              <span className="font-normal text-[12px] text-[rgba(11,44,37,0.5)] uppercase tracking-wider">
                ou
              </span>
              <div className="bg-[rgba(11,44,37,0.15)] flex-1 h-px" />
            </div>

            {/* Boutons Sociaux Figma 1030:23501 */}
            <div className="flex gap-[12px] items-center w-full">
              {/* Google */}
              <button
                type="button"
                disabled={!isGoogleAvailable || googleLoading}
                onClick={isGoogleAvailable ? handleGoogleLogin : undefined}
                aria-disabled={!isGoogleAvailable}
                className="bg-[rgba(255,255,255,0.75)] hover:bg-white/90 border border-[rgba(11,44,37,0.25)] flex flex-1 gap-[10px] h-[52px] sm:h-[56px] items-center justify-center px-[16px] py-[14px] rounded-[16px] transition cursor-pointer text-[#0b2c25] font-semibold text-[14px]"
              >
                <img src={googleIcon} alt="Google" className="size-[20px]" />
                <span className="text-[#0b2c25] font-semibold">Google</span>
                {!isGoogleAvailable && (
                  <span className="text-[10px] bg-[#eef7ec] border border-[#235347]/30 text-[#0b2c25] px-1.5 py-0.5 rounded-full font-medium">
                    Bientôt
                  </span>
                )}
              </button>

              {/* Apple */}
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="bg-[rgba(255,255,255,0.75)] border border-[rgba(11,44,37,0.25)] flex flex-1 gap-[10px] h-[52px] sm:h-[56px] items-center justify-center px-[16px] py-[14px] rounded-[16px] text-[#0b2c25] font-semibold text-[14px] cursor-not-allowed"
              >
                <img src={appleIcon} alt="Apple" className="size-[20px]" />
                <span className="text-[#0b2c25] font-semibold">Apple</span>
              </button>
            </div>

            <p className="font-normal text-[14px] text-[rgba(11,44,37,0.7)] text-center w-full pt-1">
              {role === 'CUSTOMER' ? (
                <>
                  Pas encore de compte ?{' '}
                  <Link to="/register?role=client" className="font-semibold text-[#17664e] hover:underline">
                    Créer un compte
                  </Link>
                </>
              ) : (
                <>
                  Nouveau commerçant ?{' '}
                  <Link to="/register?role=merchant" className="font-semibold text-[#17664e] hover:underline">
                    Créer un compte professionnel
                  </Link>
                </>
              )}
            </p>
          </>
        )}

        {/* ─── ÉTAPE 2 : Ouvrir Telegram & QR Code ─────────────────────────── */}
        {step === 'WAITING_TELEGRAM' && (
          <div className="flex flex-col items-center text-center gap-5 w-full">
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  if (pollingRef.current) clearInterval(pollingRef.current);
                  setStep('PHONE');
                }}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[rgba(11,44,37,0.7)] hover:text-[#0b2c25] transition cursor-pointer"
              >
                <img src={arrowLeftIcon} alt="" className="size-4" />
                <span>Modifier le numéro</span>
              </button>
              <span className="bg-[rgba(255,255,255,0.7)] border border-[rgba(11,44,37,0.2)] text-[#0b2c25] text-xs font-semibold px-3 py-1 rounded-full">
                {normalizedPhone}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="font-semibold text-[#0b2c25] text-[24px] sm:text-[28px] leading-tight">
                Ouvrez Telegram
              </h2>
              <p className="text-[13px] sm:text-[14px] text-[rgba(11,44,37,0.65)] max-w-sm mx-auto">
                Confirmez votre numéro avec le bot FORSA pour recevoir votre code à 6 chiffres.
              </p>
            </div>

            {/* Message d'erreur */}
            {errorMessage && (
              <div className="bg-[rgba(253,236,234,0.9)] border border-[#b22222]/30 rounded-[14px] p-3 text-[13px] text-[#b22222] w-full text-left">
                {errorMessage}
              </div>
            )}

            {/* Bouton direct ouvrir Telegram */}
            {deepLink && (
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-[56px] bg-[#229ED9] hover:bg-[#1E88BE] text-white font-medium text-[16px] rounded-[16px] flex items-center justify-center gap-2.5 shadow-sm transition cursor-pointer"
              >
                <img src={figmaSmartPhone} alt="" className="size-5 brightness-0 invert" />
                <span>Ouvrir dans Telegram</span>
              </a>
            )}

            {/* QR Code pour desktop */}
            {deepLink && (
              <div className="backdrop-blur-[10px] bg-[rgba(255,255,255,0.7)] p-4 rounded-[20px] border border-[rgba(255,255,255,0.9)] shadow-xs flex flex-col items-center gap-2">
                <QRCodeSVG value={deepLink} size={150} level="M" />
                <span className="text-[11px] text-[rgba(11,44,37,0.7)]">
                  Ou scannez avec votre smartphone
                </span>
              </div>
            )}

            {/* Indicateur de polling & compte à rebours */}
            <div className="flex flex-col items-center gap-2 pt-1 w-full">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#0b2c25] bg-[rgba(255,255,255,0.7)] px-3.5 py-1.5 rounded-full border border-[rgba(11,44,37,0.18)]">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex size-full rounded-full bg-[#17664e] opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-[#17664e]" />
                </span>
                <span>En attente de votre confirmation dans Telegram...</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[rgba(11,44,37,0.7)]">
                <img src={figmaClock} alt="" className="size-3.5 opacity-60" />
                <span>Temps restant : {formatTimer(waitingCountdown)}</span>
              </div>
            </div>

            {waitingCountdown === 0 && (
              <button
                type="button"
                onClick={() => handleStartTelegram()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#17664e] hover:underline cursor-pointer"
              >
                <img src={figmaRefresh} alt="" className="size-3.5" />
                <span>Générer un nouveau lien</span>
              </button>
            )}
          </div>
        )}

        {/* ─── ÉTAPE 3 : Saisie Code OTP ──────────────────────────────────── */}
        {step === 'VERIFY_OTP' && (
          <div className="flex flex-col items-center text-center gap-5 w-full">
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setStep('PHONE')}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[rgba(11,44,37,0.7)] hover:text-[#0b2c25] transition cursor-pointer"
              >
                <img src={arrowLeftIcon} alt="" className="size-4" />
                <span>Changer de numéro</span>
              </button>
              <span className="bg-[rgba(255,255,255,0.7)] border border-[rgba(11,44,37,0.2)] text-[#0b2c25] text-xs font-semibold px-3 py-1 rounded-full">
                {normalizedPhone}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="font-semibold text-[#0b2c25] text-[24px] sm:text-[28px] leading-tight">
                Code de vérification
              </h2>
              <p className="text-[13px] sm:text-[14px] text-[rgba(11,44,37,0.65)] max-w-sm mx-auto">
                Entrez le code à 6 chiffres envoyé par le bot FORSA sur Telegram
              </p>
            </div>

            {errorMessage && (
              <div className="bg-[rgba(253,236,234,0.9)] border border-[#b22222]/30 rounded-[14px] p-3 text-[13px] text-[#b22222] w-full text-left">
                {errorMessage}
              </div>
            )}

            {/* 6 cases OTP conformes Figma */}
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
                  onPaste={handleOtpPaste}
                  className="size-11 sm:size-13 text-center text-xl sm:text-2xl font-bold bg-[rgba(255,255,255,0.7)] border-[1.5px] border-[rgba(11,44,37,0.22)] focus:border-2 focus:border-[#17664e] focus:bg-white rounded-[14px] text-[#0b2c25] shadow-xs focus:outline-none transition"
                />
              ))}
            </div>

            {/* Compte à rebours & Renvoi */}
            <div className="flex flex-col items-center gap-2 w-full text-xs text-[rgba(11,44,37,0.7)]">
              <div className="flex items-center gap-1.5">
                <img src={figmaClock} alt="" className="size-3.5 opacity-60" />
                <span>Le code expire dans : <strong className="text-[#0b2c25]">{formatTimer(otpCountdown)}</strong></span>
              </div>

              <div className="pt-1">
                {resendCooldown > 0 ? (
                  <span className="text-[rgba(11,44,37,0.6)]">
                    Renvoyer un code ({resendCooldown}s)
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#17664e] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    <img src={figmaRefresh} alt="" className="size-3.5" />
                    <span>Renvoyer un code</span>
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={loading || otp.join('').length !== 6}
              onClick={() => submitOtp()}
              className="bg-[#0b2c25] hover:bg-[#17664e] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-white font-medium text-[16px] sm:text-[17px] transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Validation...' : 'Valider le code'}</span>
              <ArrowRight className="size-5 text-white stroke-[2.2] shrink-0" />
            </button>
          </div>
        )}

        {/* ─── ÉTAPE 4 : Compte verrouillé (5 tentatives erronées) ──────────── */}
        {step === 'LOCKED' && (
          <div className="flex flex-col items-center text-center gap-5 w-full">
            <div className="size-16 rounded-full bg-[rgba(253,236,234,0.9)] border border-[#b22222]/30 flex items-center justify-center text-[#b22222]">
              <Icon name="alertc" size={32} />
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="font-semibold text-[#0b2c25] text-2xl sm:text-[28px] leading-tight">
                Tentatives épuisées
              </h2>
              <p className="text-xs sm:text-[14px] text-[rgba(11,44,37,0.65)] max-w-sm mx-auto">
                Par mesure de sécurité, ce défi a été annulé après 5 codes erronés. Veuillez recommencer depuis le début.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setOtp(['', '', '', '', '', '']);
                setStep('PHONE');
                setErrorMessage(null);
                setAttemptsLeft(null);
              }}
              className="bg-[#0b2c25] hover:bg-[#17664e] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-white font-medium text-[16px] sm:text-[17px] transition shadow-sm cursor-pointer"
            >
              <span>Recommencer</span>
            </button>
          </div>
        )}
      </main>

      <div className="relative z-10 w-full max-w-6xl h-8" />
    </div>
  );
};
