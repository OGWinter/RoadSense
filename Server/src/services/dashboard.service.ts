import { IssueRepository } from '../infrastructure/repositories/issue.repository';
import { DashboardStatsDTO, IUserPayload } from '../shared/types';

export class DashboardService {
  constructor(private issueRepo: IssueRepository) {}

  async getStats(user?: IUserPayload): Promise<DashboardStatsDTO> {
    return this.issueRepo.getDashboardStats(user);
  }
}
