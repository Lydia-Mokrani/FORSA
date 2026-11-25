import React, { useState, useEffect } from 'react';
import { ShieldCheck, Laptop, Smartphone, Globe, Trash2, X, Loader2 } from 'lucide-react';
import {
  getActiveSessions,
  revokeUserSession,
  UserSession,
} from '../auth/services/authService';

interface SessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionsModal: React.FC<SessionsModalProps> = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getActiveSessions();
      setSessions(data);
    } catch {
      setError('Impossible de récupérer la liste des sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      const ok = await revokeUserSession(id);
      if (ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
      } else {
        setError('Échec de la révocation de la session.');
      }
    } catch {
      setError('Erreur lors de la révocation.');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-poppins text-[#0B2C25]"
      data-node-id="sessions-modal"
    >
      <div className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 sm:p-8 max-w-lg w-full shadow-xl relative animate-scale-in">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 cursor-pointer p-1"
          aria-label="Fermer"
        >
          <X className="size-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="size-11 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#17664e]">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-xl text-[#0b2c25]">
              Sessions actives
            </h3>
            <p className="text-xs text-[#0b2c25]/70">
              Gérez les appareils et navigateurs connectés à votre compte
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#fdecea] border border-[#f2b8b3] text-[#b3261e] text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-stone-400 gap-2">
            <Loader2 className="size-6 animate-spin text-[#17664e]" />
            <p className="text-xs">Chargement des sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 rounded-2xl bg-[#eef7ec] border border-[#dbf0dd] text-xs text-[#17664e] mb-4">
            <p className="font-medium">1 session active (Appareil actuel)</p>
            <p className="text-2xs text-[#17664e]/80 mt-1">Navigateur Web actif sécurisé par jeton JWT.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1">
            {sessions.map((s, idx) => {
              const isCurrent = s.current || idx === 0;
              const isMobile = s.device?.toLowerCase().includes('mobile') || s.userAgent?.toLowerCase().includes('mobile');
              return (
                <div
                  key={s.id || idx}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-[#dbf0dd] bg-stone-50/50 hover:bg-stone-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-[#eef7ec] flex items-center justify-center text-[#17664e] shrink-0">
                      {isMobile ? <Smartphone className="size-4" /> : <Laptop className="size-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#0b2c25]">
                          {s.device || (isMobile ? 'Mobile' : 'Ordinateur de bureau')}
                        </span>
                        {isCurrent && (
                          <span className="bg-[#eef7ec] text-[#17664e] border border-[#dbf0dd] text-2xs px-2 py-0.5 rounded-full font-medium">
                            Cette session
                          </span>
                        )}
                      </div>
                      <p className="text-2xs text-[#0b2c25]/60 mt-0.5">
                        {s.ipAddress ? `IP : ${s.ipAddress}` : 'Session web active'}
                        {s.lastActiveAt ? ` · Actif : ${new Date(s.lastActiveAt).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      type="button"
                      disabled={revokingId === s.id}
                      onClick={() => handleRevoke(s.id)}
                      className="text-stone-400 hover:text-[#b3261e] p-2 rounded-lg hover:bg-red-50 transition cursor-pointer"
                      title="Révoquer cette session"
                    >
                      {revokingId === s.id ? (
                        <Loader2 className="size-4 animate-spin text-[#b3261e]" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#0b2c25] hover:bg-[#12443a] text-white text-xs font-medium cursor-pointer shadow-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
