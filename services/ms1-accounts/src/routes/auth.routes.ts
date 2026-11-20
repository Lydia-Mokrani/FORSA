import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

export const authRouter = Router();

authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);
authRouter.post('/refresh', AuthController.refresh);
authRouter.post('/logout', AuthController.logout);
authRouter.get('/public-key', AuthController.getPublicKey);
authRouter.get('/jwks', AuthController.getPublicKey);
