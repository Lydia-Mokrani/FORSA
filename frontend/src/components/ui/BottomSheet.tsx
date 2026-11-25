import React, { useEffect, useRef, useId } from 'react';
import { cn } from './cn';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  closeOnEsc?: boolean;
  closeOnBackdropClick?: boolean;
  showDragHandle?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

/**
 * BottomSheet composant conforme Figma Lot R0b (Mobile).
 * - role="dialog", aria-modal="true"
 * - Glisse depuis le bas de l'écran (fixed bottom-0)
 * - Poignée visuelle (drag handle)
 * - Focus trap, ESC et backdrop click
 * - Coins supérieurs arrondis (rounded-t-[24px] / rounded-t-[32px])
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  actions,
  children,
  closeOnEsc = true,
  closeOnBackdropClick = true,
  showDragHandle = true,
  showCloseButton = true,
  className,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  // Mémoriser et restaurer le focus
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;

      const focusTimer = setTimeout(() => {
        if (!sheetRef.current) return;
        const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          sheetRef.current.focus();
        }
      }, 30);

      return () => {
        clearTimeout(focusTimer);
        if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
          previousActiveElementRef.current.focus();
        }
      };
    }
  }, [isOpen]);

  // Échap et Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && sheetRef.current) {
        const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || document.activeElement === sheetRef.current) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-ui-ink/40 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full max-h-[85vh] overflow-y-auto bg-white border-t-[1.5px] border-x-[1.5px] border-ui-card-border',
          'rounded-t-[28px] p-[20px] pb-[32px] shadow-[0px_-8px_30px_rgba(11,44,37,0.12)]',
          'font-poppins text-ui-ink flex flex-col gap-[16px] outline-none animate-in slide-in-from-bottom duration-200',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poignée tactile mobile */}
        {showDragHandle && (
          <div className="w-12 h-1.5 rounded-full bg-ui-ink/20 mx-auto -mt-1 mb-1 shrink-0" />
        )}

        {/* En-tête : Titre, description et bouton fermer */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {title && (
              <h2
                id={titleId}
                className="text-[18px] font-semibold text-ui-ink leading-snug"
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                id={descId}
                className="text-[13px] text-ui-text-70 mt-0.5 leading-normal"
              >
                {description}
              </p>
            )}
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="size-8 rounded-full flex items-center justify-center text-ui-ink/60 hover:text-ui-ink hover:bg-ui-mint transition-colors shrink-0"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Contenu principal */}
        {children && <div className="text-[14px] leading-relaxed">{children}</div>}

        {/* Actions / Pied */}
        {actions && (
          <div className="flex flex-col gap-2.5 pt-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
