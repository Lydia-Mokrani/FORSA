// frontend/src/features/profile/ProfileCard.tsx
import React from 'react';
import imgPhotoDeProfil from '../../assets/images/figma/figma_903_imgPhotoDeProfil.png';
import imgElements from '../../assets/icons/figma/icone-camera-01.svg';
import imgElements1 from '../../assets/icons/figma/icone-checkmark-badge-01.svg';
import imgElements2 from '../../assets/icons/figma/icone-pin.svg';
import imgElements3 from '../../assets/icons/figma/icone-tick-02.svg';

export interface ProfileCardProps {
  user?: {
    fullName?: string;
    email?: string;
    phone?: string | null;
    avatarUrl?: string | null;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    preferredLocation?: string | null;
    preferences?: {
      preferredLocation?: string | null;
      searchRadiusKm?: number;
    } | null;
    [key: string]: any;
  };
  className?: string;
  onEditPhoto?: () => void;
  onEditClick?: () => void;
  preferredLocation?: string | null;
}

/**
 * Composant « Carte profil » isolé (Figma Node 903:34764)
 * Dimensions exactes : 388 × 185 px
 */
export const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  className = '',
  onEditPhoto,
  onEditClick,
  preferredLocation,
}) => {
  const displayName = user?.fullName || (user?.phone ? user.phone : user?.email ? user.email.split('@')[0] : 'Mon Compte');
  const displayLocation = preferredLocation || user?.preferences?.preferredLocation || user?.preferredLocation || 'Bab Ezzouar, Alger';
  const isEmailVerified = user?.emailVerified !== false;
  const isPhoneVerified = user?.phoneVerified !== false;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'MC';
  const handleEdit = onEditPhoto || onEditClick;

  return (
    <div
      style={{ width: '388px', height: '185px' }}
      className={`bg-gradient-to-r border-[1.5px] border-[#dbf0dd] border-solid content-stretch flex from-white items-center pb-[20px] px-[20px] relative rounded-[24px] to-[#eef7ec] shadow-[0px_4px_16px_rgba(11,44,37,0.06)] font-poppins ${className}`}
      data-node-id="903:34764"
      data-name="Carte profil"
    >
      {/* Photo de profil (65x66) avec bouton changer la photo */}
      <div className="h-[66px] relative shrink-0 w-[65px]" data-node-id="903:34765" data-name="Photo de profil">
        <div className="absolute left-[-15.5px] size-[67px] top-[-0.5px] rounded-full overflow-hidden" data-node-id="903:34766" data-name="Photo de profil">
          {user?.avatarUrl ? (
            <img
              alt={displayName}
              className="block size-full rounded-full object-cover"
              src={user.avatarUrl}
            />
          ) : (
            <div className="size-full bg-[#0B2C25] text-white flex items-center justify-center font-bold text-xl rounded-full">
              {initials}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleEdit}
          className="absolute bg-[#0b2c25] border-2 border-white border-solid content-stretch flex items-center justify-center left-[23.5px] rounded-[100px] size-[28px] top-[38.5px] cursor-pointer hover:bg-[#17664e] transition"
          data-node-id="903:34767"
          data-name="Bouton changer la photo"
          title="Changer la photo"
        >
          <div className="overflow-clip relative shrink-0 size-[18px]" data-node-id="903:34768" data-name="Icône camera-01">
            <div className="absolute inset-[8.33%_8.33%_8.34%_8.33%]" data-node-id="I903:34768;2:7092" data-name="elements">
              <div className="absolute inset-[-5%]">
                <img alt="" className="block max-w-none size-full" src={imgElements} />
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Identité */}
      <div className="content-stretch flex flex-col gap-[4px] items-start ml-[24px] relative shrink-0 w-[240px]" data-node-id="903:34769" data-name="Identité">
        {/* Nom + Badge vérifié */}
        <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-node-id="903:34770" data-name="Nom">
          <p className="[word-break:break-word] font-bold leading-[normal] not-italic relative shrink-0 text-[20px] text-[#0b2c25] whitespace-nowrap" data-node-id="903:34771">
            {displayName}
          </p>
          <div className="overflow-clip relative shrink-0 size-[19px]" data-node-id="903:34772" data-name="Icône checkmark-badge-01">
            <div className="absolute inset-[8.33%_8.33%_8.34%_8.34%]" data-node-id="I903:34772;2:8135" data-name="elements">
              <div className="absolute inset-[-4.73%_-4.73%_-4.74%_-4.74%]">
                <img alt="Vérifié" className="block max-w-none size-full" src={imgElements1} />
              </div>
            </div>
          </div>
        </div>

        {/* Localisation */}
        <div className="content-stretch flex gap-[6px] items-center relative shrink-0" data-node-id="903:34773" data-name="Localisation">
          <div className="overflow-clip relative shrink-0 size-[14px]" data-node-id="903:34774" data-name="Icône location-01">
            <div className="absolute inset-[8.34%_12.49%_8.33%_12.5%]" data-node-id="I903:34774;2:14757" data-name="elements">
              <div className="absolute inset-[-6.43%_-7.15%]">
                <img alt="" className="block max-w-none size-full" src={imgElements2} />
              </div>
            </div>
          </div>
          <p className="[word-break:break-word] font-medium leading-[normal] not-italic relative shrink-0 text-[10px] text-[#0b2c25] truncate max-w-[190px]" data-node-id="903:34775">
            {displayLocation}
          </p>
        </div>

        {/* Pastilles de vérification */}
        <div className="content-stretch flex gap-[6px] items-center relative shrink-0 mt-1" data-node-id="903:34776" data-name="Pastilles de vérification">
          <div
            className={`content-stretch flex gap-[4px] items-center justify-center px-[8px] py-[4px] relative rounded-[100px] shrink-0 ${
              isEmailVerified ? 'bg-[#dbf0dd]' : 'bg-[#f7dcd8]'
            }`}
            data-node-id="903:34777"
            data-name="Pastille E-mail vérifié"
          >
            {isEmailVerified && (
              <div className="overflow-clip relative shrink-0 size-[8px]" data-node-id="903:34778" data-name="Icône tick-02">
                <div className="absolute inset-[27.09%_20.84%_27.08%_20.83%]" data-node-id="I903:34778;2:8207" data-name="elements">
                  <div className="absolute inset-[-20.46%_-16.09%_-20.45%_-16.06%]">
                    <img alt="" className="block max-w-none size-full" src={imgElements3} />
                  </div>
                </div>
              </div>
            )}
            <p
              className={`[word-break:break-word] font-semibold leading-[normal] not-italic relative shrink-0 text-[8px] whitespace-nowrap ${
                isEmailVerified ? 'text-[#17664e]' : 'text-[#b13b3b]'
              }`}
              data-node-id="903:34779"
            >
              {isEmailVerified ? 'E-mail vérifié' : 'E-mail non vérifié'}
            </p>
          </div>

          <div
            className={`content-stretch flex gap-[4px] items-center justify-center px-[8px] py-[4px] relative rounded-[100px] shrink-0 ${
              isPhoneVerified ? 'bg-[#dbf0dd]' : 'bg-[#f7dcd8]'
            }`}
            data-node-id="903:34780"
            data-name="Pastille Téléphone vérifié"
          >
            {isPhoneVerified && (
              <div className="overflow-clip relative shrink-0 size-[8px]" data-node-id="903:34781" data-name="Icône tick-02">
                <div className="absolute inset-[27.09%_20.84%_27.08%_20.83%]" data-node-id="I903:34781;2:8207" data-name="elements">
                  <div className="absolute inset-[-20.46%_-16.09%_-20.45%_-16.06%]">
                    <img alt="" className="block max-w-none size-full" src={imgElements3} />
                  </div>
                </div>
              </div>
            )}
            <p
              className={`[word-break:break-word] font-semibold leading-[normal] not-italic relative shrink-0 text-[8px] whitespace-nowrap ${
                isPhoneVerified ? 'text-[#17664e]' : 'text-[#b13b3b]'
              }`}
              data-node-id="903:34782"
            >
              {isPhoneVerified ? 'Téléphone vérifié' : 'Téléphone non vérifié'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
