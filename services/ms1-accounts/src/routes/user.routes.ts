import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { SocialController } from '../controllers/social.controller';
import { authenticate } from '../middleware/auth.middleware';
import { handleAvatarUpload } from '../middleware/avatar-upload.middleware';

export const userRouter = Router();

// Profil
userRouter.get('/me', authenticate, UserController.getMe);
userRouter.put('/me', authenticate, UserController.updateMe);

// Avatar
userRouter.post('/me/avatar', authenticate, handleAvatarUpload, UserController.uploadAvatar);
userRouter.delete('/me/avatar', authenticate, UserController.deleteAvatar);

// Vérification téléphone
userRouter.post('/verify-phone/request', authenticate, UserController.requestPhoneOtp);
userRouter.post('/verify-phone/confirm', authenticate, UserController.confirmPhoneOtp);

// Comptes sociaux liés
userRouter.get('/me/social', authenticate, SocialController.list);
userRouter.post('/me/social/google', authenticate, SocialController.linkGoogle);
userRouter.delete('/me/social/:provider', authenticate, SocialController.unlink);
