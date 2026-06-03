import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Colors, Radius, Spacing, FontSize } from '../constants/theme';

const DEFAULT_AVATAR = 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/b117e6a3283d05781cdb00ec910eb9c43edccf2a.jpg';

interface Props {
  avatarUrl?: string | null;
}

export default function HeaderMenu({ avatarUrl }: Props) {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    setVisible(false);
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.auth.signOut();
            router.replace('/sign-in');
          } catch {
            Alert.alert('Error', 'Could not logout. Please try again.');
          }
        },
      },
    ]);
  };

  const handleViewProfile = () => {
    setVisible(false);
    router.push('/profile');
  };

  return (
    <View>
      <Pressable onPress={() => setVisible(true)} style={styles.avatarBorder}>
        <Image
          source={{ uri: avatarUrl || DEFAULT_AVATAR }}
          style={styles.avatarImg}
          contentFit="cover"
        />
      </Pressable>

      <Modal visible={visible} transparent animationType="none" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <View style={styles.menu}>
            <Pressable style={styles.menuItem} onPress={handleViewProfile}>
              <Text style={styles.menuItemText}>View Profile</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.menuItem} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarBorder: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.primary,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  menu: {
    marginTop: 100,
    marginLeft: 16,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 160,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontSize: FontSize.base,
    color: Colors.dark,
    fontWeight: '600',
  },
  logoutText: {
    fontSize: FontSize.base,
    color: '#dc2626',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
});
