import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

export const userRouter = Router();

userRouter.get('/me', authenticate, UserController.getMe);
userRouter.put('/me', authenticate, UserController.updateMe);
userRouter.post('/verify-phone/request', authenticate, UserController.requestPhoneOtp);
userRouter.post('/verify-phone/confirm', authenticate, UserController.confirmPhoneOtp);
