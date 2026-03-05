import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react-native';
import { teamAPI } from '../../../lib/api';

export default function TeamCheckinsScreen() {
  const { id } = useLocalSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCheckins();
  }, [id]);

  const fetchCheckins = async () => {
    try {
      const res = await teamAPI.getCheckins(id);
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch check-ins:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCheckins();
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background-dark items-center justify-center">
        <ActivityIndicator size="large" color="#0df259" />
      </View>
    );
  }

  const members = data?.members ?? [];
  const completedCount = members.filter(m => m.completed).length;
  const totalCount = members.length;

  return (
    <View className="flex-1 bg-background-dark">
      {/* Header */}
      <View className="bg-surface-dark px-6 pt-16 pb-6 border-b border-slate-700">
        <View className="flex-row items-center gap-4 mb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#ffffff" strokeWidth={2} />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Team Check-Ins</Text>
        </View>

        {/* Summary */}
        <View className="bg-slate-800 rounded-xl p-4">
          <Text className="text-slate-400 text-sm mb-2">Current Window</Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-white text-3xl font-bold">{completedCount}</Text>
            <Text className="text-slate-400 text-lg">/ {totalCount} completed</Text>
          </View>
          {totalCount > 0 && (
            <View className="bg-slate-700 h-2 rounded-full overflow-hidden mt-3">
              <View
                className="bg-primary h-full rounded-full"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </View>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 py-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0df259" />}
      >
        {members.length === 0 ? (
          <View className="items-center py-20">
            <Text className="text-slate-500">No members on this team yet</Text>
          </View>
        ) : (
          <View className="gap-3">
            {members.map((member) => (
              <CheckinRow key={member.user.id} member={member} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function CheckinRow({ member }) {
  const timeAgo = (dateStr) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <View className={`rounded-xl p-5 border ${
      member.completed ? 'bg-surface-dark border-slate-700' : 'bg-slate-800/50 border-slate-700'
    }`}>
      <View className="flex-row items-center gap-4">
        {/* Avatar */}
        <View className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden">
          {member.user.photoUrl ? (
            <Image source={{ uri: member.user.photoUrl }} className="w-full h-full" />
          ) : (
            <View className="w-full h-full items-center justify-center bg-primary/20">
              <Text className="text-primary text-lg font-bold">
                {member.user.name[0]}
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View className="flex-1">
          <Text className="text-white font-bold text-base">{member.user.name}</Text>
          {member.completed ? (
            <View className="flex-row items-center gap-2 mt-1">
              <CheckCircle size={14} color="#0df259" strokeWidth={2} />
              <Text className="text-slate-400 text-sm">{timeAgo(member.submittedAt)}</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-2 mt-1">
              <Clock size={14} color="#94a3b8" strokeWidth={2} />
              <Text className="text-slate-500 text-sm">Not checked in yet</Text>
            </View>
          )}
        </View>

        {/* Points */}
        {member.completed && (
          <View className="items-end gap-1">
            <View className="bg-primary/10 px-3 py-1 rounded-full">
              <Text className="text-primary font-bold">{member.weeklyScore} pts</Text>
            </View>
            <Text className="text-slate-500 text-xs">{member.points} total</Text>
          </View>
        )}
      </View>
    </View>
  );
}
