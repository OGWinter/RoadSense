import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { issueApi } from '@/features/issues/issueApi';
import { QUERY_KEYS } from '@/app/queryClient';
import { Issue, IssueSeverity, IssueStatus } from '@/types';
import { FitBoundsControl } from '../components/FitBoundsControl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DemoNoticeBadge } from '@/components/common/DemoNoticeBadge';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { createSeverityIcon } from '@/utils/mapUtils';
import {
  formatConfidence,
  formatDate,
  getSeverityBadgeClass,
  getStatusBadgeClass,
  formatStatusLabel,
} from '@/utils/formatters';
import {
  MapPin,
  ExternalLink,
  RefreshCw,
  Layers,
  ListFilter,
  Map as MapIcon,
  Table as TableIcon,
  AlertTriangle,
  Compass,
} from 'lucide-react';

export const MapPage: React.FC = () => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'split' | 'table'>('map');

  // Fetch issues for map display
  const {
    data: paginatedData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.ISSUES({ limit: 100 }),
    queryFn: () => issueApi.getIssues({ limit: 100 }),
  });

  const allIssues: Issue[] = paginatedData?.issues || [];

  // Filter issues by severity and status
  const filteredAllIssues = useMemo(() => {
    return allIssues.filter((issue) => {
      if (selectedSeverity !== 'all' && issue.severity !== selectedSeverity) {
        return false;
      }
      if (selectedStatus !== 'all' && issue.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [allIssues, selectedSeverity, selectedStatus]);

  // Separate issues into mapped (valid coordinates) and unmapped (missing/invalid GPS)
  const { mappedIssues, unmappedIssues } = useMemo(() => {
    const mapped: Issue[] = [];
    const unmapped: Issue[] = [];

    filteredAllIssues.forEach((issue) => {
      const lat = issue.location?.lat;
      const lng = issue.location?.lng;
      const isValid =
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180 &&
        !(lat === 0 && lng === 0);

      if (isValid) {
        mapped.push(issue);
      } else {
        unmapped.push(issue);
      }
    });

    return { mappedIssues: mapped, unmappedIssues: unmapped };
  }, [filteredAllIssues]);

  // Center coordinate calculation
  const defaultCenter: [number, number] = useMemo(() => {
    if (mappedIssues.length > 0) {
      return [mappedIssues[0].location.lat, mappedIssues[0].location.lng];
    }
    return [19.0760, 72.8777]; // Municipal center fallback
  }, [mappedIssues]);

  const markerPositions = useMemo(() => {
    return mappedIssues.map((i) => ({ lat: i.location.lat, lng: i.location.lng }));
  }, [mappedIssues]);

  return (
    <div className="space-y-4 h-[calc(100vh-7rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            Geospatial Road Damage Map
          </h1>
          <p className="text-xs text-muted-foreground">
            Interactive OpenStreetMap visualization of potholes, fractures, and road hazards.
          </p>
        </div>

        {/* View Mode & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'map' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Full Map View"
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Map</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'split' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Map & List Split View"
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Split</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'table' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Table View Fallback"
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Table</span>
            </button>
          </div>

          {/* Severity Filter */}
          <div className="w-32">
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="h-8 text-xs">
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

          {/* Status Filter */}
          <div className="w-32">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-8 text-xs">
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 px-2.5 text-xs gap-1"
            title="Refresh map markers"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          <Badge variant="secondary" className="h-8 px-2 text-xs">
            {mappedIssues.length} Mapped
          </Badge>

          {unmappedIssues.length > 0 && (
            <Badge variant="outline" className="h-8 px-2 text-xs border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/40">
              {unmappedIssues.length} Unmapped (No GPS)
            </Badge>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex gap-4 min-h-0 relative">
        {/* MAP CONTAINER (Shown in 'map' or 'split' view) */}
        {viewMode !== 'table' && (
          <div className={`relative rounded-xl border border-border overflow-hidden shadow-sm bg-card transition-all ${
            viewMode === 'split' ? 'w-full lg:w-3/5' : 'w-full'
          }`}>
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
                <div className="text-center space-y-2">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground font-medium">Loading geospatial markers...</p>
                </div>
              </div>
            ) : null}

            {!isLoading && mappedIssues.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-[400] pointer-events-none p-4">
                <div className="bg-card/95 border border-border shadow-xl rounded-xl p-5 text-center max-w-sm pointer-events-auto space-y-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm text-foreground">No Mapped Locations Available</h3>
                    <p className="text-xs text-muted-foreground">
                      {unmappedIssues.length > 0
                        ? `${unmappedIssues.length} road defects were recorded without valid GPS coordinates. They can still be triaged via the table or list view.`
                        : 'No road defects match your currently selected filters.'}
                    </p>
                  </div>
                  {unmappedIssues.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewMode('table')}
                      className="text-xs gap-1.5 h-8 w-full"
                    >
                      <TableIcon className="h-3.5 w-3.5" /> View Unmapped Defects in Table
                    </Button>
                  )}
                </div>
              </div>
            )}

            <MapContainer
              center={defaultCenter}
              zoom={13}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitBoundsControl markers={markerPositions} />

              {mappedIssues.map((issue) => (
                <Marker
                  key={issue._id}
                  position={[issue.location.lat, issue.location.lng]}
                  icon={createSeverityIcon(issue.severity, selectedIssue?._id === issue._id)}
                  eventHandlers={{
                    click: () => setSelectedIssue(issue),
                  }}
                >
                  <Popup className="roadsense-popup">
                    <div className="p-1 space-y-2 min-w-[240px]">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${getSeverityBadgeClass(
                            issue.severity
                          )}`}
                        >
                          {issue.severity}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getStatusBadgeClass(
                            issue.status
                          )}`}
                        >
                          {formatStatusLabel(issue.status)}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm text-foreground capitalize">
                          {issue.title || issue.type.replace('_', ' ')}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          GPS: {issue.location.lat.toFixed(5)}, {issue.location.lng.toFixed(5)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border">
                        <div>
                          <span className="text-muted-foreground">Confidence: </span>
                          <strong className="text-foreground">{formatConfidence(issue.confidence)}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Priority: </span>
                          <strong className="text-foreground">{issue.priorityScore ?? 75}/100</strong>
                        </div>
                      </div>

                      <div className="pt-1">
                        <DemoNoticeBadge isDemo={issue.isDemo} />
                      </div>

                      <Button asChild size="sm" className="w-full mt-2 h-7 text-xs gap-1.5 shadow-sm">
                        <Link to={`/app/issues/${issue._id}`}>
                          <span>Review & Triage</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 z-[400] bg-card/90 backdrop-blur-md border border-border rounded-lg p-2.5 shadow-lg text-xs space-y-1.5 pointer-events-auto">
              <p className="font-semibold text-[11px] text-foreground uppercase tracking-wider">
                Severity Pin Legend
              </p>
              <div className="flex flex-col gap-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 ring-1 ring-white" />
                  <span>Critical Damage</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500 ring-1 ring-white" />
                  <span>High Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 ring-1 ring-white" />
                  <span>Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-1 ring-white" />
                  <span>Low Defect</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SIDEBAR LIST IN SPLIT VIEW OR FULL TABLE IN TABLE VIEW */}
        {(viewMode === 'split' || viewMode === 'table') && (
          <div className={`${
            viewMode === 'split' ? 'hidden lg:flex flex-col w-2/5' : 'flex-1 flex flex-col'
          } rounded-xl border border-border bg-card overflow-hidden shadow-sm`}>
            <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Issues List ({filteredAllIssues.length})
              </span>
              {unmappedIssues.length > 0 && (
                <span className="text-[11px] text-amber-600 font-medium">
                  {unmappedIssues.length} issues without GPS
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredAllIssues.length === 0 ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="No Issues Match Filter"
                  description="Try selecting 'All Severities' or 'All Statuses'."
                />
              ) : (
                <div className="divide-y divide-border">
                  {filteredAllIssues.map((issue) => {
                    const hasValidCoords =
                      issue.location &&
                      typeof issue.location.lat === 'number' &&
                      typeof issue.location.lng === 'number' &&
                      !isNaN(issue.location.lat) &&
                      !isNaN(issue.location.lng);

                    return (
                      <div
                        key={issue._id}
                        className={`p-3.5 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3 ${
                          selectedIssue?._id === issue._id ? 'bg-muted/50 border-l-4 border-l-primary' : ''
                        }`}
                        onClick={() => setSelectedIssue(issue)}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground truncate capitalize">
                              {issue.title || issue.type.replace('_', ' ')}
                            </span>
                            {!hasValidCoords && (
                              <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-300">
                                No GPS
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span>Conf: {formatConfidence(issue.confidence)}</span>
                            <span>•</span>
                            <span>Priority: {issue.priorityScore ?? 75}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border capitalize ${getSeverityBadgeClass(
                              issue.severity
                            )}`}
                          >
                            {issue.severity}
                          </span>
                          <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Link to={`/app/issues/${issue._id}`} title="Review Details">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
