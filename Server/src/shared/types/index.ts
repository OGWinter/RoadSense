import { Request } from 'express';

export type UserRole = 'admin' | 'volunteer' | 'municipal_officer';

export interface IUserPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: IUserPayload;
}

export type IssueType = 'pothole' | 'crack' | 'other';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'detected' | 'verified' | 'rejected' | 'repair_pending' | 'repaired';

export type UploadStatus = 'uploaded' | 'processing' | 'completed' | 'failed';

export interface GeoLocationDTO {
  lat: number;
  lng: number;
}

export interface StatusAuditEntryDTO {
  previousStatus: IssueStatus;
  newStatus: IssueStatus;
  actorId: string;
  actorRole: string;
  reason?: string;
  timestamp: string;
}

export interface RoadIssueDTO {
  _id: string;
  title: string;
  type: IssueType;
  severity: IssueSeverity;
  confidence: number;
  priorityScore: number;
  location: GeoLocationDTO | null; // Null if no GPS or unaligned
  status: IssueStatus;
  sourceUploadId: string;
  videoTimestampMs?: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isDemo: boolean;
  statusHistory?: StatusAuditEntryDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface UploadDTO {
  _id: string;
  uploaderId: string;
  originalFilename: string;
  storageKey?: string;
  gpsStorageKey?: string;
  mimeType: string;
  sizeBytes: number;
  status: UploadStatus;
  progress: number;
  detectionCount: number;
  error?: string;
  isDemo: boolean;
  recordingStartedAt?: string;
  recordingEndedAt?: string;
  gpsTrackFormat?: string;
  gpsSampleCount?: number;
  gpsStatus?: 'available' | 'missing' | 'error' | 'unaligned';
  createdAt: string;
  updatedAt: string;
}

export interface UserDTO {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  emailVerified?: boolean;
  createdAt: string;
}

export type OfficerRequestStatus = 'pending' | 'approved' | 'rejected';

export interface OfficerRegistrationRequestDTO {
  _id: string;
  name: string;
  email: string;
  municipality: string;
  department: string;
  employeeId?: string;
  status: OfficerRequestStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStatsDTO {
  totalIssues: number;
  criticalIssues: number;
  pendingRepairs: number;
  repairedIssues: number;
  byStatus: Record<IssueStatus, number>;
  bySeverity: Record<IssueSeverity, number>;
  totalUploads: number;
  uploadsByStatus: Record<UploadStatus, number>;
}

export interface ReportSummaryDTO {
  bySeverity: Record<IssueSeverity, number>;
  byStatus: Record<IssueStatus, number>;
  byType: Record<IssueType, number>;
  recentDetectionsCount: number;
  averagePriorityScore: number;
}
