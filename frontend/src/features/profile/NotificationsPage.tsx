// frontend/src/features/profile/NotificationsPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShoppingBag,
  Clock,
  Mail,
  Send,
  Check,
  Sliders,
  Inbox,
} from 'lucide-react';
import { getCurrentUser, updateUserProfile, AuthUser } from '../auth/services/authService';

interface NotificationItem {
  id: string;
  type: 'ORDER' | 'OFFER' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'prefs'>('all');
  const [user, setUser] = useState<AuthUser | null>(null);

  // Préférences de notification
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [telegramAlerts, setTelegramAlerts] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);

  // Liste des notifications in-app
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      type: 'OFFER',
      title: 'Nouveaux paniers disponibles à Alger Centre !',
      message: 'Des commerces proches de votre zone viennent de publier des paniers surprise à -50%.',
      timestamp: 'Il y a 30 min',
      read: false,
    },
    {
      id: 'notif-2',
      type: 'SYSTEM',
      title: 'Bienvenue sur FORSA',
      message: 'Votre compte est configuré. Vous pouvez dès maintenant explorer les offres et sauver des repas.',
      timestamp: 'Il y a 2 jours',
      read: true,
    },
  ]);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const u = await getCurrentUser();
        if (mounted && u) {
          setUser(u);
          if (u.preferences) {
            if (u.preferences.emailNotifications !== undefined) {
              setEmailAlerts(u.preferences.emailNotifications);
            }
            if (u.preferences.telegramNotifications !== undefined) {
              setTelegramAlerts(u.preferences.telegramNotifications);
            }
          }
        }
      } catch {
        const cached = localStorage.getItem('forsa_user');
        if (cached && mounted) {
          try {
            const u = JSON.parse(cached);
            setUser(u);
          } catch {}
        }
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleTogglePreference = async (
    key: 'emailNotifications' | 'telegramNotifications' | 'pushNotifications',
    curr: boolean,
    setter: (v: boolean) => void
  ) => {
    const nextVal = !curr;
    setter(nextVal);
    setPrefsSaving(true);
    try {
      await updateUserProfile({
        [key]: nextVal,
      });
    } catch (err) {
      console.warn('Error saving pref:', err);
    } finally {
      setPrefsSaving(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="min-h-screen bg-[#fffaf0] p-4 sm:p-6 md:p-8 font-poppins text-[#0B2C25]"
      data-name="Client · Notifications"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & En-tête */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#0b2c25]">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="text-xs font-bold text-white bg-[#17664e] px-2.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#0b2c25]/75 mt-1">
                Restez informé des paniers disponibles, de vos réservations et des alertes anti-gaspi
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="self-start sm:self-auto border border-[#0b2c25]/30 hover:bg-stone-100 text-[#0b2c25] text-xs font-semibold px-4 py-2 rounded-full transition cursor-pointer"
            >
              ← Retour au profil
            </button>
          </div>
        </div>

        {/* Onglets de navigation */}
        <div className="flex items-center justify-between gap-3 border-b border-[#ebeee1] pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#0b2c25] text-white shadow-xs'
                  : 'text-[#0b2c25]/70 hover:bg-stone-100'
              }`}
            >
              Toutes ({notifications.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
                activeTab === 'unread'
                  ? 'bg-[#0b2c25] text-white shadow-xs'
                  : 'text-[#0b2c25]/70 hover:bg-stone-100'
              }`}
            >
              Non lues ({unreadCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('prefs')}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'prefs'
                  ? 'bg-[#0b2c25] text-white shadow-xs'
                  : 'text-[#0b2c25]/70 hover:bg-stone-100'
              }`}
            >
              <Sliders className="size-3.5" />
              <span>Préférences</span>
            </button>
          </div>

          {activeTab !== 'prefs' && unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-[#17664e] hover:underline cursor-pointer hidden sm:inline"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>

        {/* Contenu de l'onglet actif */}
        {activeTab === 'prefs' ? (
          /* ─── ONGLET PRÉFÉRENCES ─── */
          <div className="bg-white rounded-[24px] border-[1.5px] border-[#dbf0dd] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#ebeee1]">
              <div className="size-11 rounded-full bg-[#eef7ec] border border-[#235347]/30 flex items-center justify-center text-[#17664e] shrink-0">
                <Sliders className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#0b2c25]">Canaux de notification</h2>
                <p className="text-xs text-[#0b2c25]/60">Choisissez comment et quand vous souhaitez être alerté</p>
              </div>
            </div>

            <div className="divide-y divide-[#ebeee1]">
              {/* Notifications par E-mail */}
              <div className="flex items-center justify-between py-4 px-2 hover:bg-[#fffaf0] rounded-[16px] transition">
                <div className="flex items-center gap-3.5">
                  <div className="size-10 rounded-full bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                    <Mail className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#0b2c25]">Notifications par e-mail</h4>
                    <p className="text-xs text-[#0b2c25]/60">
                      Recevoir un e-mail lors de la confirmation d'une réservation ou de nouveautés
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={emailAlerts}
                  onClick={() =>
                    handleTogglePreference('emailNotifications', emailAlerts, setEmailAlerts)
                  }
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    emailAlerts ? 'bg-[#0b2c25]' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      emailAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Notifications In-App & Push */}
              <div className="flex items-center justify-between py-4 px-2 hover:bg-[#fffaf0] rounded-[16px] transition">
                <div className="flex items-center gap-3.5">
                  <div className="size-10 rounded-full bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                    <Bell className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#0b2c25]">Alertes paniers proches</h4>
                    <p className="text-xs text-[#0b2c25]/60">
                      Alertes instantanées dès qu'un commerce dans votre rayon publie un panier
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={pushAlerts}
                  onClick={() =>
                    handleTogglePreference('pushNotifications', pushAlerts, setPushAlerts)
                  }
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    pushAlerts ? 'bg-[#0b2c25]' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      pushAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Notifications Telegram */}
              <div className="flex items-center justify-between py-4 px-2 hover:bg-[#fffaf0] rounded-[16px] transition">
                <div className="flex items-center gap-3.5">
                  <div className="size-10 rounded-full bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                    <Send className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#0b2c25]">Rappels Telegram</h4>
                    <p className="text-xs text-[#0b2c25]/60">
                      Recevez un rappel Telegram 1 heure avant la fin du créneau de retrait
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={telegramAlerts}
                  onClick={() =>
                    handleTogglePreference('telegramNotifications', telegramAlerts, setTelegramAlerts)
                  }
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    telegramAlerts ? 'bg-[#0b2c25]' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      telegramAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ─── ONGLET LISTE DES NOTIFICATIONS ─── */
          <div className="space-y-3">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-[20px] border transition flex items-start gap-3.5 ${
                    notif.read
                      ? 'bg-white border-[#dbf0dd]/70 shadow-xs'
                      : 'bg-[#eef7ec]/40 border-[#235347]/30 shadow-sm'
                  }`}
                >
                  <div className="size-10 rounded-full bg-[#eef7ec] border border-[#235347]/30 flex items-center justify-center text-[#17664e] shrink-0 mt-0.5">
                    {notif.type === 'OFFER' ? (
                      <ShoppingBag className="size-5" />
                    ) : notif.type === 'ORDER' ? (
                      <Calendar className="size-5" />
                    ) : (
                      <Sparkles className="size-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-[#0b2c25] truncate">
                        {notif.title}
                      </h4>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-[#0b2c25]/50 flex items-center gap-1">
                          <Clock className="size-3" />
                          <span>{notif.timestamp}</span>
                        </span>
                        {!notif.read && (
                          <span className="size-2 rounded-full bg-[#17664e]" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-[#0b2c25]/75 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 bg-white rounded-[24px] border border-[#dbf0dd] flex flex-col items-center justify-center text-center p-6 gap-3 shadow-xs">
                <div className="size-12 rounded-full bg-[#eef7ec] flex items-center justify-center text-[#17664e]">
                  <Inbox className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-[#0b2c25]">
                  Aucune notification {activeTab === 'unread' ? 'non lue' : ''}
                </h3>
                <p className="text-xs text-[#0b2c25]/60 max-w-sm">
                  Vous recevrez ici les alertes concernant vos réservations et les paniers anti-gaspi près de chez vous.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
