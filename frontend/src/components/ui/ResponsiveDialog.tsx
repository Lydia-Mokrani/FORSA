import React, { useEffect, useState } from 'react';
import { Modal, ModalProps } from './Modal';
import { BottomSheet, BottomSheetProps } from './BottomSheet';

export interface ResponsiveDialogProps extends Omit<ModalProps, 'size'>, Pick<BottomSheetProps, 'showDragHandle'> {
  size?: ModalProps['size'];
  mobileBreakpoint?: string; // défaut: '(min-width: 768px)'
}

/**
 * ResponsiveDialog wrapper unifié (Lot R0b).
 * Affiche Modal sur Desktop (>= 768px) et BottomSheet sur Mobile (< 768px).
 */
export const ResponsiveDialog: React.FC<ResponsiveDialogProps> = ({
  mobileBreakpoint = '(min-width: 768px)',
  size = 'md',
  showDragHandle = true,
  ...props
}) => {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia(mobileBreakpoint).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(mobileBreakpoint);
    const updateMatch = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktop(e.matches);
    };

    updateMatch(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {
      const listener = (e: MediaQueryListEvent) => updateMatch(e);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      // Fallback anciens navigateurs
      const listener = (e: MediaQueryListEvent) => updateMatch(e);
      mediaQuery.addListener(listener);
      return () => mediaQuery.removeListener(listener);
    }
  }, [mobileBreakpoint]);

  if (isDesktop) {
    return <Modal size={size} {...props} />;
  }

  return <BottomSheet showDragHandle={showDragHandle} {...props} />;
};
