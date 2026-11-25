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
            ? 'flex items-center justify-between w-full'
            : 'flex flex-col gap-6 w-full'
        )}
      >
        {steps.map((step, index) => {
          const isDone = index < current;
          const isCurrent = index === current;
          const isUpcoming = index > current;

          return (
            <React.Fragment key={step.id ?? index}>
              <li
                className={cn(
                  'flex items-center gap-3',
                  orientation === 'horizontal' ? 'flex-1 last:flex-none' : 'w-full'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {/* Pastille numérotée ou validée */}
                <div
                  className={cn(
                    'size-[36px] md:size-[40px] rounded-full flex items-center justify-center shrink-0 font-medium text-[14px] transition-colors',
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
                      'text-[13px] md:text-[14px] leading-tight truncate',
                      isCurrent && 'font-semibold text-ui-ink',
                      isDone && 'font-medium text-ui-ink',
                      isUpcoming && 'font-normal text-ui-text-70'
                    )}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="text-[11px] md:text-[12px] text-ui-text-70 truncate mt-0.5 hidden sm:inline">
                      {step.description}
                    </span>
                  )}
                </div>

                {/* Ligne de connexion entre les étapes (si orientation horizontale et pas le dernier élément) */}
                {orientation === 'horizontal' && index < steps.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-[2px] mx-2 md:mx-4 transition-colors',
                      index < current ? 'bg-ui-emerald' : 'bg-ui-field-border'
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
