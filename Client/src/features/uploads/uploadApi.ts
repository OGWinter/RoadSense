import { apiClient } from '@/services/apiClient';
import { API_ENDPOINTS } from '@/services/endpoints';
import { UploadItem } from '@/types';
import { AxiosProgressEvent } from 'axios';
import { mockUploads, getStoredMockUploads, saveStoredMockUploads } from '@/services/mockData';

export interface UploadOptions {
  videoFile: File;
  gpsFile?: File | null;
  gpsSamples?: any[] | string | null;
  description?: string;
  recordingStartedAt?: string | null;
  recordingEndedAt?: string | null;
  onUploadProgress?: (progress: number) => void;
}

export interface DirectUploadInitiateResponse {
  uploadId: string;
  presignedUrl: string;
  requiredHeaders?: Record<string, string>;
}

export const uploadApi = {
  getUploads: async (mineOnly = false): Promise<UploadItem[]> => {
    try {
      const url = mineOnly ? `${API_ENDPOINTS.UPLOADS.LIST}?mine=true` : API_ENDPOINTS.UPLOADS.LIST;
      const response = await apiClient.get<any>(url);
      const data = response.data?.data || response.data;
      if (Array.isArray(data)) return data;
      return data.uploads || data.items || [];
    } catch (err: any) {
      if (err?.isNetworkError || !err?.statusCode) {
        return getStoredMockUploads();
      }
      throw err;
    }
  },

  getUploadById: async (id: string): Promise<UploadItem> => {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.UPLOADS.DETAIL(id));
      const data = response.data?.data || response.data;
      return data.upload || data;
    } catch (err: any) {
      if (err?.isNetworkError || !err?.statusCode) {
        const stored = getStoredMockUploads();
        const found = stored.find((u) => u._id === id);
        if (found) {
          // If in demo processing state, simulate completing after initial check
          if (found.status === 'processing' || found.status === 'uploaded') {
            const ageMs = Date.now() - new Date(found.createdAt).getTime();
            if (ageMs > 4000) {
              found.status = 'completed';
              found.detectionCount = 7;
              found.processedAt = new Date().toISOString();
              saveStoredMockUploads(stored);
            }
          }
          return found;
        }
      }
      throw err;
    }
  },

  // Hackathon Standard MVP: Direct multipart upload
  uploadVideoMvp: async (options: UploadOptions): Promise<UploadItem> => {
    try {
      const formData = new FormData();
      formData.append('video', options.videoFile);

      if (options.gpsFile) {
        formData.append('gpsFile', options.gpsFile);
      }
      if (options.gpsSamples) {
        const jsonStr =
          typeof options.gpsSamples === 'string'
            ? options.gpsSamples
            : JSON.stringify(options.gpsSamples);
        formData.append('gpsSamples', jsonStr);
      }
      if (options.description) {
        formData.append('description', options.description);
      }
      if (options.recordingStartedAt) {
        formData.append('recordingStartedAt', options.recordingStartedAt);
      }
      if (options.recordingEndedAt) {
        formData.append('recordingEndedAt', options.recordingEndedAt);
      }

      const response = await apiClient.post<any>(API_ENDPOINTS.UPLOADS.CREATE, formData, {
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total && options.onUploadProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            options.onUploadProgress(percentCompleted);
          }
        },
      });

      const data = response.data?.data || response.data;
      return data.upload || data;
    } catch (err: any) {
      if (err?.isNetworkError || !err?.statusCode) {
        // Simulate upload network progress
        for (let p = 20; p <= 100; p += 20) {
          if (options.onUploadProgress) options.onUploadProgress(p);
          await new Promise((r) => setTimeout(r, 80));
        }

        const newId = `upl-${Date.now().toString().slice(-4)}`;
        const newUpload: UploadItem = {
          _id: newId,
          filename: options.videoFile.name,
          originalFilename: options.videoFile.name,
          status: 'processing',
          detectionCount: 0,
          createdAt: new Date().toISOString(),
          fileSize: options.videoFile.size,
          isDemo: true,
        };

        const currentUploads = getStoredMockUploads();
        currentUploads.unshift(newUpload);
        saveStoredMockUploads(currentUploads);
        return newUpload;
      }
      throw err;
    }
  },

  initiateDirectUpload: async (filename: string, fileType: string): Promise<DirectUploadInitiateResponse> => {
    const response = await apiClient.post<any>(API_ENDPOINTS.UPLOADS.INITIATE, {
      filename,
      fileType,
    });
    return response.data?.data || response.data;
  },

  completeDirectUpload: async (uploadId: string): Promise<UploadItem> => {
    const response = await apiClient.post<any>(API_ENDPOINTS.UPLOADS.COMPLETE(uploadId));
    const data = response.data?.data || response.data;
    return data.upload || data;
  },

  deleteUpload: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(API_ENDPOINTS.UPLOADS.DETAIL(id));
    } catch (err: any) {
      if (err?.isNetworkError || !err?.statusCode) {
        const currentUploads = getStoredMockUploads();
        const updated = currentUploads.filter((u) => u._id !== id);
        saveStoredMockUploads(updated);
        return;
      }
      throw err;
    }
  },
};
