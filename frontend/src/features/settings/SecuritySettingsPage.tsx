// frontend/src/features/settings/SecuritySettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCurrentUser,
  updateUserProfile,
  getActiveSessions,
  revokeUserSession,
  AuthUser,
  UserSession,
} from '../auth/services/authService';
import { formatAlgerianMobileDisplay } from '../profile/ProfilePage';

// Figma Icons
import figmaHeaderLocation from '../../assets/figma/b027565f-330c-438d-8e75-763aa35119eb.svg';
import figmaHeaderBell from '../../assets/figma/b5a3fed0-7e75-428d-bde2-d289d8362364.svg';
import figmaUnreadIndicator from '../../assets/figma/f90091a6-8256-4c7b-808d-68b1b56f5b67.svg';
import figmaFoodAvatar from '../../assets/figma/e7f7445d-b6d0-4bf3-973d-ffa1d0affdba.png';
import figmaSecurityCheckHeader from '../../assets/figma/b87a8d0b-7c1b-4134-bb71-946f25054c86.svg';
import figmaSquareLock from '../../assets/figma/766987c9-e94d-451d-a32a-815d83d1808c.svg';
import figmaSecurityShield from '../../assets/figma/f3d3d3ca-c043-4140-a9b6-b3f5977e9b44.svg';
import figmaSmartPhone from '../../assets/figma/7a071d75-6b5e-4ca3-bf0f-bf7f1d4ce5d5.svg';
import figmaTickVerified from '../../assets/figma/1d2b4ddf-2542-4439-8351-dd7b9bcdadaa.svg';
import figmaArrowRight from '../../assets/figma/c32400fc-8feb-4136-aa27-17c7f5716641.svg';
import figmaLaptopPhone from '../../assets/figma/800a9037-b5da-43ba-9867-917cddd0c20b.svg';
import figmaLogoutIcon from '../../assets/figma/77c997e8-0d8f-4270-adf3-349d202bb23c.svg';
import figmaUserRemove from '../../assets/figma/39c5264b-942a-4178-951e-ca1e06cca756.svg';

function formatDeviceName(rawDevice?: string, userAgent?: string): string {
  if (rawDevice && rawDevice !== 'Appareil Web' && rawDevice.trim().length > 0) {
    return rawDevice;
  }
  const ua = userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  let browser = 'Navigateur Web';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/')) browser = 'Safari';

  let os = '';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  if (browser && os) return `${browser} sur ${os}`;
  return browser;
}

export const SecuritySettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorUpdating, setTwoFactorUpdating] = useState(false);

  // Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Sessions Modal
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const u = await getCurrentUser();
        if (mounted) {
          setUser(u);
          setTwoFactorEnabled(Boolean(u.twoFactorEnabled));
        }
      } catch {
        const cached = localStorage.getItem('forsa_user');
        if (cached && mounted) {
          try {
            const u = JSON.parse(cached);
            setUser(u);
            setTwoFactorEnabled(Boolean(u.twoFactorEnabled));
          } catch {}
        }
      }

      try {
        const rawSessions = await getActiveSessions();
        if (mounted) {
          // Déduplication stricte par appareil web : si connecté 5 fois avec le même navigateur/appareil, n'affiche qu'1 entrée
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
    setShowSessionsModal(false);
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
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.message || 'Impossible de mettre à jour le mot de passe.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const displayEmail = user?.email || 'lydia.benali@example.com';
  const userPhone = (user as any)?.phone || user?.phoneE164;
  const displayPhone = userPhone ? (userPhone.startsWith('+213') ? userPhone : `+213 ${formatAlgerianMobileDisplay(userPhone)}`) : '+213 663 488 312';
  const preferredLocation =
    (user as any)?.preferences?.preferredLocation ||
    (user as any)?.preferredLocation ||
    'Bab Ezzouar, Alger';

  const deviceCountText = `${sessions.length} appareil${sessions.length > 1 ? 's' : ''}`;

  return (
    <div
      className="w-full min-h-screen bg-[#fffaf0] font-poppins text-[#0B2C25] pb-[28px] pt-[30px] px-4 sm:px-[40px] select-none"
      data-node-id="994:20853"
      data-name="Desktop · Paramètres — Sécurité du compte"
    >
      <div className="max-w-[1202px] mx-auto flex flex-col gap-[24px]">
        {/* ── EN-TÊTE DE PAGE (Figma 994:20856) ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-[24px] w-full" data-node-id="994:20856" data-name="Page header">
          {/* Introduction (994:20857) */}
          <div className="flex flex-col gap-[3px] text-[#0b2c25]" data-node-id="994:20857">
            <p className="font-normal text-[11px] text-[#0b2c25]/75" data-node-id="994:20858">
              Mon espace / Profil / Sécurité
            </p>
            <h1 className="font-semibold text-[36px] sm:text-[48px] text-[#0b2c25] leading-tight" data-node-id="994:20859">
              Sécurité du compte
            </h1>
            <p className="font-normal text-[16px] sm:text-[20px] text-[#0b2c25]/85" data-node-id="994:20860">
              Protégez votre compte et vos réservations.
            </p>
          </div>

          {/* Account actions (994:20861) */}
          <div className="flex items-center gap-[14px] shrink-0 self-start md:self-center" data-node-id="994:20861">
            {/* Position actuelle dans le header (994:20862) */}
            <div
              onClick={() => navigate('/location')}
              className="hidden sm:flex items-center gap-[7px] pr-[12px] cursor-pointer hover:opacity-80 transition"
              data-node-id="994:20862"
              title="Modifier ma localisation"
            >
              <img src={figmaHeaderLocation} alt="" className="size-[18px] shrink-0" />
              <span className="font-normal text-[12px] text-[#0b2c25] leading-[1.5] max-w-[150px] truncate">
                {preferredLocation}
              </span>
            </div>

            {/* Notifications entry (994:20865) */}
            <div
              onClick={() => navigate('/notifications')}
              className="relative size-[42px] rounded-full flex items-center justify-center cursor-pointer hover:bg-white/60 transition bg-white/40"
              data-node-id="994:20865"
              title="Notifications"
            >
              <img src={figmaHeaderBell} alt="" className="size-[22px] shrink-0" />
              <img
                src={figmaUnreadIndicator}
                alt=""
                className="absolute top-[8px] left-[27px] size-[7px]"
              />
            </div>

            {/* Circular User Avatar Photo (994:20868) */}
            <div
              onClick={() => navigate('/profile')}
              className="relative size-[48px] rounded-full overflow-hidden shrink-0 border border-black/5 shadow-xs cursor-pointer hover:opacity-90 transition"
              data-node-id="994:20868"
              title="Mon profil"
            >
              <img
                src={figmaFoodAvatar}
                alt="Avatar"
                className="size-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* ── COLONNES (Figma 994:20869) ── */}
        <div className="flex flex-col lg:flex-row gap-[24px] items-start w-full" data-node-id="994:20869" data-name="Colonnes">
          {/* ── COLONNE GAUCHE (549px - 994:20870) ── */}
          <div className="w-full lg:flex-1 lg:max-w-[549px] flex flex-col gap-[24px]" data-node-id="994:20870" data-name="Colonne gauche">
            {/* CARTE 1 : CONNEXION (994:20871) */}
            <div
              className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[24px] flex flex-col gap-[8px] shadow-sm w-full"
              data-node-id="994:20871"
              data-name="Carte sécurité"
            >
              <div className="flex items-center gap-[12px] w-full" data-node-id="994:20872" data-name="En-tête de carte">
                <div className="size-[44px] rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center shrink-0" data-node-id="994:20873">
                  <img src={figmaSecurityCheckHeader} alt="" className="size-[22px]" />
                </div>
                <h2 className="font-medium text-[20px] text-[#0b2c25]" data-node-id="994:20875">
                  Connexion
                </h2>
              </div>

              <div className="h-px bg-[#ebeee1] w-full my-1" data-node-id="994:20876" />

              {/* Ligne Mot de passe (994:20877) */}
              <div className="flex items-center gap-[12px] py-[12px] px-2 hover:bg-[#fffaf0] rounded-[16px] transition w-full" data-node-id="994:20877">
                <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0" data-node-id="994:20878">
                  <img src={figmaSquareLock} alt="" className="size-[20px]" />
                </div>
                <div className="flex flex-col gap-px flex-1 min-w-0" data-node-id="994:20880">
                  <p className="font-semibold text-[14px] text-[#0b2c25]" data-node-id="994:20881">
                    Mot de passe
                  </p>
                  <p className="font-normal text-[11px] text-[#0b2c25]/75" data-node-id="994:20882">
                    Modifié il y a 2 mois
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  className="border border-[#0b2c25] hover:bg-[#ebeee1] px-[14px] py-[6px] rounded-full font-semibold text-[11px] text-[#0b2c25] transition cursor-pointer"
                  data-node-id="994:20883"
                >
                  Modifier
                </button>
              </div>

              <div className="h-px bg-[#ebeee1] w-full" data-node-id="994:20885" />

              {/* Ligne Double authentification (994:20886) */}
              <div className="flex items-center gap-[12px] py-[12px] px-2 hover:bg-[#fffaf0] rounded-[16px] transition w-full" data-node-id="994:20886">
                <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0" data-node-id="994:20887">
                  <img src={figmaSecurityShield} alt="" className="size-[20px]" />
                </div>
                <div className="flex flex-col gap-px flex-1 min-w-0" data-node-id="994:20889">
                  <p className="font-semibold text-[14px] text-[#0b2c25]" data-node-id="994:20890">
                    Double authentification
                  </p>
                  <p className="font-normal text-[12px] text-[#0b2c25]/75" data-node-id="994:20891">
                    Code de sécurité à chaque connexion
                  </p>
                </div>

                {/* Interrupteur Figma (994:20892) */}
                <button
                  type="button"
                  onClick={handleToggle2FA}
                  disabled={twoFactorUpdating}
                  className={`relative w-[48px] h-[28px] rounded-full transition-colors cursor-pointer shrink-0 ${
                    twoFactorEnabled ? 'bg-[#0b2c25]' : 'bg-[#e2e8f0]'
                  }`}
                  data-node-id="994:20892"
                >
                  <span
                    className={`absolute top-[2px] size-[24px] rounded-full bg-white transition-transform shadow-xs ${
                      twoFactorEnabled ? 'left-[22px]' : 'left-[2px]'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* CARTE 2 : VÉRIFICATIONS (994:20894) */}
            <div
              className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[24px] flex flex-col gap-[8px] shadow-sm w-full"
              data-node-id="994:20894"
              data-name="Carte sécurité"
            >
              <div className="flex items-center gap-[12px] w-full" data-node-id="994:20895" data-name="En-tête de carte">
                <div className="size-[44px] rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center shrink-0" data-node-id="994:20896">
                  <img src={figmaSecurityCheckHeader} alt="" className="size-[22px]" />
                </div>
                <h2 className="font-medium text-[20px] text-[#0b2c25]" data-node-id="994:20898">
                  Vérifications
                </h2>
              </div>

              <div className="h-px bg-[#ebeee1] w-full my-1" data-node-id="994:20899" />

              {/* Ligne E-mail (994:20900) */}
              <div
                onClick={() => navigate('/profile/email')}
                className="flex items-center gap-[12px] py-[12px] px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group w-full"
                data-node-id="994:20900"
              >
                <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0 group-hover:bg-[#dbf0dd] transition-colors" data-node-id="994:20901">
                  <span className="font-semibold text-xs text-[#0b2c25]">@</span>
                </div>
                <div className="flex flex-col gap-px flex-1 min-w-0" data-node-id="994:20903">
                  <p className="font-semibold text-[14px] text-[#0b2c25]" data-node-id="994:20904">
                    E-mail
                  </p>
                  <p className="font-normal text-[11px] text-[#0b2c25]/75 truncate" data-node-id="994:20905">
                    {displayEmail}
                  </p>
                </div>
                <div className="bg-[#dbf0dd] flex items-center gap-[3px] px-[8px] py-[3px] rounded-full shrink-0" data-node-id="994:20906">
                  <img src={figmaTickVerified} alt="" className="size-[12px]" />
                  <span className="font-semibold text-[10px] text-[#17664e]" data-node-id="994:20908">
                    Vérifié
                  </span>
                </div>
              </div>

              <div className="h-px bg-[#ebeee1] w-full" data-node-id="994:20909" />

              {/* Ligne Téléphone (994:20910) */}
              <div
                onClick={() => navigate('/profile/phone')}
                className="flex items-center gap-[12px] py-[12px] px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group w-full"
                data-node-id="994:20910"
              >
                <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0 group-hover:bg-[#dbf0dd] transition-colors" data-node-id="994:20911">
                  <img src={figmaSmartPhone} alt="" className="size-[20px]" />
                </div>
                <div className="flex flex-col gap-px flex-1 min-w-0" data-node-id="994:20913">
                  <p className="font-semibold text-[14px] text-[#0b2c25]" data-node-id="994:20914">
                    Téléphone
                  </p>
                  <p className="font-normal text-[11px] text-[#0b2c25]/75 truncate" data-node-id="994:20915">
                    {displayPhone}
                  </p>
                </div>
                <div className="bg-[#dbf0dd] flex items-center gap-[3px] px-[8px] py-[3px] rounded-full shrink-0" data-node-id="994:20916">
                  <img src={figmaTickVerified} alt="" className="size-[12px]" />
                  <span className="font-semibold text-[10px] text-[#17664e]" data-node-id="994:20918">
                    Vérifié
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── COLONNE DROITE (549px - 994:20919) ── */}
          <div className="w-full lg:flex-1 lg:max-w-[549px] flex flex-col gap-[24px]" data-node-id="994:20919" data-name="Colonne droite">
            {/* CARTE 1 : APPAREILS (994:20920) */}
            <div
              className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[24px] flex flex-col gap-[8px] shadow-sm w-full"
              data-node-id="994:20920"
              data-name="Carte sécurité"
            >
              <div className="flex items-center gap-[12px] w-full" data-node-id="994:20921" data-name="En-tête de carte">
                <div className="size-[44px] rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center shrink-0" data-node-id="994:20922">
                  <img src={figmaSmartPhone} alt="" className="size-[22px]" />
                </div>
                <h2 className="font-medium text-[20px] text-[#0b2c25]" data-node-id="994:20924">
                  Appareils
                </h2>
              </div>

              <div className="h-px bg-[#ebeee1] w-full my-1" data-node-id="994:20925" />

              {/* Ligne Sessions actives (994:20926) */}
              <div
                onClick={() => setShowSessionsModal(true)}
                className="flex items-center gap-[12px] py-[12px] px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group w-full"
                data-node-id="994:20926"
              >
                <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0 group-hover:bg-[#dbf0dd] transition-colors" data-node-id="994:20927">
                  <img src={figmaLaptopPhone} alt="" className="size-[20px]" />
                </div>
                <div className="flex flex-col gap-px flex-1 min-w-0" data-node-id="994:20929">
                  <p className="font-semibold text-[14px] text-[#0b2c25]" data-node-id="994:20930">
                    Sessions actives
                  </p>
                  <p className="font-normal text-[11px] text-[#0b2c25]/75" data-node-id="994:20931">
                    Appareils connectés à votre compte
                  </p>
                </div>
                <span className="font-normal text-[12px] text-[#0b2c25]/70" data-node-id="994:20932">
                  {deviceCountText}
                </span>
                <img src={figmaArrowRight} alt="" className="size-[18px] opacity-70 group-hover:opacity-100 transition" />
              </div>

              <div className="h-px bg-[#ebeee1] w-full" data-node-id="994:20934" />

              {/* Ligne Se déconnecter partout (994:20935) */}
              <div
                onClick={handleRevokeOtherSessions}
                className="flex items-center gap-[12px] py-[12px] px-2 hover:bg-[#fffaf0] rounded-[16px] transition cursor-pointer group w-full"
                data-node-id="994:20935"
              >
                <div className="size-[40px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0 group-hover:bg-[#fad4cf] transition-colors" data-node-id="994:20936">
                  <img src={figmaLogoutIcon} alt="" className="size-[20px]" />
                </div>
                <div className="flex flex-col gap-px flex-1 min-w-0" data-node-id="994:20938">
                  <p className="font-semibold text-[14px] text-[#0b2c25]" data-node-id="994:20939">
                    Se déconnecter partout
                  </p>
                  <p className="font-normal text-[11px] text-[#0b2c25]/75" data-node-id="994:20940">
                    Fermer toutes les sessions ouvertes
                  </p>
                </div>
                <img src={figmaArrowRight} alt="" className="size-[18px] opacity-70 group-hover:opacity-100 transition" />
              </div>
            </div>

            {/* CARTE 2 : ZONE SENSIBLE (994:20942) */}
            <div
              className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[24px] flex flex-col gap-[8px] shadow-sm w-full"
              data-node-id="994:20942"
              data-name="Carte sécurité"
            >
              <div className="flex items-center gap-[12px] w-full" data-node-id="994:20943" data-name="En-tête de carte">
                <div className="size-[44px] rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center shrink-0" data-node-id="994:20944">
                  <img src={figmaSquareLock} alt="" className="size-[22px]" />
                </div>
                <h2 className="font-medium text-[20px] text-[#0b2c25]" data-node-id="994:20946">
                  Zone sensible
                </h2>
              </div>

              <div className="h-px bg-[#ebeee1] w-full my-1" data-node-id="994:20947" />

              {/* Ligne Supprimer mon compte (994:20948) */}
              <div
                onClick={() => navigate('/settings/danger')}
                className="flex items-center gap-[12px] py-[12px] px-2 hover:bg-[#fdecea] rounded-[16px] transition cursor-pointer group w-full"
                data-node-id="994:20948"
              >
                <div className="size-[40px] rounded-full bg-[#f7dcd8] flex items-center justify-center shrink-0 group-hover:bg-[#fad4cf] transition-colors" data-node-id="994:20949">
                  <img src={figmaUserRemove} alt="" className="size-[20px]" />
                </div>
                <div className="flex flex-col gap-px flex-1 min-w-0" data-node-id="994:20951">
                  <p className="font-semibold text-[14px] text-[#b13b3b]" data-node-id="994:20952">
                    Supprimer mon compte
                  </p>
                  <p className="font-normal text-[11px] text-[#0b2c25]" data-node-id="994:20953">
                    Action définitive, vos données seront effacées
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODALE MOT DE PASSE (Figma 994:21082) */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[24px] border-[1.5px] border-[#dbf0dd] p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-semibold text-lg text-[#0B2C25]">
              Modifier le mot de passe
            </h3>
            <p className="font-normal text-xs text-[#0B2C25]/75">
              Choisissez un mot de passe sécurisé comportant au moins 8 caractères.
            </p>

            {passwordError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-[#eef7ec] text-[#17664e] text-xs font-semibold">
                Mot de passe mis à jour avec succès !
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[#0B2C25] mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Minimum 8 caractères"
                  className="w-full h-11 px-3 text-sm bg-[#fffaf0] border border-[#78847F]/40 rounded-xl focus:outline-none focus:border-[#17664E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B2C25] mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Répétez le mot de passe"
                  className="w-full h-11 px-3 text-sm bg-[#fffaf0] border border-[#78847F]/40 rounded-xl focus:outline-none focus:border-[#17664E]"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#0B2C25]/40 text-[#0B2C25] font-semibold text-xs hover:bg-stone-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="flex-1 py-2.5 rounded-xl bg-[#0B2C25] text-white font-semibold text-xs hover:bg-[#17664E] transition"
                >
                  {passwordSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE SESSIONS ACTIVES (Figma 994:20926) */}
      {showSessionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[24px] border-[1.5px] border-[#dbf0dd] p-6 max-w-lg w-full space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg text-[#0B2C25]">
                Sessions actives ({sessions.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowSessionsModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>
            <p className="font-normal text-xs text-[#0B2C25]/75">
              Voici les appareils actuellement connectés à votre compte FORSA.
            </p>

            <div className="divide-y divide-[#ebeee1] border border-[#ebeee1] rounded-2xl overflow-hidden">
              {sessions.map((sess) => (
                <div key={sess.id || sess.device} className="p-3.5 flex items-center justify-between gap-3 bg-[#fffaf0]">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={figmaLaptopPhone} alt="" className="size-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-[#0B2C25] truncate">
                        {sess.device || 'Appareil Web'}
                      </p>
                      <p className="text-[11px] text-[#0B2C25]/60">
                        {sess.current ? 'Session actuelle (Cet appareil)' : 'Connecté récemment'}
                      </p>
                    </div>
                  </div>
                  {!sess.current && (
                    <button
                      type="button"
                      onClick={() => sess.id && handleRevokeSession(sess.id)}
                      disabled={revokingId === sess.id}
                      className="text-xs text-[#b13b3b] hover:underline font-semibold shrink-0 cursor-pointer"
                    >
                      {revokingId === sess.id ? 'Fermeture...' : 'Déconnecter'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSessionsModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#0B2C25]/40 text-[#0B2C25] font-semibold text-xs hover:bg-stone-50 transition"
              >
                Fermer
              </button>
              {sessions.some((s) => !s.current) && (
                <button
                  type="button"
                  onClick={handleRevokeOtherSessions}
                  disabled={revokingAll}
                  className="flex-1 py-2.5 rounded-xl bg-[#b13b3b] text-white font-semibold text-xs hover:bg-[#922a2a] transition"
                >
                  {revokingAll ? 'Déconnexion...' : 'Se déconnecter partout'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecuritySettingsPage;
