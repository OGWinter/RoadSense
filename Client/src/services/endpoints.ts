export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    OFFICER_REGISTER: '/auth/officer-register',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  DASHBOARD: {
    STATS: '/dashboard/stats',
  },
  ISSUES: {
    LIST: '/issues',
    DETAIL: (id: string) => `/issues/${id}`,
    UPDATE_STATUS: (id: string) => `/issues/${id}/status`,
  },
  UPLOADS: {
    LIST: '/uploads',
    CREATE: '/uploads',
    DETAIL: (id: string) => `/uploads/${id}`,
    INITIATE: '/uploads/initiate',
    COMPLETE: (id: string) => `/uploads/${id}/complete`,
  },
  REPORTS: {
    SUMMARY: '/reports/summary',
  },
  USERS: {
    LIST: '/admin/users',
  },
  ADMIN: {
    USERS: '/admin/users',
    OFFICER_REQUESTS: '/admin/officer-requests',
    OFFICER_REQUEST_REVIEW: (id: string) => `/admin/officer-requests/${id}`,
  },
} as const;
