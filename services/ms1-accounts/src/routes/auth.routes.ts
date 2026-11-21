import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { AccountController } from '../controllers/account.controller';
import { SocialController } from '../controllers/social.controller';

export const authRouter = Router();

// Rate limiter : 30 requêtes / 15 min par IP (désactivé en test)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { code: 'TOO_MANY_REQUESTS', message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

// Auth classique
authRouter.post('/register', limiter, AuthController.register);
authRouter.post('/login', limiter, AuthController.login);
authRouter.post('/refresh', AuthController.refresh);
authRouter.post('/logout', AuthController.logout);
authRouter.get('/public-key', AuthController.getPublicKey);
authRouter.get('/jwks', AuthController.getPublicKey);

// Vérification e-mail & mot de passe oublié
authRouter.post('/verify-email', limiter, AccountController.verifyEmail);
authRouter.post('/resend-verification', limiter, AccountController.resendVerification);
authRouter.post('/forgot-password', limiter, AccountController.forgotPassword);
authRouter.post('/reset-password', limiter, AccountController.resetPassword);

// OAuth social
authRouter.post('/google', limiter, SocialController.google);
authRouter.post('/apple', SocialController.apple);
