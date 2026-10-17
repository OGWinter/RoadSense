export type UserRole = 'admin' | 'volunteer' | 'municipal_officer';
export type UserApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  status?: UserApprovalStatus;
  isApproved?: boolean;
  createdAt?: string;
}

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IssueStatus =
  | 'detected'
  | 'verified'
  | 'rejected'
  | 'repair_pending'
  | 'repaired';

export interface IssueLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface Issue {
  _id: string;
  title: string;
  type: string;
  severity: IssueSeverity;
  confidence: number;
  priorityScore: number;
  location: IssueLocation;
  status: IssueStatus;
  sourceUploadId?: string;
  detectedAt?: string;
  videoTimestamp?: string;
  frameNumber?: number;
  isDemo?: boolean;
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
  imageUrl?: string;
}

export type UploadStatus = 'uploaded' | 'processing' | 'completed' | 'failed';

export interface UploadItem {
  _id: string;
  filename: string;
  originalFilename?: string;
  status: UploadStatus;
  detectionCount: number;
  createdAt: string;
  fileSize?: number;
  duration?: number;
  processedAt?: string;
  isDemo?: boolean;
  errorMessage?: string;
  sourceType?: 'video' | 'dashcam' | 'drone';
  progress?: number;
  storageKey?: string;
}

export interface DashboardStats {
  totalIssues: number;
  criticalIssues: number;
  pendingRepairs: number;
  repairedIssues: number;
  totalUploads?: number;
  processingUploads?: number;
  failedUploads?: number;
  severityDistribution?: Record<IssueSeverity, number>;
  recentIssues?: Issue[];
  isDemo?: boolean;
}

export interface ReportsSummary {
  severityCounts: Record<IssueSeverity, number>;
  statusCounts: Record<IssueStatus, number>;
  monthlyTrends?: { month: string; detected: number; repaired: number }[];
  pciScore?: number; // Pavement Condition Index (0 - 100)
  totalKilometersSurveyed?: number;
}

export interface IssueFilters {
  severity?: IssueSeverity | 'all';
  status?: IssueStatus | 'all';
  type?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'priorityScore' | 'detectedAt' | 'severity';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  issues?: T[];
  items?: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface ApiErrorResponse {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}
