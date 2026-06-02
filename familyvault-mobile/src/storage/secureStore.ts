/**
 * SecureStorage — all sensitive data wrapper
 *
 * Uses Expo SecureStore which maps to:
 *   iOS  → Keychain Services (hardware-backed on modern iPhones)
 *   Android → Android Keystore + EncryptedSharedPreferences
 *
 * NEVER store tokens in AsyncStorage — it is unencrypted plain text.
 */

import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

const KEYS = {
  ACCESS_TOKEN: 'fv_access_token',
  REFRESH_TOKEN: 'fv_refresh_token',
  USER_DATA: 'fv_user_data',
  BIOMETRIC_ENABLED: 'fv_biometric_enabled',
} as const;

export const SecureStorage = {
  // ── Tokens ────────────────────────────────────────────────────────────────

  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken),
    ]);
  },

  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  },

  async updateAccessToken(accessToken: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken);
  },

  // ── User ──────────────────────────────────────────────────────────────────

  async saveUser(user: User): Promise<void> {
    await SecureStore.setItemAsync(KEYS.USER_DATA, JSON.stringify(user));
  },

  async getUser(): Promise<User | null> {
    const raw = await SecureStore.getItemAsync(KEYS.USER_DATA);
    return raw ? (JSON.parse(raw) as User) : null;
  },

  // ── Biometrics ────────────────────────────────────────────────────────────

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(KEYS.BIOMETRIC_ENABLED, String(enabled));
  },

  async isBiometricEnabled(): Promise<boolean> {
    const val = await SecureStore.getItemAsync(KEYS.BIOMETRIC_ENABLED);
    return val === 'true';
  },

  // ── Cleanup ───────────────────────────────────────────────────────────────

  async clearAll(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(KEYS.USER_DATA),
      // Note: we intentionally keep BIOMETRIC_ENABLED so the user's
      // preference is remembered after re-login.
    ]);
  },
};
