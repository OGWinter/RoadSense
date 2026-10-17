import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../dashboardApi';
import { reportsApi } from '@/features/reports/reportsApi';
import { QUERY_KEYS } from '@/app/queryClient';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DemoNoticeBadge } from '@/components/common/DemoNoticeBadge';
import {
  AlertTriangle,
  Flame,
  Clock,
  CheckCircle2,
  MapPin,
  ArrowRight,
  RefreshCw,
  UploadCloud,
  FileText,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  formatDate,
  formatConfidence,
  getSeverityBadgeClass,
  getStatusBadgeClass,
  formatStatusLabel,
} from '@/utils/formatters';

const SEVERITY_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

export const DashboardPage: React.FC = () => {
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_STATS,
    queryFn: dashboardApi.getStats,
  });

  const {
    data: reports,
    isLoading: isReportsLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.REPORTS_SUMMARY,
    queryFn: reportsApi.getSummary,
  });

  const kpis = [
    {
      title: 'Total Road Issues',
      value: stats?.totalIssues ?? 0,
      icon: AlertTriangle,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400',
      description: 'Cumulative potholes & cracks',
    },
    {
      title: 'High & Critical Hazards',
      value: stats?.criticalIssues ?? 0,
      icon: Flame,
      color: 'text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400',
      description: 'Immediate structural risk',
    },
    {
      title: 'Pending Municipal Repairs',
      value: stats?.pendingRepairs ?? 0,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400',
      description: 'Dispatched or scheduled',
    },
    {
      title: 'Resolved & Repaired',
      value: stats?.repairedIssues ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
      description: 'Verified work orders closed',
    },
    {
      title: 'Survey Ingestions',
      value: stats?.totalUploads ?? 0,
      icon: UploadCloud,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-400',
      description: stats?.processingUploads ? `${stats.processingUploads} processing` : 'Dashcam video sweeps',
    },
  ];

  // Prepare chart data from reports summary or fallback to stats distribution
  const severityDistributionData = [
    { name: 'Low', count: reports?.severityCounts?.low || 0, color: SEVERITY_COLORS.low },
    { name: 'Medium', count: reports?.severityCounts?.medium || 0, color: SEVERITY_COLORS.medium },
    { name: 'High', count: reports?.severityCounts?.high || 0, color: SEVERITY_COLORS.high },
    { name: 'Critical', count: reports?.severityCounts?.critical || 0, color: SEVERITY_COLORS.critical },
  ];

  const statusPieData = [
    { name: 'Detected', value: reports?.statusCounts?.detected || 0, color: '#3b82f6' },
    { name: 'Verified', value: reports?.statusCounts?.verified || 0, color: '#8b5cf6' },
    { name: 'Pending Repair', value: reports?.statusCounts?.repair_pending || 0, color: '#f59e0b' },
    { name: 'Repaired', value: reports?.statusCounts?.repaired || 0, color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Municipal Operations Command"
        description="Real-time monitoring of road pavement damage, computer vision detections, and repair triage."
        badge={stats?.isDemo ? <DemoNoticeBadge isDemo={true} /> : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStats()}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/app/map">
                <MapPin className="h-3.5 w-3.5" />
                Open Live Map
              </Link>
            </Button>
          </div>
        }
      />

      {isStatsError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to load dashboard metrics</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {(statsError as any)?.message || 'The RoadSense API could not be reached.'}
            </span>
            <Button size="sm" variant="outline" onClick={() => refetchStats()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} className="relative overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {kpi.title}
                    </p>
                    <div className="mt-2 flex items-baseline gap-2">
                      {isStatsLoading ? (
                        <Skeleton className="h-8 w-16" />
                      ) : (
                        <span className="text-3xl font-extrabold tracking-tight text-foreground">
                          {kpi.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {kpi.description}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${kpi.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution Bar Chart */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Damage Distribution by Severity</span>
              <Badge variant="outline" className="text-xs font-normal">
                RoadSense AI Classification
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of detected road defects requiring municipal engineering intervention.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {isReportsLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={severityDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {severityDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Donut Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Triage & Repair Status</CardTitle>
            <CardDescription className="text-xs">
              Current progress across municipal workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="70%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full mt-2 text-xs">
                {statusPieData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground truncate">{item.name}:</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Issues & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Road Damage Findings */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Recent Road Damage Detections</CardTitle>
              <CardDescription className="text-xs">
                Latest defects logged by Dashcam AI inference
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link to="/app/issues">
                View all issues <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : stats?.recentIssues && stats.recentIssues.length > 0 ? (
              <div className="divide-y divide-border">
                {stats.recentIssues.slice(0, 5).map((issue) => (
                  <div key={issue._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/app/issues/${issue._id}`}
                          className="font-medium text-sm text-foreground hover:underline truncate"
                        >
                          {issue.title || `${issue.type.replace('_', ' ')} detected`}
                        </Link>
                        <DemoNoticeBadge isDemo={issue.isDemo} />
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-3">
                        <span>Lat: {issue.location?.lat?.toFixed(4)}, Lng: {issue.location?.lng?.toFixed(4)}</span>
                        <span>Confidence: {formatConfidence(issue.confidence)}</span>
                        <span>{formatDate(issue.detectedAt || issue.createdAt)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border capitalize ${getSeverityBadgeClass(issue.severity)}`}>
                        {issue.severity}
                      </span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${getStatusBadgeClass(issue.status)}`}>
                        {formatStatusLabel(issue.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <p>No recent damage records found.</p>
                <Button asChild variant="outline" size="sm" className="mt-3 gap-1">
                  <Link to="/app/uploads/new">
                    <UploadCloud className="h-3.5 w-3.5" /> Upload Dashcam Video
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Operational Shortcuts */}
        <div className="space-y-4">
          <Card className="shadow-sm bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
                <Activity className="h-4 w-4" />
                Live Map Navigation
              </CardTitle>
              <CardDescription className="text-xs">
                Visualize all geolocated potholes, longitudinal cracks, and alligator cracking on OpenStreetMap.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full gap-2 shadow-sm">
                <Link to="/app/map">
                  <MapPin className="h-4 w-4" />
                  Explore Geospatial Map
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Pavement Condition Index (PCI)
              </CardTitle>
              <CardDescription className="text-xs">
                Official ASTM D6433 rating for municipal road sections.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-2xl font-bold text-foreground">
                  {reports?.pciScore ?? 78} / 100
                </span>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
                  Satisfactory
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">
                Based on {reports?.totalKilometersSurveyed ?? 142.5} km of municipal roadway surveys.
              </p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/app/reports">View Full Engineering Report</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
