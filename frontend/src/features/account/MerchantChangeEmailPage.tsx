import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2, Info } from 'lucide-react';

export const MerchantChangeEmailPage: React.FC = () => {
  const navigate = useNavigate();

  const [currentEmail] = useState('maison.gourmande@forsa.dz');
  const [newEmail, setNewEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSendLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      setError('Veuillez saisir une adresse e-mail valide.');
      return;
    }
    setError('');
    setOtpSent(true);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      setError('Le code de vérification doit comporter 6 chiffres.');
      return;
    }
    setError('');
    setSuccess(true);
    setTimeout(() => {
      navigate('/merchant/account');
    }, 1500);
  };

  return (
    <div
      className="max-w-4xl mx-auto pb-16 font-poppins text-[#0B2C25]"
      data-node-id="1186:22302"
      data-name="Desktop · Mon compte — Modifier l’e-mail"
    >
      {/* Fil d'ariane & En-tête */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate('/merchant/account')}
          className="inline-flex items-center gap-1.5 text-xs text-[#0b2c25]/70 hover:text-[#0b2c25] mb-2 cursor-pointer transition-colors"
          data-node-id="1186:22327"
        >
          <ArrowLeft className="size-3.5" />
          <span>Mon espace / Mon compte / Sécurité</span>
        </button>

        <h1 className="font-semibold text-3xl sm:text-4xl text-[#0b2c25]" data-node-id="1186:22328">
          Modifier l’adresse e-mail
        </h1>
        <p className="text-base text-[#0b2c25]/75 mt-1" data-node-id="1186:22329">
          Nous vous enverrons un lien pour confirmer la nouvelle adresse
        </p>
      </div>

      {success && (
        <div className="mb-6 p-4 rounded-2xl bg-[#eef7ec] border border-[#dbf0dd] text-[#17664e] flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="size-5 shrink-0" />
          <p className="font-medium text-sm">
            Votre nouvelle adresse e-mail a été vérifiée et enregistrée avec succès ! Redirection...
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-[#fdecea] border border-[#f2b8b3] text-[#b3261e] text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Formulaire Principal (2 cols) */}
        <div className="lg:col-span-2 bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 sm:p-7 shadow-xs">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
            <div className="size-10 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#17664e]">
              <Mail className="size-5" />
            </div>
            <h2 className="font-medium text-xl text-[#0b2c25]" data-node-id="1186:22406">
              Adresse e-mail
            </h2>
          </div>

          {!otpSent ? (
            <form onSubmit={handleSendLink} className="flex flex-col gap-5">
              {/* Adresse actuelle */}
              <div data-node-id="1186:22472">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b2c25] mb-1.5" data-node-id="1186:22474">
                  Adresse actuelle
                </label>
                <div className="bg-[#ebeee1] border border-[#e8ebdf] rounded-xl px-4 py-3 flex items-center justify-between text-sm text-[#0b2c25]" data-node-id="1186:22475">
                  <span className="font-medium">{currentEmail}</span>
                  <span className="bg-[#eef7ec] text-[#17664e] rounded-full px-2.5 py-0.5 text-xs font-medium" data-node-id="1186:22487">
                    Vérifiée
                  </span>
                </div>
              </div>

              {/* Nouvelle adresse */}
              <div data-node-id="1186:22489">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b2c25] mb-1.5" data-node-id="1186:22490">
                  Nouvelle adresse e-mail *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nouvelle.adresse@exemple.dz"
                  className="w-full h-12 px-4 rounded-xl border border-[#dbf0dd] focus:border-[#17664e] focus:ring-2 focus:ring-[#17664e]/20 outline-none text-sm transition-all"
                  data-node-id="1186:22491"
                />
              </div>

              <p className="text-xs text-[#0b2c25]/70 leading-relaxed" data-node-id="1186:22522">
                Votre adresse actuelle reste active tant que la nouvelle n’est pas confirmée.
              </p>

              {/* Boutons d'action */}
              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => navigate('/merchant/account')}
                  className="px-6 py-3 rounded-xl border-[1.5px] border-[#0b2c25] text-[#0b2c25] text-sm font-medium hover:bg-stone-50 cursor-pointer transition-all"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-[#0b2c25] hover:bg-[#12443a] text-white text-sm font-medium flex items-center gap-2 cursor-pointer transition-all shadow-xs"
                >
                  <Send className="size-4" />
                  <span>Envoyer le code de vérification</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
              <div className="p-4 rounded-xl bg-[#eef7ec] border border-[#dbf0dd] text-sm text-[#17664e]">
                Un code de vérification à 6 chiffres a été envoyé à <strong>{newEmail}</strong>.
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b2c25] mb-1.5">
                  Code de vérification reçu *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full h-12 px-4 rounded-xl border border-[#dbf0dd] focus:border-[#17664e] focus:ring-2 focus:ring-[#17664e]/20 outline-none text-center font-mono text-xl tracking-widest transition-all"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[#0b2c25]/75">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="hover:underline cursor-pointer"
                >
                  Changer d’adresse
                </button>
                <button
                  type="button"
                  onClick={() => alert('Code renvoyé avec succès')}
                  className="text-[#17664e] font-semibold hover:underline cursor-pointer"
                >
                  Renvoyer le code
                </button>
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="px-6 py-3 rounded-xl border-[1.5px] border-[#0b2c25] text-[#0b2c25] text-sm font-medium hover:bg-stone-50 cursor-pointer transition-all"
                >
                  Retour
                </button>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-[#0b2c25] hover:bg-[#12443a] text-white text-sm font-medium flex items-center gap-2 cursor-pointer transition-all shadow-xs"
                >
                  <CheckCircle2 className="size-4" />
                  <span>Confirmer la nouvelle adresse</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Carte « Comment ça marche ? » (1 col) */}
        <div
          className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 shadow-xs flex flex-col gap-4"
          data-node-id="1186:22452"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
            <div className="size-9 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#17664e]">
              <Info className="size-4.5" />
            </div>
            <h3 className="font-medium text-lg text-[#0b2c25]" data-node-id="1186:22456">
              Comment ça marche ?
            </h3>
          </div>

          <div className="flex flex-col gap-4 text-xs leading-relaxed" data-node-id="1186:22457">
            <div className="flex items-start gap-3" data-node-id="1186:22523">
              <span className="size-6 rounded-full bg-[#eef7ec] border border-[#dbf0dd] text-[#17664e] font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <p className="text-[#0b2c25]/85" data-node-id="1186:22526">
                Saisissez votre nouvelle adresse e-mail.
              </p>
            </div>

            <div className="flex items-start gap-3" data-node-id="1186:22527">
              <span className="size-6 rounded-full bg-[#eef7ec] border border-[#dbf0dd] text-[#17664e] font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <p className="text-[#0b2c25]/85" data-node-id="1186:22530">
                Consultez le code de vérification reçu sur votre nouvelle boîte de réception.
              </p>
            </div>

            <div className="flex items-start gap-3" data-node-id="1186:22531">
              <span className="size-6 rounded-full bg-[#eef7ec] border border-[#dbf0dd] text-[#17664e] font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <p className="text-[#0b2c25]/85" data-node-id="1186:22534">
                La nouvelle adresse devient active immédiatement pour vos notifications et la récupération.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
