import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AuthenticatedRequest, IUserPayload } from '../../shared/types';
import { UnauthorizedError } from '../../shared/errors/app.error';

export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if ((req as any).cookies?.token) {
      token = (req as any).cookies.token;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication token missing. Please log in with Bearer token.');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as IUserPayload;
    if (!decoded.userId || !decoded.role) {
      throw new UnauthorizedError('Malformed or invalid authentication token');
    }

    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Token has expired. Please log in again.'));
    } else if (error.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid authentication token signature.'));
    } else {
      next(error);
    }
  }
};

export const optionalAuthenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if ((req as any).cookies?.token) {
      token = (req as any).cookies.token;
    }

    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET) as IUserPayload;
      if (decoded.userId && decoded.role) {
        req.user = decoded;
      }
    }
  } catch {
    // Non-blocking: continue without authenticated user context
  }
  next();
};
