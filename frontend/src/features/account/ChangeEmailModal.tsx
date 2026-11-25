import React, { useState } from 'react';
import { Mail, CheckCircle2, X, Send } from 'lucide-react';

interface ChangeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
  onSuccess: (newEmail: string) => void;
}

export const ChangeEmailModal: React.FC<ChangeEmailModalProps> = ({
  isOpen,
  onClose,
  currentEmail,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [newEmail, setNewEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      setError('Veuillez renseigner une adresse e-mail valide.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      setError('Le code de confirmation doit comporter 6 chiffres.');
      return;
    }
    setError('');
    setStep(3);
    setTimeout(() => {
      onSuccess(newEmail);
      handleClose();
    }, 1500);
  };

  const handleClose = () => {
    setStep(1);
    setNewEmail('');
    setOtpCode('');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-poppins"
      data-node-id="994:15622"
      data-name="Desktop · Modal — Changer d’e-mail"
    >
      <div className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 sm:p-8 max-w-md w-full shadow-xl relative animate-scale-in">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 cursor-pointer p-1"
          aria-label="Fermer"
        >
          <X className="size-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="size-11 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#17664e]">
            <Mail className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-xl text-[#0b2c25]">
              Changer d’adresse e-mail
            </h3>
            <p className="text-xs text-[#0b2c25]/70">
              Étape {step} sur 2
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#fdecea] border border-[#f2b8b3] text-[#b3261e] text-xs">
            {error}
          </div>
        )}

        {/* Step 1: Input new email */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b2c25] mb-1">
                Adresse e-mail actuelle
              </label>
              <div className="px-3.5 py-2.5 rounded-xl bg-[#ebeee1] text-xs text-[#0b2c25] font-medium">
                {currentEmail}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b2c25] mb-1">
                Nouvelle adresse e-mail *
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nouvelle.adresse@exemple.dz"
                className="w-full h-11 px-3.5 rounded-xl border border-[#dbf0dd] focus:border-[#17664e] focus:ring-2 focus:ring-[#17664e]/20 outline-none text-sm transition-all"
              />
            </div>

            <p className="text-xs text-[#0b2c25]/65">
              Un code de vérification vous sera envoyé sur cette nouvelle adresse.
            </p>

            <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#0b2c25] hover:bg-stone-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#0b2c25] hover:bg-[#12443a] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="size-3.5" />
                <span>Envoyer le code</span>
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Input OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="p-3 rounded-xl bg-[#eef7ec] border border-[#dbf0dd] text-xs text-[#17664e]">
              Code envoyé à <strong>{newEmail}</strong>.
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b2c25] mb-1">
                Code de vérification (6 chiffres) *
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full h-12 px-3.5 rounded-xl border border-[#dbf0dd] focus:border-[#17664e] focus:ring-2 focus:ring-[#17664e]/20 outline-none text-center font-mono text-xl tracking-widest transition-all"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[#0b2c25]/75">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="hover:underline cursor-pointer"
              >
                Modifier l’adresse
              </button>
              <button
                type="button"
                onClick={() => alert('Code renvoyé')}
                className="text-[#17664e] font-semibold hover:underline cursor-pointer"
              >
                Renvoyer le code
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#0b2c25] hover:bg-stone-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#0b2c25] hover:bg-[#12443a] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="size-3.5" />
                <span>Valider le changement</span>
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="size-14 text-[#17664e] mb-3 animate-bounce" />
            <h4 className="font-semibold text-lg text-[#0b2c25] mb-1">
              Adresse e-mail mise à jour !
            </h4>
            <p className="text-xs text-[#0b2c25]/70">
              Votre nouvelle adresse <strong>{newEmail}</strong> est maintenant active.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
