import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { SocialController } from '../controllers/social.controller';
import { requireAuth } from '@forsa/common';
import { jwtService } from '../services/jwt.service';
import { startRateLimiter, verifyRateLimiter } from '../middlewares/rate-limit.middleware';

export const authRouter = Router();

const authMiddleware = requireAuth(jwtService.getPublicKey());

// ─── Authentification Telegram (spec §3 & §6) ─────────────────────────────────
authRouter.post('/telegram/start', startRateLimiter, AuthController.telegramStart);
authRouter.get('/telegram/challenges/:id', AuthController.telegramChallengeStatus);
authRouter.post('/telegram/verify', verifyRateLimiter, AuthController.telegramVerify);

// ─── Gestion de Session & Refresh Token (rotation & révocation) ───────────────
authRouter.post('/refresh', AuthController.refresh);
authRouter.post('/logout', AuthController.logout);
authRouter.get('/sessions', authMiddleware, AuthController.getSessions);
authRouter.delete('/sessions/:id', authMiddleware, AuthController.revokeSession);

// ─── Changement de Mode (spec §6 & §7) ────────────────────────────────────────
authRouter.post('/switch-mode', authMiddleware, AuthController.switchMode);

// ─── Clé Publique & JWKS (Validation inter-services sans appel réseau) ────────
authRouter.get('/public-key', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(jwtService.getPublicKey());
});

authRouter.get('/jwks', (_req, res) => {
  res.status(200).json({
    keys: [
      {
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        publicKey: jwtService.getPublicKey(),
      },
    ],
  });
});

// OAuth social (conservé en interne sans être exposé dans l'UI)
authRouter.post('/google', SocialController.google);
authRouter.post('/apple', SocialController.apple);
