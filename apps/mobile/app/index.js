import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { user, token } = useAuthStore();

  if (!user || !token) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(app)/dashboard" />;
}
