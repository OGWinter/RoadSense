import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../infrastructure/repositories/user.repository';
import { OfficerRequestRepository } from '../infrastructure/repositories/officerRequest.repository';
import { env } from '../config/env';
import { IUserPayload, UserDTO, OfficerRegistrationRequestDTO } from '../shared/types';
import {
  UnauthorizedError,
  ConflictError,
  BadRequestError,
  NotFoundError
} from '../shared/errors/app.error';
import { logger } from '../shared/logger';
import {
  sendEmail,
  buildVerificationEmail,
  buildForgotPasswordEmail
} from './email.service';

export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private officerRequestRepo?: OfficerRequestRepository
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────────
  async login(email: string, pass: string): Promise<{ token: string; user: UserDTO }> {
    const normalizedEmail = email.toLowerCase().trim();
    const userDoc = await this.userRepo.findByEmail(normalizedEmail, true);

    if (!userDoc) {
      // Check if this email has a PENDING officer request, give helpful error
      if (this.officerRequestRepo) {
        const pending = await this.officerRequestRepo.findPendingByEmail(normalizedEmail);
        if (pending) {
          logger.warn({ email: normalizedEmail }, 'Login failed: officer request still pending admin approval');
          throw new UnauthorizedError(
            'Your Municipal Officer application is still pending administrator approval. You will receive an email once it is reviewed.'
          );
        }
      }
      logger.warn({ email: normalizedEmail }, 'Login failed: user not found');
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!userDoc.isActive) {
      logger.warn({ email: normalizedEmail }, 'Login failed: account deactivated');
      throw new UnauthorizedError('Your account has been deactivated. Please contact an administrator.');
    }

    const isMatch = await bcrypt.compare(pass, userDoc.passwordHash);
    if (!isMatch) {
      logger.warn({ email: normalizedEmail }, 'Login failed: invalid password');
      throw new UnauthorizedError('Invalid email or password');
    }

    const payload: IUserPayload = {
      userId: userDoc._id.toString(),
      email: userDoc.email,
      role: userDoc.role
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });

    const userDTO: UserDTO = {
      _id: userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      role: userDoc.role,
      isActive: userDoc.isActive,
      emailVerified: userDoc.emailVerified,
      createdAt: userDoc.createdAt.toISOString()
    };

    logger.info({ userId: userDTO._id, role: userDTO.role }, 'User authenticated');
    return { token, user: userDTO };
  }

  // ─────────────────────────────────────────────────────────────────
  // GET ME
  // ─────────────────────────────────────────────────────────────────
  async getMe(userId: string): Promise<UserDTO> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account not found or deactivated');
    }
    return user;
  }

  // ─────────────────────────────────────────────────────────────────
  // REGISTER VOLUNTEER
  // ─────────────────────────────────────────────────────────────────
  async registerVolunteer(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<UserDTO> {
    const normalizedEmail = data.email.toLowerCase().trim();

    const existingUser = await this.userRepo.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictError('An account with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await this.userRepo.create({
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'volunteer',
      isActive: true,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    });

    // Send verification email (non-blocking — don't fail registration if email fails)
    const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    sendEmail({
      to: normalizedEmail,
      subject: '✅ Verify your RoadSense email address',
      html: buildVerificationEmail(data.name.trim(), verifyUrl)
    }).catch((err) => logger.warn({ err }, 'Verification email send failed — non-fatal'));

    logger.info({ userId: user._id, email: user.email }, 'Volunteer registered');
    return user;
  }

  // ─────────────────────────────────────────────────────────────────
  // VERIFY EMAIL
  // ─────────────────────────────────────────────────────────────────
  async verifyEmail(token: string): Promise<UserDTO> {
    const userDoc = await this.userRepo.findByVerificationToken(token);
    if (!userDoc) {
      throw new BadRequestError('Invalid or expired email verification link. Please request a new one.');
    }

    userDoc.emailVerified = true;
    userDoc.emailVerificationToken = undefined;
    userDoc.emailVerificationExpires = undefined;
    await userDoc.save();

    logger.info({ email: userDoc.email }, 'Email verified successfully');
    return {
      _id: userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      role: userDoc.role,
      isActive: userDoc.isActive,
      emailVerified: true,
      createdAt: userDoc.createdAt.toISOString()
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // RESEND VERIFICATION
  // ─────────────────────────────────────────────────────────────────
  async resendVerificationEmail(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const userDoc = await this.userRepo.findByEmail(normalizedEmail);
    if (!userDoc) {
      // Don't reveal if email exists
      return;
    }
    if (userDoc.emailVerified) {
      return;
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    userDoc.emailVerificationToken = verificationToken;
    userDoc.emailVerificationExpires = verificationExpires;
    await userDoc.save();

    const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    await sendEmail({
      to: normalizedEmail,
      subject: '✅ Verify your RoadSense email address',
      html: buildVerificationEmail(userDoc.name, verifyUrl)
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // FORGOT PASSWORD
  // ─────────────────────────────────────────────────────────────────
  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const userDoc = await this.userRepo.findByEmail(normalizedEmail);

    // Always return success to avoid email enumeration
    if (!userDoc || !userDoc.isActive) {
      logger.info({ email: normalizedEmail }, 'Forgot password: user not found or inactive — silent response');
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    userDoc.passwordResetToken = resetToken;
    userDoc.passwordResetExpires = resetExpires;
    await userDoc.save();

    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: normalizedEmail,
      subject: '🔐 Reset your RoadSense password',
      html: buildForgotPasswordEmail(userDoc.name, resetUrl)
    }).catch((err) => logger.error({ err }, 'Failed to send password reset email'));

    logger.info({ email: normalizedEmail }, 'Password reset email sent');
  }

  // ─────────────────────────────────────────────────────────────────
  // RESET PASSWORD
  // ─────────────────────────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!token || newPassword.length < 8) {
      throw new BadRequestError('Invalid token or password too short (minimum 8 characters)');
    }

    const userDoc = await this.userRepo.findByResetToken(token);
    if (!userDoc) {
      throw new BadRequestError('Password reset link is invalid or has expired. Please request a new one.');
    }

    userDoc.passwordHash = await bcrypt.hash(newPassword, 10);
    userDoc.passwordResetToken = undefined;
    userDoc.passwordResetExpires = undefined;
    await userDoc.save();

    logger.info({ email: userDoc.email }, 'Password reset successfully');
  }

  // ─────────────────────────────────────────────────────────────────
  // REGISTER OFFICER REQUEST
  // ─────────────────────────────────────────────────────────────────
  async registerOfficerRequest(data: {
    name: string;
    email: string;
    password: string;
    municipality: string;
    department: string;
    employeeId?: string;
  }): Promise<OfficerRegistrationRequestDTO> {
    if (!this.officerRequestRepo) {
      throw new Error('OfficerRequestRepository is not configured in AuthService');
    }

    const normalizedEmail = data.email.toLowerCase().trim();

    const existingUser = await this.userRepo.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictError('An account with this email address already exists');
    }

    const existingRequest = await this.officerRequestRepo.findPendingByEmail(normalizedEmail);
    if (existingRequest) {
      throw new ConflictError('A pending officer registration request already exists for this email address');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const request = await this.officerRequestRepo.create({
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash,
      municipality: data.municipality.trim(),
      department: data.department.trim(),
      employeeId: data.employeeId
    });

    logger.info({ requestId: request._id, email: request.email }, 'Municipal officer application submitted');
    return request;
  }
}
