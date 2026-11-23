import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { SocialController } from '../controllers/social.controller';
import { authenticate } from '../middleware/auth.middleware';
import { handleAvatarUpload } from '../middleware/avatar-upload.middleware';

export const userRouter = Router();

// Profil
userRouter.get('/me', authenticate, UserController.getMe);
userRouter.put('/me', authenticate, UserController.updateMe);
userRouter.post('/me/switch-mode', authenticate, UserController.switchMode);

// Changement de numéro (spec §3 & Lot 2B)
userRouter.post('/me/phone/change/start', authenticate, UserController.changePhoneStart);
userRouter.post('/me/phone/change/verify', authenticate, UserController.changePhoneVerify);

// Avatar & Photo alias
userRouter.post('/me/avatar', authenticate, handleAvatarUpload, UserController.uploadAvatar);
userRouter.post('/me/photo', authenticate, handleAvatarUpload, UserController.uploadAvatar);
userRouter.delete('/me/avatar', authenticate, UserController.deleteAvatar);
userRouter.delete('/me/photo', authenticate, UserController.deleteAvatar);

// Comptes sociaux liés (conservé en interne)
userRouter.get('/me/social', authenticate, SocialController.list);
userRouter.post('/me/social/google', authenticate, SocialController.linkGoogle);
userRouter.delete('/me/social/:provider', authenticate, SocialController.unlink);
