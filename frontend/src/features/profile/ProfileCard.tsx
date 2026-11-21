// frontend/src/features/profile/ProfileCard.tsx
import React from 'react';
import { UserProfile } from './types';
import {
  defaultAvatar,
  figmaCamera,
  figmaCheckmarkBadge,
  figmaLocationPin,
  figmaTickPill,
} from './figmaAssets';

interface ProfileCardProps {
  user: UserProfile;
  className?: string;
  onEditClick?: () => void;
}

/**
 * Composant « Carte profil » isolé (Frame Figma 903:34764)
 * Dimensions exactes : 388 × 185 px
 */
export const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  className = '',
  onEditClick,
}) => {
  return (
    <div
      style={{ width: '388px', height: '185px' }}
      className={`relative overflow-hidden rounded-[20px] bg-gradient-to-r from-white to-[#EEF7EC] p-5 border border-[#DBF0DD] shadow-[0px_4px_16px_rgba(11,44,37,0.06)] flex flex-col justify-between font-poppins text-[#0B2C25] ${className}`}
    >
      {/* Top section: Avatar + Identité */}
      <div className="flex items-start gap-4">
        {/* Photo de profil (65x66) avec bouton caméra */}
        <div className="relative shrink-0 size-[65px]">
          <div className="size-full rounded-full overflow-hidden bg-[#ebeee1] border-2 border-[#DBF0DD] shadow-sm flex items-center justify-center">
            <img
              src={user.avatarUrl || defaultAvatar}
              alt={user.fullName || 'Profil'}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = defaultAvatar;
              }}
            />
          </div>

          <button
            type="button"
            onClick={onEditClick}
            className="absolute bottom-0 right-0 size-[24px] rounded-full bg-[#0B2C25] border-2 border-white flex items-center justify-center text-white shadow-sm hover:bg-[#17664e] transition"
            title="Photo de profil"
          >
            <img src={figmaCamera} alt="" className="size-[12px]" />
          </button>
        </div>

        {/* Identité */}
        <div className="min-w-0 flex-1">
          {/* Nom + Badge certifié */}
          <div className="flex items-center gap-1.5">
            <h4 className="text-[17px] font-bold text-[#0B2C25] truncate leading-tight">
              {user.fullName || 'Lydia Benali'}
            </h4>
            <img
              src={figmaCheckmarkBadge}
              alt="Compte Vérifié"
              className="size-[18px] shrink-0"
            />
          </div>

          {/* Localisation */}
          <div className="flex items-center gap-1 text-xs text-[#0B2C25]/75 mt-1 truncate">
            <img src={figmaLocationPin} alt="" className="size-[14px] shrink-0" />
            <span className="truncate">Bab Ezzouar, Alger</span>
          </div>

          {/* Pastilles de vérification */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                user.emailVerified
                  ? 'bg-[#DBF0DD] text-[#17664E]'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {user.emailVerified && (
                <img src={figmaTickPill} alt="" className="size-[10px]" />
              )}
              {user.emailVerified ? 'E-mail vérifié' : 'E-mail non vérifié'}
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                user.phoneVerified
                  ? 'bg-[#DBF0DD] text-[#17664E]'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {user.phoneVerified && (
                <img src={figmaTickPill} alt="" className="size-[10px]" />
              )}
              {user.phoneVerified ? 'Tél vérifié' : 'Tél non vérifié'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom section: Membre depuis + Action */}
      <div className="flex items-center justify-between pt-3 border-t border-[#DBF0DD]/60">
        <span className="text-[11px] font-medium text-[#0B2C25]/60">
          Membre depuis oct. 2026
        </span>

        {onEditClick && (
          <button
            type="button"
            onClick={onEditClick}
            className="text-xs font-semibold text-[#17664E] hover:text-[#0B2C25] transition"
          >
            Modifier →
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileCard;
