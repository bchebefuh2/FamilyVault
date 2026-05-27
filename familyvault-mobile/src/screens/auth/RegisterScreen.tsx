import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'> };

type Mode = 'create' | 'join';

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();

  const [mode, setMode] = useState<Mode>('create');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    if (mode === 'create' && !familyName.trim()) {
      Alert.alert('Missing field', 'Please enter a family name.');
      return;
    }
    if (mode === 'join' && !inviteCode.trim()) {
      Alert.alert('Missing field', 'Please enter an invite code.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        familyName: mode === 'create' ? familyName.trim() : undefined,
        inviteCode: mode === 'join' ? inviteCode.trim().toUpperCase() : undefined,
      });
    } catch (err) {
      Alert.alert('Registration failed', extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={44} color="#6C63FF" />
          <Text style={styles.title}>Create Account</Text>
        </View>

        {/* Mode toggle — Create Family / Join Family */}
        <View style={styles.toggle}>
          {(['create', 'join'] as Mode[]).map((m) => (
            <Pressable
              key={m}
              style={[styles.toggleBtn, mode === m && styles.toggleActive]}
              onPress={() => setMode(m)}
            >
              <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                {m === 'create' ? 'Create Family' : 'Join Family'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Personal fields */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>First name</Text>
            <TextInput style={styles.input} placeholder="Jane" placeholderTextColor="#A7A9BE"
              value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Last name</Text>
            <TextInput style={styles.input} placeholder="Smith" placeholderTextColor="#A7A9BE"
              value={lastName} onChangeText={setLastName} autoCapitalize="words" />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="jane@example.com" placeholderTextColor="#A7A9BE"
            value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Min. 8 characters" placeholderTextColor="#A7A9BE"
              value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
            <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#A7A9BE" />
            </Pressable>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm password</Text>
          <TextInput style={styles.input} placeholder="Repeat password" placeholderTextColor="#A7A9BE"
            value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} />
        </View>

        {/* Family-specific field */}
        {mode === 'create' ? (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Family name</Text>
            <TextInput style={styles.input} placeholder="e.g. The Smiths" placeholderTextColor="#A7A9BE"
              value={familyName} onChangeText={setFamilyName} />
          </View>
        ) : (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Invite code</Text>
            <TextInput style={[styles.input, styles.codeInput]} placeholder="e.g. ABCD1234" placeholderTextColor="#A7A9BE"
              value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" maxLength={8} />
            <Text style={styles.hint}>Ask your family admin for the invite code.</Text>
          </View>
        )}

        <Pressable style={[styles.primaryBtn, isLoading && styles.disabled]} onPress={handleRegister} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#FFFFFE" /> :
            <Text style={styles.primaryBtnText}>{mode === 'create' ? 'Create Family' : 'Join Family'}</Text>}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0E17' },
  inner: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40, gap: 16 },
  header: { alignItems: 'center', marginBottom: 8, gap: 10 },
  title: { fontSize: 26, fontWeight: '700', color: '#FFFFFE' },
  toggle: { flexDirection: 'row', backgroundColor: '#1A1A2E', borderRadius: 12, padding: 4, gap: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleActive: { backgroundColor: '#6C63FF' },
  toggleText: { fontSize: 14, fontWeight: '500', color: '#A7A9BE' },
  toggleTextActive: { color: '#FFFFFE' },
  row: { flexDirection: 'row', gap: 12 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '500', color: '#A7A9BE' },
  input: {
    backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: '#2D2B55',
    borderRadius: 12, padding: 14, fontSize: 15, color: '#FFFFFE',
  },
  codeInput: { letterSpacing: 3, textAlign: 'center', fontSize: 18, fontWeight: '600' },
  hint: { fontSize: 12, color: '#A7A9BE', marginTop: 2 },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { position: 'absolute', right: 14 },
  primaryBtn: {
    backgroundColor: '#6C63FF', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 4,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFE' },
  disabled: { opacity: 0.6 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  footerText: { color: '#A7A9BE', fontSize: 14 },
  footerLink: { color: '#6C63FF', fontSize: 14, fontWeight: '600' },
});
