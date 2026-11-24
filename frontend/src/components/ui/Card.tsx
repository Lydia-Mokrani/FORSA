import React from 'react';
import { cn } from './cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  headerClassName?: string;
}

/**
 * Composant Card conforme aux spécifications Figma Lot R0.
 * Fond blanc, bordure 1.5px #dbf0dd, rayon 24px, padding 28px (20px sur mobile).
 * En-tête : Badge icône rond (fond mint #eef7ec, bordure #e8ebdf) + titre (20px Medium desktop / 18px SemiBold mobile).
 */
export const Card: React.FC<CardProps> = ({
  title,
  icon,
  headerRight,
  headerClassName,
  children,
  className,
  ...props
}) => {
  const hasHeader = Boolean(title || icon || headerRight);

  return (
    <div
      className={cn(
        'bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] font-poppins text-left',
        'p-[20px] md:p-[28px]',
        'shadow-[0px_4px_16px_rgba(11,44,37,0.04)]',
        className
      )}
      {...props}
    >
      {hasHeader && (
        <div
          className={cn(
            'flex items-center justify-between gap-[14px] mb-[22px] md:mb-[24px]',
            headerClassName
          )}
        >
          <div className="flex items-center gap-[12px] md:gap-[14px]">
            {icon && (
              <div className="size-[40px] rounded-full bg-[#eef7ec] border border-[#e8ebdf] flex items-center justify-center shrink-0 text-[#0b2c25]">
                {icon}
              </div>
            )}
            {title && (
              <h2 className="text-[18px] md:text-[20px] font-semibold md:font-medium text-[#0b2c25] leading-snug">
                {title}
              </h2>
            )}
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
      )}

      {children}
    </div>
  );
};
