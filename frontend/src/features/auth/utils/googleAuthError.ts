export interface GoogleAuthErrorInput {
  code?: string | null;
  status?: number | null;
  message?: string | null;
}

export interface GoogleAuthErrorResult {
  message: string;
  code?: string;
  link?: {
    text: string;
    href: string;
  };
}

export const GENERIC_GOOGLE_ERROR = 'Connexion Google indisponible.';

/**
 * Fonction pure de mappage des erreurs d'authentification Google (Lot F-fix).
 * Règle stricte : Le mappage est basé sur le champ "code" du corps JSON et NON sur le code HTTP seul.
 *
 * - ACCOUNT_NOT_FOUND -> message contenant "inscrivez-vous d'abord" avec un lien vers la page d'inscription.
 * - EMAIL_NOT_VERIFIED -> message explicite invitant à vérifier son adresse e-mail.
 * - INVALID_GOOGLE_TOKEN, GOOGLE_NOT_CONFIGURED, toute 5xx, erreur réseau, ou 404 SANS code (route absente)
 *   -> message générique "Connexion Google indisponible."
 */
export function mapGoogleAuthError(
  err?: GoogleAuthErrorInput | Error | unknown | null,
  registerPath: string = '/register'
): GoogleAuthErrorResult {
  if (!err) {
    return { message: GENERIC_GOOGLE_ERROR };
  }

  const code = (err as any)?.code;
  const status = (err as any)?.status;

  // 1. Mappage prioritaire par code d'erreur applicatif JSON
  if (code === 'ACCOUNT_NOT_FOUND') {
    return {
      message: "Aucun compte associé à cette adresse Google. Inscrivez-vous d'abord pour accéder à FORSA.",
      code: 'ACCOUNT_NOT_FOUND',
      link: {
        text: 'Créer un compte',
        href: registerPath,
      },
    };
  }

  if (code === 'EMAIL_NOT_VERIFIED') {
    return {
      message: "Votre adresse e-mail Google n'est pas encore vérifiée. Veuillez vérifier votre e-mail avant de vous connecter.",
      code: 'EMAIL_NOT_VERIFIED',
    };
  }

  if (code === 'INVALID_GOOGLE_TOKEN' || code === 'GOOGLE_NOT_CONFIGURED') {
    return {
      message: GENERIC_GOOGLE_ERROR,
      code,
    };
  }

  // 2. Erreurs HTTP sans code applicatif reconnu (5xx, 404 sans code de route manquante, etc.)
  if (typeof status === 'number') {
    // 404 sans code (ex: route /api/auth/google non implémentée côté backend avant Lot G1)
    if (status === 404) {
      return { message: GENERIC_GOOGLE_ERROR };
    }
    // Toute erreur serveur 5xx
    if (status >= 500) {
      return { message: GENERIC_GOOGLE_ERROR };
    }
  }

  // 3. Erreur réseau ou inconnue
  return { message: GENERIC_GOOGLE_ERROR };
}
