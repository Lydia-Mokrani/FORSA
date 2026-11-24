import React from 'react';
import { cn } from './cn';

export type ChipVariant = 'success' | 'error' | 'warn' | 'neutral';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  icon?: React.ReactNode;
}

/**
 * Pastille d'état (Chip / Badge) conforme Figma Lot R0.
 * Variantes : success | error | warn | neutral.
 * Typographie : 12px Medium, Forme : pillule (rounded-ui-pill), Accessibilité : role="status".
 */
export const Chip: React.FC<ChipProps> = ({
  variant = 'neutral',
  icon,
  children,
  className,
  ...props
}) => {
  const variantStyles: Record<ChipVariant, string> = {
    success: 'bg-ui-mint text-ui-emerald',
    error: 'bg-ui-error-bg text-ui-error',
    warn: 'bg-ui-warn-bg text-ui-warn',
    neutral: 'bg-ui-map-down text-ui-ink',
  };

  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-[6px] px-[12px] py-[6px] rounded-ui-pill',
        'text-[12px] font-medium font-poppins select-none whitespace-nowrap',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
