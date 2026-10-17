import { Request, Response, NextFunction } from 'express';
import { IssueService } from '../../services/issue.service';
import { AuthenticatedRequest } from '../../shared/types';

export class IssueController {
  constructor(private issueService: IssueService) {}

  listIssues = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.issueService.listIssues(req.query as any);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  getIssueById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const issue = await this.issueService.getIssueById(req.params.id);
      res.status(200).json({
        success: true,
        data: issue
      });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const updated = await this.issueService.updateStatus(req.user!, id, status, reason);

      res.status(200).json({
        success: true,
        message: `Issue status updated to '${status}'`,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  };
}
