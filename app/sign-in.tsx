import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { signInWithEmail } from '../lib/api';

function friendlyAuthError(error: any): string {
  const msg = typeof error === 'string' ? error : error?.message ?? JSON.stringify(error);
  if (msg.includes('Invalid login credentials')) return 'Invalid email or password.';
  if (msg.includes('Email not confirmed')) return 'Please verify your email before signing in.';
  if (msg.includes('Invalid email')) return 'Please enter a valid email address.';
  if (msg.includes('Too many requests')) return 'Too many attempts. Please try again later.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Network error. Check your connection.';
  return msg;
}

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  function validate() {
    const errors = { email: '', password: '' };
    if (!email.trim()) errors.email = 'Email is required.';
    else if (!email.includes('@')) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Password is required.';
    setFieldErrors(errors);
    return !errors.email && !errors.password;
  }

  const handleSignIn = async () => {
    setErrorMessage('');
    if (!validate()) return;

    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      router.replace('/(tabs)');
    } catch (error) {
      setErrorMessage(friendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    router.push('/sign-up');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerCenter}>
          <Image
            source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:51.png' }}
            style={{ width: 24, height: 24 }}
            resizeMode="contain"
          />
          <Text style={styles.headerBrand}>ShareHub</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your ShareHub account</Text>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, fieldErrors.email ? styles.inputError : null]}
              value={email}
              onChangeText={(v) => { setEmail(v); setErrorMessage(''); setFieldErrors((p) => ({ ...p, email: '' })); }}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, fieldErrors.password ? styles.inputError : null]}
              value={password}
              onChangeText={(v) => { setPassword(v); setErrorMessage(''); setFieldErrors((p) => ({ ...p, password: '' })); }}
              placeholder="Enter your password"
              secureTextEntry
            />
            {fieldErrors.password ? <Text style={styles.fieldError}>{fieldErrors.password}</Text> : null}
          </View>

          <TouchableOpacity style={[styles.button, loading && { opacity: 0.6 }]} onPress={handleSignIn} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.white,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarBorder: {
    width: 32, height: 32, borderRadius: Radius.full, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm,
  },
  avatarImg: { width: 28, height: 28, borderRadius: Radius.full },
  headerBrand: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.primary },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg },
  formContainer: { paddingTop: Spacing.xl },
  title: { fontSize: FontSize.h1, fontWeight: 'bold', color: Colors.dark, textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.body, color: Colors.muted, textAlign: 'center', marginBottom: Spacing.xl },
  errorBanner: {
    backgroundColor: '#fef2f2', borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: '#fecaca', marginBottom: Spacing.lg,
  },
  errorBannerText: { color: '#991b1b', fontSize: FontSize.base, textAlign: 'center' },
  inputContainer: { marginBottom: Spacing.lg },
  label: { fontSize: FontSize.base, fontWeight: '500', color: Colors.dark, marginBottom: Spacing.sm },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.md, fontSize: FontSize.base, backgroundColor: Colors.inputBg,
  },
  inputError: { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
  fieldError: { color: '#dc2626', fontSize: 13, marginTop: 4 },
  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md,
    alignItems: 'center', marginTop: Spacing.md,
  },
  buttonText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '600' },
  signUpContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  signUpText: { fontSize: FontSize.base, color: Colors.muted },
  signUpLink: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
});
