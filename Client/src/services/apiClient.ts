import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

// In-memory token storage (with sessionStorage fallback for page refresh in demo)
let inMemoryToken: string | null = sessionStorage.getItem('roadsense_token');

let onUnauthorizedCallback: (() => void) | null = null;

export const setAuthToken = (token: string | null) => {
  inMemoryToken = token;
  if (token) {
    sessionStorage.setItem('roadsense_token', token);
  } else {
    sessionStorage.removeItem('roadsense_token');
  }
};

export const getAuthToken = (): string | null => {
  return inMemoryToken;
};

export const registerUnauthorizedHandler = (cb: () => void) => {
  onUnauthorizedCallback = cb;
};

export interface NormalizedError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
  isNetworkError: boolean;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: true, // Supports secure HttpOnly cookies & CSRF
  headers: {
    'Accept': 'application/json',
  },
});

// Request interceptor: inject Bearer token if present
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (inMemoryToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${inMemoryToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 & error normalization
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    const isNetworkError = !error.response;
    const statusCode = error.response?.status;
    let message = 'An unexpected error occurred. Please try again.';

    if (isNetworkError) {
      message = 'Cannot connect to RoadSense server. Please check your backend connection.';
    } else if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (statusCode === 401) {
      message = 'Your session has expired or you are unauthorized.';
      // Trigger session reset if not on login page
      if (onUnauthorizedCallback && !window.location.pathname.includes('/login')) {
        onUnauthorizedCallback();
      }
    } else if (statusCode === 403) {
      message = 'You do not have permission to perform this action.';
    } else if (statusCode === 404) {
      message = 'The requested resource was not found.';
    } else if (statusCode === 500) {
      message = 'Internal server error occurred on the RoadSense backend.';
    }

    const normalized: NormalizedError = {
      message,
      statusCode,
      errors: error.response?.data?.errors,
      isNetworkError,
    };

    return Promise.reject(normalized);
  }
);
