import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Settings, Users, Trophy, UserPlus, Palette, User, Megaphone, ClipboardCheck } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { gymAPI, adminAPI } from '../../lib/api';

export default function GymOwnerDashboard() {
  const [gym, setGym] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, selectedGym, token } = useAuthStore();

  useEffect(() => {
    loadGymData();
  }, []);

  const loadGymData = async () => {
    try {
      const [gymResponse, statsResponse] = await Promise.all([
        gymAPI.getById(selectedGym.id),
        adminAPI.getStats(selectedGym.id),
      ]);
      setGym(gymResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Failed to load gym data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background-dark items-center justify-center">
        <ActivityIndicator size="large" color="#0df259" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-dark">
      {/* Header */}
      <View className="bg-surface-dark px-6 pt-16 pb-6 border-b border-slate-700">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-3">
            <Settings size={32} color="#0df259" strokeWidth={2} />
            <Text className="text-white text-3xl font-bold">Gym Admin</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => router.push('/(app)/profile')}
            className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden"
          >
            {user?.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} className="w-full h-full" />
            ) : (
              <View className="w-full h-full items-center justify-center bg-primary/20">
                <User size={20} color="#0df259" strokeWidth={2} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Gym Info */}
        <View className="flex-row items-center gap-3">
          {gym?.logoUrl ? (
            <Image source={{ uri: gym.logoUrl }} className="w-16 h-16 rounded-xl" />
          ) : (
            <View className="w-16 h-16 rounded-xl bg-primary/10 items-center justify-center">
              <Text className="text-primary text-2xl font-bold">{gym?.name?.substring(0, 1)}</Text>
            </View>
          )}
          <View>
            <Text className="text-white text-xl font-bold">{gym?.name}</Text>
            <Text className="text-slate-400 text-sm">{gym?.plan} Plan</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        {/* Stats Grid */}
        <View className="mb-6">
          <Text className="text-white text-xl font-bold mb-4">Overview</Text>
          <View className="flex-row flex-wrap gap-3">
            <StatCard 
              label="Members" 
              value={stats?.totalMembers} 
              icon={<Users size={24} color="#0df259" strokeWidth={2} />}
            />
            <StatCard 
              label="Teams" 
              value={stats?.activeTeams} 
              icon={<Users size={24} color="#0df259" strokeWidth={2} />}
            />
            <StatCard 
              label="Challenges" 
              value={stats?.activeChallenges} 
              icon={<Trophy size={24} color="#0df259" strokeWidth={2} />}
            />
            <StatCard 
              label="Pending Invites" 
              value={stats?.pendingInvites} 
              icon={<UserPlus size={24} color="#0df259" strokeWidth={2} />}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mb-6">
          <Text className="text-white text-xl font-bold mb-4">Quick Actions</Text>
          <View className="gap-3">
            <ActionButton
              label="Edit Gym Profile"
              description="Logo, colors, contact info"
              icon={<Palette size={24} color="#0df259" strokeWidth={2} />}
              onPress={() => router.push('/admin/gym-profile')}
            />
            <ActionButton
              label="Manage Teams"
              description="Create teams, assign members"
              icon={<Users size={24} color="#0df259" strokeWidth={2} />}
              onPress={() => router.push('/admin/teams')}
            />
            <ActionButton
              label="Create Challenge"
              description="New nutrition/fitness challenge"
              icon={<Trophy size={24} color="#0df259" strokeWidth={2} />}
              onPress={() => router.push('/admin/challenges')}
            />
            <ActionButton
              label="Manage Members"
              description="Assign teams, adjust points"
              icon={<User size={24} color="#0df259" strokeWidth={2} />}
              onPress={() => router.push('/admin/members')}
            />
            <ActionButton
              label="Invite Members"
              description="Generate invite codes"
              icon={<UserPlus size={24} color="#0df259" strokeWidth={2} />}
              onPress={() => router.push('/admin/invites')}
            />
            <ActionButton
              label="Announcements"
              description="Post updates to all members"
              icon={<Megaphone size={24} color="#0df259" strokeWidth={2} />}
              onPress={() => router.push('/admin/announcements')}
            />
            <ActionButton
              label="Check-in Status"
              description="See who submitted this week"
              icon={<ClipboardCheck size={24} color="#0df259" strokeWidth={2} />}
              onPress={() => router.push('/admin/checkin-status')}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <View className="flex-1 min-w-[45%] bg-surface-dark rounded-xl p-4 border border-slate-700">
      <View className="flex-row items-center justify-between mb-2">
        {icon}
        <Text className="text-white text-2xl font-bold">{value}</Text>
      </View>
      <Text className="text-slate-400 text-sm">{label}</Text>
    </View>
  );
}

function ActionButton({ label, description, icon, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-surface-dark rounded-xl p-5 border border-slate-700 active:bg-slate-800"
    >
      <View className="flex-row items-center gap-4">
        <View className="w-12 h-12 bg-primary/10 rounded-xl items-center justify-center">
          {icon}
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold text-base">{label}</Text>
          <Text className="text-slate-400 text-sm mt-1">{description}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
