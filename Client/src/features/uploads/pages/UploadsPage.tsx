import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { uploadApi } from '../uploadApi';
import { QUERY_KEYS } from '@/app/queryClient';
import { useAppSelector } from '@/hooks/useRedux';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { DemoNoticeBadge } from '@/components/common/DemoNoticeBadge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  FileVideo,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { formatDate } from '@/utils/formatters';

export const UploadsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');

  const {
    data: rawUploads = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: QUERY_KEYS.UPLOADS(),
    queryFn: () => uploadApi.getUploads(false),
    staleTime: 5000,
    refetchOnMount: 'always',
    refetchInterval: (query) => {
      const list = query.state.data;
      if (
        Array.isArray(list) &&
        list.some((u) => u.status === 'processing' || u.status === 'uploaded')
      ) {
        return 3000;
      }
      return false;
    },
  });

  const uploads = useMemo(() => {
    if (viewMode === 'mine' && user?.id) {
      return rawUploads.filter((u) => u.uploaderId === user.id);
    }
    return rawUploads;
  }, [rawUploads, viewMode, user?.id]);

  const myUploadsCount = useMemo(() => {
    if (!user?.id) return 0;
    return rawUploads.filter((u) => u.uploaderId === user.id).length;
  }, [rawUploads, user?.id]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => uploadApi.deleteUpload(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.UPLOADS() });
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_STATS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ISSUES() });
    },
  });

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Are you sure you want to permanently delete "${name}"?\nThis will remove the video from storage and delete all associated road defects.`
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </Badge>
        );
      case 'processing':
      case 'uploaded':
        return (
          <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 gap-1 text-[11px]">
            <Clock className="h-3 w-3 animate-spin" /> Processing
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1 text-[11px]">
            <AlertCircle className="h-3 w-3" /> Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Road Survey Uploads"
        description="Ingested video dashcam surveys and automated defect detection pipelines."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild size="sm" className="gap-1.5 shadow-sm">
              <Link to="/app/uploads/new">
                <UploadCloud className="h-4 w-4" />
                Upload New Survey
              </Link>
            </Button>
          </div>
        }
      />

      {/* Tabs / Filter Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('all')}
          className="text-xs h-8 gap-1.5 shadow-sm"
        >
          <span>All City Surveys</span>
          <Badge variant={viewMode === 'all' ? 'secondary' : 'outline'} className="ml-1 text-[10px] px-1.5 py-0 font-mono">
            {rawUploads.length}
          </Badge>
        </Button>
        <Button
          variant={viewMode === 'mine' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('mine')}
          className="text-xs h-8 gap-1.5 shadow-sm"
        >
          <span>My Surveys</span>
          <Badge variant={viewMode === 'mine' ? 'secondary' : 'outline'} className="ml-1 text-[10px] px-1.5 py-0 font-mono">
            {myUploadsCount}
          </Badge>
        </Button>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Uploads</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{(error as any)?.message || 'Failed to retrieve uploads from backend.'}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : uploads.length === 0 ? (
          <EmptyState
            icon={FileVideo}
            title="No Survey Videos Uploaded Yet"
            description="Submit your first dashcam or camera inspection video to detect road damage."
            actionNode={
              <Button asChild size="sm" className="gap-1.5">
                <Link to="/app/uploads/new">
                  <UploadCloud className="h-4 w-4" /> Upload Dashcam Video
                </Link>
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename / Pipeline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detections Found</TableHead>
                <TableHead>Upload Timestamp</TableHead>
                <TableHead>Classification Source</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((item) => (
                <TableRow
                  key={item._id}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => navigate(`/app/uploads/${item._id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileVideo className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-foreground text-sm">{item.originalFilename || item.filename}</p>
                          {item.uploaderId && user?.id && item.uploaderId === user.id && (
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px] px-1.5 py-0">
                              My Survey
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-muted-foreground">{item._id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>
                    <span className="font-bold text-foreground text-sm">
                      {item.detectionCount ?? 0}
                    </span>{' '}
                    <span className="text-xs text-muted-foreground">defects</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DemoNoticeBadge isDemo={item.isDemo} />
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/app/uploads/${item._id}`)}
                        className="h-8 px-2 gap-1 text-xs"
                      >
                        <span>Pipeline</span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      {(user?.role === 'admin' || (item.uploaderId && user?.id && item.uploaderId === user.id)) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleteMutation.isPending}
                          onClick={(e) =>
                            handleDelete(
                              e,
                              item._id,
                              item.originalFilename || item.filename
                            )
                          }
                          className="h-8 px-2 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title="Delete video from storage & database"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};
