import { apiClient } from '@/services/apiClient';
import { API_ENDPOINTS } from '@/services/endpoints';
import { User } from '@/types';
import { MOCK_USERS } from '@/services/mockData';

export const usersApi = {
  getUsers: async (): Promise<User[]> => {
    try {
      // 1. Fetch registered users from backend
      const usersResPromise = apiClient.get<any>(API_ENDPOINTS.ADMIN.USERS).catch(() => null);
      // 2. Fetch officer registration requests (pending, approved, rejected)
      const officerReqPromise = apiClient.get<any>(API_ENDPOINTS.ADMIN.OFFICER_REQUESTS).catch(() => null);

      const [usersRes, officerReqRes] = await Promise.all([usersResPromise, officerReqPromise]);

      const result: User[] = [];

      // Add officer requests first so pending items are prominently visible to admin
      if (officerReqRes?.data) {
        const reqData = officerReqRes.data?.data || officerReqRes.data;
        const requests = Array.isArray(reqData) ? reqData : reqData.requests || [];
        requests.forEach((r: any) => {
          result.push({
            id: r._id || r.id,
            name: r.name,
            email: r.email,
            role: 'municipal_officer',
            status: r.status,
            isApproved: r.status === 'approved',
            department: r.department
              ? `${r.department}${r.municipality ? ` (${r.municipality})` : ''}`
              : r.municipality || 'Public Works',
            createdAt: r.createdAt,
          });
        });
      }

      // Add confirmed users
      if (usersRes?.data) {
        const uData = usersRes.data?.data || usersRes.data;
        const rawUsers = Array.isArray(uData) ? uData : uData.users || [];
        rawUsers.forEach((u: any) => {
          // Avoid duplicate display if already listed via officer request
          if (!result.some((existing) => existing.email === u.email)) {
            result.push({
              id: u._id || u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              status: u.isActive !== false ? 'approved' : 'rejected',
              isApproved: u.isActive !== false,
              department:
                u.role === 'admin'
                  ? 'Municipal Operations Command'
                  : u.role === 'municipal_officer'
                  ? 'Civil Infrastructure & Pavement'
                  : 'Citizen Surveyor Network',
              createdAt: u.createdAt,
            });
          }
        });
      }

      if (result.length > 0) {
        return result;
      }

      // If backend returned empty array, return empty array
      if (usersRes || officerReqRes) {
        return [];
      }

      return [];
    } catch (err: any) {
      if (err?.isNetworkError || !err?.statusCode) {
        return [];
      }
      throw err;
    }
  },

  approveUser: async (id: string): Promise<User> => {
    try {
      const response = await apiClient.patch<any>(API_ENDPOINTS.ADMIN.OFFICER_REQUEST_REVIEW(id), {
        status: 'approved',
      });
      const data = response.data?.data || response.data;
      return {
        id: data._id || id,
        name: data.name || 'Officer',
        email: data.email || '',
        role: 'municipal_officer',
        status: 'approved',
        isApproved: true,
      };
    } catch (err: any) {
      if (err?.isNetworkError || !err?.statusCode) {
        const found = Object.values(MOCK_USERS).find((u) => u.id === id);
        if (found) {
          found.status = 'approved';
          found.isApproved = true;
          return found;
        }
      }
      throw err;
    }
  },

  rejectUser: async (id: string, reason?: string): Promise<User> => {
    try {
      const response = await apiClient.patch<any>(API_ENDPOINTS.ADMIN.OFFICER_REQUEST_REVIEW(id), {
        status: 'rejected',
        reason: reason || 'Application rejected by administrator',
      });
      const data = response.data?.data || response.data;
      return {
        id: data._id || id,
        name: data.name || 'Officer',
        email: data.email || '',
        role: 'municipal_officer',
        status: 'rejected',
        isApproved: false,
      };
    } catch (err: any) {
      if (err?.isNetworkError || !err?.statusCode) {
        const found = Object.values(MOCK_USERS).find((u) => u.id === id);
        if (found) {
          found.status = 'rejected';
          found.isApproved = false;
          return found;
        }
      }
      throw err;
    }
  },
};
