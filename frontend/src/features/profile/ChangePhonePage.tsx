import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import phoneIcon from '../../assets/icons/input-phone.svg';
import arrowRightIcon from '../../assets/icons/arrow-right.svg';
import checkmarkIcon from '../../assets/icons/checkmark-circle-02.svg';
import { startPhoneChange, verifyPhoneChange, getStoredUser } from '../auth/services/authService';

export const ChangePhonePage: React.FC = () => {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [step, setStep] = useState<'INPUT' | 'OTP' | 'SUCCESS'>('INPUT');
  const [newPhone, setNewPhone] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) {
      setError('Veuillez saisir votre nouveau numéro de téléphone.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await startPhoneChange();
      setChallengeId(res.challengeId);
      setStep('OTP');
    } catch (err: any) {
      setError(err?.message || 'Numéro invalide ou déjà utilisé.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const updated = [...otp];
    updated[index] = clean;
    setOtp(updated);

    if (clean && index < 5) {
      document.getElementById(`change-phone-otp-${index + 1}`)?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6 || !challengeId) return;

    setLoading(true);
    setError(null);
    try {
      await verifyPhoneChange(challengeId, code, newPhone.trim());
      setStep('SUCCESS');
      setTimeout(() => navigate('/profile'), 2000);
    } catch (err: any) {
      setError(err?.message || 'Code erroné ou expiré. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#fffaf0] min-h-screen flex flex-col items-center justify-start p-4 sm:p-8 font-poppins selection:bg-[#17664e] selection:text-white">
      <div className="w-full max-w-lg bg-white border border-[#dbf0dd] rounded-[24px] p-6 sm:p-8 shadow-sm flex flex-col gap-6 mt-4 sm:mt-10">
        {step === 'INPUT' && (
          <>
            <div className="flex flex-col gap-1 text-center">
              <h1 className="font-semibold text-[#0b2c25] text-2xl">
                Changer de numéro de téléphone
              </h1>
              <p className="text-sm text-[rgba(11,44,37,0.65)]">
                Numéro actuel : <strong className="text-[#0b2c25]">{user?.phoneE164 || 'Non renseigné'}</strong>
              </p>
            </div>

            {error && (
              <div className="bg-[#fdecea] border border-[#b22222]/20 text-[#b22222] text-xs sm:text-sm rounded-xl p-3 w-full text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleStart} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b2c25]">
                  Nouveau numéro (+213)
                </label>
                <div className="flex items-center gap-3 border border-[rgba(11,44,37,0.22)] focus-within:border-[#17664e] rounded-xl px-4 h-12 bg-white transition">
                  <img src={phoneIcon} alt="" className="size-5 opacity-60" />
                  <input
                    type="tel"
                    required
                    placeholder="05 50 12 34 56"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-[#0b2c25]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#0b2c25] hover:bg-[#17664e] text-white font-medium text-sm rounded-xl h-12 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? 'Envoi...' : 'Envoyer le code'}</span>
                  <img src={arrowRightIcon} alt="" className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="w-full h-12 rounded-xl border border-[rgba(11,44,37,0.3)] text-[#0b2c25] font-medium text-sm hover:bg-stone-50 transition cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'OTP' && (
          <div className="flex flex-col gap-5 items-center text-center">
            <h2 className="font-semibold text-[#0b2c25] text-2xl">
              Code de confirmation
            </h2>
            <p className="text-sm text-[rgba(11,44,37,0.65)]">
              Saisissez le code à 6 chiffres envoyé au <strong className="text-[#0b2c25]">{newPhone}</strong>
            </p>

            {error && (
              <div className="bg-[#fdecea] border border-[#b22222]/20 text-[#b22222] text-xs sm:text-sm rounded-xl p-3 w-full text-center">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-center w-full">
              {otp.map((d, idx) => (
                <input
                  key={idx}
                  id={`change-phone-otp-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  className="size-11 sm:size-12 text-center text-xl font-bold bg-white border border-[rgba(11,44,37,0.22)] focus:border-2 focus:border-[#17664e] rounded-xl text-[#0b2c25] focus:outline-none transition"
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleVerify}
              disabled={loading || otp.join('').length !== 6}
              className="w-full bg-[#0b2c25] hover:bg-[#17664e] text-white font-medium text-sm rounded-xl h-12 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Vérification...' : 'Confirmer le nouveau numéro'}</span>
            </button>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="size-20 rounded-full bg-[#eaf6eb] flex items-center justify-center">
              <img src={checkmarkIcon} alt="" className="size-10" />
            </div>
            <h2 className="font-semibold text-[#0b2c25] text-2xl">
              Numéro mis à jour !
            </h2>
            <p className="text-sm text-[rgba(11,44,37,0.65)]">
              Votre numéro a été mis à jour avec succès. Redirection vers votre profil...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
