// frontend/src/features/settings/SecuritySettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Laptop,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  ChevronRight,
  X,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import {
  getCurrentUser,
  getActiveSessions,
  revokeUserSession,
  UserSession,
  AuthUser,
  updateUserProfile,
} from '../auth/services/authService';

function formatDeviceName(device?: string, userAgent?: string): string {
  if (device && !device.startsWith('Mozilla/') && device.length < 50 && device !== 'Appareil Web') {
    return device;
  }
  const ua = userAgent || (device?.startsWith('Mozilla/') ? device : typeof navigator !== 'undefined' ? navigator.userAgent : '');
  if (!ua) return 'Navigateur Web';

  let os = '';
  if (/windows nt 10/i.test(ua)) os = 'Windows 10/11';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/iphone/i.test(ua)) os = 'iPhone (iOS)';
  else if (/ipad/i.test(ua)) os = 'iPad (iPadOS)';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Navigateur Web';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua) && !/opr\//i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/opr\//i.test(ua)) browser = 'Opera';

  return os ? `${browser} sur ${os}` : browser;
}

export const SecuritySettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Double authentification (2FA) toggle
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorUpdating, setTwoFactorUpdating] = useState(false);

  // Modal changement de mot de passe
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Revocation loading
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const u = await getCurrentUser();
        if (mounted) {
          setUser(u);
          if ((u as any)?.twoFactorEnabled) {
            setTwoFactorEnabled(true);
          }
        }
      } catch {
        const cached = localStorage.getItem('forsa_user');
        if (cached && mounted) {
          try {
            const u = JSON.parse(cached);
            setUser(u);
            if (u?.twoFactorEnabled) setTwoFactorEnabled(true);
          } catch {}
        }
      }

      try {
        const rawSessions = await getActiveSessions();
        if (mounted) {
          // Déduplication par appareil : si connecté 5 fois avec le même appareil/navigateur, n'affiche qu'une seule session
          const seenDevices = new Set<string>();
          const deduped: UserSession[] = [];
          let hasCurrent = false;

          for (const s of rawSessions) {
            const cleanDevice = formatDeviceName(s.device, s.userAgent);
            const key = cleanDevice.toLowerCase();

            if (!seenDevices.has(key)) {
              seenDevices.add(key);
              const isCurrent = !hasCurrent || Boolean(s.current);
              if (isCurrent) hasCurrent = true;
              deduped.push({
                ...s,
                device: cleanDevice,
                current: isCurrent,
              });
            }
          }

          if (deduped.length === 0) {
            deduped.push({
              id: 'current-session',
              device: formatDeviceName(undefined, navigator.userAgent),
              current: true,
              lastActiveAt: new Date().toISOString(),
            });
          }

          setSessions(deduped);
        }
      } catch {}

      if (mounted) setLoading(false);
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggle2FA = async () => {
    const nextVal = !twoFactorEnabled;
    setTwoFactorEnabled(nextVal);
    setTwoFactorUpdating(true);
    try {
      await updateUserProfile({
        twoFactorEnabled: nextVal,
      });
    } catch {
      setTwoFactorEnabled(!nextVal);
    } finally {
      setTwoFactorUpdating(false);
    }
  };

  const handleRevokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      await revokeUserSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.warn('Revoke error:', err);
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    setRevokingAll(true);
    const otherSessions = sessions.filter((s) => !s.current && s.id);
    for (const sess of otherSessions) {
      if (sess.id) {
        await revokeUserSession(sess.id).catch(() => {});
      }
    }
    setSessions((prev) => prev.filter((s) => s.current));
    setRevokingAll(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    setPasswordSaving(true);
    try {
      await updateUserProfile({
        password: newPassword,
      });
      setPasswordSuccess(true);
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1800);
    } catch (err: any) {
      setPasswordError(err.message || 'Impossible de mettre à jour le mot de passe.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#fffaf0] p-4 sm:p-6 md:p-8 font-poppins text-[#0B2C25] selection:bg-[#17664e] selection:text-white"
      data-node-id="994:20853"
      data-name="Desktop · Paramètres — Sécurité du compte"
    >
      <div className="max-w-[1140px] mx-auto space-y-6">
        {/* Navigation & En-tête Figma 994:20856 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-[44px] font-bold tracking-tight text-[#0b2c25]">
              Sécurité du compte
            </h1>
            <p className="text-sm sm:text-base text-[#0b2c25]/75 mt-1 font-normal">
              Protégez votre compte et vos réservations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="self-start sm:self-auto border border-[#0b2c25]/30 hover:bg-stone-100 text-[#0b2c25] text-xs font-semibold px-4 py-2 rounded-full transition cursor-pointer"
          >
            ← Retour aux paramètres
          </button>
        </div>

        {/* Grille 2 Colonnes : Figma 994:20869 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Colonne Gauche (Connexion & Vérifications) */}
          <div className="space-y-6">
            {/* ─── CARTE 1 : CONNEXION (Figma 994:20871) ─── */}
            <div className="bg-white rounded-[24px] border-[1.5px] border-[#dbf0dd] p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-[#ebeee1]">
                <div className="size-11 rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center text-[#17664e] shrink-0">
                  <Shield className="size-5" />
                </div>
                <div>
                  <h2 className="text-[20px] font-semibold text-[#0b2c25]">Connexion</h2>
                  <p className="text-xs text-[#0b2c25]/60">Mot de passe et authentification</p>
                </div>
              </div>

              <div className="divide-y divide-[#ebeee1]">
                {/* Ligne Mot de passe */}
                <div className="flex items-center justify-between py-3.5 px-2 hover:bg-[#fffaf0] rounded-[16px] transition">
                  <div className="flex items-center gap-3.5">
                    <div className="size-10 rounded-full bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                      <Lock className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#0b2c25]">Mot de passe</h4>
                      <p className="text-xs text-[#0b2c25]/60">
                        Chiffré et sécurisé avec Argon2id
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(true)}
                    className="px-3.5 py-1.5 rounded-full border border-[#0b2c25] hover:bg-[#0b2c25] hover:text-white text-xs font-semibold text-[#0b2c25] transition cursor-pointer"
                  >
                    Modifier
                  </button>
                </div>

                {/* Ligne Double authentification (2FA) */}
                <div className="flex items-center justify-between py-3.5 px-2 hover:bg-[#fffaf0] rounded-[16px] transition">
                  <div className="flex items-center gap-3.5">
                    <div className="size-10 rounded-full bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                      <Shield className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#0b2c25]">Double authentification</h4>
                      <p className="text-xs text-[#0b2c25]/60">
                        Code de sécurité à chaque connexion
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch Figma 994:20892 */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={twoFactorEnabled}
                    onClick={handleToggle2FA}
                    disabled={twoFactorUpdating}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      twoFactorEnabled ? 'bg-[#0b2c25]' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* ─── CARTE 2 : VÉRIFICATIONS (Figma 994:20894) ─── */}
            <div className="bg-white rounded-[24px] border-[1.5px] border-[#dbf0dd] p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-[#ebeee1]">
                <div className="size-11 rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center text-[#17664e] shrink-0">
                  <Mail className="size-5" />
                </div>
                <div>
                  <h2 className="text-[20px] font-semibold text-[#0b2c25]">Vérifications</h2>
                  <p className="text-xs text-[#0b2c25]/60">E-mail et numéro de téléphone confirmés</p>
                </div>
              </div>

              <div className="divide-y divide-[#ebeee1]">
                {/* Ligne Email */}
                <div className="flex items-center justify-between py-3.5 px-2 hover:bg-[#fffaf0] rounded-[16px] transition">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="size-10 rounded-full bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                      <Mail className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-[#0b2c25]">E-mail</h4>
                        <span className="text-[10px] font-semibold text-[#17664e] bg-[#eef7ec] px-2 py-0.5 rounded-full border border-[#235347]/20 flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          <span>Vérifié</span>
                        </span>
                      </div>
                      <p className="text-xs text-[#0b2c25]/70 truncate">
                        {user?.email || 'email@exemple.dz'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/profile/email')}
                    className="px-3.5 py-1.5 rounded-full border border-[#0b2c25]/30 hover:bg-[#0b2c25] hover:text-white text-xs font-semibold text-[#0b2c25] transition cursor-pointer shrink-0 ml-2"
                  >
                    Modifier
                  </button>
                </div>

                {/* Ligne Téléphone */}
                <div className="flex items-center justify-between py-3.5 px-2 hover:bg-[#fffaf0] rounded-[16px] transition">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="size-10 rounded-full bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                      <Phone className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-[#0b2c25]">Téléphone</h4>
                        <span className="text-[10px] font-semibold text-[#17664e] bg-[#eef7ec] px-2 py-0.5 rounded-full border border-[#235347]/20 flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          <span>Vérifié</span>
                        </span>
                      </div>
                      <p className="text-xs text-[#0b2c25]/70 truncate">
                        {user?.phoneE164 || (user as any)?.phone || '+213 555 00 00 00'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/profile/phone')}
                    className="px-3.5 py-1.5 rounded-full border border-[#0b2c25]/30 hover:bg-[#0b2c25] hover:text-white text-xs font-semibold text-[#0b2c25] transition cursor-pointer shrink-0 ml-2"
                  >
                    Modifier
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne Droite (Appareils & Zone sensible) */}
          <div className="space-y-6">
            {/* ─── CARTE 3 : APPAREILS / SESSIONS ACTIVES (Figma 994:20920) ─── */}
            <div className="bg-white rounded-[24px] border-[1.5px] border-[#dbf0dd] p-6 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ebeee1]">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center text-[#17664e] shrink-0">
                    <Smartphone className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-[20px] font-semibold text-[#0b2c25]">
                      Appareils ({sessions.length || 1})
                    </h2>
                    <p className="text-xs text-[#0b2c25]/60">Appareils connectés à votre compte</p>
                  </div>
                </div>

                {sessions.filter((s) => !s.current).length > 0 && (
                  <button
                    type="button"
                    onClick={handleRevokeOtherSessions}
                    disabled={revokingAll}
                    className="self-start sm:self-auto text-xs font-semibold text-red-600 hover:text-red-800 hover:underline cursor-pointer transition"
                  >
                    {revokingAll ? 'Fermeture...' : 'Se déconnecter partout'}
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="size-6 animate-spin text-[#17664e]" />
                  <p className="text-xs text-[#0b2c25]/60">Chargement de vos appareils...</p>
                </div>
              ) : sessions.length > 0 ? (
                <div className="divide-y divide-[#ebeee1]">
                  {sessions.map((sess, idx) => {
                    const isMobile = (sess.device || sess.userAgent || '').toLowerCase().includes('android') || (sess.device || sess.userAgent || '').toLowerCase().includes('iphone');
                    return (
                      <div
                        key={sess.id || idx}
                        className="py-3.5 px-2 flex items-center justify-between gap-3 text-sm hover:bg-[#fffaf0] rounded-[16px] transition"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="size-10 rounded-full bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                            {isMobile ? <Smartphone className="size-5" /> : <Laptop className="size-5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-[#0b2c25] truncate">
                              {formatDeviceName(sess.device, sess.userAgent)}
                            </p>
                            <p className="text-xs text-[#0b2c25]/60 flex items-center gap-1.5 mt-0.5">
                              <Clock className="size-3" />
                              <span>
                                {sess.current
                                  ? 'Session active'
                                  : sess.lastActiveAt
                                  ? `Actif : ${new Date(sess.lastActiveAt).toLocaleDateString('fr-DZ')}`
                                  : 'Session active'}
                              </span>
                              {sess.ipAddress && <span>· IP: {sess.ipAddress}</span>}
                            </p>
                          </div>
                        </div>

                        <div>
                          {sess.current ? (
                            <span className="text-xs font-semibold text-[#17664e] bg-[#eef7ec] px-3 py-1 rounded-full border border-[#235347]/20 whitespace-nowrap">
                              Cet appareil
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => sess.id && handleRevokeSession(sess.id)}
                              disabled={revokingId === sess.id}
                              className="text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-[10px] transition cursor-pointer whitespace-nowrap"
                            >
                              {revokingId === sess.id ? '...' : 'Déconnecter'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-[16px] bg-[#fffaf0] border border-[#dbf0dd] text-xs text-[#0b2c25]/70 flex items-center justify-between">
                  <span>Session courante sécurisée sur cet appareil.</span>
                  <span className="font-semibold text-[#17664e]">Active</span>
                </div>
              )}
            </div>

            {/* ─── CARTE 4 : ZONE SENSIBLE (Figma 1156:26272) ─── */}
            <div className="bg-white rounded-[24px] border-[1.5px] border-[#dbf0dd] p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-[#ebeee1]">
                <div className="size-11 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h2 className="text-[20px] font-semibold text-[#0b2c25]">Zone sensible</h2>
                  <p className="text-xs text-[#0b2c25]/60">Désactivation ou suppression</p>
                </div>
              </div>

              <div
                onClick={() => navigate('/settings/account')}
                className="flex items-center justify-between py-3.5 px-2 hover:bg-red-50/50 rounded-[16px] transition cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="size-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                    <Trash2 className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-red-700 group-hover:text-red-800 transition">
                      Supprimer mon compte
                    </h4>
                    <p className="text-xs text-red-600/70">
                      Action définitive, vos données seront effacées
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-red-400 group-hover:text-red-700 transition" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Changement de Mot de Passe */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-[24px] border border-[#dbf0dd] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#ebeee1]">
              <div className="flex items-center gap-2.5">
                <Lock className="size-5 text-[#17664e]" />
                <h3 className="text-lg font-bold text-[#0b2c25]">Modifier mon mot de passe</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="size-8 rounded-full flex items-center justify-center hover:bg-stone-100 text-[#0b2c25]/60 hover:text-[#0b2c25] transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 rounded-[12px] bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-[12px] bg-[#eef7ec] border border-[#235347]/30 text-xs text-[#0b2c25] flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#17664e] shrink-0" />
                <span>Mot de passe mis à jour avec succès !</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#0b2c25] mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  required
                  placeholder="8 caractères minimum"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-[12px] bg-[#fffaf0] border border-[#dbf0dd] text-xs text-[#0b2c25] focus:outline-none focus:ring-1 focus:ring-[#17664e]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#0b2c25] mb-1">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  required
                  placeholder="Répétez votre mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-[12px] bg-[#fffaf0] border border-[#dbf0dd] text-xs text-[#0b2c25] focus:outline-none focus:ring-1 focus:ring-[#17664e]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-[12px] border border-[#0b2c25]/30 text-xs font-semibold text-[#0b2c25] hover:bg-stone-100 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="px-4 py-2 rounded-[12px] bg-[#0b2c25] hover:bg-[#17664e] text-xs font-semibold text-white shadow-sm transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {passwordSaving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <span>Enregistrer</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default SecuritySettingsPage;
