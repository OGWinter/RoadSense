import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';
import {
  loginSchema,
  volunteerRegisterSchema,
  officerRegisterSchema
} from '../../shared/validation/auth.schema';

export const createAuthRouter = (authController: AuthController): Router => {
  const router = Router();

  // Public login
  router.post('/login', authLimiter, validateRequest({ body: loginSchema }), authController.login);

  // Public volunteer self-registration
  router.post('/register', authLimiter, validateRequest({ body: volunteerRegisterSchema }), authController.register);

  // Public municipal officer application
  router.post('/officer-register', authLimiter, validateRequest({ body: officerRegisterSchema }), authController.officerRegister);

  // Logout
  router.post('/logout', authController.logout);

  // Current user profile
  router.get('/me', authenticate, authController.getMe);

  // Email verification — GET /auth/verify-email?token=...
  router.get('/verify-email', authController.verifyEmail);

  // Resend verification email
  router.post('/resend-verification', authLimiter, authController.resendVerification);

  // Forgot password — sends reset link to Gmail
  router.post('/forgot-password', authLimiter, authController.forgotPassword);

  // Reset password with token
  router.post('/reset-password', authLimiter, authController.resetPassword);

  return router;
};

