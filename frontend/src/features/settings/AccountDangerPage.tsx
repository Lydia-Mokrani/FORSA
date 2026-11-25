import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PauseCircle,
  Trash2,
  AlertTriangle,
  AlertCircle,
  ArrowLeft,
  Info,
  CheckCircle2,
  X,
  Lock,
} from 'lucide-react';

export const AccountDangerPage: React.FC = () => {
  const navigate = useNavigate();
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);

  // Simulation état : commerçant avec commandes ou réservations en cours
  const [hasActiveOrders, setHasActiveOrders] = useState(true);

  return (
    <div
      className="min-h-screen bg-[#fffaf0] p-4 sm:p-6 md:p-10 font-poppins text-[#0B2C25]"
      data-node-id="1156:26272"
      data-name="Desktop · Compte — Zone sensible"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Fil d'ariane & En-tête */}
        <div>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="inline-flex items-center gap-1.5 text-xs text-[#0b2c25]/70 hover:text-[#0b2c25] mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Mon compte / Paramètres / Gestion du compte</span>
          </button>

          <h1 className="font-semibold text-3xl sm:text-4xl text-[#0b2c25]">
            Gérer mon compte
          </h1>
          <p className="text-sm sm:text-base text-[#0b2c25]/75 mt-1">
            Désactivez ou supprimez définitivement votre compte FORSA
          </p>
        </div>

        {/* Bannière Blocage : Suppression impossible si commandes en cours */}
        {hasActiveOrders && (
          <div
            className="p-5 sm:p-6 rounded-[20px] bg-[#fdecea] border border-[#f2b8b3] text-[#b3261e] flex flex-col sm:flex-row items-start gap-4 shadow-xs animate-fade-in"
            data-node-id="1156:26649"
            data-name="Bannière — Suppression impossible (commandes en cours)"
          >
            <div className="size-10 rounded-full bg-white/80 flex items-center justify-center shrink-0 text-[#b3261e] shadow-xs">
              <AlertTriangle className="size-5" />
            </div>

            <div className="flex-1">
              <h3 className="font-semibold text-base sm:text-lg text-[#b3261e] mb-1">
                Suppression impossible pour le moment
              </h3>
              <p className="text-xs sm:text-sm text-[#b3261e]/90 leading-relaxed">
                Vous avez actuellement des réservations ou commandes en cours. Conformément aux règles de sécurité FORSA, vous devez finaliser ou annuler toutes vos transactions actives avant de pouvoir supprimer votre compte.
              </p>

              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/reservations')}
                  className="px-4 py-2 rounded-xl bg-[#b3261e] hover:bg-[#962019] text-white text-xs font-semibold cursor-pointer transition-all shadow-xs"
                >
                  Gérer mes commandes en cours
                </button>
                <button
                  type="button"
                  onClick={() => setHasActiveOrders(false)}
                  className="px-3 py-2 rounded-xl text-xs text-[#b3261e] underline hover:no-underline cursor-pointer"
                >
                  (Simuler 0 commande active)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grille 2 cartes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Carte 1 : Désactiver mon compte */}
          <div
            className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 sm:p-8 flex flex-col justify-between shadow-xs"
            data-node-id="1156:26330"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="size-11 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#17664e]">
                  <PauseCircle className="size-5" />
                </div>
                <h2 className="font-semibold text-xl text-[#0b2c25]" data-node-id="1156:26337">
                  Désactiver mon compte
                </h2>
              </div>

              <p className="text-sm text-[#0b2c25]/75 leading-relaxed mb-6" data-node-id="1156:26348">
                Votre profil, vos offres et vos informations seront temporairement masqués. Vous pourrez réactiver votre compte à tout moment en vous reconnectant simplement.
              </p>
            </div>

            <div className="pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowDeactivateDialog(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl border-[1.5px] border-[#0b2c25] hover:bg-stone-50 active:scale-98 text-[#0b2c25] font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                data-node-id="1156:26349"
              >
                <PauseCircle className="size-4.5" />
                <span>Désactiver temporairement</span>
              </button>
            </div>
          </div>

          {/* Carte 2 : Supprimer mon compte */}
          <div
            className="bg-[#fffafa] border-[1.5px] border-[#f2b8b3] rounded-[24px] p-6 sm:p-8 flex flex-col justify-between shadow-xs"
            data-node-id="1156:26338"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="size-11 rounded-full bg-[#fdecea] border border-[#f2b8b3] flex items-center justify-center text-[#b3261e]">
                  <Trash2 className="size-5" />
                </div>
                <h2 className="font-semibold text-xl text-[#b3261e]" data-node-id="1156:26347">
                  Supprimer mon compte
                </h2>
              </div>

              <p className="text-sm text-[#0b2c25]/75 leading-relaxed mb-6" data-node-id="1156:26355">
                Vos données personnelles, vos réservations et vos préférences seront définitivement effacées. Cette action est irréversible.
              </p>
            </div>

            <div className="pt-4 border-t border-red-100">
              <button
                type="button"
                disabled={hasActiveOrders}
                onClick={() => setShowDeleteDialog(true)}
                className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  hasActiveOrders
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-[#b3261e] hover:bg-[#962019] text-white active:scale-98 cursor-pointer shadow-xs'
                }`}
                data-node-id="1156:26356"
              >
                <Trash2 className="size-4.5" />
                <span>Supprimer mon compte</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bannière — info support */}
        <div
          className="p-5 sm:p-6 rounded-[20px] bg-white border border-[#dbf0dd] flex items-start gap-4 shadow-xs"
          data-node-id="1156:26364"
        >
          <div className="size-9 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#17664e] shrink-0">
            <Info className="size-4.5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-[#0b2c25]" data-node-id="1156:26371">
              Un souci avec votre compte ?
            </h4>
            <p className="text-xs text-[#0b2c25]/70 mt-0.5" data-node-id="1156:26372">
              Contactez le support avant de supprimer votre compte. Notre équipe peut vous aider à résoudre la majorité des difficultés.
            </p>
            <a
              href="mailto:support@forsa.dz"
              className="inline-block mt-2 text-xs font-semibold text-[#17664e] hover:underline"
            >
              Écrire au support FORSA →
            </a>
          </div>
        </div>
      </div>

      {/* Modal Confirmation Désactivation */}
      {showDeactivateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-poppins">
          <div className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-scale-in">
            <button
              type="button"
              onClick={() => setShowDeactivateDialog(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 cursor-pointer p-1"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="size-11 rounded-full bg-[#eef7ec] flex items-center justify-center text-[#17664e]">
                <PauseCircle className="size-6" />
              </div>
              <h3 className="font-semibold text-xl text-[#0b2c25]">
                Désactiver temporairement
              </h3>
            </div>

            <p className="text-sm text-[#0b2c25]/75 leading-relaxed mb-6">
              Êtes-vous certain de vouloir mettre votre compte en pause ? Vos offres ne seront plus visibles des acheteurs jusqu'à votre prochaine reconnexion.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowDeactivateDialog(false)}
                className="px-5 py-2.5 rounded-xl border border-stone-200 text-xs font-medium text-[#0b2c25] hover:bg-stone-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeactivateDialog(false);
                  navigate('/welcome');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#0b2c25] hover:bg-[#12443a] text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Confirmer la désactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation Suppression (1156:26512) */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-poppins">
          <div
            className="bg-white border-[1.5px] border-[#f2b8b3] rounded-[28px] p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-scale-in"
            data-node-id="1156:26512"
          >
            <button
              type="button"
              onClick={() => setShowDeleteDialog(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 cursor-pointer p-1"
              data-node-id="1156:26521"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="size-12 rounded-full bg-[#fdecea] flex items-center justify-center text-[#b3261e]">
                <Trash2 className="size-6" />
              </div>
              <h3 className="font-semibold text-xl text-[#b3261e]" data-node-id="1156:26525">
                Supprimer définitivement votre compte
              </h3>
            </div>

            <p className="text-sm text-[#0b2c25]/80 leading-relaxed mb-4" data-node-id="1156:26526">
              Cette action est irréversible. Vos données personnelles et votre accès ne pourront pas être restaurés.
            </p>

            {/* Conséquences */}
            <div className="bg-[#fdecea]/40 border border-[#f2b8b3]/60 rounded-2xl p-4 space-y-2.5 mb-5 text-xs text-[#0b2c25]/85" data-node-id="1156:26474">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="size-4 text-[#b3261e] shrink-0 mt-0.5" />
                <span>Vos données personnelles et votre profil seront définitivement effacés.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <AlertCircle className="size-4 text-[#b3261e] shrink-0 mt-0.5" />
                <span>Vos offres et historiques de réservations seront archivés sans association nominative.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <AlertCircle className="size-4 text-[#b3261e] shrink-0 mt-0.5" />
                <span>Votre numéro de téléphone sera dissocié de notre système d'authentification.</span>
              </div>
            </div>

            {/* Case à cocher */}
            <label className="flex items-start gap-3 mb-6 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmCheckbox}
                onChange={(e) => setConfirmCheckbox(e.target.checked)}
                className="mt-0.5 size-4 accent-[#b3261e] rounded cursor-pointer"
                data-node-id="1156:26505"
              />
              <span className="text-xs text-[#0b2c25] leading-relaxed" data-node-id="1156:26510">
                Je comprends que cette action est définitive et que je ne pourrai pas récupérer mes informations.
              </span>
            </label>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                className="px-5 py-2.5 rounded-xl border border-stone-200 text-xs font-medium text-[#0b2c25] hover:bg-stone-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!confirmCheckbox}
                onClick={() => {
                  setShowDeleteDialog(false);
                  navigate('/welcome');
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  confirmCheckbox
                    ? 'bg-[#b3261e] hover:bg-[#962019] text-white cursor-pointer shadow-xs active:scale-98'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                <Trash2 className="size-3.5" />
                <span>Confirmer la suppression</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
