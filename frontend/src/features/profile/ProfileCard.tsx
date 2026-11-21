// frontend/src/features/profile/ProfileCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, MapPin, Check, AlertCircle, ShieldCheck, Edit3 } from 'lucide-react';
import { UserProfile } from './types';

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
          <div className="size-full rounded-full overflow-hidden bg-emerald-900 border-2 border-[#DBF0DD] shadow-sm flex items-center justify-center text-white text-xl font-bold">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span>{user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}</span>
            )}
          </div>

          <div
            className="absolute bottom-0 right-0 size-[24px] rounded-full bg-[#0B2C25] border-2 border-white flex items-center justify-center text-white shadow-sm"
            title="Photo de profil"
          >
            <Camera size={11} />
          </div>
        </div>

        {/* Identité */}
        <div className="min-w-0 flex-1">
          {/* Nom + Badge certifié */}
          <div className="flex items-center gap-1.5">
            <h4 className="text-[17px] font-bold text-[#0B2C25] truncate leading-tight">
              {user.fullName || 'Lydia Benali'}
            </h4>
            <div
              className="size-[18px] rounded-full bg-[#17664E] text-white flex items-center justify-center shrink-0"
              title="Compte Vérifié"
            >
              <Check size={11} strokeWidth={3} />
            </div>
          </div>

          {/* Localisation */}
          <div className="flex items-center gap-1 text-xs text-[#0B2C25]/75 mt-1 truncate">
            <MapPin size={12} className="text-[#17664E] shrink-0" />
            <span className="truncate">Bab Ezzouar, Alger</span>
          </div>

          {/* Pastilles de vérification */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                user.emailVerified
                  ? 'bg-[#DBF0DD] text-[#0B2C25]'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {user.emailVerified ? (
                <Check size={10} className="text-[#17664E]" strokeWidth={2.5} />
              ) : (
                <AlertCircle size={10} className="text-amber-700" />
              )}
              {user.emailVerified ? 'E-mail vérifié' : 'E-mail non vérifié'}
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                user.phoneVerified
                  ? 'bg-[#DBF0DD] text-[#0B2C25]'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {user.phoneVerified ? (
                <Check size={10} className="text-[#17664E]" strokeWidth={2.5} />
              ) : (
                <AlertCircle size={10} className="text-amber-700" />
              )}
              {user.phoneVerified ? 'Tél. vérifié' : 'Tél. non vérifié'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer bar: Statut & Action */}
      <div className="pt-2 border-t border-[#0B2C25]/8 flex items-center justify-between text-xs">
        <span className="text-[11px] text-[#0B2C25]/60">
          {user.phone ? `+213 ${user.phone}` : user.email}
        </span>

        {onEditClick ? (
          <button
            onClick={onEditClick}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#17664E] hover:text-[#0B2C25] transition"
          >
            <Edit3 size={12} />
            <span>Modifier</span>
          </button>
        ) : (
          <Link
            to="/profile"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#17664E] hover:text-[#0B2C25] transition"
          >
            <Edit3 size={12} />
            <span>Modifier</span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default ProfileCard;
