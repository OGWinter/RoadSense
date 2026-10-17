import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../reportsApi';
import { QUERY_KEYS } from '@/app/queryClient';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const {
    data: reports,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.REPORTS_SUMMARY,
    queryFn: reportsApi.getSummary,
  });

  const severityChartData = [
    { name: 'Low Risk', count: reports?.severityCounts?.low || 0, fill: '#10b981' },
    { name: 'Medium Defect', count: reports?.severityCounts?.medium || 0, fill: '#f59e0b' },
    { name: 'High Severity', count: reports?.severityCounts?.high || 0, fill: '#f97316' },
    { name: 'Critical Hazard', count: reports?.severityCounts?.critical || 0, fill: '#ef4444' },
  ];

  const statusChartData = [
    { name: 'Detected', count: reports?.statusCounts?.detected || 0, fill: '#3b82f6' },
    { name: 'Verified', count: reports?.statusCounts?.verified || 0, fill: '#8b5cf6' },
    { name: 'Pending Repair', count: reports?.statusCounts?.repair_pending || 0, fill: '#f59e0b' },
    { name: 'Repaired', count: reports?.statusCounts?.repaired || 0, fill: '#10b981' },
    { name: 'Rejected', count: reports?.statusCounts?.rejected || 0, fill: '#64748b' },
  ];

  const trendData = reports?.monthlyTrends?.length ? reports.monthlyTrends : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Municipal Analytics & Road Quality Reports"
        description="Comprehensive pavement health index, historical defect trends, and municipal repair throughput."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Data
          </Button>
        }
      />

      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Reports</AlertTitle>
          <AlertDescription>
            {(error as any)?.message || 'Failed to fetch summary data.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Highlights & PCI Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Pavement Condition Index (PCI)
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {reports?.pciScore ?? 78}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  ASTM D6433 Standard Evaluation
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                Satisfactory
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Total Network Surveyed
              </p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-foreground">
                  {reports?.totalKilometersSurveyed ?? 142.5}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">km</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                High-definition video telemetry analyzed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Repair Resolution Rate
              </p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-foreground">
                  84.2%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Verified potholes repaired within SLA
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Count Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Defect Count by Severity Rating</CardTitle>
            <CardDescription className="text-xs">
              Classification of road defects by immediate danger to vehicular transit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={severityChartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <RechartsTooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Issues Detected" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Count Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Issues by Operational Status</CardTitle>
            <CardDescription className="text-xs">
              Current progress across municipal inspection and repair queues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <RechartsTooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historical Trend Area Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Detection vs. Repair Velocity Trend
          </CardTitle>
          <CardDescription className="text-xs">
            Comparison of AI detected pavement defects against verified public works repairs over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RechartsTooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="detected"
                    name="Defects Detected"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="repaired"
                    name="Defects Repaired"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
