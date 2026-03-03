import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { CheckCircle, Trophy, MessageCircle, Settings } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';

export default function DashboardScreen() {
  const { user, selectedGym } = useAuthStore();
  const isAdmin = selectedGym?.role === 'owner' || selectedGym?.role === 'admin';

  return (
    <ScrollView className="flex-1 bg-background-dark">
      {/* Header */}
      <View className="bg-surface-dark px-6 pt-16 pb-6 border-b border-slate-700">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-3xl font-bold">Dashboard</Text>
            <Text className="text-slate-400 mt-1">{selectedGym?.name ?? 'Welcome back'}</Text>
          </View>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => router.push('/(app)/admin')}
              className="p-2 bg-primary/20 rounded-lg"
            >
              <Settings size={24} color="#0df259" strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View className="px-6 py-6">
        <Text className="text-white text-xl font-bold mb-4">Quick Actions</Text>
        
        <View className="gap-4">
          <TouchableOpacity className="bg-primary p-6 rounded-2xl">
            <View className="flex-row items-center gap-4">
              <CheckCircle size={32} color="#102216" strokeWidth={2} />
              <View className="flex-1">
                <Text className="text-background-dark font-bold text-lg">Check In</Text>
                <Text className="text-background-dark/70 text-sm">Submit this week's progress</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="bg-surface-dark p-6 rounded-2xl border border-slate-700">
            <View className="flex-row items-center gap-4">
              <Trophy size={32} color="#0df259" strokeWidth={2} />
              <View className="flex-1">
                <Text className="text-white font-bold text-lg">Leaderboard</Text>
                <Text className="text-slate-400 text-sm">See your ranking</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="bg-surface-dark p-6 rounded-2xl border border-slate-700">
            <View className="flex-row items-center gap-4">
              <MessageCircle size={32} color="#0df259" strokeWidth={2} />
              <View className="flex-1">
                <Text className="text-white font-bold text-lg">Team Chat</Text>
                <Text className="text-slate-400 text-sm">Connect with your team</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Grid */}
      <View className="px-6 pb-6">
        <Text className="text-white text-xl font-bold mb-4">Your Stats</Text>
        <View className="flex-row gap-4">
          <View className="flex-1 bg-surface-dark p-5 rounded-xl border border-slate-700">
            <Text className="text-slate-400 text-xs uppercase mb-2">Total Points</Text>
            <Text className="text-white text-3xl font-bold">1,240</Text>
          </View>
          <View className="flex-1 bg-surface-dark p-5 rounded-xl border border-slate-700">
            <Text className="text-slate-400 text-xs uppercase mb-2">Rank</Text>
            <Text className="text-primary text-3xl font-bold">#4</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
