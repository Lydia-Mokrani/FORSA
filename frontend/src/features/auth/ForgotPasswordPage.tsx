import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import arrowRightIcon from '../../assets/icons/arrow-right.svg';
import arrowLeftIcon from '../../assets/icons/arrow-left.svg';
import mailIcon from '../../assets/icons/input-mail.svg';
import mailSentIcon from '../../assets/icons/illustration-mail-sent.svg';
import { startEmailRecovery } from './services/authService';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Veuillez saisir votre adresse e-mail.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await startEmailRecovery(email.trim());
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l’envoi de la demande.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#dce1d0] from-[10.156%] via-[#f3e7c6] via-[66.797%] to-[#787b72] to-[106.64%] flex flex-col items-center justify-center min-h-screen pb-[66px] pt-[96px] px-[16px] sm:px-[64px] relative size-full font-poppins selection:bg-[#17664e] selection:text-white">
      {/* En-tête Figma 1030:23919 */}
      <header className="absolute flex h-[32px] items-center justify-between left-[20px] sm:left-[64px] top-[24px] sm:top-[32px] right-[20px] sm:right-[64px] overflow-clip">
        <Link to="/" className="font-extrabold text-[#0b2c25] text-[20px] sm:text-[24px] tracking-tight">
          FORSA
        </Link>
        <span className="hidden sm:inline font-medium text-[14px] text-[rgba(11,44,37,0.85)]">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* ─── ÉCRAN 17 : Mot de passe oublié (Figma 1030:23917) ─── */}
      {!sent ? (
        <main className="backdrop-blur-[20px] bg-[rgba(255,255,255,0.34)] border-[1.2px] border-[rgba(255,255,255,0.7)] flex flex-col gap-[22px] items-start p-[28px] sm:p-[48px] rounded-[32px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] w-full max-w-[520px]">
          <div className="flex flex-col gap-[8px] items-center text-center w-full">
            <h1 className="font-semibold text-[#0b2c25] text-[26px] sm:text-[34px] leading-tight">
              Mot de passe oublié ?
            </h1>
            <p className="font-normal text-[14px] sm:text-[15px] text-[rgba(11,44,37,0.65)] leading-relaxed">
              Saisissez votre adresse e-mail, nous vous enverrons un lien pour le réinitialiser.
            </p>
          </div>

          {error && (
            <div className="bg-[#fdecea] border border-[#b22222]/20 text-[#b22222] text-xs sm:text-sm rounded-xl p-3 w-full text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-[14px] w-full">
            <div className="bg-[rgba(255,255,255,0.62)] border-[1.2px] border-[rgba(255,255,255,0.9)] flex gap-[12px] h-[56px] items-center px-[18px] py-[16px] rounded-[14px] w-full focus-within:border-[#17664e] focus-within:bg-white transition">
              <img src={mailIcon} alt="" className="size-[20px] shrink-0 opacity-70" />
              <input
                type="email"
                required
                placeholder="Adresse e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-[#0b2c25] placeholder:text-[rgba(11,44,37,0.5)] text-[15px]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-[#0b2c25] hover:bg-[#17664e] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-white font-medium text-[16px] sm:text-[17px] transition shadow-sm cursor-pointer disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Envoi en cours...' : 'Envoyer le lien'}</span>
              <img src={arrowRightIcon} alt="" className="size-[20px]" />
            </button>
          </form>

          <Link
            to="/login"
            className="flex gap-[6px] items-center justify-center w-full text-[#17664e] hover:underline font-medium text-[14px] transition py-1"
          >
            <img src={arrowLeftIcon} alt="" className="size-[16px]" />
            <span>Retour à la connexion</span>
          </Link>
        </main>
      ) : (
        /* ─── ÉCRAN 18 : Lien de réinitialisation envoyé (Figma 1030:23932) ─── */
        <main className="backdrop-blur-[20px] bg-[rgba(255,255,255,0.34)] border-[1.2px] border-[rgba(255,255,255,0.7)] flex flex-col gap-[22px] items-start p-[28px] sm:p-[48px] rounded-[32px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.1)] w-full max-w-[520px]">
          <div className="flex items-start justify-center w-full">
            <div className="bg-[#eaf6eb] flex items-center justify-center rounded-[48px] size-[80px] sm:size-[96px]">
              <img src={mailSentIcon} alt="" className="size-[40px] sm:size-[48px]" />
            </div>
          </div>

          <div className="flex flex-col gap-[8px] items-center text-center w-full">
            <h1 className="font-semibold text-[#0b2c25] text-[26px] sm:text-[34px] leading-tight">
              E-mail envoyé
            </h1>
            <p className="font-normal text-[14px] sm:text-[15px] text-[rgba(11,44,37,0.65)] leading-relaxed">
              Si un compte existe pour <strong className="text-[#0b2c25]">{email}</strong>, vous recevrez un lien de réinitialisation dans quelques minutes.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <Link
              to="/login"
              className="bg-[#0b2c25] hover:bg-[#17664e] flex gap-[10px] h-[56px] items-center justify-center px-[24px] py-[16px] rounded-[16px] w-full text-white font-medium text-[16px] sm:text-[17px] transition shadow-sm"
            >
              <span>Retour à la connexion</span>
              <img src={arrowRightIcon} alt="" className="size-[20px]" />
            </Link>

            <p className="font-normal text-[14px] text-[rgba(11,44,37,0.7)] text-center w-full pt-1">
              Rien reçu ?{' '}
              <button
                type="button"
                onClick={() => setSent(false)}
                className="font-semibold text-[#17664e] hover:underline cursor-pointer"
              >
                Renvoyer le lien
              </button>
            </p>
          </div>
        </main>
      )}
    </div>
  );
};
