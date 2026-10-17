import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadApi } from '../uploadApi';
import { QUERY_KEYS } from '@/app/queryClient';
import { useAppSelector } from '@/hooks/useRedux';
import { PageHeader } from '@/components/common/PageHeader';
import { DemoNoticeBadge } from '@/components/common/DemoNoticeBadge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ArrowLeft,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  Cpu,
  MapPin,
  RefreshCw,
  ArrowRight,
  Loader2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '@/utils/formatters';

export const UploadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  const {
    data: upload,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.UPLOAD_DETAIL(id || ''),
    queryFn: () => uploadApi.getUploadById(id || ''),
    enabled: Boolean(id),
    // Poll strictly ONLY when processing or uploaded; stop immediately upon completed, failed, or unmount!
    refetchInterval: (query) => {
      const current = query.state.data;
      if (!current) return 3000;
      if (current.status === 'processing' || current.status === 'uploaded') {
        return 3000; // Poll every 3 seconds while inference runs
      }
      return false; // Stop polling on completed/failed
    },
    refetchIntervalInBackground: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (uploadId: string) => uploadApi.deleteUpload(uploadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.UPLOADS() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_STATS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ISSUES() });
      navigate('/app/uploads');
    },
  });

  const handleDelete = () => {
    if (!upload) return;
    if (
      window.confirm(
        `Are you sure you want to permanently delete "${upload.originalFilename || upload.filename}"?\nThis will remove the video from Cloudinary / storage and delete all detected defect records.`
      )
    ) {
      deleteMutation.mutate(upload._id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !upload) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/app/uploads')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Uploads
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Survey Record Not Found</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{(error as any)?.message || 'The specified upload session could not be retrieved.'}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="ml-4 h-7 text-xs">
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isProcessing = upload.status === 'processing' || upload.status === 'uploaded';
  const isCompleted = upload.status === 'completed';
  const isFailed = upload.status === 'failed';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/app/uploads')}
          className="gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All Survey Uploads
        </Button>

        <div className="flex items-center gap-2">
          <DemoNoticeBadge isDemo={upload.isDemo} />
          {isProcessing && (
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 gap-1 text-xs">
              <RefreshCw className="h-3 w-3 animate-spin" /> Polling Active
            </Button>
          )}
          {upload.storageKey && upload.storageKey.startsWith('http') && (
            <Button variant="outline" size="sm" asChild className="h-8 gap-1 text-xs">
              <a href={upload.storageKey} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
                <span>Cloudinary Video</span>
              </a>
            </Button>
          )}
          {(user?.role === 'admin' || user?.role === 'volunteer') && (
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
              className="h-8 gap-1.5 text-xs shadow-sm"
              title="Delete video from Cloudinary & database"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Video</span>
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-sm border">
        <CardHeader className="pb-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileVideo className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-foreground">
                  {upload.originalFilename || upload.filename || 'Survey Video Ingestion'}
                </CardTitle>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Pipeline ID: {upload._id}
                </p>
              </div>
            </div>

            <div>
              {isProcessing && (
                <Badge variant="outline" className="border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 gap-1.5 py-1 px-3">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  AI Inference In Progress
                </Badge>
              )}
              {isCompleted && (
                <Badge variant="outline" className="border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 gap-1.5 py-1 px-3">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Processing Complete
                </Badge>
              )}
              {isFailed && (
                <Badge variant="destructive" className="gap-1.5 py-1 px-3">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Inference Failed
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Active AI Processing Banner */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-900 dark:text-blue-200">
                <span className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-blue-600 animate-pulse" />
                  Computer Vision Frame Analysis Running...
                </span>
                <span className="text-muted-foreground font-normal">Auto-updating status</span>
              </div>
              <Progress value={upload.progress ?? 65} indicatorColor="bg-blue-600" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                The AI inference engine is extracting frames from your road video, running deep learning defect models (pothole & crack bounding boxes), and correlating GPS coordinates.
              </p>
            </div>
          )}

          {isFailed && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Inference Error</AlertTitle>
              <AlertDescription className="text-xs">
                {upload.errorMessage ||
                  'The AI pipeline encountered a parsing or frame decode issue with this video stream. Please verify video codecs and retry.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/30 border border-border">
            <div>
              <p className="text-xs text-muted-foreground">Upload Timestamp</p>
              <p className="font-semibold text-xs text-foreground mt-1">
                {formatDate(upload.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Detections Identified</p>
              <p className="font-bold text-lg text-primary mt-0.5">
                {upload.detectionCount ?? 0} defects
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Execution Status</p>
              <p className="font-semibold text-xs capitalize text-foreground mt-1">
                {upload.status}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed Time</p>
              <p className="font-semibold text-xs text-foreground mt-1">
                {upload.processedAt ? formatDate(upload.processedAt) : isProcessing ? 'Processing...' : '—'}
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4 bg-muted/10">
          <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
            <Link to="/app/uploads/new">Upload Another Video</Link>
          </Button>

          {isCompleted && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button asChild size="sm" className="gap-1.5 w-full sm:w-auto shadow-sm">
                <Link to="/app/issues">
                  <span>View Detections in Issues</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="sm" className="gap-1.5 w-full sm:w-auto">
                <Link to="/app/map">
                  <MapPin className="h-4 w-4" />
                  <span>See on Map</span>
                </Link>
              </Button>
            </div>
          )}

          {isFailed && (
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link to="/app/uploads/new">Retry Upload</Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};
