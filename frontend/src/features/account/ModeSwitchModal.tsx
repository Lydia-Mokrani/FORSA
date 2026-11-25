import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, User, X, Loader2, ArrowRight } from 'lucide-react';
import { switchUserMode } from '../auth/services/authService';

interface ModeSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModeSwitchModal: React.FC<ModeSwitchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSwitch = async () => {
    setError('');
    setLoading(true);
    try {
      await switchUserMode('CUSTOMER');
      onClose();
      navigate('/profile');
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du basculement en mode client.');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-poppins text-[#0B2C25]"
      data-node-id="1155:25968"
      data-name="Modal — Passer en mode client"
    >
      <div className="backdrop-blur-[20px] bg-white/95 border-[1.2px] border-[rgba(255,255,255,0.7)] rounded-[28px] p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-scale-in">
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
            <RefreshCw className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-xl text-[#0b2c25]">
              Passer en mode client
            </h3>
            <p className="text-xs text-[#0b2c25]/70">
              Explorer les paniers et réserver des offres
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#fdecea] border border-[#f2b8b3] text-[#b3261e] text-xs">
            {error}
          </div>
        )}

        <div className="p-4 rounded-2xl bg-[#eef7ec] border border-[#dbf0dd] text-xs text-[#17664e] mb-5 leading-relaxed">
          <p className="font-semibold text-sm mb-1 text-[#0b2c25]">
            Basculez facilement entre vos rôles
          </p>
          <p className="text-xs text-[#0b2c25]/80">
            Vous pourrez à tout moment revenir à votre espace commerçant depuis le menu de navigation.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#0b2c25] hover:bg-stone-50 cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSwitch}
            className="px-5 py-2.5 rounded-xl bg-[#0b2c25] hover:bg-[#12443a] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}
            <span>Activer le mode client</span>
          </button>
        </div>
      </div>
    </div>
  );
};
