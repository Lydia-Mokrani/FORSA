import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import loginBg from '../../assets/login-bg.png';
import arrowRightIcon from '../../assets/icons/arrow-right.svg';
import arrowLeftIcon from '../../assets/icons/arrow-left.svg';
import badgeRoleIcon from '../../assets/icons/badge-role-icon.svg';
import infoCircleIcon from '../../assets/icons/information-circle.svg';
import checkmarkIcon from '../../assets/icons/checkmark-circle-02.svg';
import inputPhoneIcon from '../../assets/icons/input-phone.svg';
import figmaAlertCircle from '../../assets/icons/figma/icone-alert-circle.svg';
import figmaClock from '../../assets/icons/figma/icone-clock-01.svg';
import figmaRefresh from '../../assets/icons/figma/icone-refresh.svg';
import figmaSmartPhone from '../../assets/icons/figma/icone-smart-phone-01.svg';

import {
  startTelegramAuth,
  getTelegramChallengeStatus,
  verifyTelegramAuth,
  getPostLoginRedirect,
  AuthUser,
} from './services/authService';

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
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

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
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

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
      setExpiresAt(new Date(data.expiresAt));

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
    // Si l'utilisateur colle une chaîne (ex: 6 chiffres)
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

    // Auto-focus vers la case suivante si un chiffre est saisi
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Soumission automatique si les 6 cases sont remplies
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
      // Nettoyage de l'OTP pour nouvelle saisie
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

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-4 py-8 sm:px-16 font-poppins selection:bg-forsa-leaf selection:text-white overflow-x-hidden">
      {/* Fond photo officiel Figma (Image bokeh feuille verte + overlay #FFFAF0 à 28%) */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img src={loginBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FFFAF0]/28" />
      </div>

      {/* En-tête Figma */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-4">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-[14px] font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* Modal overlay de succès */}
      {isSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-8 flex flex-col items-center text-center gap-4 shadow-2xl border border-emerald-500/30">
            <div className="w-16 h-16 rounded-full bg-[#0B2C25] text-white flex items-center justify-center shadow-md">
              <img src={checkmarkIcon} alt="" className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-[#0B2C25]">Connexion réussie !</h2>
            <p className="text-sm text-[#0B2C25]/75">
              Bienvenue sur FORSA. Redirection en cours...
            </p>
          </div>
        </div>
      )}

      {/* Carte Glassmorphism */}
      <main className="relative z-10 backdrop-blur-[20px] bg-white/40 border-[1.2px] border-white/70 rounded-[32px] p-6 sm:p-12 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] flex flex-col gap-[20px] my-auto max-w-[520px] w-full">
        {/* Toggle Rôle (uniquement à l'étape initiale) */}
        {step === 'PHONE' && (
          <div className="flex items-center justify-start w-full">
            <button
              type="button"
              onClick={toggleRole}
              className="group inline-flex items-center gap-2 bg-white/65 hover:bg-white/85 border border-[#0B2C25]/20 h-[38px] px-3.5 rounded-full transition shadow-sm cursor-pointer"
            >
              <img src={badgeRoleIcon} alt="Rôle" className="w-4 h-4 shrink-0" />
              <span className="text-[13px] font-semibold text-[#0B2C25]">
                {role === 'CUSTOMER' ? 'Espace client' : 'Espace commerçant'}
              </span>
              <span className="text-[#0B2C25]/40 text-[13px]">·</span>
              <span className="text-[13px] font-semibold text-[#17664E] group-hover:underline">
                Changer
              </span>
            </button>
          </div>
        )}

        {/* ─── ÉTAPE 1 : Saisie Téléphone ───────────────────────────────────── */}
        {step === 'PHONE' && (
          <>
            <div className="text-center flex flex-col gap-2 w-full">
              <h1 className="font-semibold text-[#0B2C25] text-2xl sm:text-[34px] leading-tight">
                {role === 'CUSTOMER' ? 'Bon retour !' : 'Espace commerçant'}
              </h1>
              <p className="font-normal text-[15px] text-[#0B2C25]/65 leading-normal">
                {role === 'CUSTOMER'
                  ? 'Connectez-vous avec votre numéro mobile pour retrouver vos offres'
                  : 'Gérez vos offres et vos réservations'}
              </p>
            </div>

            {/* Message d'erreur */}
            {errorMessage && (
              <div className="flex items-center gap-3 bg-[#B22222]/10 border border-[#B22222]/20 text-[#B22222] text-xs sm:text-[13px] p-3.5 rounded-2xl">
                <img src={figmaAlertCircle} alt="" className="w-5 h-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleStartTelegram} className="flex flex-col gap-4 w-full">
              <div className="bg-white/60 focus-within:bg-white/85 border-[1.2px] border-white/90 focus-within:border-[#17664E] rounded-[14px] h-[56px] px-[18px] flex items-center gap-3 transition">
                <img src={inputPhoneIcon} alt="" className="size-5 shrink-0 opacity-60" />
                <span className="text-sm font-semibold text-[#0B2C25]/80 select-none">+213</span>
                <span className="text-[#0B2C25]/30">|</span>
                <input
                  type="tel"
                  required
                  placeholder="05 / 06 / 07 XX XX XX XX"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full bg-transparent text-[#0B2C25] text-[15px] placeholder:text-[#0B2C25]/50 focus:outline-none font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[56px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[17px] rounded-[16px] flex items-center justify-center gap-2.5 shadow-md transition mt-2 cursor-pointer active:scale-[0.99] disabled:opacity-60"
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

            {role === 'MERCHANT' && (
              <div className="flex items-start gap-2.5 bg-white/40 border border-[#0B2C25]/15 rounded-[16px] p-3.5 text-xs text-[#0B2C25]/75">
                <img src={infoCircleIcon} alt="" className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
                <span>L’accès commerçant requiert une boutique enregistrée et approuvée par l’équipe FORSA.</span>
              </div>
            )}

            <p className="text-center text-[14px] text-[#0B2C25]/75 pt-1">
              {role === 'CUSTOMER' ? (
                <>
                  Pas encore de compte ?{' '}
                  <Link to="/register?role=client" className="font-semibold text-[#17664E] hover:underline">
                    Créer un compte
                  </Link>
                </>
              ) : (
                <>
                  Nouveau commerçant ?{' '}
                  <Link to="/register?role=merchant" className="font-semibold text-[#17664E] hover:underline">
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
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B2C25]/70 hover:text-[#0B2C25] transition cursor-pointer"
              >
                <img src={arrowLeftIcon} alt="" className="w-4 h-4" />
                <span>Modifier le numéro</span>
              </button>
              <span className="text-xs font-medium text-[#17664E] bg-[#17664E]/10 px-2.5 py-1 rounded-full">
                {normalizedPhone}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="font-semibold text-[#0B2C25] text-2xl sm:text-[28px] leading-tight">
                Ouvrez Telegram
              </h2>
              <p className="text-xs sm:text-[14px] text-[#0B2C25]/70 max-w-sm mx-auto">
                Confirmez votre numéro avec le bot FORSA pour recevoir votre code à 6 chiffres.
              </p>
            </div>

            {/* Message d'erreur */}
            {errorMessage && (
              <div className="flex items-center gap-3 bg-[#B22222]/10 border border-[#B22222]/20 text-[#B22222] text-xs sm:text-[13px] p-3 rounded-2xl w-full text-left">
                <img src={figmaAlertCircle} alt="" className="w-5 h-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Bouton direct ouvrir Telegram */}
            {deepLink && (
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-[54px] bg-[#229ED9] hover:bg-[#1E88BE] text-white font-medium text-[16px] rounded-[16px] flex items-center justify-center gap-2.5 shadow-md transition cursor-pointer"
              >
                <img src={figmaSmartPhone} alt="" className="w-5 h-5 invert" />
                <span>Ouvrir dans Telegram</span>
              </a>
            )}

            {/* QR Code pour desktop */}
            {deepLink && (
              <div className="bg-white/80 p-4 rounded-[20px] border border-[#0B2C25]/15 shadow-sm flex flex-col items-center gap-2">
                <QRCodeSVG value={deepLink} size={150} level="M" />
                <span className="text-[11px] text-[#0B2C25]/60">
                  Ou scannez avec votre smartphone
                </span>
              </div>
            )}

            {/* Indicateur de polling & compte à rebours */}
            <div className="flex flex-col items-center gap-2 pt-1 w-full">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#0B2C25]/80 bg-white/50 px-3.5 py-1.5 rounded-full border border-[#0B2C25]/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#17664E] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#17664E]" />
                </span>
                <span>En attente de votre confirmation dans Telegram...</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#0B2C25]/60">
                <img src={figmaClock} alt="" className="w-3.5 h-3.5 opacity-60" />
                <span>Temps restant : {formatTimer(waitingCountdown)}</span>
              </div>
            </div>

            {waitingCountdown === 0 && (
              <button
                type="button"
                onClick={() => handleStartTelegram()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#17664E] hover:underline cursor-pointer"
              >
                <img src={figmaRefresh} alt="" className="w-3.5 h-3.5" />
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
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B2C25]/70 hover:text-[#0B2C25] transition cursor-pointer"
              >
                <img src={arrowLeftIcon} alt="" className="w-4 h-4" />
                <span>Changer de numéro</span>
              </button>
              <span className="text-xs font-medium text-[#17664E] bg-[#17664E]/10 px-2.5 py-1 rounded-full">
                {normalizedPhone}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="font-semibold text-[#0B2C25] text-2xl sm:text-[28px] leading-tight">
                Code de vérification
              </h2>
              <p className="text-xs sm:text-[14px] text-[#0B2C25]/70 max-w-sm mx-auto">
                Entrez le code à 6 chiffres envoyé par le bot FORSA sur Telegram
              </p>
            </div>

            {/* Message d'erreur */}
            {errorMessage && (
              <div className="flex items-center gap-3 bg-[#B22222]/10 border border-[#B22222]/20 text-[#B22222] text-xs sm:text-[13px] p-3 rounded-2xl w-full text-left">
                <img src={figmaAlertCircle} alt="" className="w-5 h-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 6 cases OTP */}
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

            {/* Compte à rebours & Renvoi */}
            <div className="flex flex-col items-center gap-2 w-full text-xs text-[#0B2C25]/70">
              <div className="flex items-center gap-1.5">
                <img src={figmaClock} alt="" className="w-3.5 h-3.5 opacity-60" />
                <span>Le code expire dans : <strong className="text-[#0B2C25]">{formatTimer(otpCountdown)}</strong></span>
              </div>

              <div className="pt-1">
                {resendCooldown > 0 ? (
                  <span className="text-[#0B2C25]/50">
                    Renvoyer un code ({resendCooldown}s)
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#17664E] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    <img src={figmaRefresh} alt="" className="w-3.5 h-3.5" />
                    <span>Renvoyer un code</span>
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={loading || otp.join('').length !== 6}
              onClick={() => submitOtp()}
              className="w-full h-[54px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[16px] rounded-[16px] flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span>Vérification...</span>
              ) : (
                <>
                  <span>Valider le code</span>
                  <img src={arrowRightIcon} alt="" className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ─── ÉTAPE 4 : Compte verrouillé (Trop de tentatives) ─────────────── */}
        {step === 'LOCKED' && (
          <div className="flex flex-col items-center text-center gap-5 w-full">
            <div className="w-16 h-16 rounded-full bg-[#B22222]/10 border border-[#B22222]/20 flex items-center justify-center">
              <img src={figmaAlertCircle} alt="" className="w-8 h-8 text-[#B22222]" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="font-semibold text-[#0B2C25] text-2xl sm:text-[28px] leading-tight">
                Tentatives épuisées
              </h2>
              <p className="text-xs sm:text-[14px] text-[#0B2C25]/75 max-w-sm mx-auto">
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
              className="w-full h-[52px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[16px] rounded-[16px] flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
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
