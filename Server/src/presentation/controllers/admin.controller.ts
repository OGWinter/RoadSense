import { Response, NextFunction } from 'express';
import { AdminService } from '../../services/admin.service';
import { AuthenticatedRequest } from '../../shared/types';

export class AdminController {
  constructor(private adminService: AdminService) {}

  listOfficerRequests = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const status = req.query.status as any;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await this.adminService.listOfficerRequests({ status, page, limit });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  reviewOfficerRequest = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      const updated = await this.adminService.reviewOfficerRequest(
        req.user!,
        id,
        status,
        reason
      );

      res.status(200).json({
        success: true,
        message: `Officer registration request ${status} successfully`,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  };

  createUser = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { name, email, password, role, isActive } = req.body;
      const user = await this.adminService.createUser({
        name,
        email,
        password,
        role,
        isActive
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully by administrator',
        data: user
      });
    } catch (error) {
      next(error);
    }
  };

  listUsers = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await this.adminService.listUsers(page, limit);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}
