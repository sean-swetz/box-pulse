import { View, Text, TouchableOpacity } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Home, CheckCircle, Trophy, MessageCircle, GraduationCap } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';

export default function BottomNav() {
  const pathname = usePathname();
  const selectedGym = useAuthStore((state) => state.selectedGym);
  
  // Check if user is a coach
  const isCoach = selectedGym?.isCoach || false;

  const tabs = [
    { name: 'Dashboard', path: '/(app)/dashboard', icon: Home },
    { name: 'Check-in', path: '/(app)/checkin', icon: CheckCircle },
    { name: 'Leaderboard', path: '/(app)/leaderboard', icon: Trophy },
    { name: 'Chat', path: '/(app)/chat', icon: MessageCircle },
    ...(isCoach ? [{ name: 'Coach', path: '/(app)/coach-dashboard', icon: GraduationCap }] : []),
  ];

  return (
    <View className="bg-surface-dark border-t border-slate-700 px-2 py-3 pb-8">
      <View className="flex-row justify-around items-center gap-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <TouchableOpacity
              key={tab.path}
              onPress={() => router.push(tab.path)}
              className="items-center py-2 px-4 flex-1"
            >
              <Icon 
                size={24} 
                color={isActive ? '#0df259' : '#94a3b8'}
                strokeWidth={2}
              />
              <Text 
                className={`text-xs font-medium mt-2 ${
                  isActive ? 'text-primary' : 'text-slate-400'
                }`}
              >
                {tab.name}
              </Text>
              {isActive && (
                <View className="absolute bottom-0 w-12 h-1 bg-primary rounded-full" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
