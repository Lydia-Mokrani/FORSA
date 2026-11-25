import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Building,
  Check,
  ArrowRight,
  ArrowLeft,
  X,
  Repeat,
  Info,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  getCurrentUser,
  switchUserMode,
  AuthUser,
} from '../auth/services/authService';

export const ModeSwitchPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetRole, setTargetRole] = useState<'CUSTOMER' | 'MERCHANT' | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      try {
        const u = await getCurrentUser();
        if (mounted) setUser(u);
      } catch {
        const cached = localStorage.getItem('forsa_user');
        if (cached && mounted) {
          try {
            setUser(JSON.parse(cached));
          } catch {}
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  const roles = user?.roles || [];
  const isCurrentlyMerchant = roles.includes('MERCHANT') || user?.activeMode === 'merchant';
  const shopStatus = (user as any)?.shop?.status || (user as any)?.shopStatus || null;
  const isShopApproved = shopStatus === 'APPROVED' || isCurrentlyMerchant;
  const hasPendingShop = shopStatus === 'PENDING';
  const hasRejectedShop = shopStatus === 'REJECTED';

  const handleRequestSwitch = (role: 'CUSTOMER' | 'MERCHANT') => {
    setError(null);
    if (role === 'MERCHANT' && !isShopApproved && !isCurrentlyMerchant) {
      return;
    }
    setTargetRole(role);
    setShowConfirmModal(true);
  };

  const handleConfirmSwitch = async () => {
    if (!targetRole) return;
    setSwitching(true);
    setError(null);
    try {
      await switchUserMode(targetRole);
      if (user) {
        const updatedUser: AuthUser = {
          ...user,
          roles: targetRole === 'MERCHANT' ? ['MERCHANT'] : ['CUSTOMER'],
          activeMode: targetRole === 'MERCHANT' ? 'merchant' : 'customer',
        };
        setUser(updatedUser);
        localStorage.setItem('forsa_user', JSON.stringify(updatedUser));
      }

      setShowConfirmModal(false);

      if (targetRole === 'MERCHANT') {
        navigate('/merchant/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de basculer de mode actuellement.');
      setShowConfirmModal(false);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#fffaf0] p-4 sm:p-6 md:p-10 font-poppins text-[#0B2C25]"
      data-node-id="1155:25969"
      data-name="Desktop · Mode — Passer en mode commerçant"
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {/* En-tête */}
        <div data-node-id="1155:26118">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs text-[#0b2c25]/70 hover:text-[#0b2c25] mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Mon espace / Mode d’utilisation</span>
          </button>

          <h1 className="font-semibold text-3xl sm:text-[44px] text-[#0b2c25] leading-tight" data-node-id="1155:26119">
            Mode d’utilisation
          </h1>
          <p className="text-base sm:text-xl text-[#0b2c25]/80 mt-1" data-node-id="1155:26120">
            Choisissez l’espace que vous souhaitez utiliser
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-[#fdecea] border border-[#f2b8b3] text-[#b3261e] text-sm flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Grille des 2 Options (Client vs Commerçant) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 items-stretch" data-node-id="1155:26129">
          {/* Option Client */}
          <div
            className={`rounded-[24px] p-7 sm:p-8 flex flex-col justify-between transition-all ${
              !isCurrentlyMerchant
                ? 'bg-[#eef7ec] border-2 border-[#17664e] shadow-xs'
                : 'bg-white border-[1.5px] border-[#dbf0dd] shadow-xs'
            }`}
            data-node-id="1155:26130"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="size-12 rounded-full bg-white border border-[#e8ebdf] flex items-center justify-center text-[#17664e]">
                  <User className="size-6" />
                </div>
                {!isCurrentlyMerchant && (
                  <span className="bg-[#17664e] text-white rounded-full px-3 py-1 text-xs font-medium" data-node-id="1155:26137">
                    Mode actuel
                  </span>
                )}
              </div>

              <h2 className="font-medium text-2xl text-[#0b2c25] mb-2" data-node-id="1155:26139">
                Mode client
              </h2>
              <p className="text-sm text-[#0b2c25]/70 leading-relaxed mb-6" data-node-id="1155:26140">
                Trouvez des invendus près de vous, réservez en ligne et retirez en magasin à prix réduit.
              </p>
            </div>

            <div className="pt-4 border-t border-[#dbf0dd]/60">
              {!isCurrentlyMerchant ? (
                <div className="flex items-center gap-2 text-[#17664e] font-medium text-sm py-2">
                  <Check className="size-4.5" />
                  <span>Vous utilisez actuellement cet espace</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRequestSwitch('CUSTOMER')}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#0b2c25] hover:bg-[#12443a] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
                >
                  <Repeat className="size-4" />
                  <span>Passer en mode client</span>
                </button>
              )}
            </div>
          </div>

          {/* Option Commerçant */}
          <div
            className={`rounded-[24px] p-7 sm:p-8 flex flex-col justify-between transition-all ${
              isCurrentlyMerchant
                ? 'bg-[#eef7ec] border-2 border-[#17664e] shadow-xs'
                : 'bg-white border-[1.5px] border-[#dbf0dd] shadow-xs'
            }`}
            data-node-id="1155:26147"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="size-12 rounded-full bg-[#eef7ec] border border-[#e8ebdf] flex items-center justify-center text-[#17664e]">
                  <Building className="size-6" />
                </div>
                {isCurrentlyMerchant ? (
                  <span className="bg-[#17664e] text-white rounded-full px-3 py-1 text-xs font-medium">
                    Mode actuel
                  </span>
                ) : hasPendingShop ? (
                  <span className="bg-[#fff4dc] text-[#8a5a00] border border-[#ffd580] rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1">
                    <Clock className="size-3" />
                    En attente de validation
                  </span>
                ) : null}
              </div>

              <h2 className="font-medium text-2xl text-[#0b2c25] mb-2" data-node-id="1155:26157">
                Mode commerçant
              </h2>
              <p className="text-sm text-[#0b2c25]/70 leading-relaxed mb-6" data-node-id="1155:26158">
                Publiez vos invendus, suivez vos réservations, mettez à jour votre boutique et consultez vos avis.
              </p>
            </div>

            <div className="pt-4 border-t border-[#dbf0dd]/60">
              {isCurrentlyMerchant ? (
                <div className="flex items-center gap-2 text-[#17664e] font-medium text-sm py-2">
                  <Check className="size-4.5" />
                  <span>Vous utilisez actuellement cet espace</span>
                </div>
              ) : isShopApproved ? (
                <button
                  type="button"
                  onClick={() => handleRequestSwitch('MERCHANT')}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#0b2c25] hover:bg-[#12443a] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
                  data-node-id="1155:26159"
                >
                  <Repeat className="size-4" />
                  <span>Passer en mode commerçant</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (hasPendingShop || hasRejectedShop) {
                      navigate('/merchant/status');
                    } else {
                      navigate('/register');
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border-[1.5px] border-[#0b2c25] text-[#0b2c25] font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer hover:bg-stone-50"
                >
                  <span>
                    {hasPendingShop || hasRejectedShop ? 'Voir le statut de la boutique' : 'Créer un compte commerçant'}
                  </span>
                  <ArrowRight className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bannière info */}
        <div
          className="bg-[#eef7ec] border border-[#dbf0dd] rounded-2xl p-5 flex items-start gap-3.5 shadow-xs"
          data-node-id="1155:26167"
        >
          <div className="size-8 rounded-full bg-white flex items-center justify-center text-[#17664e] shrink-0 mt-0.5">
            <Info className="size-4.5" />
          </div>
          <p className="text-sm text-[#17664e] font-medium leading-relaxed" data-node-id="1155:26174">
            Vos informations de profil et votre historique sont conservés lorsque vous changez de mode d'utilisation.
          </p>
        </div>
      </div>

      {/* MODALE CENTRÉE FIGMA (1155:26176) */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-poppins"
          data-node-id="1155:26175"
        >
          <div
            className="backdrop-blur-[20px] bg-white/95 border-[1.2px] border-[rgba(255,255,255,0.7)] rounded-[24px] p-7 sm:p-8 max-w-[560px] w-full shadow-2xl relative animate-scale-in flex flex-col gap-5"
            data-node-id="1155:26176"
          >
            {/* Top row with badge and close button */}
            <div className="flex items-center justify-between" data-node-id="1155:26177">
              <div
                className="size-14 rounded-full bg-[#eef7ec] flex items-center justify-center text-[#17664e]"
                data-node-id="1155:26178"
              >
                <Repeat className="size-6" />
              </div>

              <button
                type="button"
                onClick={() => !switching && setShowConfirmModal(false)}
                className="size-10 rounded-full border border-[#e8ebdf] flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-50 cursor-pointer transition-colors"
                data-node-id="1155:26185"
                aria-label="Fermer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Titre & Sous-titre */}
            <div>
              <h3 className="font-semibold text-2xl text-[#0b2c25] leading-tight mb-2" data-node-id="1155:26189">
                {targetRole === 'MERCHANT' ? 'Passer en mode commerçant ?' : 'Passer en mode client ?'}
              </h3>
              <p className="text-[15px] text-[#0b2c25]/75 leading-relaxed" data-node-id="1155:26190">
                {targetRole === 'MERCHANT'
                  ? 'Vous accéderez à votre tableau de bord commerçant : offres, réservations et avis. Vous pourrez revenir en mode client à tout moment.'
                  : 'Vous accéderez à l’espace client : découvrez les invendus disponibles autour de vous, réservez vos paniers et suivez vos commandes.'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100" data-node-id="1155:26191">
              <button
                type="button"
                disabled={switching}
                onClick={() => setShowConfirmModal(false)}
                className="px-6 py-3.5 rounded-[14px] border-[1.5px] border-[#0b2c25] text-[#0b2c25] text-[15px] font-medium hover:bg-stone-50 cursor-pointer transition-all"
                data-node-id="1155:26192"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={switching}
                onClick={handleConfirmSwitch}
                className="px-6 py-3.5 rounded-[14px] bg-[#0b2c25] hover:bg-[#12443a] text-white text-[15px] font-medium flex items-center gap-2 cursor-pointer transition-all shadow-xs active:scale-98"
                data-node-id="1155:26194"
              >
                <Repeat className="size-4" />
                <span>
                  {switching
                    ? 'Bascule en cours...'
                    : targetRole === 'MERCHANT'
                    ? 'Passer en mode commerçant'
                    : 'Passer en mode client'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
