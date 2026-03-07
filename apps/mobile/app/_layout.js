import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../global.css';
import { useAuthStore } from '../store/authStore';
import { registerForPushNotifications } from '../lib/notifications';

export default function RootLayout() {
  const { loadAuth, token } = useAuthStore();

  useEffect(() => {
    loadAuth();
  }, []);

  useEffect(() => {
    if (token) {
      registerForPushNotifications();
    }
  }, [token]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="gym-select" />
      </Stack>
    </>
  );
}
