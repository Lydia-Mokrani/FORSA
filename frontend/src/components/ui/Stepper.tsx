import React from 'react';
import { cn } from './cn';

export interface StepItem {
  id?: string | number;
  title: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  current: number; // Index de l'étape courante (0-based)
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Stepper composant conforme Figma Lot R0b (Inscription commerçant & Statuts validation).
 * - steps[] et current (0-indexed)
 * - États : done (validé avec checkmark), current (en cours avec aria-current="step"), upcoming (à venir)
 * - Navigation accessible avec <nav aria-label="..."> et <ol>
 */
export const Stepper: React.FC<StepperProps> = ({
  steps,
  current,
  className,
  orientation = 'horizontal',
}) => {
  if (!steps || steps.length === 0) return null;

  return (
    <nav
      aria-label="Étapes du parcours"
      className={cn('w-full font-poppins', className)}
    >
      <ol
        className={cn(
          orientation === 'horizontal'
            ? 'flex items-start justify-between w-full relative'
            : 'flex flex-col gap-6 w-full'
        )}
      >
        {steps.map((step, index) => {
          const isDone = index < current;
          const isCurrent = index === current;
          const isUpcoming = index > current;

          if (orientation === 'vertical') {
            return (
              <li
                key={step.id ?? index}
                className="flex items-start gap-3 w-full"
                aria-current={isCurrent ? 'step' : undefined}
              >
                {/* Pastille numérotée ou validée */}
                <div
                  className={cn(
                    'size-[36px] rounded-full flex items-center justify-center shrink-0 font-medium text-[14px] transition-colors',
                    isDone && 'bg-ui-emerald text-white',
                    isCurrent && 'border-2 border-ui-emerald bg-ui-mint text-ui-emerald font-semibold shadow-xs',
                    isUpcoming && 'border-2 border-ui-field-border bg-white text-ui-text-70'
                  )}
                  aria-hidden="true"
                >
                  {isDone ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M13.3334 4L6.00008 11.3333L2.66675 8"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Libellé de l'étape */}
                <div className="flex flex-col min-w-0">
                  <span
                    className={cn(
                      'text-[14px] leading-tight',
                      isCurrent && 'font-semibold text-ui-ink',
                      isDone && 'font-medium text-ui-ink',
                      isUpcoming && 'font-normal text-ui-text-70'
                    )}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="text-[12px] text-ui-text-70 mt-0.5">
                      {step.description}
                    </span>
                  )}
                </div>
              </li>
            );
          }

          // Mode horizontal : Auto-layout flex vertical centré pour chaque étape
          // Empêche tout débordement hors de la carte
          return (
            <li
              key={step.id ?? index}
              className="flex flex-col items-center flex-1 relative min-w-0 px-1"
              aria-current={isCurrent ? 'step' : undefined}
            >
              {/* Ligne de connexion reliant cette pastille à la suivante */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute top-[16px] md:top-[18px] left-1/2 w-full h-[2px] transition-colors z-0',
                    index < current ? 'bg-ui-emerald' : 'bg-ui-field-border'
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Pastille numérotée ou validée */}
              <div
                className={cn(
                  'size-[32px] md:size-[36px] rounded-full flex items-center justify-center shrink-0 font-medium text-[13px] md:text-[14px] transition-colors relative z-10',
                  isDone && 'bg-ui-emerald text-white shadow-xs',
                  isCurrent && 'border-2 border-ui-emerald bg-ui-mint text-ui-emerald font-semibold shadow-xs',
                  isUpcoming && 'border border-ui-field-border bg-white text-ui-text-70'
                )}
                aria-hidden="true"
              >
                {isDone ? (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M13.3334 4L6.00008 11.3333L2.66675 8"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Libellé de l'étape centré sous sa pastille */}
              <div className="flex flex-col items-center text-center mt-2 w-full min-w-0">
                <span
                  className={cn(
                    'text-[11px] sm:text-[13px] leading-tight break-words max-w-full text-center',
                    isCurrent && 'font-semibold text-ui-ink',
                    isDone && 'font-medium text-ui-ink',
                    isUpcoming && 'font-normal text-ui-text-70'
                  )}
                >
                  {step.title}
                </span>
                {step.description && (
                  <span className="text-[10px] sm:text-[11px] text-ui-text-70 truncate mt-0.5 hidden sm:inline max-w-full text-center">
                    {step.description}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
