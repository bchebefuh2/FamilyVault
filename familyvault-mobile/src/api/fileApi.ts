import apiClient from './client';
import { FileMetadata } from '../types';

export const fileApi = {
  /** List all non-deleted files for the user's family */
  listFiles: () =>
    apiClient.get<FileMetadata[]>('/api/files').then((r) => r.data),

  /**
   * Upload a file using multipart/form-data.
   * onUploadProgress lets us show a progress bar to the user.
   */
  uploadFile: (
    uri: string,
    name: string,
    mimeType: string,
    onUploadProgress?: (percent: number) => void,
  ) => {
    const formData = new FormData();
    // React Native's FormData accepts {uri, name, type} for file blobs
    formData.append('file', { uri, name, type: mimeType } as unknown as Blob);

    return apiClient.post<FileMetadata>('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (evt.total && onUploadProgress) {
          onUploadProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      },
    }).then((r) => r.data);
  },

  /** Returns the download URL (presigned in Phase 4, direct stream for now) */
  getDownloadUrl: (fileId: string) =>
    `${apiClient.defaults.baseURL}/api/files/${fileId}/download`,

  /** Soft-delete a file */
  deleteFile: (fileId: string) =>
    apiClient.delete(`/api/files/${fileId}`),
};
