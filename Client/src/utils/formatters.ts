import { IssueSeverity, IssueStatus, UserRole } from '@/types';
import { format, parseISO } from 'date-fns';

export function formatDate(dateString?: string | Date, fallback: string = '—'): string {
  if (!dateString) return fallback;
  try {
    const d = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(d, 'MMM d, yyyy HH:mm');
  } catch {
    return String(dateString);
  }
}

export function formatRelativeDate(dateString?: string | Date): string {
  if (!dateString) return '—';
  try {
    const d = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(d, 'yyyy-MM-dd');
  } catch {
    return '—';
  }
}

export function formatConfidence(value: number): string {
  // If value is 0..1, convert to percentage
  const num = value <= 1 ? Math.round(value * 100) : Math.round(value);
  return `${num}%`;
}

export function getSeverityBadgeClass(severity: IssueSeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800';
    case 'medium':
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
    case 'low':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300';
  }
}

export function getSeverityColorHex(severity: IssueSeverity): string {
  switch (severity) {
    case 'critical':
      return '#ef4444';
    case 'high':
      return '#f97316';
    case 'medium':
      return '#f59e0b';
    case 'low':
      return '#10b981';
    default:
      return '#64748b';
  }
}

export function getStatusBadgeClass(status: IssueStatus): string {
  switch (status) {
    case 'detected':
      return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
    case 'verified':
      return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800';
    case 'repair_pending':
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
    case 'repaired':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
    case 'rejected':
      return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300';
  }
}

export function formatStatusLabel(status: IssueStatus): string {
  switch (status) {
    case 'detected':
      return 'Detected';
    case 'verified':
      return 'Verified';
    case 'rejected':
      return 'Rejected';
    case 'repair_pending':
      return 'Repair Pending';
    case 'repaired':
      return 'Repaired';
    default:
      return status;
  }
}

export function formatRoleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'municipal_officer':
      return 'Municipal Officer';
    case 'volunteer':
      return 'Volunteer Surveyor';
    default:
      return role;
  }
}
