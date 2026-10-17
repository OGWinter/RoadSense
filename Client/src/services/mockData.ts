import { Issue, UploadItem, DashboardStats, ReportsSummary, User } from '@/types';

export const MOCK_USERS: Record<string, User> = {};

// Clean in-memory issues list - no dummy items
export let mockIssues: Issue[] = [];

// Clean in-memory uploads list - no dummy items
export let mockUploads: UploadItem[] = [];

export function getMockDashboardStats(): DashboardStats {
  return {
    totalIssues: 0,
    criticalIssues: 0,
    pendingRepairs: 0,
    repairedIssues: 0,
    totalUploads: 0,
    processingUploads: 0,
    failedUploads: 0,
    severityDistribution: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    },
    recentIssues: [],
  };
}

export function getMockReportsSummary(): ReportsSummary {
  return {
    severityCounts: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    },
    statusCounts: {
      detected: 0,
      verified: 0,
      repair_pending: 0,
      repaired: 0,
      rejected: 0,
    },
    monthlyTrends: [],
    pciScore: 100,
    totalKilometersSurveyed: 0,
  };
}
