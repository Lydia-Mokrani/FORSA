import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Button,
  Field,
  Banner,
  Chip,
  Icon,
} from '../../components/ui';

import arrowRightIcon from '../../assets/icons/arrow-right.svg';
import arrowLeftIcon from '../../assets/icons/arrow-left.svg';
import badgeRoleIcon from '../../assets/icons/badge-role-icon.svg';
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
          // Contact validé dans Telegram -> passage immédiat à la saisie du code OTP
          if (pollingRef.current) clearInterval(pollingRef.current);
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
      const data = await verifyTelegramAuth(challengeId, code);

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

    const redirectPath = getPostLoginRedirect(user, role);

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
    <div className="relative min-h-screen w-full bg-ui-auth-bg flex flex-col items-center justify-between px-4 py-8 sm:px-16 font-poppins selection:bg-ui-emerald selection:text-white overflow-x-hidden">
      {/* En-tête Figma */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-4">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-ui-ink hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-[14px] font-medium text-ui-text-80">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* Modal overlay de succès conforme Figma (fond vert sombre semi-transparent) */}
      {isSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ui-ink/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border-[1.5px] border-ui-card-border rounded-ui-card p-8 flex flex-col items-center text-center gap-4 shadow-xl">
            <div className="size-16 rounded-full bg-ui-mint border border-ui-card-border text-ui-emerald flex items-center justify-center shadow-xs">
              <Icon name="check" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-ui-ink">Connexion réussie !</h2>
            <p className="text-sm text-ui-text-70">
              Bienvenue sur FORSA. Redirection en cours...
            </p>
          </div>
        </div>
      )}

      {/* Carte Blanche Conforme Figma [DECISION HYB: Fond uni #dce1d0] */}
      <main className="relative z-10 bg-white border-[1.5px] border-ui-card-border rounded-[32px] p-6 sm:p-10 shadow-[0px_16px_40px_rgba(11,44,37,0.08)] flex flex-col gap-[20px] my-auto max-w-[520px] w-full">
        {/* Toggle Rôle */}
        {step === 'PHONE' && (
          <div className="flex items-center justify-start w-full">
            <button
              type="button"
              onClick={toggleRole}
              className="group inline-flex items-center gap-2 bg-ui-mint hover:bg-ui-mint/80 border border-ui-field-border h-[38px] px-3.5 rounded-full transition shadow-xs cursor-pointer"
            >
              <img src={badgeRoleIcon} alt="Rôle" className="size-4 shrink-0" />
              <span className="text-[13px] font-semibold text-ui-ink">
                {role === 'CUSTOMER' ? 'Espace client' : 'Espace commerçant'}
              </span>
              <span className="text-ui-text-70 text-[13px]">·</span>
              <span className="text-[13px] font-semibold text-ui-emerald group-hover:underline">
                Changer
              </span>
            </button>
          </div>
        )}

        {/* ─── ÉTAPE 1 : Saisie Téléphone ───────────────────────────────────── */}
        {step === 'PHONE' && (
          <>
            <div className="text-center flex flex-col gap-2 w-full">
              <h1 className="font-semibold text-ui-ink text-2xl sm:text-[32px] leading-tight">
                {role === 'CUSTOMER' ? 'Bon retour !' : 'Espace commerçant'}
              </h1>
              <p className="font-normal text-[15px] text-ui-text-70 leading-normal">
                {role === 'CUSTOMER'
                  ? 'Connectez-vous avec votre numéro mobile pour retrouver vos offres'
                  : 'Gérez vos offres et vos réservations'}
              </p>
            </div>

            {/* Message d'erreur via Banner R0 */}
            {errorMessage && (
              <Banner
                variant="error"
                description={errorMessage}
                className="w-full text-left"
              >
                {googleErrorLink && (
                  <div className="mt-2">
                    <Link
                      to={googleErrorLink.href}
                      className="text-[13px] font-semibold text-ui-emerald hover:underline inline-flex items-center gap-1"
                    >
                      {googleErrorLink.text} →
                    </Link>
                  </div>
                )}
              </Banner>
            )}

            <form onSubmit={handleStartTelegram} className="flex flex-col gap-4 w-full">
              <Field
                label="Numéro de mobile"
                type="tel"
                required
                prefix="+213"
                leftIcon={<Icon name="phone" size={18} />}
                placeholder="05 / 06 / 07 XX XX XX XX"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                helperText="Vous recevrez un code de confirmation sur Telegram"
              />

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

            {role === 'MERCHANT' && (
              <Banner
                variant="info"
                description="L’accès commerçant requiert une boutique enregistrée et approuvée par l’équipe FORSA."
              />
            )}

            {/* Séparateur Social Login */}
            <div className="relative flex items-center justify-center w-full my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ui-field-border" />
              </div>
              <span className="relative px-3 bg-white text-[12px] font-medium text-ui-text-70 uppercase tracking-wider">
                ou
              </span>
            </div>

            {/* Boutons Sociaux [DECISION HYB] */}
            <div className="flex flex-col gap-2.5 w-full">
              {/* Google : réservé aux comptes existants, câblage VITE_GOOGLE_CLIENT_ID */}
              <button
                type="button"
                disabled={!isGoogleAvailable || googleLoading}
                onClick={isGoogleAvailable ? handleGoogleLogin : undefined}
                aria-disabled={!isGoogleAvailable}
                className="w-full h-[48px] rounded-ui-ctl border border-ui-field-border bg-white hover:bg-ui-mint/30 text-ui-ink flex items-center justify-center gap-2.5 font-medium text-[14px] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <img src={googleIcon} alt="Google" className="size-5 shrink-0" />
                <span>Continuer avec Google</span>
                {!isGoogleAvailable && (
                  <span className="text-[11px] bg-stone-100 text-ui-text-70 px-2 py-0.5 rounded-full font-normal">
                    Bientôt disponible
                  </span>
                )}
              </button>

              {/* Apple : design only, jamais fonctionnel, no onClick, no fetch */}
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="w-full h-[48px] rounded-ui-ctl border border-ui-field-border bg-stone-50 text-ui-ink/50 flex items-center justify-center gap-2.5 font-medium text-[14px] cursor-not-allowed"
              >
                <img src={appleIcon} alt="Apple" className="size-5 shrink-0 opacity-40" />
                <span>Continuer avec Apple</span>
                <span className="text-[11px] bg-stone-200/60 text-ui-text-70 px-2 py-0.5 rounded-full font-normal">
                  Bientôt disponible
                </span>
              </button>
            </div>

            <p className="text-center text-[14px] text-ui-text-70 pt-1">
              {role === 'CUSTOMER' ? (
                <>
                  Pas encore de compte ?{' '}
                  <Link to="/register?role=client" className="font-semibold text-ui-emerald hover:underline">
                    Créer un compte
                  </Link>
                </>
              ) : (
                <>
                  Nouveau commerçant ?{' '}
                  <Link to="/register?role=merchant" className="font-semibold text-ui-emerald hover:underline">
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
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ui-text-70 hover:text-ui-ink transition cursor-pointer"
              >
                <img src={arrowLeftIcon} alt="" className="size-4" />
                <span>Modifier le numéro</span>
              </button>
              <Chip variant="success">{normalizedPhone}</Chip>
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="font-semibold text-ui-ink text-2xl sm:text-[28px] leading-tight">
                Ouvrez Telegram
              </h2>
              <p className="text-xs sm:text-[14px] text-ui-text-70 max-w-sm mx-auto">
                Confirmez votre numéro avec le bot FORSA pour recevoir votre code à 6 chiffres.
              </p>
            </div>

            {/* Message d'erreur */}
            {errorMessage && (
              <Banner
                variant="error"
                description={errorMessage}
                className="w-full text-left"
              />
            )}

            {/* Bouton direct ouvrir Telegram */}
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

            {/* QR Code pour desktop */}
            {deepLink && (
              <div className="bg-white p-4 rounded-ui-card border border-ui-card-border shadow-xs flex flex-col items-center gap-2">
                <QRCodeSVG value={deepLink} size={150} level="M" />
                <span className="text-[11px] text-ui-text-70">
                  Ou scannez avec votre smartphone
                </span>
              </div>
            )}

            {/* Indicateur de polling & compte à rebours */}
            <div className="flex flex-col items-center gap-2 pt-1 w-full">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-ui-ink bg-ui-mint px-3.5 py-1.5 rounded-full border border-ui-card-border">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex size-full rounded-full bg-ui-emerald opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-ui-emerald" />
                </span>
                <span>En attente de votre confirmation dans Telegram...</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-ui-text-70">
                <img src={figmaClock} alt="" className="size-3.5 opacity-60" />
                <span>Temps restant : {formatTimer(waitingCountdown)}</span>
              </div>
            </div>

            {waitingCountdown === 0 && (
              <button
                type="button"
                onClick={() => handleStartTelegram()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ui-emerald hover:underline cursor-pointer"
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
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ui-text-70 hover:text-ui-ink transition cursor-pointer"
              >
                <img src={arrowLeftIcon} alt="" className="size-4" />
                <span>Changer de numéro</span>
              </button>
              <Chip variant="success">{normalizedPhone}</Chip>
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="font-semibold text-ui-ink text-2xl sm:text-[28px] leading-tight">
                Code de vérification
              </h2>
              <p className="text-xs sm:text-[14px] text-ui-text-70 max-w-sm mx-auto">
                Entrez le code à 6 chiffres envoyé par le bot FORSA sur Telegram
              </p>
            </div>

            {/* Message d'erreur */}
            {errorMessage && (
              <Banner
                variant="error"
                description={errorMessage}
                className="w-full text-left"
              />
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
                  className="size-12 sm:size-14 text-center text-2xl font-bold bg-white border-[1.5px] border-ui-field-border focus:border-2 focus:border-ui-emerald focus:bg-white rounded-ui-ctl text-ui-ink shadow-xs focus:outline-none transition"
                />
              ))}
            </div>

            {/* Compte à rebours & Renvoi */}
            <div className="flex flex-col items-center gap-2 w-full text-xs text-ui-text-70">
              <div className="flex items-center gap-1.5">
                <img src={figmaClock} alt="" className="size-3.5 opacity-60" />
                <span>Le code expire dans : <strong className="text-ui-ink">{formatTimer(otpCountdown)}</strong></span>
              </div>

              <div className="pt-1">
                {resendCooldown > 0 ? (
                  <span className="text-ui-text-70 opacity-60">
                    Renvoyer un code ({resendCooldown}s)
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-ui-emerald hover:underline cursor-pointer disabled:opacity-50"
                  >
                    <img src={figmaRefresh} alt="" className="size-3.5" />
                    <span>Renvoyer un code</span>
                  </button>
                )}
              </div>
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
              Valider le code
            </Button>
          </div>
        )}

        {/* ─── ÉTAPE 4 : Compte verrouillé (5 tentatives erronées) ──────────── */}
        {step === 'LOCKED' && (
          <div className="flex flex-col items-center text-center gap-5 w-full">
            <div className="size-16 rounded-full bg-ui-error-bg border border-ui-error/20 flex items-center justify-center">
              <Icon name="alertc" size={32} />
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="font-semibold text-ui-ink text-2xl sm:text-[28px] leading-tight">
                Tentatives épuisées
              </h2>
              <p className="text-xs sm:text-[14px] text-ui-text-70 max-w-sm mx-auto">
                Par mesure de sécurité, ce défi a été annulé après 5 codes erronés. Veuillez recommencer depuis le début.
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              fullWidth
              onClick={() => {
                setOtp(['', '', '', '', '', '']);
                setStep('PHONE');
                setErrorMessage(null);
                setAttemptsLeft(null);
              }}
            >
              Recommencer
            </Button>
          </div>
        )}
      </main>

      <div className="relative z-10 w-full max-w-6xl h-8" />
    </div>
  );
};
