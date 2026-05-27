/**
 * AuthContext.tsx
 *
 * Provides global auth state to the entire app:
 *   - Persists session across app restarts (SecureStore)
 *   - Biometric authentication (Face ID / Fingerprint)
 *   - Wires the force-logout callback into the Axios client
 */

import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { authApi } from '../api/authApi';
import { setForceLogoutHandler } from '../api/client';
import { SecureStorage } from '../storage/secureStore';
import { LoginRequest, RegisterRequest, User } from '../types';

// ── State ──────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isLoading: boolean;      // true while restoring session on startup
  isAuthenticated: boolean;
}

type AuthAction =
  | { type: 'SET_USER'; payload: User }
  | { type: 'CLEAR_USER' }
  | { type: 'SET_LOADING'; payload: boolean };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: true, isLoading: false };
    case 'CLEAR_USER':
      return { user: null, isAuthenticated: false, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
  }
}

// ── Context Shape ─────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  biometricLogin: () => Promise<boolean>;
  isBiometricAvailable: () => Promise<boolean>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // ── Restore session on startup ─────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const [user, accessToken] = await Promise.all([
          SecureStorage.getUser(),
          SecureStorage.getAccessToken(),
        ]);

        if (user && accessToken) {
          dispatch({ type: 'SET_USER', payload: user });
        } else {
          dispatch({ type: 'CLEAR_USER' });
        }
      } catch {
        dispatch({ type: 'CLEAR_USER' });
      }
    })();
  }, []);

  // ── Wire force-logout into Axios client ───────────────────────────────────

  const forceLogout = useCallback(async () => {
    await SecureStorage.clearAll();
    dispatch({ type: 'CLEAR_USER' });
  }, []);

  useEffect(() => {
    setForceLogoutHandler(forceLogout);
  }, [forceLogout]);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const login = async (credentials: LoginRequest) => {
    const response = await authApi.login(credentials);
    const user: User = {
      userId: response.userId,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      role: response.role,
      familyId: response.familyId,
      familyName: response.familyName,
      inviteCode: response.inviteCode,
    };
    await SecureStorage.saveTokens(response.accessToken, response.refreshToken);
    await SecureStorage.saveUser(user);
    dispatch({ type: 'SET_USER', payload: user });
  };

  const register = async (data: RegisterRequest) => {
    const response = await authApi.register(data);
    const user: User = {
      userId: response.userId,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      role: response.role,
      familyId: response.familyId,
      familyName: response.familyName,
      inviteCode: response.inviteCode, // admins get invite code back
    };
    await SecureStorage.saveTokens(response.accessToken, response.refreshToken);
    await SecureStorage.saveUser(user);
    dispatch({ type: 'SET_USER', payload: user });
  };

  const logout = async () => {
    try {
      const refreshToken = await SecureStorage.getRefreshToken();
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // Swallow errors — always clear local state
    } finally {
      await SecureStorage.clearAll();
      dispatch({ type: 'CLEAR_USER' });
    }
  };

  // ── Biometric helpers ──────────────────────────────────────────────────────

  /**
   * Check if the device supports biometrics AND has enrolled biometrics.
   * Returns true only if both are true.
   */
  const isBiometricAvailable = async (): Promise<boolean> => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  };

  /**
   * Prompt biometric authentication. On success, restore the stored session.
   * Returns true if authentication succeeded.
   */
  const biometricLogin = async (): Promise<boolean> => {
    const available = await isBiometricAvailable();
    if (!available) return false;

    const biometricEnabled = await SecureStorage.isBiometricEnabled();
    if (!biometricEnabled) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock FamilyVault',
      fallbackLabel: 'Use Password',
      disableDeviceFallback: false,
    });

    if (!result.success) return false;

    // Session is already in SecureStore — just restore it
    const [user, accessToken] = await Promise.all([
      SecureStorage.getUser(),
      SecureStorage.getAccessToken(),
    ]);

    if (user && accessToken) {
      dispatch({ type: 'SET_USER', payload: user });
      return true;
    }
    return false;
  };

  const setBiometricEnabled = async (enabled: boolean) => {
    await SecureStorage.setBiometricEnabled(enabled);
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        biometricLogin,
        isBiometricAvailable,
        setBiometricEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
