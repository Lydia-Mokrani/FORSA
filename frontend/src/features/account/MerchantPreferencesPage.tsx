import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Check, Info } from 'lucide-react';

export const MerchantPreferencesPage: React.FC = () => {
  const navigate = useNavigate();

  const [notifs, setNotifs] = useState({
    emailReservations: true,
    reminderAlerts: true,
    newReviews: true,
    expiringOffers: false,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => {
      navigate('/merchant/account');
    }, 1200);
  };

  return (
    <div
      className="max-w-4xl mx-auto pb-16 font-poppins text-[#0B2C25]"
      data-node-id="1186:21763"
      data-name="Desktop · Mon compte — Préférences & notifications"
    >
      {/* Fil d'ariane & En-tête */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate('/merchant/account')}
          className="inline-flex items-center gap-1.5 text-xs text-[#0b2c25]/70 hover:text-[#0b2c25] mb-2 cursor-pointer transition-colors"
          data-node-id="1186:21788"
        >
          <ArrowLeft className="size-3.5" />
          <span>Mon espace / Mon compte / Préférences</span>
        </button>

        <h1 className="font-semibold text-3xl sm:text-4xl text-[#0b2c25]" data-node-id="1186:21789">
          Préférences &amp; notifications
        </h1>
        <p className="text-base text-[#0b2c25]/75 mt-1" data-node-id="1186:21790">
          Choisissez comment FORSA vous tient informé
        </p>
      </div>

      {savedSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-[#eef7ec] border border-[#dbf0dd] text-[#17664e] flex items-center gap-3 animate-fade-in">
          <Check className="size-5 shrink-0" />
          <p className="font-medium text-sm">Préférences enregistrées avec succès !</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Carte Principale Notifications (2 cols) */}
          <div className="lg:col-span-2 bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 sm:p-7 shadow-xs">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
              <div className="size-10 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#17664e]">
                <Bell className="size-5" />
              </div>
              <h2 className="font-medium text-xl text-[#0b2c25]" data-node-id="1186:21867">
                Notifications
              </h2>
            </div>

            <div className="flex flex-col gap-5">
              {/* Ligne 1 */}
              <div className="flex items-center justify-between pb-4 border-b border-stone-100" data-node-id="1186:21933">
                <div className="max-w-[78%]">
                  <p className="font-medium text-sm text-[#0b2c25]" data-node-id="1186:21935">
                    Notifications par e-mail
                  </p>
                  <p className="text-xs text-[#0b2c25]/65 mt-0.5" data-node-id="1186:21936">
                    Restez informé de vos réservations et nouveaux avis.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifs({ ...notifs, emailReservations: !notifs.emailReservations })}
                  className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                    notifs.emailReservations ? 'bg-[#17664e]' : 'bg-stone-300'
                  }`}
                  aria-label="Toggle notifications email"
                >
                  <div
                    className={`size-5.5 rounded-full bg-white shadow-xs transition-transform ${
                      notifs.emailReservations ? 'translate-x-5.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Ligne 2 */}
              <div className="flex items-center justify-between pb-4 border-b border-stone-100" data-node-id="1186:21940">
                <div className="max-w-[78%]">
                  <p className="font-medium text-sm text-[#0b2c25]" data-node-id="1186:21942">
                    Alertes de rappel
                  </p>
                  <p className="text-xs text-[#0b2c25]/65 mt-0.5" data-node-id="1186:21943">
                    Rappel sur les dates de retrait de vos réservations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifs({ ...notifs, reminderAlerts: !notifs.reminderAlerts })}
                  className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                    notifs.reminderAlerts ? 'bg-[#17664e]' : 'bg-stone-300'
                  }`}
                  aria-label="Toggle alertes rappel"
                >
                  <div
                    className={`size-5.5 rounded-full bg-white shadow-xs transition-transform ${
                      notifs.reminderAlerts ? 'translate-x-5.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Ligne 3 */}
              <div className="flex items-center justify-between pb-4 border-b border-stone-100" data-node-id="1186:21947">
                <div className="max-w-[78%]">
                  <p className="font-medium text-sm text-[#0b2c25]" data-node-id="1186:21949">
                    Nouveaux avis clients
                  </p>
                  <p className="text-xs text-[#0b2c25]/65 mt-0.5" data-node-id="1186:21950">
                    Soyez alerté dès qu’un client laisse un avis.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifs({ ...notifs, newReviews: !notifs.newReviews })}
                  className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                    notifs.newReviews ? 'bg-[#17664e]' : 'bg-stone-300'
                  }`}
                  aria-label="Toggle nouveaux avis"
                >
                  <div
                    className={`size-5.5 rounded-full bg-white shadow-xs transition-transform ${
                      notifs.newReviews ? 'translate-x-5.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Ligne 4 */}
              <div className="flex items-center justify-between" data-node-id="1186:21954">
                <div className="max-w-[78%]">
                  <p className="font-medium text-sm text-[#0b2c25]" data-node-id="1186:21956">
                    Offres bientôt terminées
                  </p>
                  <p className="text-xs text-[#0b2c25]/65 mt-0.5" data-node-id="1186:21957">
                    Rappel avant la fin du créneau de retrait de vos offres.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifs({ ...notifs, expiringOffers: !notifs.expiringOffers })}
                  className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                    notifs.expiringOffers ? 'bg-[#17664e]' : 'bg-stone-300'
                  }`}
                  aria-label="Toggle offres expirent"
                >
                  <div
                    className={`size-5.5 rounded-full bg-white shadow-xs transition-transform ${
                      notifs.expiringOffers ? 'translate-x-5.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Carte « À savoir » (1 col) */}
          <div
            className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 shadow-xs flex flex-col gap-4"
            data-node-id="1186:21913"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
              <div className="size-9 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#17664e]">
                <Info className="size-4.5" />
              </div>
              <h3 className="font-medium text-lg text-[#0b2c25]" data-node-id="1186:21917">
                À savoir
              </h3>
            </div>

            <p className="text-xs leading-relaxed text-[#0b2c25]/80" data-node-id="1186:21960">
              Les messages importants (validation du compte, sécurité) sont toujours envoyés, même si vous désactivez les notifications.
            </p>

            <div className="bg-[#eef7ec] rounded-full px-3 py-1.5 w-fit" data-node-id="1186:21961">
              <span className="text-[11px] font-semibold text-[#17664e]" data-node-id="1186:21962">
                Toujours actives
              </span>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-stone-100">
          <button
            type="button"
            onClick={() => navigate('/merchant/account')}
            className="px-6 py-3 rounded-xl border-[1.5px] border-[#0b2c25] text-[#0b2c25] text-sm font-medium hover:bg-stone-50 cursor-pointer transition-all"
            data-node-id="1186:21858"
          >
            Annuler
          </button>

          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-[#0b2c25] hover:bg-[#12443a] text-white text-sm font-medium flex items-center gap-2 cursor-pointer transition-all shadow-xs"
            data-node-id="1186:21860"
          >
            <Check className="size-4" />
            <span>Enregistrer les modifications</span>
          </button>
        </div>
      </form>
    </div>
  );
};
