import React from 'react';
import { cn } from './cn';
import { Icon } from './Icon';

export type BannerVariant = 'success' | 'warn' | 'error' | 'info';

export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BannerVariant;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
}

/**
 * Composant Banner d'alerte / notification contextuelle conforme Figma Lot R0.
 * Variantes : success (verte), warn (ambre), error (rouge), info (bleue).
 * Rayon 16px (ui-panel), padding 18px.
 */
export const Banner: React.FC<BannerProps> = ({
  variant = 'info',
  title,
  description,
  icon,
  onClose,
  className,
  ...props
}) => {
  const isAlert = variant === 'error' || variant === 'warn';

  const variantStyles: Record<
    BannerVariant,
    {
      container: string;
      title: string;
      defaultIcon: React.ReactNode;
    }
  > = {
    success: {
      container: 'bg-ui-mint border-ui-success-border',
      title: 'text-ui-emerald',
      defaultIcon: <Icon name="check-success" size={22} alt="" />,
    },
    warn: {
      container: 'bg-ui-warn-bg border-ui-warn-border',
      title: 'text-ui-warn',
      defaultIcon: <Icon name="alert-warn" size={22} alt="" />,
    },
    error: {
      container: 'bg-ui-error-bg border-ui-error/30',
      title: 'text-ui-error',
      defaultIcon: <Icon name="alertc" size={22} alt="" />,
    },
    info: {
      container: 'bg-ui-info-bg border-ui-info-border',
      title: 'text-ui-info',
      defaultIcon: <Icon name="info" size={22} alt="" />,
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      className={cn(
        'w-full border rounded-ui-panel p-[18px] font-poppins text-left',
        'flex items-start gap-[14px]',
        style.container,
        className
      )}
      {...props}
    >
      <div className="shrink-0 mt-[1px]">
        {icon || style.defaultIcon}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className={cn('text-[15px] font-semibold leading-snug', style.title)}>
          {title}
        </h3>
        {description && (
          <p className="mt-[4px] text-[13px] font-normal text-ui-text-70 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la notification"
          className="shrink-0 p-1 text-ui-ink/50 hover:text-ui-ink rounded-full transition-colors cursor-pointer"
        >
          <svg className="size-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};
