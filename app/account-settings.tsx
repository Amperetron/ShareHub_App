import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';

export default function AccountSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Gate state
  const [password, setPassword] = useState('');
  const [gateError, setGateError] = useState('');
  const [verified, setVerified] = useState(false);
  const [gating, setGating] = useState(false);

  // Edit state
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [saving, setSaving] = useState('');

  const handleVerify = async () => {
    if (!password) { setGateError('Enter your password.'); return; }
    setGating(true);
    setGateError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('No user email found');

      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (error) throw error;
      setVerified(true);
      setUsername(user.user_metadata?.full_name || '');
      setAvatarUrl(user.user_metadata?.avatar_url || '');
      setPhone(user.user_metadata?.phone || '');
    } catch (error: any) {
      setGateError(error?.message || 'Wrong password. Try again.');
    } finally {
      setGating(false);
    }
  };

  const handleSavePhone = async () => {
    if (!phone.trim()) { Alert.alert('Validation', 'Phone number cannot be empty.'); return; }
    if (phone.replace(/\D/g, '').length < 10) { Alert.alert('Validation', 'Enter a valid phone number.'); return; }
    setSaving('phone');
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Not authenticated');
      await supabase.auth.updateUser({ data: { phone: phone.trim() } });
      // @ts-expect-error
      const { error } = await supabase.from('users').update({ phone: phone.trim() }).eq('id', userId);
      if (error) throw error;
      Alert.alert('Saved', 'Phone number updated.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not update phone number.');
    } finally {
      setSaving('');
    }
  };

  const handleSaveUsername = async () => {
    if (!username.trim()) { Alert.alert('Validation', 'Username cannot be empty.'); return; }
    setSaving('username');
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Not authenticated');
      // @ts-expect-error
      const { error } = await supabase.from('users').update({ full_name: username.trim() }).eq('id', userId);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: username.trim() } });
      Alert.alert('Saved', 'Username updated.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not update username.');
    } finally {
      setSaving('');
    }
  };

  const handleSavePassword = async () => {
    if (!newPassword) { Alert.alert('Validation', 'Enter a new password.'); return; }
    if (newPassword.length < 6) { Alert.alert('Validation', 'Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmNewPassword) { Alert.alert('Validation', 'Passwords do not match.'); return; }
    setSaving('password');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      Alert.alert('Saved', 'Password updated.');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not update password.');
    } finally {
      setSaving('');
    }
  };

  const handleSaveAvatar = async () => {
    const trimmed = avatarUrl.trim();
    if (!trimmed) { Alert.alert('Validation', 'Enter a profile picture URL.'); return; }
    setSaving('avatar');
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      // @ts-expect-error
      await supabase.from('users').update({ avatar_url: trimmed }).eq('id', userId);
      await supabase.auth.updateUser({ data: { avatar_url: trimmed } });
      Alert.alert('Saved', 'Profile picture updated.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not update avatar.');
    } finally {
      setSaving('');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your profile and data. You will be signed out. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = (await supabase.auth.getUser()).data.user?.id;
              if (userId) {
                await supabase.from('users').delete().eq('id', userId);
              }
              await supabase.auth.signOut();
              router.replace('/sign-in');
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Could not delete account.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {!verified ? (
          <View style={styles.gateCard}>
            <Text style={styles.gateTitle}>Enter Your Password</Text>
            <Text style={styles.gateDesc}>
              Verify your identity to access account settings.
            </Text>
            {gateError ? (
              <Text style={styles.gateError}>{gateError}</Text>
            ) : null}
            <TextInput
              style={[styles.input, gateError ? styles.inputError : null]}
              value={password}
              onChangeText={(v) => { setPassword(v); setGateError(''); }}
              placeholder="Current password"
              secureTextEntry
              autoFocus
            />
            <Pressable
              style={[styles.primaryBtn, gating && { opacity: 0.6 }]}
              onPress={handleVerify}
              disabled={gating}
            >
              {gating ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>Continue</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <>
            {/* Username */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Change Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Your display name"
                autoCapitalize="words"
              />
              <Pressable
                style={[styles.primaryBtn, saving === 'username' && { opacity: 0.6 }]}
                onPress={handleSaveUsername}
                disabled={saving === 'username'}
              >
                <Text style={styles.primaryBtnText}>
                  {saving === 'username' ? 'Saving...' : 'Save Username'}
                </Text>
              </Pressable>
            </View>

            {/* Phone Number */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Your phone number"
                keyboardType="phone-pad"
              />
              <Pressable
                style={[styles.primaryBtn, saving === 'phone' && { opacity: 0.6 }]}
                onPress={handleSavePhone}
                disabled={saving === 'phone'}
              >
                <Text style={styles.primaryBtnText}>
                  {saving === 'phone' ? 'Saving...' : 'Save Phone Number'}
                </Text>
              </Pressable>
            </View>

            {/* Password */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Change Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password (min 6 chars)"
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholder="Confirm new password"
                secureTextEntry
              />
              <Pressable
                style={[styles.primaryBtn, saving === 'password' && { opacity: 0.6 }]}
                onPress={handleSavePassword}
                disabled={saving === 'password'}
              >
                <Text style={styles.primaryBtnText}>
                  {saving === 'password' ? 'Saving...' : 'Save Password'}
                </Text>
              </Pressable>
            </View>

            {/* Profile Picture */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile Picture URL</Text>
              <TextInput
                style={styles.input}
                value={avatarUrl}
                onChangeText={setAvatarUrl}
                placeholder="https://example.com/avatar.jpg"
                autoCapitalize="none"
                keyboardType="url"
              />
              <Pressable
                style={[styles.primaryBtn, saving === 'avatar' && { opacity: 0.6 }]}
                onPress={handleSaveAvatar}
                disabled={saving === 'avatar'}
              >
                <Text style={styles.primaryBtnText}>
                  {saving === 'avatar' ? 'Saving...' : 'Save Picture'}
                </Text>
              </Pressable>
            </View>

            {/* Delete Account */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: '#dc2626' }]}>Danger Zone</Text>
              <Text style={styles.deleteDesc}>
                Once deleted, your profile and all data will be permanently removed.
              </Text>
              <Pressable style={styles.deleteBtn} onPress={handleDeleteAccount}>
                <Text style={styles.deleteBtnText}>Delete Account</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  backBtn: { paddingVertical: 4 },
  backText: { fontSize: FontSize.body, fontWeight: '600', color: Colors.primary },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.dark },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.xl },
  // Gate
  gateCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xxl, padding: Spacing.lg,
    gap: Spacing.md, marginTop: Spacing.xl,
  },
  gateTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.dark, textAlign: 'center' },
  gateDesc: { fontSize: FontSize.base, color: Colors.muted, textAlign: 'center' },
  gateError: { color: '#dc2626', fontSize: FontSize.base, textAlign: 'center' },
  // Section
  section: {
    backgroundColor: Colors.white, borderRadius: Radius.xxl, padding: Spacing.lg, gap: Spacing.md,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.dark, marginBottom: Spacing.xs },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.md, fontSize: FontSize.base, backgroundColor: Colors.inputBg,
  },
  inputError: { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
  primaryBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md,
    alignItems: 'center', marginTop: Spacing.xs,
  },
  primaryBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '600' },
  // Delete
  deleteDesc: { fontSize: FontSize.base, color: Colors.muted, lineHeight: 20 },
  deleteBtn: {
    borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: '#dc2626',
  },
  deleteBtnText: { color: '#dc2626', fontSize: FontSize.base, fontWeight: '600' },
});
