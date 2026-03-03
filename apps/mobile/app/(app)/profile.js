import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { User, Camera, LogOut, Settings, Trophy, Award } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen() {
  const { user, selectedGym, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView className="flex-1 bg-background-dark">
      {/* Header */}
      <View className="bg-surface-dark px-6 pt-16 pb-8">
        {/* Profile Photo */}
        <View className="items-center mb-6">
          <View className="relative">
            <View className="w-32 h-32 rounded-full bg-slate-700 overflow-hidden border-4 border-slate-800">
              {user?.photoUrl ? (
                <Image source={{ uri: user.photoUrl }} className="w-full h-full" />
              ) : (
                <View className="w-full h-full items-center justify-center bg-primary/20">
                  <User size={48} color="#0df259" strokeWidth={2} />
                </View>
              )}
            </View>
            <TouchableOpacity className="absolute bottom-0 right-0 w-10 h-10 bg-primary rounded-full items-center justify-center border-4 border-surface-dark">
              <Camera size={20} color="#102216" strokeWidth={2} />
            </TouchableOpacity>
          </View>
          
          <Text className="text-white text-2xl font-bold mt-4">{user?.name || 'User'}</Text>
          <Text className="text-slate-400 mt-1">{user?.email}</Text>
          {selectedGym && (
            <View className="bg-primary/10 px-4 py-2 rounded-full mt-3">
              <Text className="text-primary font-bold">{selectedGym.name}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats */}
      <View className="px-6 py-6">
        <Text className="text-white text-xl font-bold mb-4">Your Stats</Text>
        <View className="flex-row gap-4">
          <View className="flex-1 bg-surface-dark rounded-xl p-5 border border-slate-700">
            <View className="flex-row items-center gap-2 mb-2">
              <Trophy size={20} color="#0df259" strokeWidth={2} />
              <Text className="text-slate-400 text-sm">Points</Text>
            </View>
            <Text className="text-white text-3xl font-bold">1,240</Text>
          </View>
          <View className="flex-1 bg-surface-dark rounded-xl p-5 border border-slate-700">
            <View className="flex-row items-center gap-2 mb-2">
              <Award size={20} color="#0df259" strokeWidth={2} />
              <Text className="text-slate-400 text-sm">Rank</Text>
            </View>
            <Text className="text-primary text-3xl font-bold">#4</Text>
          </View>
        </View>
      </View>

      {/* Settings */}
      <View className="px-6 pb-6">
        <Text className="text-white text-xl font-bold mb-4">Settings</Text>
        <View className="gap-3">
          <TouchableOpacity className="bg-surface-dark rounded-xl p-5 border border-slate-700 flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <Settings size={24} color="#94a3b8" strokeWidth={2} />
              <Text className="text-white font-semibold">Account Settings</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogout} className="bg-red-500/10 rounded-xl p-5 border border-red-500/20 flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <LogOut size={24} color="#ef4444" strokeWidth={2} />
              <Text className="text-red-500 font-semibold">Log Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
