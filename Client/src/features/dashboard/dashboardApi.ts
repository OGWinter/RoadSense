import { apiClient } from '@/services/apiClient';
import { API_ENDPOINTS } from '@/services/endpoints';
import { DashboardStats } from '@/types';
import { getMockDashboardStats } from '@/services/mockData';

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.DASHBOARD.STATS);
      const data = response.data?.data || response.data;

      return {
        totalIssues: data.totalIssues ?? data.issuesCount ?? data.total ?? 0,
        criticalIssues: data.criticalIssues ?? data.criticalCount ?? data.highCriticalCount ?? 0,
        pendingRepairs: data.pendingRepairs ?? data.repairPending ?? data.pendingCount ?? 0,
        repairedIssues: data.repairedIssues ?? data.repairedCount ?? data.resolvedIssues ?? 0,
        totalUploads: data.totalUploads ?? data.uploadCount ?? data.uploadsTotal ?? 0,
        processingUploads: data.uploadsByStatus?.processing ?? data.processingUploads ?? data.processingCount ?? 0,
        failedUploads: data.uploadsByStatus?.failed ?? data.failedUploads ?? data.failedCount ?? 0,
        isDemo: data.isDemo,
        severityDistribution: data.bySeverity ?? data.severityDistribution ?? data.severityCounts,
        recentIssues: data.recentIssues,
      };
    } catch (err: any) {
      if (err?.isNetworkError || !err?.statusCode) {
        return getMockDashboardStats();
      }
      throw err;
    }
  },
};
