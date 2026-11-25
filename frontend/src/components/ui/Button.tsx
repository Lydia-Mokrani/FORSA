import React from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dangerOutline';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * Bouton accessible conforme aux tokens Figma du Lot R0.
 * Dimensions : 15px Medium, px 26 py 14, rayon 14px (rounded-ui-ctl).
 * Note : Les couleurs danger/dangerOutline proviennent du token d'erreur Figma #b3261e (Frame 1154:25702).
 * Note [NOT IN FIGMA] : L'état loading avec spinner animé est une amélioration UX absente des maquettes statiques.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className,
  type = 'button',
  ...props
}) => {
  const isDisabled = disabled || loading;

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-ui-ink text-white hover:bg-ui-emerald active:bg-ui-ink/90 border border-transparent',
    secondary:
      'bg-white text-ui-ink border-[1.5px] border-ui-ink hover:bg-stone-50 active:bg-stone-100',
    danger:
      'bg-ui-error text-white hover:bg-ui-error/90 active:bg-ui-error/80 border border-transparent',
    dangerOutline:
      'bg-white text-ui-error border-[1.5px] border-ui-error hover:bg-ui-error-bg active:bg-ui-error-bg/70',
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={cn(
        'font-poppins text-[15px] font-medium leading-normal',
        'px-[26px] py-[14px] rounded-ui-ctl',
        'inline-flex items-center justify-center gap-[10px]',
        'transition-all duration-150 ease-in-out cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-emerald focus-visible:ring-offset-2',
        variantClasses[variant],
        fullWidth && 'w-full',
        isDisabled && 'opacity-45 cursor-not-allowed pointer-events-none',
        className
      )}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!loading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
};
