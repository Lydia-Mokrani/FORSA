import { requireAuth } from '@forsa/common';
import { jwtService } from '../services/jwt.service';

export const authenticate = requireAuth(jwtService.getPublicKey());
