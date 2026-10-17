import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services/auth.service';
import { AuthenticatedRequest } from '../../shared/types';

export class AuthController {
  constructor(private authService: AuthService) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { token: result.token, user: result.user }
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.clearCookie('token');
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.authService.getMe(req.user!.userId);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  };

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password } = req.body;
      const user = await this.authService.registerVolunteer({ name, email, password });

      res.status(201).json({
        success: true,
        message: 'Registration successful! Please check your email to verify your account.',
        data: user
      });
    } catch (error) {
      next(error);
    }
  };

  officerRegister = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password, municipality, department, employeeId } = req.body;
      const request = await this.authService.registerOfficerRequest({
        name, email, password, municipality, department, employeeId
      });

      res.status(202).json({
        success: true,
        message: 'Municipal officer application submitted successfully and is pending administrator review',
        data: request
      });
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.query as { token: string };
      if (!token) {
        res.status(400).json({ success: false, message: 'Verification token is required' });
        return;
      }
      const user = await this.authService.verifyEmail(token);
      res.status(200).json({
        success: true,
        message: 'Email verified successfully! You can now log in.',
        data: user
      });
    } catch (error) {
      next(error);
    }
  };

  resendVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      await this.authService.resendVerificationEmail(email);
      res.status(200).json({
        success: true,
        message: 'If that email exists and is unverified, a new verification link has been sent.'
      });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      await this.authService.forgotPassword(email);
      res.status(200).json({
        success: true,
        message: 'If that email is registered, a password reset link has been sent to your inbox.'
      });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, password } = req.body;
      await this.authService.resetPassword(token, password);
      res.status(200).json({
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.'
      });
    } catch (error) {
      next(error);
    }
  };
}
