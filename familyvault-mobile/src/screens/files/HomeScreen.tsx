import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useFiles } from '../../hooks/useFiles';
import { FileMetadata } from '../../types';
import { fileIcon, formatDate, formatFileSize } from '../../utils/formatters';
import { fileApi } from '../../api/fileApi';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-file-system';

export default function HomeScreen() {
  const { user } = useAuth();
  const { files, isLoading, error, fetchFiles, deleteFile } = useFiles();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDelete = useCallback(
    (item: FileMetadata) => {
      const isOwn = item.uploadedByEmail === user?.email;
      const canDelete = isOwn || user?.role === 'ADMIN';
      if (!canDelete) {
        Alert.alert('Permission denied', 'Only admins can delete other members\' files.');
        return;
      }
      Alert.alert(
        'Delete file',
        `Delete "${item.originalName}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete', style: 'destructive',
            onPress: async () => {
              setDeletingId(item.id);
              await deleteFile(item.id);
              setDeletingId(null);
            },
          },
        ],
      );
    },
    [user, deleteFile],
  );

  const handleDownload = useCallback(async (item: FileMetadata) => {
    try {
      const url = fileApi.getDownloadUrl(item.id);
      // Download to the app's cache directory, then share/open
      const localUri = `${FileSystem.cacheDirectory}${item.originalName}`;
      const { uri } = await FileSystem.downloadAsync(url, localUri);
      // Use Sharing to open with the system share sheet
      await (Sharing as any).shareAsync(uri, {
        mimeType: item.contentType,
        dialogTitle: item.originalName,
      });
    } catch {
      Alert.alert('Download failed', 'Could not download the file. Please try again.');
    }
  }, []);

  const renderItem = ({ item }: { item: FileMetadata }) => (
    <Pressable
      style={styles.fileCard}
      onPress={() => handleDownload(item)}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.fileIconWrap}>
        <Ionicons name={fileIcon(item.contentType) as any} size={26} color="#6C63FF" />
      </View>
      <View style={styles.fileMeta}>
        <Text style={styles.fileName} numberOfLines={1}>{item.originalName}</Text>
        <Text style={styles.fileInfo}>
          {formatFileSize(item.size)} · {item.uploadedBy} · {formatDate(item.createdAt)}
        </Text>
      </View>
      {deletingId === item.id ? (
        <ActivityIndicator size="small" color="#6C63FF" />
      ) : (
        <Ionicons name="chevron-forward-outline" size={18} color="#2D2B55" />
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Family banner */}
      <View style={styles.banner}>
        <Ionicons name="people-outline" size={18} color="#A7A9BE" />
        <Text style={styles.bannerText}>{user?.familyName}</Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={16} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={files}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={files.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchFiles}
            tintColor="#6C63FF"
            colors={['#6C63FF']}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="cloud-outline" size={64} color="#2D2B55" />
              <Text style={styles.emptyTitle}>No files yet</Text>
              <Text style={styles.emptySubtitle}>Upload a file from the Upload tab to get started.</Text>
            </View>
          ) : null
        }
      />

      <Text style={styles.hint}>Tap to download · Long press to delete</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0E17' },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
  bannerText: { fontSize: 13, color: '#A7A9BE', fontWeight: '500' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2D1B1B', padding: 12, marginHorizontal: 16, marginTop: 8, borderRadius: 8,
  },
  errorText: { color: '#FF6B6B', fontSize: 13, flex: 1 },
  listContent: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1 },
  fileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1A1A2E', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#2D2B55',
  },
  fileIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#0F0E17', justifyContent: 'center', alignItems: 'center',
  },
  fileMeta: { flex: 1 },
  fileName: { fontSize: 15, fontWeight: '600', color: '#FFFFFE', marginBottom: 3 },
  fileInfo: { fontSize: 12, color: '#A7A9BE' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#FFFFFE' },
  emptySubtitle: { fontSize: 14, color: '#A7A9BE', textAlign: 'center', paddingHorizontal: 40 },
  hint: { textAlign: 'center', fontSize: 11, color: '#2D2B55', padding: 8 },
});
