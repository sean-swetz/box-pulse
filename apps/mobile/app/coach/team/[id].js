import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MessageCircle, CheckCircle } from 'lucide-react-native';
import axios from 'axios';
import { useAuthStore } from '../../../store/authStore';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    fetchTeamDetails();
  }, [id]);

  const fetchTeamDetails = async () => {
    try {
      const response = await axios.get(`/api/teams/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeam(response.data);
    } catch (error) {
      console.error('Failed to fetch team:', error);
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

  if (!team) {
    return (
      <View className="flex-1 bg-background-dark items-center justify-center">
        <Text className="text-slate-400">Team not found</Text>
      </View>
    );
  }

  const sortedMembers = [...(team.members || [])].sort((a, b) => b.points - a.points);

  return (
    <View className="flex-1 bg-background-dark">
      {/* Header */}
      <View 
        className="px-6 pt-16 pb-6"
        style={{ backgroundColor: team.color || '#0df259' }}
      >
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mb-4 flex-row items-center"
        >
          <ArrowLeft size={20} color="#ffffff" strokeWidth={2} />
          <Text className="text-white font-bold ml-2">Back</Text>
        </TouchableOpacity>
        
        <Text className="text-white text-3xl font-bold">{team.name}</Text>
        <Text className="text-white/80 mt-1">Coach Dashboard</Text>

        {/* Quick Stats */}
        <View className="flex-row mt-6 space-x-3">
          <View className="flex-1 bg-white/20 backdrop-blur rounded-xl p-4">
            <Text className="text-white/80 text-xs uppercase">Total Points</Text>
            <Text className="text-white text-3xl font-bold mt-1">{team.totalPoints}</Text>
          </View>
          <View className="flex-1 bg-white/20 backdrop-blur rounded-xl p-4">
            <Text className="text-white/80 text-xs uppercase">Members</Text>
            <Text className="text-white text-3xl font-bold mt-1">{team.members?.length || 0}</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {/* Action Buttons */}
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            onPress={() => router.push(`/chat/team/${team.id}`)}
            className="flex-1 bg-primary py-4 rounded-xl flex-row items-center justify-center gap-2"
          >
            <MessageCircle size={20} color="#102216" strokeWidth={2} />
            <Text className="text-background-dark font-bold text-base">Message Team</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => router.push(`/coach/checkins/${team.id}`)}
            className="flex-1 bg-slate-700 py-4 rounded-xl flex-row items-center justify-center gap-2"
          >
            <CheckCircle size={20} color="#ffffff" strokeWidth={2} />
            <Text className="text-white font-bold text-base">Check-Ins</Text>
          </TouchableOpacity>
        </View>

        {/* Team Roster */}
        <View className="mb-4">
          <Text className="text-white text-xl font-bold mb-3">Team Roster</Text>
          
          {sortedMembers.length === 0 ? (
            <View className="bg-surface-dark rounded-xl p-6 items-center">
              <Text className="text-slate-400">No team members yet</Text>
            </View>
          ) : (
            <View className="space-y-2">
              {sortedMembers.map((member, index) => (
                <MemberRow 
                  key={member.id} 
                  member={member} 
                  rank={index + 1}
                  isCaptain={member.isCaptain}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function MemberRow({ member, rank, isCaptain }) {
  const getRankColor = () => {
    if (rank === 1) return 'bg-yellow-500';
    if (rank === 2) return 'bg-slate-300';
    if (rank === 3) return 'bg-orange-600';
    return 'bg-slate-700';
  };

  return (
    <View className="bg-surface-dark rounded-xl p-4 flex-row items-center border border-slate-700">
      {/* Rank */}
      <View className={`w-8 h-8 rounded-full items-center justify-center ${getRankColor()} mr-3`}>
        <Text className="text-white font-bold text-sm">{rank}</Text>
      </View>

      {/* Avatar */}
      <View className="w-12 h-12 rounded-full overflow-hidden mr-3 bg-slate-700">
        {member.user.photoUrl ? (
          <Image 
            source={{ uri: member.user.photoUrl }} 
            className="w-full h-full"
          />
        ) : (
          <View className="w-full h-full items-center justify-center bg-primary/20">
            <Text className="text-primary text-lg font-bold">
              {member.user.name.substring(0, 1)}
            </Text>
          </View>
        )}
      </View>

      {/* Name & Points */}
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="text-white font-bold text-base">{member.user.name}</Text>
          {isCaptain && (
            <View className="ml-2 bg-primary/20 px-2 py-0.5 rounded">
              <Text className="text-primary text-xs font-bold">CAPTAIN</Text>
            </View>
          )}
        </View>
        <Text className="text-slate-400 text-sm">{member.user.email}</Text>
      </View>

      {/* Points */}
      <View className="items-end">
        <Text className="text-primary text-xl font-bold">{member.points}</Text>
        <Text className="text-slate-500 text-xs">points</Text>
      </View>
    </View>
  );
}
