declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (momentListener?: (notification: any) => void) => void;
          renderButton?: (parent: HTMLElement, options: any) => void;
          disableAutoSelect?: () => void;
        };
      };
    };
  }
}

let scriptLoadingPromise: Promise<boolean> | null = null;

/**
 * Charge le script Google Identity Services (GIS) de manière paresseuse (lazy loading).
 * Aucune dépendance npm requise.
 * En cas d'erreur de chargement, résout false sans crasher l'application ni lever d'erreur console.
 */
export function loadGoogleIdentityScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.accounts?.id) return Promise.resolve(true);

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve(true);
        return;
      }
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}
