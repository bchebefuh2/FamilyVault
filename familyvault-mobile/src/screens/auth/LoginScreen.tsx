import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { extractErrorMessage } from '../../utils/formatters';
import { AuthStackParamList } from '../../types';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

export default function LoginScreen({ navigation }: Props) {
  const { login, biometricLogin, isBiometricAvailable } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      // Auto-prompt biometrics if available and user has enabled it
      if (available) {
        await biometricLogin();
      }
    })();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setIsLoading(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch (err) {
      Alert.alert('Login failed', extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometric = async () => {
    const success = await biometricLogin();
    if (!success) {
      Alert.alert('Biometric failed', 'Could not verify your identity. Please log in with your password.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Logo / Header */}
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={52} color="#6C63FF" />
          <Text style={styles.title}>FamilyVault</Text>
          <Text style={styles.subtitle}>Your private family space</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#A7A9BE"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Your password"
                placeholderTextColor="#A7A9BE"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#A7A9BE"
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.primaryBtn, isLoading && styles.disabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFE" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign In</Text>
            )}
          </Pressable>

          {/* Biometric login — only shown if device supports it */}
          {biometricAvailable && (
            <Pressable style={styles.biometricBtn} onPress={handleBiometric}>
              <Ionicons name="finger-print-outline" size={22} color="#6C63FF" />
              <Text style={styles.biometricText}>Use Face ID / Fingerprint</Text>
            </Pressable>
          )}
        </View>

        {/* Register link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Create one</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0E17' },
  inner: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 30, fontWeight: '700', color: '#FFFFFE', marginTop: 12 },
  subtitle: { fontSize: 15, color: '#A7A9BE', marginTop: 4 },
  form: { gap: 18 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '500', color: '#A7A9BE' },
  input: {
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2D2B55',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#FFFFFE',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { position: 'absolute', right: 14 },
  primaryBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFE' },
  disabled: { opacity: 0.6 },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2D2B55',
    borderRadius: 12,
  },
  biometricText: { fontSize: 15, color: '#6C63FF', fontWeight: '500' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 36 },
  footerText: { color: '#A7A9BE', fontSize: 14 },
  footerLink: { color: '#6C63FF', fontSize: 14, fontWeight: '600' },
});
