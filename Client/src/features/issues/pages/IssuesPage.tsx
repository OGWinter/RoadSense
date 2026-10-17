import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { issueApi } from '../issueApi';
import { QUERY_KEYS } from '@/app/queryClient';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import {
  formatDate,
  formatConfidence,
  getSeverityBadgeClass,
  getStatusBadgeClass,
  formatStatusLabel,
} from '@/utils/formatters';

export const IssuesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Read URL search params
  const severityFilter = searchParams.get('severity') || 'all';
  const statusFilter = searchParams.get('status') || 'all';
  const searchFilter = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 15;

  const updateFilters = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val === 'all' || val === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, val);
      }
    });
    // Reset to page 1 on filter change if page wasn't explicitly updated
    if (!updates.page && nextParams.has('page') && updates.page !== '1') {
      nextParams.set('page', '1');
    }
    setSearchParams(nextParams);
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.ISSUES({
      severity: severityFilter,
      status: statusFilter,
      search: searchFilter,
      page: currentPage,
      limit: pageSize,
    }),
    queryFn: () =>
      issueApi.getIssues({
        severity: severityFilter as any,
        status: statusFilter as any,
        search: searchFilter,
        page: currentPage,
        limit: pageSize,
      }),
  });

  const issues = data?.issues || [];
  const totalItems = data?.total || 0;
  const totalPages = data?.totalPages || Math.ceil(totalItems / pageSize) || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Road Damage Issues"
        description="Review, verify, and prioritize geolocated pavement defects identified during survey sweeps."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Issues</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{(error as any)?.message || 'Failed to fetch road issues from server.'}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filter and Search Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or type..."
                value={searchFilter}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="w-36">
                <Select
                  value={severityFilter}
                  onValueChange={(val) => updateFilters({ severity: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-36">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => updateFilters({ status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="detected">Detected</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="repair_pending">Repair Pending</SelectItem>
                    <SelectItem value="repaired">Repaired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(severityFilter !== 'all' || statusFilter !== 'all' || searchFilter !== '') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchParams(new URLSearchParams())}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues Table */}
      <Card className="shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : issues.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No Road Issues Found"
            description="No damage records match your current criteria. Adjust your filters or upload a dashcam survey."
            actionLabel="Reset Filters"
            onAction={() => setSearchParams(new URLSearchParams())}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Defect / Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detection Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((issue) => (
                <TableRow
                  key={issue._id}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => navigate(`/app/issues/${issue._id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="space-y-0.5">
                      <div className="text-foreground font-semibold flex items-center gap-1.5">
                        <span>{issue.title || issue.type.replace('_', ' ')}</span>
                      </div>
                      <DemoNoticeBadge isDemo={issue.isDemo} />
                    </div>
                  </TableCell>
                  <TableCell className="capitalize text-xs text-muted-foreground">
                    {issue.type.replace('_', ' ')}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded border capitalize ${getSeverityBadgeClass(
                        issue.severity
                      )}`}
                    >
                      {issue.severity}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {formatConfidence(issue.confidence)}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-bold text-foreground">
                      {issue.priorityScore ?? 75}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {issue.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary shrink-0" />
                        {issue.location.lat.toFixed(4)}, {issue.location.lng.toFixed(4)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded border ${getStatusBadgeClass(
                        issue.status
                      )}`}
                    >
                      {formatStatusLabel(issue.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(issue.detectedAt || issue.createdAt)}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/app/issues/${issue._id}`)}
                      className="h-8 px-2 gap-1 text-xs"
                    >
                      <span>Review</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            <div>
              Showing <span className="font-medium text-foreground">{issues.length}</span> of{' '}
              <span className="font-medium text-foreground">{totalItems}</span> recorded issues
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || isLoading}
                onClick={() => updateFilters({ page: String(currentPage - 1) })}
                className="h-8 px-2.5 text-xs gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <span className="px-2 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || isLoading}
                onClick={() => updateFilters({ page: String(currentPage + 1) })}
                className="h-8 px-2.5 text-xs gap-1"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
