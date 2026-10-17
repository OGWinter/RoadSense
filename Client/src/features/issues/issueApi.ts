import { apiClient } from '@/services/apiClient';
import { API_ENDPOINTS } from '@/services/endpoints';
import { Issue, IssueFilters, IssueStatus, PaginatedResponse } from '@/types';
import { mockIssues } from '@/services/mockData';

export function normalizeIssue(raw: any): Issue {
  if (!raw) return raw;

  let lat: number | undefined;
  let lng: number | undefined;

  if (raw.location) {
    if (typeof raw.location.lat === 'number') {
      lat = raw.location.lat;
    } else if (typeof raw.location.latitude === 'number') {
      lat = raw.location.latitude;
    }

    if (typeof raw.location.lng === 'number') {
      lng = raw.location.lng;
    } else if (typeof raw.location.longitude === 'number') {
      lng = raw.location.longitude;
    }

    // GeoJSON Point support: coordinates: [lng, lat]
    if (Array.isArray(raw.location.coordinates) && raw.location.coordinates.length >= 2) {
      lng = Number(raw.location.coordinates[0]);
      lat = Number(raw.location.coordinates[1]);
    }
  }

  // Root level coordinate fallback
  if (lat === undefined && typeof raw.lat === 'number') lat = raw.lat;
  if (lng === undefined && typeof raw.lng === 'number') lng = raw.lng;
  if (lat === undefined && typeof raw.latitude === 'number') lat = raw.latitude;
  if (lng === undefined && typeof raw.longitude === 'number') lng = raw.longitude;

  const hasValidCoords =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0);

  return {
    ...raw,
    _id: raw._id || raw.id,
    location: hasValidCoords
      ? { ...raw.location, lat: lat!, lng: lng! }
      : raw.location,
  };
}

export const issueApi = {
  getIssues: async (filters: IssueFilters = {}): Promise<PaginatedResponse<Issue>> => {
    try {
      const params: Record<string, any> = {};

      if (filters.severity && filters.severity !== 'all') {
        params.severity = filters.severity;
      }
      if (filters.status && filters.status !== 'all') {
        params.status = filters.status;
      }
      if (filters.search) {
        params.search = filters.search;
      }
      if (filters.page) {
        params.page = filters.page;
      }
      if (filters.limit) {
        params.limit = filters.limit;
      }

      const response = await apiClient.get<any>(API_ENDPOINTS.ISSUES.LIST, { params });
      const data = response.data?.data || response.data;

      if (Array.isArray(data)) {
        const issues = data.map(normalizeIssue);
        return {
          issues,
          total: issues.length,
          page: filters.page || 1,
          limit: filters.limit || 20,
          totalPages: Math.ceil(issues.length / (filters.limit || 20)),
        };
      }

      const rawIssues = data.issues || data.items || [];
      const issues = rawIssues.map(normalizeIssue);
      const total = data.total ?? issues.length;
      const page = data.page ?? filters.page ?? 1;
      const limit = data.limit ?? filters.limit ?? 20;

      return {
        issues,
        total,
        page,
        limit,
        totalPages: data.totalPages || Math.ceil(total / limit) || 1,
      };
    } catch (err: any) {
      if (err?.isNetworkError || !err?.statusCode) {
        // Filter mock issues
        let filtered = [...mockIssues];
        if (filters.severity && filters.severity !== 'all') {
          filtered = filtered.filter((i) => i.severity === filters.severity);
        }
        if (filters.status && filters.status !== 'all') {
          filtered = filtered.filter((i) => i.status === filters.status);
        }
        if (filters.search) {
          const q = filters.search.toLowerCase();
          filtered = filtered.filter(
            (i) => i.title.toLowerCase().includes(q) || i.type.toLowerCase().includes(q)
          );
        }

        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const start = (page - 1) * limit;
        const paged = filtered.slice(start, start + limit);

        return {
          issues: paged,
          total: filtered.length,
          page,
          limit,
          totalPages: Math.ceil(filtered.length / limit) || 1,
        };
      }
      throw err;
    }
  },

  getIssueById: async (id: string): Promise<Issue> => {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.ISSUES.DETAIL(id));
      const data = response.data?.data || response.data;
      return normalizeIssue(data.issue || data);
    } catch (err: any) {
      if (err?.isNetworkError || !err?.statusCode) {
        const found = mockIssues.find((i) => i._id === id);
        if (found) return normalizeIssue(found);
      }
      throw err;
    }
  },

  updateStatus: async (id: string, status: IssueStatus, notes?: string): Promise<Issue> => {
    try {
      const response = await apiClient.patch<any>(
        API_ENDPOINTS.ISSUES.UPDATE_STATUS(id),
        { status, reason: notes || undefined }
      );
      const data = response.data?.data || response.data;
      return normalizeIssue(data.issue || data);
    } catch (err: any) {
      if (err?.isNetworkError || !err?.statusCode) {
        const item = mockIssues.find((i) => i._id === id);
        if (item) {
          item.status = status;
          if (notes) item.notes = notes;
          item.updatedAt = new Date().toISOString();
          return item;
        }
      }
      throw err;
    }
  },
};
