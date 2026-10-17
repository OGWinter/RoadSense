import { Issue, UploadItem, DashboardStats, ReportsSummary, User } from '@/types';

export const MOCK_USERS: Record<string, User> = {};

// Clean in-memory issues list - no dummy items
export let mockIssues: Issue[] = [];

const UPLOADS_STORAGE_KEY = 'roadsense_mock_uploads';

export function getStoredMockUploads(): UploadItem[] {
  try {
    const raw = localStorage.getItem(UPLOADS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return mockUploads;
}

export function saveStoredMockUploads(items: UploadItem[]) {
  mockUploads = items;
  try {
    localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

// In-memory uploads list with localStorage initial state
export let mockUploads: UploadItem[] = getStoredMockUploads();

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
