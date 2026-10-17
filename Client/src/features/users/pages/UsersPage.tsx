import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../usersApi';
import { QUERY_KEYS } from '@/app/queryClient';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
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
import { Users, Shield, RefreshCw, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatRoleLabel, formatDate } from '@/utils/formatters';
import { toast } from 'sonner';

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();

  const {
    data: users = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.USERS,
    queryFn: usersApi.getUsers,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => usersApi.approveUser(id),
    onSuccess: (updated) => {
      toast.success(`Officer ${updated.name} has been approved.`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to approve officer.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => usersApi.rejectUser(id),
    onSuccess: (updated) => {
      toast.warning(`Officer application for ${updated.name} was rejected.`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to reject officer.');
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Municipal Users & Surveyors"
        description="Administrative access directory of certified municipal officers, public works supervisors, and volunteer surveyors."
        badge={
          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
            Admin Console
          </Badge>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      {isError && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Notice: User Directory Service</AlertTitle>
          <AlertDescription className="text-xs">
            {(error as any)?.message ||
              'User endpoint is either restricted or not implemented on this backend environment. Main road operations remain unaffected.'}
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
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Users Registered"
            description="The user directory has no active accounts listed."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Name</TableHead>
                <TableHead>Email Address</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Approval Status</TableHead>
                <TableHead>Department / Sector</TableHead>
                <TableHead>Member Since</TableHead>
                <TableHead className="text-right">Admin Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isPending = u.status === 'pending' || u.isApproved === false;
                const isApproved = u.status === 'approved' || (u.isApproved !== false && !isPending);

                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <span className="truncate">{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.role === 'admin' ? 'default' : 'secondary'}
                        className="text-[11px]"
                      >
                        {formatRoleLabel(u.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isPending ? (
                        <Badge variant="outline" className="text-[11px] border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 gap-1">
                          <Clock className="h-3 w-3" /> Pending Approval
                        </Badge>
                      ) : isApproved ? (
                        <Badge variant="outline" className="text-[11px] border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Approved
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[11px] gap-1">
                          <XCircle className="h-3 w-3" /> Rejected
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.department || 'Public Works Dept.'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.role === 'municipal_officer' && isPending ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => approveMutation.mutate(u.id)}
                            disabled={approveMutation.isPending}
                            className="h-7 px-2 text-xs gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectMutation.mutate(u.id)}
                            disabled={rejectMutation.isPending}
                            className="h-7 px-2 text-xs gap-1 text-destructive hover:bg-destructive/10"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};
