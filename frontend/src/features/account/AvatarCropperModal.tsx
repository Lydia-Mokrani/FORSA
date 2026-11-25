import React, { useState } from 'react';
import { Camera, ZoomIn, ZoomOut, Check, X } from 'lucide-react';

interface AvatarCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
}

export const AvatarCropperModal: React.FC<AvatarCropperModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
}) => {
  const [zoom, setZoom] = useState(1);

  if (!isOpen) return null;

  const handleSave = () => {
    // Dans une implémentation complète, un canvas HTML5 dessine l'image avec zoom.
    onCropComplete(imageSrc);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-poppins"
      data-node-id="994:15438"
      data-name="Desktop · Modal — Recadrer la photo (cropper)"
    >
      <div className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-scale-in">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 cursor-pointer p-1"
          aria-label="Fermer"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#17664e]">
            <Camera className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-[#0b2c25]">
              Recadrer la photo
            </h3>
            <p className="text-xs text-[#0b2c25]/70">
              Ajustez l’échelle pour centrer votre visage
            </p>
          </div>
        </div>

        {/* Zone de recadrage circulaire */}
        <div className="relative size-64 mx-auto rounded-full overflow-hidden border-4 border-[#17664e] shadow-inner bg-stone-100 flex items-center justify-center mb-6">
          <img
            src={imageSrc}
            alt="Aperçu recadrage"
            className="size-full object-cover transition-transform duration-100"
            style={{ transform: `scale(${zoom})` }}
          />
        </div>

        {/* Slider Zoom */}
        <div className="flex items-center gap-3 mb-6 px-2">
          <ZoomOut className="size-4 text-stone-400 shrink-0" />
          <input
            type="range"
            min="1"
            max="2.5"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full accent-[#17664e] cursor-pointer"
            aria-label="Contrôle du zoom"
          />
          <ZoomIn className="size-4 text-stone-400 shrink-0" />
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-medium text-[#0b2c25] hover:bg-stone-50 cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-[#0b2c25] hover:bg-[#12443a] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Check className="size-4" />
            <span>Appliquer le cadrage</span>
          </button>
        </div>
      </div>
    </div>
  );
};
