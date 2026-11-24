import React from 'react';
import { cn } from './cn';
import { Icon } from './Icon';
import { Avatar } from './Avatar';

export interface HeaderProps {
  /** Liste des segments du fil d'Ariane (Desktop uniquement) */
  breadcrumb?: string[];
  /** Titre principal (H1) */
  title: string;
  /** Sous-titre Desktop */
  subtitle?: string;
  /** Sous-titre Mobile (optionnel si différent du desktop) */
  mobileSubtitle?: string;
  /** Callback lors du clic sur le bouton retour mobile */
  onBack?: () => void;
  /** Actions personnalisées affichées à droite */
  actions?: React.ReactNode;
  /** Avatar utilisateur optionnel */
  userAvatar?: {
    name?: string;
    src?: string | null;
  };
  /** Affichage de l'icône notification */
  hasNotifications?: boolean;
  /** Callback clic notifications */
  onNotificationClick?: () => void;
  className?: string;
}

/**
 * Composant Header responsive unifié :
 * - Desktop : Fil d'Ariane 11px, Titre H1 48px SemiBold #0b2c25, Sous-titre 20px Regular, zone profil droite (cloche + avatar).
 * - Mobile : Bouton retour rond 40px, Titre 20px Medium, Sous-titre 13px Regular.
 */
export const Header: React.FC<HeaderProps> = ({
  breadcrumb,
  title,
  subtitle,
  mobileSubtitle,
  onBack,
  actions,
  userAvatar,
  hasNotifications,
  onNotificationClick,
  className,
}) => {
  return (
    <header className={cn('w-full', className)}>
      {/* Version Desktop (md+) */}
      <div className="hidden md:flex flex-col gap-2">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Fil d'Ariane" className="text-[11px] font-normal text-ui-ink flex items-center gap-1.5">
            {breadcrumb.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="opacity-40" aria-hidden="true">/</span>}
                <span className={idx === breadcrumb.length - 1 ? 'font-medium text-ui-ink' : 'opacity-80'}>
                  {item}
                </span>
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-[48px] font-semibold text-ui-ink leading-[1.1] tracking-[-0.02em]">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[20px] font-normal text-ui-text-80 mt-2 leading-snug">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 shrink-0 pt-2">
            {actions}
            {hasNotifications && (
              <button
                type="button"
                onClick={onNotificationClick}
                aria-label="Notifications"
                className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors cursor-pointer"
              >
                <Icon name="bell" size={28} />
              </button>
            )}
            {userAvatar && (
              <Avatar name={userAvatar.name} src={userAvatar.src} size={48} />
            )}
          </div>
        </div>
      </div>

      {/* Version Mobile (< md) */}
      <div className="md:hidden flex items-center gap-3.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Retour"
            className="w-10 h-10 rounded-full bg-white border border-ui-field-border flex items-center justify-center shrink-0 cursor-pointer shadow-sm active:scale-95 transition-transform"
          >
            <Icon name="back" size={20} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] font-medium text-ui-ink leading-tight truncate">
            {title}
          </h1>
          {(mobileSubtitle || subtitle) && (
            <p className="text-[13px] font-normal text-ui-text-70 leading-normal truncate mt-0.5">
              {mobileSubtitle || subtitle}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </header>
  );
};
