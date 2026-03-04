import { View } from 'react-native';
import { Stack } from 'expo-router';
import BottomNav from '../../components/BottomNav';

export default function AppLayout() {
  return (
    <View className="flex-1">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="checkin" />
        <Stack.Screen name="leaderboard" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="coach-dashboard" />
        <Stack.Screen name="recipes" />
        <Stack.Screen name="reports" />
      </Stack>
      <BottomNav />
    </View>
  );
}
