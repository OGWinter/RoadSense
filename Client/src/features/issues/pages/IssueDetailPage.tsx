import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { issueApi } from '../issueApi';
import { QUERY_KEYS } from '@/app/queryClient';
import { useAppSelector } from '@/hooks/useRedux';
import { IssueStatus } from '@/types';
import { DemoNoticeBadge } from '@/components/common/DemoNoticeBadge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { createSeverityIcon } from '@/utils/mapUtils';
import {
  formatDate,
  formatConfidence,
  getSeverityBadgeClass,
  getStatusBadgeClass,
  formatStatusLabel,
} from '@/utils/formatters';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Wrench,
  MapPin,
  Calendar,
  FileVideo,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Film,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';

const WORKFLOW_STEPS: IssueStatus[] = ['detected', 'verified', 'repair_pending', 'repaired'];

export const IssueDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  const [confirmStatus, setConfirmStatus] = useState<IssueStatus | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Privileged Review Permissions:
  // Admin has full review rights.
  // Municipal Officer has review rights only if NOT pending approval.
  const isPendingOfficer = user?.role === 'municipal_officer' && (user?.status === 'pending' || user?.isApproved === false);
  const canReview = user?.role === 'admin' || (user?.role === 'municipal_officer' && !isPendingOfficer);

  const {
    data: issue,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.ISSUE_DETAIL(id || ''),
    queryFn: () => issueApi.getIssueById(id || ''),
    enabled: Boolean(id),
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: IssueStatus) => issueApi.updateStatus(id!, newStatus),
    onSuccess: (updated) => {
      toast.success(`Issue status successfully updated to "${formatStatusLabel(updated.status)}"`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ISSUE_DETAIL(id!) });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_STATS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORTS_SUMMARY });
      setConfirmDialogOpen(false);
      setConfirmStatus(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update issue status');
    },
  });

  const handleStatusChangeClick = (newStatus: IssueStatus) => {
    setConfirmStatus(newStatus);
    setConfirmDialogOpen(true);
  };

  const handleConfirmStatusChange = () => {
    if (confirmStatus) {
      statusMutation.mutate(confirmStatus);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 md:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (isError || !issue) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/app/issues')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Issues
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Issue Not Found</AlertTitle>
          <AlertDescription>
            {(error as any)?.message || 'The requested road damage record could not be loaded.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasCoords =
    issue.location &&
    typeof issue.location.lat === 'number' &&
    typeof issue.location.lng === 'number' &&
    !isNaN(issue.location.lat) &&
    !isNaN(issue.location.lng);

  const currentStepIndex = WORKFLOW_STEPS.indexOf(issue.status);

  return (
    <div className="space-y-6">
      {/* Back button and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/app/issues')}
            className="h-9 w-9 shrink-0"
            title="Back to Issues"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground capitalize">
                {issue.title || issue.type.replace('_', ' ')}
              </h1>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded border capitalize ${getSeverityBadgeClass(
                  issue.severity
                )}`}
              >
                {issue.severity}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Defect ID: <span className="font-mono">{issue._id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DemoNoticeBadge isDemo={issue.isDemo} />
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${getStatusBadgeClass(
              issue.status
            )}`}
          >
            {formatStatusLabel(issue.status)}
          </span>
        </div>
      </div>

      {/* Municipal Workflow Lifecycle Stepper */}
      <Card className="shadow-sm border">
        <CardContent className="p-4 sm:p-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Municipal Repair Lifecycle Progress
          </p>

          {issue.status === 'rejected' ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs border">
              <XCircle className="h-4 w-4 text-slate-500" />
              <span>
                <strong>Defect Rejected:</strong> Verified as false positive or camera artifact by municipal inspector. Removed from active dispatch.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 relative">
              {WORKFLOW_STEPS.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div
                    key={step}
                    className={`flex flex-col p-3 rounded-lg border text-xs transition-all ${
                      isCurrent
                        ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                        : isPassed
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-medium'
                        : 'bg-muted/30 border-border text-muted-foreground opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-mono tracking-wider">Step {idx + 1}</span>
                      {isPassed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                    </div>
                    <span className="capitalize">{formatStatusLabel(step)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metadata & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Defect Specifications & Evidence</CardTitle>
              <CardDescription className="text-xs">
                Computer vision telemetry, frame timestamps, and structural defect metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/40 border border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Defect Type</p>
                  <p className="font-semibold text-sm capitalize text-foreground mt-0.5">
                    {issue.type.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Detection Confidence</p>
                  <p className="font-semibold text-sm text-foreground mt-0.5">
                    {formatConfidence(issue.confidence)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Priority Rating</p>
                  <p className="font-mono font-bold text-sm text-foreground mt-0.5">
                    {issue.priorityScore ?? 75} / 100
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Severity Level</p>
                  <p className="font-semibold text-sm capitalize text-foreground mt-0.5">
                    {issue.severity}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    Logged Timestamp:{' '}
                    <strong className="text-foreground">
                      {formatDate(issue.detectedAt || issue.createdAt)}
                    </strong>
                  </span>
                </div>

                {/* Video Timestamp Evidence */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Film className="h-4 w-4 text-primary shrink-0" />
                  <span>Video Evidence Timestamp: </span>
                  <Badge variant="outline" className="font-mono font-semibold text-xs border-primary/40 bg-primary/5 text-primary">
                    {issue.videoTimestamp || '00:14 (Frame #420)'}
                  </Badge>
                </div>

                {issue.sourceUploadId && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileVideo className="h-4 w-4 text-primary shrink-0" />
                    <span>Source Video Survey Pipeline: </span>
                    <Link
                      to={`/app/uploads/${issue.sourceUploadId}`}
                      className="font-mono text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      {issue.sourceUploadId}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Review & Triage Control Card (Role Guarded!) */}
          <Card className="shadow-sm border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-semibold">
                    Municipal Review & Status Transition
                  </CardTitle>
                </div>
                {!canReview && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {isPendingOfficer ? 'Pending Approval' : 'Read-only (Volunteer)'}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                {canReview
                  ? 'Authorized municipal personnel can transition defect states across the public works triage workflow.'
                  : isPendingOfficer
                  ? 'Your Municipal Officer account is pending Administrator approval. Status update privileges will activate once approved.'
                  : 'Volunteers have read-only inspection access. Status changes are reserved for certified Municipal Officers.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canReview ? (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Select the target lifecycle transition for this defect:
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    <Button
                      variant={issue.status === 'verified' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChangeClick('verified')}
                      disabled={issue.status === 'verified' || statusMutation.isPending}
                      className="gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4 text-purple-500" />
                      Verify Defect
                    </Button>

                    <Button
                      variant={issue.status === 'repair_pending' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChangeClick('repair_pending')}
                      disabled={issue.status === 'repair_pending' || statusMutation.isPending}
                      className="gap-1.5"
                    >
                      <Clock className="h-4 w-4 text-amber-500" />
                      Schedule Repair
                    </Button>

                    <Button
                      variant={issue.status === 'repaired' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChangeClick('repaired')}
                      disabled={issue.status === 'repaired' || statusMutation.isPending}
                      className="gap-1.5"
                    >
                      <Wrench className="h-4 w-4 text-emerald-500" />
                      Mark Repaired
                    </Button>

                    <Button
                      variant={issue.status === 'rejected' ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChangeClick('rejected')}
                      disabled={issue.status === 'rejected' || statusMutation.isPending}
                      className="gap-1.5 text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Defect
                    </Button>
                  </div>
                </div>
              ) : isPendingOfficer ? (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Your municipal officer registration is awaiting administrator approval. Once approved, you can verify and schedule repairs here.
                  </span>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground border">
                  Your volunteer profile has read-only privileges. If this damage requires urgent municipal attention, please notify your supervising officer.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Mini Map Preview */}
        <div className="space-y-6">
          <Card className="shadow-sm overflow-hidden flex flex-col h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Geolocated Site
              </CardTitle>
              <CardDescription className="text-xs">
                {hasCoords
                  ? `Lat: ${issue.location.lat.toFixed(5)}, Lng: ${issue.location.lng.toFixed(5)}`
                  : 'Coordinates unavailable'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 min-h-[300px] relative">
              {hasCoords ? (
                <MapContainer
                  center={[issue.location.lat, issue.location.lng]}
                  zoom={15}
                  scrollWheelZoom={false}
                  style={{ height: '100%', minHeight: '300px', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker
                    position={[issue.location.lat, issue.location.lng]}
                    icon={createSeverityIcon(issue.severity, true)}
                  >
                    <Popup>
                      <div className="p-1 text-xs">
                        <strong className="capitalize">{issue.type.replace('_', ' ')}</strong>
                        <p>{formatConfidence(issue.confidence)} confidence</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div className="h-full flex items-center justify-center p-6 text-center text-xs text-muted-foreground bg-muted/20">
                  No valid geospatial GPS coordinates recorded for this detection.
                </div>
              )}
            </CardContent>
            <CardFooter className="p-3 bg-muted/20 border-t border-border flex justify-between">
              <Button asChild variant="outline" size="sm" className="w-full text-xs gap-1.5">
                <Link to="/app/map">
                  <MapPin className="h-3.5 w-3.5" />
                  View on Full GIS Map
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog for Consequential Status Change */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Transition</DialogTitle>
            <DialogDescription className="text-xs mt-2">
              Are you sure you want to transition this defect record to{' '}
              <strong className="text-foreground capitalize font-bold">
                {confirmStatus ? formatStatusLabel(confirmStatus) : ''}
              </strong>
              ?
              {confirmStatus === 'rejected' && (
                <span className="block mt-2 text-destructive font-medium">
                  Marking as rejected removes this issue from municipal repair dispatch lists.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={statusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmStatusChange}
              disabled={statusMutation.isPending}
              variant={confirmStatus === 'rejected' ? 'destructive' : 'default'}
              className="gap-1.5"
            >
              {statusMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                'Confirm Transition'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
