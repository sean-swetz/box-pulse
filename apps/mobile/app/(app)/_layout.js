import { View } from 'react-native';
import { Stack } from 'expo-router';
import BottomNav from '../../components/BottomNav';

export default function AppLayout() {
  return (
    <View className="flex-1">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="dashboard" options={{ animation: 'none' }} />
        <Stack.Screen name="checkin" options={{ animation: 'none' }} />
        <Stack.Screen name="leaderboard" options={{ animation: 'none' }} />
        <Stack.Screen name="chat" options={{ animation: 'none' }} />
        <Stack.Screen name="profile" options={{ animation: 'none' }} />
        <Stack.Screen name="recipes" options={{ animation: 'none' }} />
        <Stack.Screen name="announcements" options={{ animation: 'none' }} />
        <Stack.Screen name="admin" />
        <Stack.Screen name="coach-dashboard" />
        <Stack.Screen name="reports" />
      </Stack>
      <BottomNav />
    </View>
  );
}
