import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import loginBg from '../../assets/login-bg.png';

export const VerifyPhonePage: React.FC = () => {
  const navigate = useNavigate();
  const [digits, setDigits] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [timer, setTimer] = useState(45);

  useEffect(() => {
    // Demander l'envoi du code OTP au chargement
    const requestOtp = async () => {
      const token = localStorage.getItem('forsa_access_token');
      if (!token) return;

      try {
        const res = await fetch('/api/users/verify-phone/request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.simulatedCode) {
          setSimulatedCode(data.simulatedCode);
        }
      } catch (e) {
        // Mode hors ligne / dev
      }
    };

    requestOtp();

    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 4) {
      setErrorMessage('Veuillez saisir le code complet à 4 chiffres.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('forsa_access_token');
      const response = await fetch('/api/users/verify-phone/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Code de vérification incorrect ou expiré.');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Code incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-8 sm:px-8 font-poppins selection:bg-forsa-leaf selection:text-white overflow-x-hidden">
      <div aria-hidden className="absolute inset-0 pointer-events-none -z-10">
        <img src={loginBg} alt="Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FFFAF0]/25 backdrop-blur-[2px]" />
      </div>

      <header className="w-full max-w-6xl flex items-center justify-between mb-8 sm:mb-12 px-2 sm:px-6">
        <Link to="/" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-xs sm:text-sm font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      <main className="w-full max-w-[480px] backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[32px] p-6 sm:p-10 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col gap-6 text-center">
        
        <div className="w-16 h-16 mx-auto rounded-full bg-white/60 border border-[#0B2C25]/15 flex items-center justify-center text-[#17664E] shadow-sm">
          <Phone className="w-8 h-8" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-[32px] font-semibold text-[#0B2C25]">
            Confirmez votre numéro
          </h1>
          <p className="text-xs sm:text-[15px] text-[#0B2C25]/65">
            Saisissez le code à 4 chiffres envoyé sur votre téléphone portable.
          </p>
        </div>

        {simulatedCode && (
          <div className="bg-emerald-500/10 border border-emerald-600/30 text-[#0B2C25] text-xs sm:text-sm p-3 rounded-2xl">
            💡 <strong>Code de démonstration WAMS :</strong> [ <span className="font-mono font-bold text-base text-[#17664E]">{simulatedCode}</span> ]
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-800 text-xs sm:text-sm px-4 py-3 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center gap-3 py-4 text-[#17664E]">
            <CheckCircle2 className="w-12 h-12" />
            <p className="font-semibold text-base sm:text-lg">Numéro validé avec succès !</p>
            <p className="text-xs text-[#0B2C25]/60">Redirection vers l'accueil...</p>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-6">
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              {[0, 1, 2, 3].map((index) => (
                <input
                  key={index}
                  id={`otp-input-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digits[index]}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-14 h-16 sm:w-16 sm:h-18 bg-white/70 border-[1.5px] border-white/95 focus:border-[#17664E] rounded-2xl text-center text-2xl font-bold text-[#0B2C25] focus:outline-none shadow-sm transition"
                />
              ))}
            </div>

            <p className="text-xs text-[#0B2C25]/70">
              {timer > 0 ? (
                <>Rien reçu ? Renvoyer le code ({`00:${timer < 10 ? `0${timer}` : timer}`})</>
              ) : (
                <button
                  type="button"
                  onClick={() => setTimer(45)}
                  className="font-semibold text-[#17664E] hover:underline"
                >
                  Renvoyer un nouveau code
                </button>
              )}
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-[#0B2C25] hover:bg-[#0B2C25]/90 text-white font-medium text-base rounded-[16px] flex items-center justify-center gap-2 shadow-md transition"
            >
              {loading ? 'Validation...' : 'Valider'}
            </button>
          </form>
        )}

        <Link
          to="/"
          className="inline-flex items-center justify-center gap-1.5 text-xs text-[#0B2C25]/60 hover:text-[#0B2C25] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Passer pour l'instant</span>
        </Link>
      </main>

      <footer className="mt-8 sm:mt-12 text-center text-xs text-[#0B2C25]/60">
        © 2026 FORSA (فرصة) · Plateforme anti-gaspillage alimentaire
      </footer>
    </div>
  );
};
