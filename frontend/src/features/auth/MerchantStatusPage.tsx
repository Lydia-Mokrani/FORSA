import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import loginBg from '../../assets/login-bg.png';
import clockPendingIcon from '../../assets/icons/illustration-clock-pending.svg';
import checkmarkIcon from '../../assets/icons/checkmark-circle-02.svg';
import infoCircleIcon from '../../assets/icons/information-circle.svg';
import arrowRightIcon from '../../assets/icons/arrow-right.svg';
import { getCurrentUser, getStoredUser, logout, ShopInfo } from './services/authService';

export const MerchantStatusPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [userStatus, setUserStatus] = useState<string>('ACTIVE');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const user = await getCurrentUser();
        setUserStatus(user.status);
        if (user.status === 'SUSPENDED') {
          navigate('/account/suspended', { replace: true });
          return;
        }
        if (user.shop) {
          setShop(user.shop);
        } else {
          // Si aucun shop n'est encore lié
          const stored = getStoredUser();
          if (stored?.shop) setShop(stored.shop);
        }
      } catch {
        const stored = getStoredUser();
        if (stored?.shop) setShop(stored.shop);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login?role=merchant');
  };

  const status = shop?.verificationStatus || 'PENDING';

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-4 py-8 sm:px-16 font-poppins selection:bg-forsa-leaf selection:text-white overflow-x-hidden">
      {/* Fond photo officiel Figma (Image bokeh feuille verte + overlay #FFFAF0 à 28%) */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img src={loginBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FFFAF0]/28" />
      </div>

      {/* En-tête officiel */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-4">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-[14px] font-medium text-[#0B2C25]/85">
          Espace Commerçant
        </span>
      </header>

      {/* Carte Statut */}
      <main className="relative z-10 w-full max-w-[540px] backdrop-blur-[20px] bg-white/40 border-[1.2px] border-white/70 rounded-[32px] p-6 sm:p-12 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col items-center text-center gap-6 my-auto">
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#17664E] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#0B2C25]/70">Chargement de votre dossier...</p>
          </div>
        ) : (
          <>
            {/* Cas PENDING (Figma Frame 12) */}
            {status === 'PENDING' && (
              <>
                <div className="w-24 h-24 rounded-full bg-white/80 border border-[#0B2C25]/15 flex items-center justify-center shadow-inner">
                  <img src={clockPendingIcon} alt="En attente" className="w-14 h-14" />
                </div>

                <div className="flex flex-col gap-2">
                  <span className="inline-block mx-auto text-xs font-semibold px-3 py-1 rounded-full bg-[#E89234]/15 text-[#C06A14] border border-[#E89234]/30">
                    Vérification en cours
                  </span>
                  <h1 className="font-semibold text-[#0B2C25] text-2xl sm:text-[30px] leading-tight">
                    Votre dossier est entre nos mains !
                  </h1>
                  <p className="text-[14px] text-[#0B2C25]/75 max-w-md mx-auto leading-relaxed">
                    Notre équipe vérifie vos pièces justificatives sous <strong className="font-semibold text-[#0B2C25]">24h à 48h ouvrées</strong>. Vous recevrez une notification Telegram dès validation.
                  </p>
                </div>

                <div className="w-full bg-white/60 border border-[#0B2C25]/10 rounded-2xl p-4 text-left flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs text-[#0B2C25]/60">
                    <span>Commerce déclaré</span>
                    <span className="font-medium text-[#0B2C25]">{shop?.name || 'Mon commerce'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-[#0B2C25]/60">
                    <span>Accès au tableau de bord</span>
                    <span className="font-medium text-[#E89234]">En attente d'approbation</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 w-full">
                  <Link
                    to="/"
                    className="w-full h-[52px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[15px] rounded-[16px] flex items-center justify-center gap-2 transition shadow-md"
                  >
                    <span>Explorer l'application FORSA</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs font-medium text-[#0B2C25]/60 hover:text-[#0B2C25] hover:underline transition"
                  >
                    Se déconnecter
                  </button>
                </div>
              </>
            )}

            {/* Cas APPROVED */}
            {status === 'APPROVED' && (
              <>
                <div className="w-20 h-20 rounded-full bg-emerald-100 border border-emerald-500/20 flex items-center justify-center shadow-md">
                  <img src={checkmarkIcon} alt="Approuvé" className="w-10 h-10 text-emerald-700" />
                </div>

                <div className="flex flex-col gap-2">
                  <span className="inline-block mx-auto text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">
                    Boutique validée
                  </span>
                  <h1 className="font-semibold text-[#0B2C25] text-2xl sm:text-[30px] leading-tight">
                    Félicitations !
                  </h1>
                  <p className="text-[14px] text-[#0B2C25]/75 max-w-md mx-auto leading-relaxed">
                    Votre dossier a été validé avec succès. Vous pouvez dès maintenant publier vos premiers paniers anti-gaspillage.
                  </p>
                </div>

                <Link
                  to="/merchant/dashboard"
                  className="w-full h-[52px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[16px] rounded-[16px] flex items-center justify-center gap-2 transition shadow-md"
                >
                  <span>Accéder à mon tableau de bord</span>
                  <img src={arrowRightIcon} alt="" className="w-5 h-5" />
                </Link>
              </>
            )}

            {/* Cas REJECTED */}
            {status === 'REJECTED' && (
              <>
                <div className="w-20 h-20 rounded-full bg-rose-100 border border-rose-500/20 flex items-center justify-center shadow-md">
                  <span className="text-3xl text-rose-700">✕</span>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="inline-block mx-auto text-xs font-semibold px-3 py-1 rounded-full bg-rose-500/15 text-rose-800 border border-rose-500/30">
                    Dossier non validé
                  </span>
                  <h1 className="font-semibold text-[#0B2C25] text-2xl sm:text-[28px] leading-tight">
                    Votre dossier nécessite une correction
                  </h1>
                  <p className="text-[14px] text-[#0B2C25]/75 max-w-md mx-auto leading-relaxed">
                    Certaines pièces transmises ne sont pas conformes ou illisibles. Veuillez contacter le support ou renvoyer vos documents.
                  </p>
                </div>

                <div className="flex flex-col gap-3 w-full">
                  <Link
                    to="/register?role=merchant&step=3"
                    className="w-full h-[52px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[15px] rounded-[16px] flex items-center justify-center gap-2 transition shadow-md"
                  >
                    <span>Mettre à jour mes documents</span>
                  </Link>

                  <a
                    href="mailto:support@forsa-dz.com"
                    className="text-xs font-medium text-[#17664E] hover:underline"
                  >
                    Contacter le support FORSA
                  </a>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs font-medium text-[#0B2C25]/60 hover:text-[#0B2C25] hover:underline pt-2"
                  >
                    Se déconnecter
                  </button>
                </div>
              </>
            )}

            {/* Cas SUSPENDED */}
            {status === 'SUSPENDED' && (
              <>
                <div className="w-20 h-20 rounded-full bg-amber-100 border border-amber-500/20 flex items-center justify-center shadow-md">
                  <img src={infoCircleIcon} alt="Suspendu" className="w-10 h-10 text-amber-700" />
                </div>

                <div className="flex flex-col gap-2">
                  <span className="inline-block mx-auto text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 border border-amber-500/30">
                    Compte suspendu
                  </span>
                  <h1 className="font-semibold text-[#0B2C25] text-2xl sm:text-[28px] leading-tight">
                    Activité suspendue temporairement
                  </h1>
                  <p className="text-[14px] text-[#0B2C25]/75 max-w-md mx-auto leading-relaxed">
                    L'accès à votre espace commerçant a été suspendu par l'administration. Veuillez contacter notre équipe d'assistance pour régulariser votre situation.
                  </p>
                </div>

                <a
                  href="mailto:support@forsa-dz.com"
                  className="w-full h-[52px] bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-[15px] rounded-[16px] flex items-center justify-center gap-2 transition shadow-md"
                >
                  <span>Contacter le support FORSA</span>
                </a>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs font-medium text-[#0B2C25]/60 hover:text-[#0B2C25] hover:underline"
                >
                  Se déconnecter
                </button>
              </>
            )}
          </>
        )}
      </main>

      <div className="relative z-10 w-full max-w-6xl h-8" />
    </div>
  );
};
