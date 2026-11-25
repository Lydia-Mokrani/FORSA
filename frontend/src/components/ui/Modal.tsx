import React, { useEffect, useRef, useId } from 'react';
import { cn } from './cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  closeOnEsc?: boolean;
  closeOnBackdropClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-[420px]',
  md: 'max-w-[520px]',
  lg: 'max-w-[640px]',
  xl: 'max-w-[780px]',
};

/**
 * Modal composant conforme Figma Lot R0b (Desktop / Général).
 * - role="dialog", aria-modal="true"
 * - Focus trap (Tab / Shift+Tab)
 * - Restauration du focus à la fermeture
 * - Fermeture sur ESC et clic backdrop (surpassable)
 * - Slots title / description / actions / children
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  actions,
  children,
  closeOnEsc = true,
  closeOnBackdropClick = true,
  showCloseButton = true,
  className,
  size = 'md',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  // Mémoriser l'élément actif avant ouverture et restaurer à la fermeture
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;

      // Déplacer le focus dans le modal
      const focusTimer = setTimeout(() => {
        if (!dialogRef.current) return;
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          dialogRef.current.focus();
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

  // Gestion de la touche Échap et Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || document.activeElement === dialogRef.current) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ui-ink/40 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full bg-white border-[1.5px] border-ui-card-border rounded-ui-card',
          'p-[24px] md:p-[28px] shadow-[0px_16px_40px_rgba(11,44,37,0.12)]',
          'font-poppins text-ui-ink flex flex-col gap-[20px] outline-none',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête : Titre, description et bouton fermer */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {title && (
              <h2
                id={titleId}
                className="text-[20px] md:text-[22px] font-semibold text-ui-ink leading-tight"
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                id={descId}
                className="text-[13px] md:text-[14px] text-ui-text-70 mt-1 leading-normal"
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
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
