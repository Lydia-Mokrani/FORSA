import React from 'react';
import { cn } from './cn';

/**
 * Calcule les initiales à partir d'un nom (ex: "Maison Gourmande" -> "MG").
 * Fallback : '?' si aucun nom valide.
 */
export function getInitials(name?: string): string {
  if (!name || typeof name !== 'string') return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  src?: string | null;
  size?: number;
  alt?: string;
  className?: string;
}

/**
 * Composant Avatar circulaire conforme aux maquettes Figma FORSA.
 * - Fond : #eef7ec (mint)
 * - Bordure : 1px #dbf0dd
 * - Initiales : 15px SemiBold #17664e
 */
export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 48,
  alt,
  className,
  style,
  ...props
}) => {
  const [imageError, setImageError] = React.useState(false);
  const initials = getInitials(name);
  const showImage = Boolean(src && !imageError);

  return (
    <div
      role="img"
      aria-label={alt || name || 'Avatar utilisateur'}
      className={cn(
        'rounded-full bg-ui-mint border border-ui-card-border flex items-center justify-center text-ui-emerald font-semibold text-[15px] select-none overflow-hidden shrink-0',
        className
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        ...style,
      }}
      {...props}
    >
      {showImage ? (
        <img
          src={src!}
          alt={alt || name || 'Avatar'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};
