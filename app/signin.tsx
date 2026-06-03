import React from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import SignIn from '../components/SignIn';
import { signInWithEmail } from '../lib/api';

const SignInScreen = () => {
  const router = useRouter();

  const handleSignIn = async (email: string, password: string) => {
    try {
      await signInWithEmail(email.trim(), password);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Sign in failed', error instanceof Error ? error.message : JSON.stringify(error));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <SignIn onSignIn={handleSignIn} />
    </View>
  );
};

export default SignInScreen;
