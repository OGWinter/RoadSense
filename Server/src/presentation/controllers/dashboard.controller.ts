import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../../services/dashboard.service';
import { AuthenticatedRequest } from '../../shared/types';

export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  getStats = async (req: AuthenticatedRequest | Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.dashboardService.getStats((req as AuthenticatedRequest).user);
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  };
}
