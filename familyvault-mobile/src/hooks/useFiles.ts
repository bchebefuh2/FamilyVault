import { useCallback, useState } from 'react';
import { fileApi } from '../api/fileApi';
import { FileMetadata } from '../types';
import { extractErrorMessage } from '../utils/formatters';

interface UseFilesReturn {
  files: FileMetadata[];
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  fetchFiles: () => Promise<void>;
  uploadFile: (uri: string, name: string, mimeType: string) => Promise<boolean>;
  deleteFile: (fileId: string) => Promise<boolean>;
}

export function useFiles(): UseFilesReturn {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fileApi.listFiles();
      setFiles(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadFile = useCallback(
    async (uri: string, name: string, mimeType: string): Promise<boolean> => {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      try {
        const newFile = await fileApi.uploadFile(uri, name, mimeType, (pct) => {
          setUploadProgress(pct);
        });
        // Prepend the new file so it appears at the top of the list
        setFiles((prev) => [newFile, ...prev]);
        return true;
      } catch (err) {
        setError(extractErrorMessage(err));
        return false;
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [],
  );

  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    setError(null);
    try {
      await fileApi.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      return true;
    } catch (err) {
      setError(extractErrorMessage(err));
      return false;
    }
  }, []);

  return {
    files,
    isLoading,
    isUploading,
    uploadProgress,
    error,
    fetchFiles,
    uploadFile,
    deleteFile,
  };
}
