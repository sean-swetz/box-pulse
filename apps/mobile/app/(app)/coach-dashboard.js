import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { MessageCircle, Eye, BarChart2, Building2, ClipboardCheck } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { coachAPI } from '../../lib/api';

export default function CoachDashboard() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTeams = async () => {
    try {
      const response = await coachAPI.getMyTeams();
      setTeams(response.data);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTeams();
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
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-3xl font-bold">Coach Dashboard</Text>
            <Text className="text-slate-400 mt-1">Manage your teams</Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => router.push('/admin/checkin-status')}
              className="flex-row items-center gap-2 bg-primary/10 px-4 py-2.5 rounded-xl border border-primary/30"
            >
              <ClipboardCheck size={16} color="#0df259" strokeWidth={2} />
              <Text className="text-primary font-semibold text-sm">Check-ins</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(app)/reports')}
              className="flex-row items-center gap-2 bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-600"
            >
              <Building2 size={16} color="#94a3b8" strokeWidth={2} />
              <Text className="text-slate-300 font-semibold text-sm">Reports</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0df259" />
        }
      >
        {teams.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Text className="text-slate-400 text-lg">No teams assigned yet</Text>
            <Text className="text-slate-500 mt-2">You'll see your teams here when assigned</Text>
          </View>
        ) : (
          <View className="px-6 py-4">
            <View className="gap-4">
              {teams.map((coaching) => (
                <TeamCard key={coaching.id} coaching={coaching} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function TeamCard({ coaching }) {
  const { team, gym } = coaching;
  
  if (!team) return null;

  const memberCount = team.members?.length || 0;
  const avgPoints = memberCount > 0 
    ? Math.round(team.members.reduce((sum, m) => sum + (m.points || 0), 0) / memberCount)
    : 0;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/coach/team/${team.id}`)}
      className="bg-surface-dark rounded-2xl p-6 border border-slate-700 active:opacity-80"
    >
      {/* Team Header */}
      <View className="flex-row items-center justify-between mb-5">
        <View className="flex-row items-center flex-1 gap-3">
          <View 
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: team.color || '#0df259' }}
          >
            <Text className="text-white text-xl font-bold">
              {team.name.substring(0, 1)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">{team.name}</Text>
            <Text className="text-slate-400 text-sm mt-1">{gym.name}</Text>
          </View>
        </View>
        <View className="bg-primary/10 px-3 py-1.5 rounded-full">
          <Text className="text-primary font-bold text-sm">{memberCount} members</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View className="flex-row gap-3 mb-5">
        <View className="flex-1 bg-slate-800 rounded-xl p-4">
          <Text className="text-slate-400 text-xs uppercase mb-1">Team Score</Text>
          <Text className="text-white text-2xl font-bold">{team.totalPoints}</Text>
        </View>
        <View className="flex-1 bg-slate-800 rounded-xl p-4">
          <Text className="text-slate-400 text-xs uppercase mb-1">Avg Points</Text>
          <Text className="text-white text-2xl font-bold">{avgPoints}</Text>
        </View>
      </View>

      {/* Member Avatars */}
      {memberCount > 0 && (
        <View className="mb-5">
          <Text className="text-slate-400 text-xs uppercase mb-3">Team Members</Text>
          <View className="flex-row -space-x-2">
            {team.members.slice(0, 8).map((member) => (
              <View key={member.id} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-surface-dark overflow-hidden">
                {member.user.photoUrl ? (
                  <Image 
                    source={{ uri: member.user.photoUrl }} 
                    className="w-full h-full"
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center bg-primary/20">
                    <Text className="text-primary text-xs font-bold">
                      {member.user.name.substring(0, 1)}
                    </Text>
                  </View>
                )}
              </View>
            ))}
            {memberCount > 8 && (
              <View className="w-8 h-8 rounded-full bg-slate-600 border-2 border-surface-dark items-center justify-center">
                <Text className="text-white text-xs font-bold">+{memberCount - 8}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Actions */}
      <View className="gap-2">
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 bg-primary/10 border border-primary py-3.5 rounded-xl flex-row items-center justify-center gap-2"
            onPress={() => router.push(`/chat/team/${team.id}`)}
          >
            <MessageCircle size={18} color="#0df259" strokeWidth={2} />
            <Text className="text-primary font-bold">Team Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-slate-700 py-3.5 rounded-xl flex-row items-center justify-center gap-2"
            onPress={() => router.push({ pathname: '/(app)/reports', params: { teamId: team.id } })}
          >
            <BarChart2 size={18} color="#ffffff" strokeWidth={2} />
            <Text className="text-white font-bold">Reports</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
