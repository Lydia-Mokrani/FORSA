import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Header,
  Card,
  Banner,
  Chip,
  Button,
  ResponsiveDialog,
  Icon,
} from '../../components/ui';
import {
  getCurrentUser,
  getActiveSessions,
  logout,
  UserSession,
  AuthUser,
} from '../auth/services/authService';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const u = await getCurrentUser();
        if (mounted) setUser(u);
      } catch {
        // Utiliser le cache si possible
        const cached = localStorage.getItem('forsa_user');
        if (cached && mounted) {
          try {
            setUser(JSON.parse(cached));
          } catch {}
        }
      }

      try {
        const s = await getActiveSessions();
        if (mounted) setSessions(s);
      } catch {}

      if (mounted) setLoading(false);
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleConfirmLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    } finally {
      setLogoutLoading(false);
    }
  };

  const isMerchant = user?.roles?.includes('MERCHANT');

  return (
    <div className="min-h-screen bg-ui-page p-4 sm:p-6 md:p-10 font-poppins text-ui-ink">
      <div className="max-w-4xl mx-auto space-y-6">
        <Header
          breadcrumb={['Mon compte', 'Paramètres']}
          title="Paramètres"
          subtitle="Gérez la sécurité, vos sessions et les préférences de votre compte"
          mobileSubtitle="Sécurité et préférences du compte"
          onBack={() => navigate('/profile')}
        />

        {/* Section 1 : Sécurité & Connexions */}
        <Card
          icon={<Icon name="phone" size={20} />}
          title="Sécurité & Authentification"
        >
          <div className="space-y-6">
            {/* Telegram lié */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-ui-ctl bg-stone-50 border border-ui-field-border">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-ui-mint flex items-center justify-center text-ui-emerald shrink-0">
                  <Icon name="phone" size={20} />
                </div>
                <div>
                  <h4 className="text-[15px] font-semibold text-ui-ink">Compte Telegram associé</h4>
                  <p className="text-[13px] text-ui-text-70">
                    {user?.phoneE164 || (user as any)?.phone
                      ? `Lié au numéro ${user?.phoneE164 || (user as any)?.phone}`
                      : 'Non configuré'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Chip variant="success">Vérifié & Actif</Chip>
                <Link
                  to="/profile?changePhone=1"
                  className="text-xs font-semibold text-ui-emerald hover:underline px-2 py-1"
                >
                  Modifier
                </Link>
              </div>
            </div>

            {/* Sessions actives (GET /auth/sessions) */}
            <div className="space-y-3">
              <h4 className="text-[15px] font-semibold text-ui-ink">
                Sessions actives
              </h4>
              {loading ? (
                <p className="text-sm text-ui-text-70">Chargement des sessions...</p>
              ) : sessions.length > 0 ? (
                <div className="divide-y divide-ui-field-border border border-ui-field-border rounded-ui-ctl overflow-hidden bg-white">
                  {sessions.map((sess, idx) => (
                    <div
                      key={sess.id || idx}
                      className="p-3.5 flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-ui-mint flex items-center justify-center text-ui-emerald">
                          <Icon name="clock" size={16} />
                        </div>
                        <div>
                          <p className="font-medium text-ui-ink">
                            {sess.device || sess.userAgent || 'Appareil Web'}
                          </p>
                          <p className="text-xs text-ui-text-70">
                            {sess.ipAddress ? `IP: ${sess.ipAddress} · ` : ''}
                            {sess.lastActiveAt
                              ? `Actif : ${new Date(sess.lastActiveAt).toLocaleString('fr-DZ')}`
                              : 'Session courante'}
                          </p>
                        </div>
                      </div>
                      {sess.current ? (
                        <span className="text-xs font-medium text-ui-emerald bg-ui-mint px-2.5 py-1 rounded-full border border-ui-card-border">
                          Cet appareil
                        </span>
                      ) : (
                        <span className="text-xs text-ui-text-70">Active</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-ui-ctl bg-stone-50 border border-ui-field-border text-sm text-ui-text-70 flex items-center justify-between">
                  <span>Session actuelle sur cet appareil (connexion par jeton sécurisé)</span>
                  <Chip variant="neutral">Actuelle</Chip>
                </div>
              )}
            </div>

            {/* Déconnexion */}
            <div className="pt-2 border-t border-ui-field-border flex items-center justify-between">
              <div>
                <h4 className="text-[14px] font-semibold text-ui-ink">Déconnexion</h4>
                <p className="text-xs text-ui-text-70">Fermer votre session sur cet appareil</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => setShowLogoutModal(true)}
              >
                Se déconnecter
              </Button>
            </div>
          </div>
        </Card>

        {/* Section 2 : Préférences de compte & Navigation */}
        <Card
          icon={<Icon name="building" size={20} />}
          title="Préférences & Mode"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/settings/mode"
              className="p-4 rounded-ui-ctl bg-stone-50 hover:bg-ui-mint/40 border border-ui-field-border flex flex-col justify-between gap-3 transition group"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-[15px] font-semibold text-ui-ink group-hover:text-ui-emerald transition">
                    Changer de mode
                  </h4>
                  <Chip variant={isMerchant ? 'success' : 'neutral'}>
                    {isMerchant ? 'Mode Commerçant' : 'Mode Client'}
                  </Chip>
                </div>
                <p className="text-xs text-ui-text-70">
                  Basculez entre votre espace client et votre gestion commerçant
                </p>
              </div>
              <span className="text-xs font-semibold text-ui-emerald flex items-center gap-1">
                Gérer le mode &rarr;
              </span>
            </Link>

            <Link
              to="/settings/account"
              className="p-4 rounded-ui-ctl bg-stone-50 hover:bg-ui-error-bg/30 border border-ui-field-border flex flex-col justify-between gap-3 transition group"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-[15px] font-semibold text-ui-ink group-hover:text-ui-error transition">
                    Gestion du compte
                  </h4>
                  <span className="text-[11px] font-medium text-ui-error bg-ui-error-bg px-2 py-0.5 rounded-full border border-ui-error/20">
                    Zone sensible
                  </span>
                </div>
                <p className="text-xs text-ui-text-70">
                  Désactivation temporaire ou suppression définitive
                </p>
              </div>
              <span className="text-xs font-semibold text-ui-error flex items-center gap-1">
                Accéder à la zone sensible &rarr;
              </span>
            </Link>
          </div>
        </Card>
      </div>

      {/* Dialogue de confirmation de déconnexion */}
      <ResponsiveDialog
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Confirmation de déconnexion"
        description="Êtes-vous sûr de vouloir vous déconnecter de votre compte FORSA sur cet appareil ?"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowLogoutModal(false)}
              disabled={logoutLoading}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmLogout}
              loading={logoutLoading}
            >
              Déconnexion
            </Button>
          </>
        }
      >
        <p className="text-sm text-ui-text-70">
          Vous devrez vous reconnecter avec votre numéro mobile et Telegram pour accéder à nouveau à vos offres.
        </p>
      </ResponsiveDialog>
    </div>
  );
};
