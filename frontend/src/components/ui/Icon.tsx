import React from 'react';
import { cn } from './cn';

// Import des icônes SVG officielles extraites de Figma
import iconBuilding from '../../assets/icons/figma/boutique-building.svg';
import iconPin from '../../assets/icons/figma/boutique-pin.svg';
import iconPinEmpty from '../../assets/icons/figma/boutique-pin-empty.svg';
import iconPinLarge from '../../assets/icons/figma/boutique-pin-large.svg';
import iconClock from '../../assets/icons/figma/boutique-clock.svg';
import iconPhone from '../../assets/icons/input-phone.svg';
import iconFile from '../../assets/icons/input-file-text.svg';
import iconDown from '../../assets/icons/input-chevron-down.svg';
import iconBack from '../../assets/icons/arrow-left.svg';
import iconCheck from '../../assets/icons/figma/boutique-check.svg';
import iconCheckSuccess from '../../assets/icons/figma/boutique-check-success.svg';
import iconAlert from '../../assets/icons/figma/boutique-alert-warn.svg';
import iconAlertc from '../../assets/icons/figma/boutique-alertc.svg';
import iconRefresh from '../../assets/icons/figma/boutique-refresh.svg';
import iconWifioff from '../../assets/icons/figma/boutique-wifioff.svg';
import iconBell from '../../assets/icons/figma/boutique-bell.svg';
import iconInfo from '../../assets/icons/information-circle.svg';
import iconUser from '../../assets/icons/input-user.svg';

export const iconMap = {
  building: iconBuilding,
  pin: iconPin,
  'pin-empty': iconPinEmpty,
  'pin-large': iconPinLarge,
  clock: iconClock,
  phone: iconPhone,
  file: iconFile,
  down: iconDown,
  'chevron-down': iconDown,
  back: iconBack,
  'arrow-left': iconBack,
  check: iconCheck,
  'check-success': iconCheckSuccess,
  alert: iconAlert,
  'alert-warn': iconAlert,
  alertc: iconAlertc,
  'alert-circle': iconAlertc,
  refresh: iconRefresh,
  wifioff: iconWifioff,
  'wifi-off': iconWifioff,
  bell: iconBell,
  info: iconInfo,
  user: iconUser,
} as const;

export type IconName = keyof typeof iconMap;

export interface IconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  name: IconName;
  size?: number | string;
  className?: string;
  alt?: string;
}

/**
 * Composant Icon : Wrapper standardisé sur les SVG officiels Figma du projet FORSA.
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  className,
  alt = '',
  style,
  ...props
}) => {
  const src = iconMap[name];

  if (!src) {
    console.warn(`[FORSA-UI] Icône manquante : "${name}".`);
    return null;
  }

  const dim = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={!alt}
      className={cn('inline-block shrink-0 select-none object-contain', className)}
      style={{
        width: dim,
        height: dim,
        ...style,
      }}
      {...props}
    />
  );
};
