import { View, Text, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle, Home, Trophy } from 'lucide-react-native';

export default function CheckinSuccessScreen() {
  const { points } = useLocalSearchParams();
  const pointsEarned = parseInt(points ?? '0', 10);

  return (
    <View className="flex-1 bg-background-dark items-center justify-center px-6">
      <View className="items-center w-full">
        {/* Icon */}
        <View className="w-28 h-28 bg-primary rounded-full items-center justify-center mb-6">
          <CheckCircle size={56} color="#102216" strokeWidth={2} />
        </View>

        <Text className="text-white text-3xl font-bold text-center mb-2">Check-In Complete!</Text>
        <Text className="text-slate-400 text-lg text-center mb-8">
          Great work this week 💪
        </Text>

        {/* Points earned card */}
        <View className="bg-surface-dark rounded-2xl p-6 border border-primary/30 w-full mb-8 items-center">
          <Text className="text-slate-400 text-sm uppercase tracking-widest mb-2">Points Earned</Text>
          <Text className="text-primary text-6xl font-bold">+{pointsEarned}</Text>
          <Text className="text-slate-500 text-sm mt-2">Keep it up to climb the leaderboard</Text>
        </View>

        <View className="gap-3 w-full">
          <TouchableOpacity
            onPress={() => router.replace('/(app)/dashboard')}
            className="bg-primary py-4 rounded-xl flex-row items-center justify-center gap-2"
          >
            <Home size={20} color="#102216" strokeWidth={2} />
            <Text className="text-background-dark font-bold text-base">Back to Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(app)/leaderboard')}
            className="bg-surface-dark py-4 rounded-xl border border-slate-700 flex-row items-center justify-center gap-2"
          >
            <Trophy size={20} color="#0df259" strokeWidth={2} />
            <Text className="text-white font-bold text-base">View Leaderboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
