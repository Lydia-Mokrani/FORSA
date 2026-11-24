import React, { useId } from 'react';
import { cn } from './cn';
import { Icon } from './Icon';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  as?: 'input' | 'select';
  options?: FieldOption[];
  containerClassName?: string;
}

/**
 * Composant Field accessible conforme Figma Lot R0.
 * Typographie : Label 14px Medium, Saisie 15px Regular, Aide 12px (text-ui-text-70), Erreur 13px (text-ui-error).
 * États : default (border-ui-field-border), focus (2px border-ui-emerald), error (2px border-ui-error).
 * Note [NOT IN FIGMA] : L'état disabled (opacity-60 bg-gray-50) est un état interactif WAI-ARIA non formalisé dans les maquettes Figma statiques.
 */
export const Field = React.forwardRef<HTMLInputElement | HTMLSelectElement, FieldProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightSlot,
      as = 'input',
      options = [],
      className,
      containerClassName,
      id: customId,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const id = customId || autoId;
    const errorId = error ? `${id}-error` : undefined;
    const helperId = helperText ? `${id}-helper` : undefined;
    const hasError = Boolean(error);

    return (
      <div className={cn('flex flex-col w-full text-left font-poppins', containerClassName)}>
        {label && (
          <label
            htmlFor={id}
            className="text-[14px] font-medium text-ui-ink mb-[8px] select-none"
          >
            {label}
          </label>
        )}

        <div
          className={cn(
            'relative flex items-center bg-white rounded-ui-ctl transition-all duration-150',
            'border',
            hasError
              ? 'border-[2px] border-ui-error'
              : 'border-ui-field-border focus-within:border-[2px] focus-within:border-ui-emerald',
            disabled && 'opacity-60 bg-gray-50 cursor-not-allowed'
          )}
        >
          {leftIcon && (
            <div className="pl-[16px] pr-[10px] flex items-center justify-center shrink-0 text-ui-ink pointer-events-none">
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
                  'w-full bg-transparent text-[15px] font-normal text-ui-ink outline-none',
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
              <div className="absolute right-[16px] flex items-center justify-center pointer-events-none text-ui-ink">
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
                  'w-full bg-transparent text-[15px] font-normal text-ui-ink outline-none',
                  'py-[15px] placeholder:text-ui-ink/40',
                  leftIcon ? 'pl-0' : 'pl-[16px]',
                  rightSlot ? 'pr-[42px]' : 'pr-[16px]',
                  disabled && 'cursor-not-allowed',
                  className
                )}
                {...props}
              />
              {rightSlot && (
                <div className="absolute right-[16px] flex items-center justify-center text-ui-ink">
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
            className="flex items-center gap-[6px] mt-[6px] text-[13px] font-normal text-ui-error"
          >
            <Icon name="alertc" size={16} alt="Erreur" />
            <span>{error}</span>
          </div>
        ) : helperText ? (
          <p
            id={helperId}
            className="mt-[6px] text-[12px] font-normal text-ui-text-70 leading-normal"
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Field.displayName = 'Field';
