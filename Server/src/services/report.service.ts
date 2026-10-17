import { IssueRepository } from '../infrastructure/repositories/issue.repository';
import { ReportSummaryDTO } from '../shared/types';

export class ReportService {
  constructor(private issueRepo: IssueRepository) {}

  async getSummary(): Promise<ReportSummaryDTO> {
    return this.issueRepo.getReportSummary();
  }
}
