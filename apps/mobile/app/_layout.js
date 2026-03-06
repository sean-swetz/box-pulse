import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/authStore';
import { registerForPushNotifications } from '../lib/notifications';
import { initializeSocket, disconnectSocket } from '../lib/socket';
import '../global.css';

export default function RootLayout() {
  const loadAuth = useAuthStore((state) => state.loadAuth);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    loadAuth();
  }, []);

  useEffect(() => {
    if (token) {
      registerForPushNotifications();
      initializeSocket(token);
    } else {
      disconnectSocket();
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
