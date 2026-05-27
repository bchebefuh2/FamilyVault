/** Human-readable file size: 1048576 → "1.0 MB" */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

/** ISO date → "May 26, 2026" */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Returns an icon name from @expo/vector-icons Ionicons based on MIME type */
export function fileIcon(contentType: string | null): string {
  if (!contentType) return 'document-outline';
  if (contentType.startsWith('image/')) return 'image-outline';
  if (contentType.startsWith('video/')) return 'videocam-outline';
  if (contentType.startsWith('audio/')) return 'musical-notes-outline';
  if (contentType.includes('pdf')) return 'document-text-outline';
  if (contentType.includes('zip') || contentType.includes('compressed')) return 'archive-outline';
  return 'document-outline';
}

/** Extracts a user-friendly error message from an Axios error */
export function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { detail?: string; title?: string } } };
    return axiosError.response?.data?.detail
      ?? axiosError.response?.data?.title
      ?? 'Something went wrong.';
  }
  return 'Network error. Please check your connection.';
}
