import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { signUpWithEmail } from '../lib/api';

function friendlyAuthError(error: any): string {
  const msg = typeof error === 'string' ? error : error?.message ?? JSON.stringify(error);
  if (msg.includes('User already registered')) return 'An account with this email already exists.';
  if (msg.includes('Password should be at least 6 characters')) return 'Password must be at least 6 characters.';
  if (msg.includes('Invalid email')) return 'Please enter a valid email address.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Network error. Check your connection.';
  return msg;
}

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  function clearError(field: string) {
    setErrorMessage('');
    setFieldErrors((p) => ({ ...p, [field]: '' }));
  }

  function validate() {
    const errors = { name: '', email: '', phone: '', password: '', confirmPassword: '' };
    if (!name.trim()) errors.name = 'Full name is required.';
    if (!email.trim()) errors.email = 'Email is required.';
    else if (!email.includes('@')) errors.email = 'Enter a valid email address.';
    if (!phone.trim()) errors.phone = 'Phone number is required.';
    else if (phone.replace(/\D/g, '').length < 10) errors.phone = 'Enter a valid phone number.';
    if (!password) errors.password = 'Password is required.';
    else if (password.length < 6) errors.password = 'Password must be at least 6 characters.';
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    setFieldErrors(errors);
    return !Object.values(errors).some(Boolean);
  }

  const handleSignUp = async () => {
    setErrorMessage('');
    if (!validate()) return;

    setLoading(true);
    try {
      const data = await signUpWithEmail(name.trim(), email.trim(), password, phone.trim());

      if (!data.session) {
        Alert.alert(
          'Confirm your email',
          'Your account was created. Please verify your email, then sign in.'
        );
        router.replace('/sign-in');
        return;
      }

      router.replace('/(tabs)');
    } catch (error) {
      setErrorMessage(friendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('/sign-in');
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
          <Text style={styles.title}>Join ShareHub</Text>
          <Text style={styles.subtitle}>Create your account to get started</Text>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[styles.input, fieldErrors.name ? styles.inputError : null]}
              value={name}
              onChangeText={(v) => { setName(v); clearError('name'); }}
              placeholder="Enter your full name"
              autoCapitalize="words"
            />
            {fieldErrors.name ? <Text style={styles.fieldError}>{fieldErrors.name}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, fieldErrors.email ? styles.inputError : null]}
              value={email}
              onChangeText={(v) => { setEmail(v); clearError('email'); }}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, fieldErrors.phone ? styles.inputError : null]}
              value={phone}
              onChangeText={(v) => { setPhone(v); clearError('phone'); }}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />
            {fieldErrors.phone ? <Text style={styles.fieldError}>{fieldErrors.phone}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, fieldErrors.password ? styles.inputError : null]}
              value={password}
              onChangeText={(v) => { setPassword(v); clearError('password'); }}
              placeholder="Create a password (min 6 characters)"
              secureTextEntry
            />
            {fieldErrors.password ? <Text style={styles.fieldError}>{fieldErrors.password}</Text> : null}
            {password.length > 0 && password.length < 6 ? (
              <Text style={styles.passwordHint}>Must be at least 6 characters ({password.length}/6)</Text>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={[styles.input, fieldErrors.confirmPassword ? styles.inputError : null]}
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); clearError('confirmPassword'); }}
              placeholder="Confirm your password"
              secureTextEntry
            />
            {fieldErrors.confirmPassword ? <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text> : null}
          </View>

          <TouchableOpacity style={[styles.button, loading && { opacity: 0.6 }]} onPress={handleSignUp} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Sign Up'}</Text>
          </TouchableOpacity>

          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleSignIn}>
              <Text style={styles.signInLink}>Sign In</Text>
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
  passwordHint: { color: '#9ca3af', fontSize: 12, marginTop: 4 },
  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md,
    alignItems: 'center', marginTop: Spacing.md,
  },
  buttonText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '600' },
  signInContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  signInText: { fontSize: FontSize.base, color: Colors.muted },
  signInLink: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
});
