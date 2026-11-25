import React, { useState } from 'react';
import { Lock, Mail, CheckCircle2, X, Send, Loader2, KeyRound } from 'lucide-react';
import { startEmailRecovery, verifyEmailRecovery } from '../auth/services/authService';

interface PasswordRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export const PasswordRecoveryModal: React.FC<PasswordRecoveryModalProps> = ({
  isOpen,
  onClose,
  email,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleStartRecovery = async () => {
    if (!email) {
      setError('Veuillez d’abord renseigner une adresse e-mail vérifiée dans votre profil.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await startEmailRecovery(email);
      setStep(2);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l’envoi du lien de récupération.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      setError('Le code de récupération doit comporter 6 chiffres.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await verifyEmailRecovery(email, code);
      setStep(3);
    } catch (err: any) {
      setError(err?.message || 'Code de récupération invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setCode('');
    setError('');
    setLoading(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-poppins text-[#0B2C25]"
      data-node-id="password-recovery-modal"
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
            <Lock className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-xl text-[#0b2c25]">
              Sécurité du mot de passe
            </h3>
            <p className="text-xs text-[#0b2c25]/70">
              Récupération sécurisée par e-mail
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#fdecea] border border-[#f2b8b3] text-[#b3261e] text-xs">
            {error}
          </div>
        )}

        {/* Step 1: Explanation and send code */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-[#eef7ec] border border-[#dbf0dd] text-xs text-[#17664e] leading-relaxed">
              <div className="flex items-start gap-2.5">
                <KeyRound className="size-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1 text-[#0b2c25]">
                    Authentification FORSA sans mot de passe
                  </p>
                  <p className="text-xs text-[#0b2c25]/75">
                    Votre compte est sécurisé par Telegram OTP et votre adresse e-mail de confiance.
                    En cas de perte d’accès, vous pouvez recevoir un code de réinitialisation d’urgence sur votre e-mail.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b2c25] mb-1">
                E-mail de récupération associé
              </label>
              <div className="px-3.5 py-2.5 rounded-xl bg-[#ebeee1] text-xs text-[#0b2c25] font-medium flex items-center gap-2">
                <Mail className="size-4 text-[#17664e]" />
                <span>{email || 'maison.gourmande@forsa.dz'}</span>
              </div>
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
                type="button"
                disabled={loading}
                onClick={handleStartRecovery}
                className="px-5 py-2.5 rounded-xl bg-[#0b2c25] hover:bg-[#12443a] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                <span>Envoyer le code de récupération</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Input code */}
        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
            <div className="p-3 rounded-xl bg-[#eef7ec] border border-[#dbf0dd] text-xs text-[#17664e]">
              Un code de sécurité a été envoyé à <strong>{email}</strong>.
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b2c25] mb-1">
                Code reçu par e-mail (6 chiffres) *
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full h-12 px-3.5 rounded-xl border border-[#dbf0dd] focus:border-[#17664e] focus:ring-2 focus:ring-[#17664e]/20 outline-none text-center font-mono text-xl tracking-widest text-[#0b2c25]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#0b2c25] hover:bg-stone-50 cursor-pointer"
              >
                Retour
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-[#0b2c25] hover:bg-[#12443a] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                <span>Valider le code</span>
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="size-14 text-[#17664e] mb-3 animate-bounce" />
            <h4 className="font-semibold text-lg text-[#0b2c25] mb-1">
              Identité confirmée avec succès !
            </h4>
            <p className="text-xs text-[#0b2c25]/70 mb-4">
              Votre e-mail de récupération a validé vos accès en toute sécurité.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl bg-[#0b2c25] text-white text-xs font-medium cursor-pointer"
            >
              Terminer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
