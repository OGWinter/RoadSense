import { IssueRepository, IssueFilterOptions } from '../infrastructure/repositories/issue.repository';
import { IssueStatus, IUserPayload, RoadIssueDTO } from '../shared/types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../shared/errors/app.error';
import { logger } from '../shared/logger';

export class IssueService {
  constructor(private issueRepo: IssueRepository) {}

  async listIssues(
    options: IssueFilterOptions
  ): Promise<{ issues: RoadIssueDTO[]; total: number; page: number; limit: number }> {
    return this.issueRepo.findFiltered(options);
  }

  async getIssueById(id: string): Promise<RoadIssueDTO> {
    const issue = await this.issueRepo.findById(id);
    if (!issue) {
      throw new NotFoundError('Road issue not found');
    }
    return issue;
  }

  async updateStatus(
    user: IUserPayload,
    issueId: string,
    newStatus: IssueStatus,
    reason?: string
  ): Promise<RoadIssueDTO> {
    // 1. Role verification: Volunteers cannot review or update issue status
    if (user.role === 'volunteer') {
      throw new ForbiddenError('Volunteers are not authorized to update issue statuses');
    }

    const currentIssue = await this.issueRepo.findById(issueId);
    if (!currentIssue) {
      throw new NotFoundError('Road issue not found');
    }

    const allowedStatuses: IssueStatus[] = [
      'detected',
      'verified',
      'rejected',
      'repair_pending',
      'repaired'
    ];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestError(`Invalid status '${newStatus}'. Allowed: ${allowedStatuses.join(', ')}`);
    }

    // Status transition rules:
    // Once marked repaired, volunteers or officers cannot reject it without admin intervention
    if (currentIssue.status === 'repaired' && newStatus === 'rejected' && user.role !== 'admin') {
      throw new ForbiddenError('Only administrators can reject an already repaired issue');
    }

    const updated = await this.issueRepo.updateStatus(
      issueId,
      newStatus,
      { userId: user.userId, role: user.role },
      reason
    );

    if (!updated) {
      throw new NotFoundError('Issue could not be updated');
    }

    logger.info(
      { issueId, oldStatus: currentIssue.status, newStatus, userId: user.userId, role: user.role, reason },
      'Road issue status updated and audit entry recorded'
    );

    return updated;
  }
}
