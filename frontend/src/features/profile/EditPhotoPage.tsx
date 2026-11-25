import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AvatarCropperModal } from '../account/AvatarCropperModal';
import { defaultAvatar } from './figmaAssets';
import { getStoredUser, setStoredUser, authFetch } from '../auth/services/authService';

export const EditPhotoPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getStoredUser();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentAvatar, setCurrentAvatar] = useState<string>(user?.avatarUrl || defaultAvatar);
  const [showCropper, setShowCropper] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    setSuccess(false);

    // Validation type et taille
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage('Format non supporté. Veuillez choisir une image JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Le fichier dépasse la taille maximale autorisée (5 Mo).');
      return;
    }

    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setRawImage(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropped = async (croppedImage: string) => {
    setShowCropper(false);
    setUploading(true);
    setErrorMessage(null);

    try {
      const resBlob = await fetch(croppedImage);
      const blob = await resBlob.blob();

      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.png');

      const res = await authFetch('/api/users/me/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Erreur lors du téléversement de la photo.');
      }

      const data = await res.json().catch(() => null);
      const newUrl = data?.avatarUrl || croppedImage;
      setCurrentAvatar(newUrl);

      if (user) {
        setStoredUser({ ...user, avatarUrl: newUrl });
      }

      setSuccess(true);
      setTimeout(() => navigate('/profile'), 1500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Impossible d’enregistrer la photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-[#fffaf0] min-h-screen flex flex-col items-center justify-start p-4 sm:p-8 font-poppins selection:bg-[#17664e] selection:text-white">
      <div className="w-full max-w-lg bg-white border border-[#dbf0dd] rounded-[24px] p-6 sm:p-8 shadow-sm flex flex-col items-center gap-6 mt-4 sm:mt-10">
        <div className="flex flex-col items-center text-center gap-1 w-full">
          <h1 className="font-semibold text-[#0b2c25] text-2xl">Photo de profil</h1>
          <p className="text-sm text-[rgba(11,44,37,0.65)]">
            Personnalisez votre avatar pour vos réservations
          </p>
        </div>

        {/* Aperçu Avatar */}
        <div className="relative size-32 rounded-full overflow-hidden border-2 border-[#17664e] shadow-sm">
          <img src={currentAvatar} alt="Avatar actuel" className="size-full object-cover" />
        </div>

        {errorMessage && (
          <div className="bg-[#fdecea] border border-[#b22222]/20 text-[#b22222] text-xs sm:text-sm rounded-xl p-3 w-full text-center">
            {errorMessage}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-xl p-3 w-full text-center">
            Photo de profil mise à jour avec succès !
          </div>
        )}

        {/* Dropzone sélecteur */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
          }}
          className="w-full border-2 border-dashed border-[rgba(11,44,37,0.2)] hover:border-[#17664e] bg-[#fffaf0]/60 rounded-2xl p-8 flex flex-col items-center text-center gap-3 cursor-pointer transition"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
            }}
          />
          <div className="size-12 rounded-full bg-[#17664e]/10 text-[#17664e] flex items-center justify-center">
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-sm text-[#0b2c25]">
              Cliquez pour téléverser ou glissez une image
            </p>
            <p className="text-xs text-[rgba(11,44,37,0.55)] mt-1">
              JPG, PNG ou WebP (max 5 Mo)
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="w-full h-12 rounded-xl border border-[rgba(11,44,37,0.3)] text-[#0b2c25] font-medium text-sm hover:bg-stone-50 transition cursor-pointer"
          >
            Retour au profil
          </button>
        </div>
      </div>

      {/* Modale de recadrage circulaire */}
      {showCropper && rawImage && (
        <AvatarCropperModal
          isOpen={showCropper}
          onClose={() => setShowCropper(false)}
          imageSrc={rawImage}
          onCropComplete={handleCropped}
        />
      )}
    </div>
  );
};
