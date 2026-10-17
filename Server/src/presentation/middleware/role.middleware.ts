import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors/app.error';

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required before role verification'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden: Role '${req.user.role}' is not authorized. Required: ${roles.join(' or ')}`
        )
      );
    }

    next();
  };
};
