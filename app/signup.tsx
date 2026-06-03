import React from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import SignUp from '../components/SignUp';
import { signUpWithEmail } from '../lib/api';

const SignUpScreen = () => {
  const router = useRouter();

  const handleSignUp = async (email: string, password: string) => {
    try {
      const data = await signUpWithEmail('Neighbor', email.trim(), password);
      if (!data.session) {
        Alert.alert('Confirm your email', 'Your account was created. Please verify your email, then sign in.');
        router.replace('/sign-in');
        return;
      }
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Sign up failed', error instanceof Error ? error.message : JSON.stringify(error));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <SignUp onSignUp={handleSignUp} />
    </View>
  );
};

export default SignUpScreen;
