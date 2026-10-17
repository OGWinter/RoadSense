import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Do not retry 401, 403, 404
        if (error?.statusCode === 401 || error?.statusCode === 403 || error?.statusCode === 404) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false, // Never retry mutations automatically
    },
  },
});

export const QUERY_KEYS = {
  AUTH_ME: ['auth', 'me'] as const,
  DASHBOARD_STATS: ['dashboard', 'stats'] as const,
  ISSUES: (filters?: any) => ['issues', filters || {}] as const,
  ISSUE_DETAIL: (id: string) => ['issues', id] as const,
  UPLOADS: (filters?: any) => ['uploads', filters || {}] as const,
  UPLOAD_DETAIL: (id: string) => ['uploads', id] as const,
  REPORTS_SUMMARY: ['reports', 'summary'] as const,
  USERS: ['users'] as const,
};
