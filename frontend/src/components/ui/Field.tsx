import React, { useId } from 'react';
import { cn } from './cn';
import { Icon } from './Icon';

export interface FieldSelectOption {
  label: string;
  value: string;
}

export interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  as?: 'input' | 'select';
  options?: FieldSelectOption[];
  containerClassName?: string;
}

/**
 * Composant Field standardisé (Input / Select) conforme Figma Lot R0.
 * Typographie : Label 14px Medium, Saisie 15px Regular, Aide 12px, Erreur 13px #b3261e.
 * États : default, focus (2px #17664e), error (2px #b3261e), disabled.
 */
export const Field = React.forwardRef<HTMLInputElement & HTMLSelectElement, FieldProps>(
  (
    {
      id: customId,
      label,
      helperText,
      error,
      leftIcon,
      rightSlot,
      as = 'input',
      options = [],
      disabled = false,
      className,
      containerClassName,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const helperId = helperText ? `${id}-helper` : undefined;
    const errorId = error ? `${id}-error` : undefined;

    const hasError = Boolean(error);

    return (
      <div className={cn('flex flex-col w-full text-left font-poppins', containerClassName)}>
        {label && (
          <label
            htmlFor={id}
            className="text-[14px] font-medium text-[#0b2c25] mb-[8px] select-none"
          >
            {label}
          </label>
        )}

        <div
          className={cn(
            'relative flex items-center bg-white rounded-[14px] transition-all duration-150',
            'border',
            hasError
              ? 'border-[2px] border-[#b3261e]'
              : 'border-[#e8ebdf] focus-within:border-[2px] focus-within:border-[#17664e]',
            disabled && 'opacity-60 bg-gray-50 cursor-not-allowed'
          )}
        >
          {leftIcon && (
            <div className="pl-[16px] pr-[10px] flex items-center justify-center shrink-0 text-[#0b2c25] pointer-events-none">
              {leftIcon}
            </div>
          )}

          {as === 'select' ? (
            <div className="relative w-full flex items-center">
              <select
                id={id}
                ref={ref as any}
                disabled={disabled}
                aria-invalid={hasError}
                aria-describedby={cn(errorId, helperId) || undefined}
                className={cn(
                  'w-full bg-transparent text-[15px] font-normal text-[#0b2c25] outline-none',
                  'py-[15px] cursor-pointer appearance-none',
                  leftIcon ? 'pl-0' : 'pl-[16px]',
                  'pr-[42px]',
                  disabled && 'cursor-not-allowed',
                  className
                )}
                {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
              >
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
                {children}
              </select>
              <div className="absolute right-[16px] flex items-center justify-center pointer-events-none text-[#0b2c25]">
                {rightSlot || <Icon name="down" size={18} alt="" />}
              </div>
            </div>
          ) : (
            <div className="relative w-full flex items-center">
              <input
                id={id}
                ref={ref as any}
                disabled={disabled}
                aria-invalid={hasError}
                aria-describedby={cn(errorId, helperId) || undefined}
                className={cn(
                  'w-full bg-transparent text-[15px] font-normal text-[#0b2c25] outline-none',
                  'py-[15px] placeholder:text-[#0b2c25]/40',
                  leftIcon ? 'pl-0' : 'pl-[16px]',
                  rightSlot ? 'pr-[42px]' : 'pr-[16px]',
                  disabled && 'cursor-not-allowed',
                  className
                )}
                {...props}
              />
              {rightSlot && (
                <div className="absolute right-[16px] flex items-center justify-center text-[#0b2c25]">
                  {rightSlot}
                </div>
              )}
            </div>
          )}
        </div>

        {error ? (
          <div
            id={errorId}
            role="alert"
            className="flex items-center gap-[6px] mt-[6px] text-[13px] font-normal text-[#b3261e]"
          >
            <Icon name="alertc" size={16} alt="Erreur" />
            <span>{error}</span>
          </div>
        ) : helperText ? (
          <p
            id={helperId}
            className="mt-[6px] text-[12px] font-normal text-[rgba(11,44,37,0.7)]"
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Field.displayName = 'Field';
