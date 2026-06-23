import React, { useState, useCallback } from 'react';
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
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
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

  const [uploadingImage, setUploadingImage] = useState(false);

  const decodeBase64 = (base64: string): ArrayBuffer => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const bufferLength = base64.length * 0.75;
    const len = base64.length;
    let p = 0;
    let j = 0;
    if (base64[len - 1] === '=') {
      p++;
      if (base64[len - 2] === '=') p++;
    }
    const arrayBuffer = new ArrayBuffer(bufferLength - p);
    const bytes = new Uint8Array(arrayBuffer);
    for (let i = 0; i < len; i += 4) {
      const encoded1 = chars.indexOf(base64[i]);
      const encoded2 = chars.indexOf(base64[i + 1]);
      const encoded3 = chars.indexOf(base64[i + 2]);
      const encoded4 = chars.indexOf(base64[i + 3]);
      const bytes1 = (encoded1 << 2) | (encoded2 >> 4);
      const bytes2 = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      const bytes3 = ((encoded3 & 3) << 6) | (encoded4 & 63);
      bytes[j++] = bytes1;
      if (encoded3 !== -1 && base64[i + 2] !== '=') {
        bytes[j++] = bytes2;
      }
      if (encoded4 !== -1 && base64[i + 3] !== '=') {
        bytes[j++] = bytes3;
      }
    }
    return arrayBuffer;
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'We need permission to access your library to upload a picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      setUploadingImage(true);
      const uri = result.assets[0].uri;
      
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      const arrayBuffer = decodeBase64(base64);
      
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error } = await supabase.storage
        .from('tools')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          upsert: true
        });

      if (error) {
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from('tools')
        .getPublicUrl(filePath);

      await handleSaveAvatar(urlData.publicUrl);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Upload failed', err.message || 'An error occurred during image upload.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveAvatar = async (url: string) => {
    setSaving('avatar');
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      // @ts-expect-error
      await supabase.from('users').update({ avatar_url: url }).eq('id', userId);
      await supabase.auth.updateUser({ data: { avatar_url: url } });
      setAvatarUrl(url);
      Alert.alert('Saved', 'Profile picture updated.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not update avatar.');
    } finally {
      setSaving('');
    }
  };

  const handleRemoveAvatar = async () => {
    setSaving('avatar');
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      // @ts-expect-error
      await supabase.from('users').update({ avatar_url: null }).eq('id', userId);
      await supabase.auth.updateUser({ data: { avatar_url: null } });
      setAvatarUrl('');
      Alert.alert('Saved', 'Profile picture removed.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not remove profile picture.');
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
              <Text style={styles.sectionTitle}>Profile Picture</Text>
              <View style={styles.avatarContainer}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarPreview}
                  />
                ) : (
                  <View style={[styles.avatarPreview, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarPlaceholderText}>No Image</Text>
                  </View>
                )}
              </View>
              <Pressable
                style={[styles.primaryBtn, (uploadingImage || saving === 'avatar') && { opacity: 0.6 }]}
                onPress={handlePickImage}
                disabled={uploadingImage || saving === 'avatar'}
              >
                {uploadingImage || saving === 'avatar' ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {avatarUrl ? 'Change Profile Picture' : 'Upload Profile Picture'}
                  </Text>
                )}
              </Pressable>
              {avatarUrl ? (
                <Pressable
                  style={[styles.removeBtn, saving === 'avatar' && { opacity: 0.6 }]}
                  onPress={handleRemoveAvatar}
                  disabled={saving === 'avatar'}
                >
                  <Text style={styles.removeBtnText}>Remove Profile Picture</Text>
                </Pressable>
              ) : null}
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
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md,
  },
  avatarPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surfaceAlt,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  avatarPlaceholderText: {
    color: Colors.muted,
    fontSize: FontSize.base,
    fontWeight: '500',
  },
  removeBtn: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dc2626',
    marginTop: Spacing.sm,
  },
  removeBtnText: {
    color: '#dc2626',
    fontSize: FontSize.base,
    fontWeight: '600',
  },
});
