import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFiles } from '../../hooks/useFiles';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../../types';

type Props = { navigation: BottomTabNavigationProp<MainTabParamList, 'Upload'> };

interface SelectedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export default function UploadScreen({ navigation }: Props) {
  const { uploadFile, isUploading, uploadProgress } = useFiles();
  const [selected, setSelected] = useState<SelectedFile | null>(null);

  // ── Pickers ──────────────────────────────────────────────────────────────────

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelected({
        uri: asset.uri,
        name: asset.fileName ?? `photo_${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize,
      });
    }
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelected({
        uri: asset.uri,
        name: `photo_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        size: asset.fileSize,
      });
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelected({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        size: asset.size,
      });
    }
  };

  // ── Upload ────────────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!selected) return;
    const success = await uploadFile(selected.uri, selected.name, selected.mimeType);
    if (success) {
      setSelected(null);
      Alert.alert('Uploaded!', `"${selected.name}" has been added to your family vault.`, [
        { text: 'View files', onPress: () => navigation.navigate('Files') },
        { text: 'Upload another', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Upload failed', 'Something went wrong. Please try again.');
    }
  };

  return (
    <View style={styles.container}>

      {/* Source buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose a source</Text>
        <View style={styles.sourceGrid}>
          <SourceButton icon="images-outline" label="Photo Library" onPress={pickFromGallery} />
          <SourceButton icon="camera-outline" label="Camera" onPress={pickFromCamera} />
          <SourceButton icon="document-outline" label="Files" onPress={pickDocument} />
        </View>
      </View>

      {/* Selected file preview */}
      {selected && (
        <View style={styles.preview}>
          <Ionicons name="document-attach-outline" size={32} color="#6C63FF" />
          <View style={styles.previewMeta}>
            <Text style={styles.previewName} numberOfLines={2}>{selected.name}</Text>
            {selected.size && (
              <Text style={styles.previewSize}>
                {(selected.size / 1024 / 1024).toFixed(2)} MB · {selected.mimeType}
              </Text>
            )}
          </View>
          <Pressable onPress={() => setSelected(null)}>
            <Ionicons name="close-circle-outline" size={22} color="#A7A9BE" />
          </Pressable>
        </View>
      )}

      {/* Progress bar */}
      {isUploading && (
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{uploadProgress}%</Text>
        </View>
      )}

      {/* Upload button */}
      <Pressable
        style={[styles.uploadBtn, (!selected || isUploading) && styles.disabled]}
        onPress={handleUpload}
        disabled={!selected || isUploading}
      >
        <Ionicons
          name={isUploading ? 'cloud-upload' : 'cloud-upload-outline'}
          size={22} color="#FFFFFE"
        />
        <Text style={styles.uploadBtnText}>
          {isUploading ? `Uploading… ${uploadProgress}%` : 'Upload to FamilyVault'}
        </Text>
      </Pressable>

      <Text style={styles.note}>Files are encrypted and only visible to your family members.</Text>
    </View>
  );
}

function SourceButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.sourceBtn} onPress={onPress}>
      <Ionicons name={icon as any} size={30} color="#6C63FF" />
      <Text style={styles.sourceBtnLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0E17', padding: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '500', color: '#A7A9BE', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  sourceGrid: { flexDirection: 'row', gap: 12 },
  sourceBtn: {
    flex: 1, backgroundColor: '#1A1A2E', borderRadius: 14,
    paddingVertical: 22, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#2D2B55',
  },
  sourceBtnLabel: { fontSize: 12, fontWeight: '500', color: '#A7A9BE' },
  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1A1A2E', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#6C63FF', marginBottom: 20,
  },
  previewMeta: { flex: 1 },
  previewName: { fontSize: 14, fontWeight: '600', color: '#FFFFFE' },
  previewSize: { fontSize: 12, color: '#A7A9BE', marginTop: 3 },
  progressWrap: { gap: 8, marginBottom: 20 },
  progressBg: { height: 6, backgroundColor: '#1A1A2E', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6C63FF', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#A7A9BE', textAlign: 'right' },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#6C63FF', borderRadius: 14, paddingVertical: 16,
  },
  uploadBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFE' },
  disabled: { opacity: 0.5 },
  note: { fontSize: 12, color: '#2D2B55', textAlign: 'center', marginTop: 20 },
});
