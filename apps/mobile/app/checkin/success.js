import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Trophy, Home } from 'lucide-react-native';

export default function CheckinSuccessScreen() {
  return (
    <View className="flex-1 bg-background-dark items-center justify-center px-6">
      <View className="items-center">
        <View className="w-24 h-24 bg-primary rounded-full items-center justify-center mb-6">
          <Trophy size={48} color="#102216" strokeWidth={2} />
        </View>
        
        <Text className="text-white text-3xl font-bold text-center mb-2">Week Complete!</Text>
        <Text className="text-slate-400 text-lg text-center mb-8">You earned 125 points this week!</Text>
        
        <View className="bg-surface-dark rounded-2xl p-6 border border-slate-700 w-full mb-8">
          <Text className="text-slate-400 text-sm mb-2">Total Progress</Text>
          <View className="flex-row items-baseline gap-2 mb-3">
            <Text className="text-white text-4xl font-bold">450</Text>
            <Text className="text-slate-400 text-lg">/ 700 points</Text>
          </View>
          <View className="bg-slate-800 h-3 rounded-full overflow-hidden">
            <View className="bg-primary h-full rounded-full" style={{ width: '64%' }} />
          </View>
          <Text className="text-slate-400 text-sm mt-2">250 points to next milestone</Text>
        </View>

        <View className="gap-3 w-full">
          <TouchableOpacity onPress={() => router.push('/(app)/dashboard')} className="bg-primary py-4 rounded-xl flex-row items-center justify-center gap-2">
            <Home size={20} color="#102216" strokeWidth={2} />
            <Text className="text-background-dark font-bold text-base">Back to Dashboard</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => router.push('/(app)/leaderboard')} className="bg-slate-700 py-4 rounded-xl">
            <Text className="text-white text-center font-bold">View Leaderboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
