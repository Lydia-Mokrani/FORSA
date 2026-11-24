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
 * Composant Banner contextuel conforme Figma Lot R0.
 * Variantes : success | warn | error | info.
 * Dimensions : Icône 22px, Titre 15px SemiBold, Description 13px, Rayon 16px, Padding 18px.
 * Accessibilité : role="alert" pour error/warn, role="status" sinon.
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
      container: 'bg-[#eef7ec] border-[#a9d3a0]',
      title: 'text-[#17664e]',
      defaultIcon: <Icon name="check-success" size={22} alt="" />,
    },
    warn: {
      container: 'bg-[#fff4dc] border-[#f0cf8f]',
      title: 'text-[#8a5a00]',
      defaultIcon: <Icon name="alert-warn" size={22} alt="" />,
    },
    error: {
      container: 'bg-[#fdecea] border-[#f8b4b4]',
      title: 'text-[#b3261e]',
      defaultIcon: <Icon name="alertc" size={22} alt="" />,
    },
    info: {
      container: 'bg-[#f0f9ff] border-[#b9e6fe]',
      title: 'text-[#026aa7]',
      defaultIcon: <Icon name="info" size={22} alt="" />,
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      className={cn(
        'w-full border rounded-[16px] p-[18px] font-poppins text-left',
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
          <p className="mt-[4px] text-[13px] font-normal text-[rgba(11,44,37,0.7)] leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la notification"
          className="shrink-0 p-1 text-[rgba(11,44,37,0.5)] hover:text-[#0b2c25] rounded-full transition-colors cursor-pointer"
        >
          <svg className="size-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};
