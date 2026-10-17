import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../../services/report.service';

export class ReportController {
  constructor(private reportService: ReportService) {}

  getSummary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await this.reportService.getSummary();
      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  };
}
