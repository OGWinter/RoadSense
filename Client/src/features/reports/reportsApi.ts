import { apiClient } from '@/services/apiClient';
import { API_ENDPOINTS } from '@/services/endpoints';
import { ReportsSummary } from '@/types';
import { getMockReportsSummary } from '@/services/mockData';

export const reportsApi = {
  getSummary: async (): Promise<ReportsSummary> => {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.REPORTS.SUMMARY);
      const data = response.data?.data || response.data;

      return {
        severityCounts: data.bySeverity || data.severityCounts || {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        },
        statusCounts: data.byStatus || data.statusCounts || {
          detected: 0,
          verified: 0,
          rejected: 0,
          repair_pending: 0,
          repaired: 0,
        },
        monthlyTrends: data.monthlyTrends || [],
        pciScore: data.pciScore ?? 78,
        totalKilometersSurveyed: data.totalKilometersSurveyed ?? 142.5,
      };
    } catch (err: any) {
      if (err?.isNetworkError || !err?.statusCode) {
        return getMockReportsSummary();
      }
      throw err;
    }
  },
};
