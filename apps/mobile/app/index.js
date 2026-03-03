import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { user, token, selectedGym } = useAuthStore();

  if (!user || !token) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!selectedGym) {
    return <Redirect href="/gym-select" />;
  }

  return <Redirect href="/(app)/dashboard" />;
}
