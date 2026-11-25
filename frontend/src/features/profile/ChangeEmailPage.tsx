import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mailIcon from '../../assets/icons/input-mail.svg';
import arrowRightIcon from '../../assets/icons/arrow-right.svg';
import mailSentIcon from '../../assets/icons/illustration-mail-sent.svg';
import { getStoredUser, authFetch } from '../auth/services/authService';

export const ChangeEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Veuillez entrer une adresse e-mail valide.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/users/me/email/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 409 || data?.code === 'EMAIL_ALREADY_EXISTS') {
          throw new Error('Cette adresse e-mail est déjà associée à un autre compte.');
        }
        throw new Error(data?.message || 'Erreur lors du changement d’e-mail.');
      }
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la modification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#fffaf0] min-h-screen flex flex-col items-center justify-start p-4 sm:p-8 font-poppins selection:bg-[#17664e] selection:text-white">
      <div className="w-full max-w-lg bg-white border border-[#dbf0dd] rounded-[24px] p-6 sm:p-8 shadow-sm flex flex-col gap-6 mt-4 sm:mt-10">
        {!sent ? (
          <>
            <div className="flex flex-col gap-1 text-center">
              <h1 className="font-semibold text-[#0b2c25] text-2xl">
                Modifier mon adresse e-mail
              </h1>
              <p className="text-sm text-[rgba(11,44,37,0.65)]">
                Adresse actuelle : <strong className="text-[#0b2c25]">{user?.email || 'Non renseignée'}</strong>
              </p>
            </div>

            {error && (
              <div className="bg-[#fdecea] border border-[#b22222]/20 text-[#b22222] text-xs sm:text-sm rounded-xl p-3 w-full text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b2c25]">
                  Nouvelle adresse e-mail
                </label>
                <div className="flex items-center gap-3 border border-[rgba(11,44,37,0.22)] focus-within:border-[#17664e] rounded-xl px-4 h-12 bg-white transition">
                  <img src={mailIcon} alt="" className="size-5 opacity-60" />
                  <input
                    type="email"
                    required
                    placeholder="exemple@domaine.dz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                  <span>{loading ? 'Envoi...' : 'Envoyer le lien de confirmation'}</span>
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
        ) : (
          <div className="flex flex-col items-center text-center gap-5">
            <div className="size-20 rounded-full bg-[#eaf6eb] flex items-center justify-center">
              <img src={mailSentIcon} alt="" className="size-10" />
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="font-semibold text-[#0b2c25] text-2xl">
                E-mail de confirmation envoyé
              </h2>
              <p className="text-sm text-[rgba(11,44,37,0.65)] leading-relaxed">
                Un message a été envoyé à <strong className="text-[#0b2c25]">{email}</strong>. Cliquez sur le lien pour valider votre nouvelle adresse.
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="bg-[#0b2c25] hover:bg-[#17664e] text-white font-medium text-sm rounded-xl h-12 transition cursor-pointer"
              >
                Retour au profil
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
