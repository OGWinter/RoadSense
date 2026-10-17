import { apiClient, setAuthToken } from '@/services/apiClient';
import { API_ENDPOINTS } from '@/services/endpoints';
import { User } from '@/types';
import { LoginFormData } from './schemas';
import { MOCK_USERS } from '@/services/mockData';

export interface AuthResponse {
  token?: string;
  user: User;
}

export const authApi = {
  login: async (credentials: LoginFormData): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<any>(API_ENDPOINTS.AUTH.LOGIN, credentials);
      const data = response.data?.data || response.data;

      const rawUser = data.user || data;
      const user: User = {
        id: rawUser.id || rawUser._id || 'user-1',
        name: rawUser.name || 'RoadSense Operator',
        email: rawUser.email || credentials.email,
        role: rawUser.role || 'municipal_officer',
        department: rawUser.department,
        createdAt: rawUser.createdAt,
      };

      sessionStorage.setItem('roadsense_user', JSON.stringify(user));
      if (data.token) {
        setAuthToken(data.token);
      }

      return {
        token: data.token,
        user,
      };
    } catch (err: any) {
      throw err;
    }
  },

  getMe: async (): Promise<User> => {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.AUTH.ME);
      const data = response.data?.data || response.data;
      const rawUser = data.user || data;

      const user: User = {
        id: rawUser.id || rawUser._id,
        name: rawUser.name,
        email: rawUser.email,
        role: rawUser.role,
        department: rawUser.department,
        createdAt: rawUser.createdAt,
      };

      sessionStorage.setItem('roadsense_user', JSON.stringify(user));
      return user;
    } catch (err: any) {
      // If backend is offline, restore from sessionStorage demo session
      const saved = sessionStorage.getItem('roadsense_user');
      if (saved) {
        return JSON.parse(saved);
      }
      throw err;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (e) {
      // Ignore
    } finally {
      sessionStorage.removeItem('roadsense_user');
      setAuthToken(null);
    }
  },

  registerVolunteer: async (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<User> => {
    const response = await apiClient.post<any>(API_ENDPOINTS.AUTH.REGISTER, data);
    const resData = response.data?.data || response.data;
    const rawUser = resData.user || resData;
    return {
      id: rawUser._id || rawUser.id,
      name: rawUser.name,
      email: rawUser.email,
      role: rawUser.role,
      createdAt: rawUser.createdAt,
    };
  },

  registerOfficer: async (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    municipality: string;
    department: string;
    employeeId?: string;
  }): Promise<{ message: string; request: any }> => {
    const response = await apiClient.post<any>(API_ENDPOINTS.AUTH.OFFICER_REGISTER, data);
    return response.data;
  },

  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { token, password });
  },

  verifyEmail: async (token: string): Promise<void> => {
    await apiClient.get(`${API_ENDPOINTS.AUTH.VERIFY_EMAIL}?token=${token}`);
  },

  resendVerification: async (email: string): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.AUTH.RESEND_VERIFICATION, { email });
  },
};

