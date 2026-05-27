import React, { useEffect, useState } from 'react';
import {
  Alert,
  Clipboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { SecureStorage } from '../../storage/secureStore';

export default function ProfileScreen() {
  const { user, logout, isBiometricAvailable, setBiometricEnabled } = useAuth();
  const [biometricOn, setBiometricOn] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    (async () => {
      const [supported, enabled] = await Promise.all([
        isBiometricAvailable(),
        SecureStorage.isBiometricEnabled(),
      ]);
      setBiometricSupported(supported);
      setBiometricOn(enabled);
    })();
  }, []);

  const toggleBiometric = async (value: boolean) => {
    setBiometricOn(value);
    await setBiometricEnabled(value);
  };

  const copyInviteCode = () => {
    if (user?.inviteCode) {
      Clipboard.setString(user.inviteCode);
      Alert.alert('Copied!', 'Invite code copied to clipboard. Share it with your family.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out', style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await logout();
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
          </Text>
        </View>
        <Text style={styles.fullName}>{user.firstName} {user.lastName}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.roleBadge}>
          <Ionicons
            name={user.role === 'ADMIN' ? 'shield-checkmark' : 'person-outline'}
            size={13} color={user.role === 'ADMIN' ? '#6C63FF' : '#A7A9BE'}
          />
          <Text style={[styles.roleText, user.role === 'ADMIN' && styles.adminText]}>
            {user.role === 'ADMIN' ? 'Family Admin' : 'Family Member'}
          </Text>
        </View>
      </View>

      {/* Family card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Family</Text>
        <Row icon="home-outline" label="Name" value={user.familyName} />
        <Row icon="people-outline" label="Your role" value={user.role === 'ADMIN' ? 'Administrator' : 'Member'} />
      </View>

      {/* Invite code — admin only */}
      {user.role === 'ADMIN' && user.inviteCode && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invite code</Text>
          <Text style={styles.cardSubtitle}>Share this code with family members so they can join.</Text>
          <Pressable style={styles.inviteRow} onPress={copyInviteCode}>
            <Text style={styles.inviteCode}>{user.inviteCode}</Text>
            <Ionicons name="copy-outline" size={20} color="#6C63FF" />
          </Pressable>
        </View>
      )}

      {/* Security */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Security</Text>
        {biometricSupported ? (
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="finger-print-outline" size={20} color="#A7A9BE" />
              <Text style={styles.settingLabel}>Face ID / Fingerprint</Text>
            </View>
            <Switch
              value={biometricOn}
              onValueChange={toggleBiometric}
              trackColor={{ false: '#2D2B55', true: '#6C63FF' }}
              thumbColor="#FFFFFE"
            />
          </View>
        ) : (
          <Row icon="finger-print-outline" label="Biometrics" value="Not available on this device" />
        )}
        <Row icon="shield-checkmark-outline" label="Token storage" value="iOS Keychain / Android Keystore" />
        <Row icon="refresh-outline" label="Token refresh" value="Auto, 15-min expiry" />
      </View>

      {/* Logout */}
      <Pressable
        style={[styles.logoutBtn, loggingOut && styles.disabled]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
        <Text style={styles.logoutText}>{loggingOut ? 'Logging out…' : 'Log out'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon as any} size={18} color="#A7A9BE" />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0E17' },
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#FFFFFE' },
  fullName: { fontSize: 22, fontWeight: '700', color: '#FFFFFE', marginTop: 4 },
  email: { fontSize: 14, color: '#A7A9BE' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 6, backgroundColor: '#1A1A2E', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  roleText: { fontSize: 12, fontWeight: '500', color: '#A7A9BE' },
  adminText: { color: '#6C63FF' },
  card: {
    backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#2D2B55', gap: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#A7A9BE', textTransform: 'uppercase', letterSpacing: 0.6 },
  cardSubtitle: { fontSize: 12, color: '#A7A9BE', marginTop: -6 },
  inviteRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0F0E17', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#6C63FF',
  },
  inviteCode: { fontSize: 24, fontWeight: '700', color: '#6C63FF', letterSpacing: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 14, color: '#A7A9BE', flex: 1 },
  rowValue: { fontSize: 13, color: '#FFFFFE', fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingLabel: { fontSize: 14, color: '#FFFFFE' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2D1B1B', borderRadius: 14, paddingVertical: 15,
    borderWidth: 1, borderColor: '#4D1B1B',
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#FF6B6B' },
  disabled: { opacity: 0.6 },
});
