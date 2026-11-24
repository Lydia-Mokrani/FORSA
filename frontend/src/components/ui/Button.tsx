import React from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dangerOutline';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * Bouton accessible conforme aux tokens Figma du Lot R0.
 * Dimensions : 15px Medium, px 26 py 14, rayon 14px.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  loading = false,
  disabled = false,
  leftIcon,
  fullWidth = false,
  children,
  className,
  type = 'button',
  ...props
}) => {
  const isDisabled = disabled || loading;

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-[#0b2c25] text-white hover:bg-[#17664e] active:bg-[#071f1a] border border-transparent',
    secondary:
      'bg-white text-[#0b2c25] border-[1.5px] border-[#0b2c25] hover:bg-[#f4f7f4] active:bg-[#e8efe9]',
    danger:
      'bg-[#b3261e] text-white hover:bg-[#8f1e17] active:bg-[#721711] border border-transparent',
    dangerOutline:
      'bg-white text-[#b3261e] border-[1.5px] border-[#b3261e] hover:bg-[#fdecea] active:bg-[#fcd7d3]',
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={cn(
        'font-poppins text-[15px] font-medium leading-normal',
        'px-[26px] py-[14px] rounded-[14px]',
        'inline-flex items-center justify-center gap-[10px]',
        'transition-all duration-150 ease-in-out cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17664e] focus-visible:ring-offset-2',
        variantClasses[variant],
        fullWidth && 'w-full',
        isDisabled && 'opacity-45 cursor-not-allowed pointer-events-none',
        className
      )}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin size-[18px] text-current"
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
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
