import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react-native';
import axios from 'axios';
import { useAuthStore } from '../../../store/authStore';

export default function TeamCheckinsScreen() {
  const { id } = useLocalSearchParams();
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  useEffect(() => {
    fetchCheckins();
  }, [id]);

  const fetchCheckins = async () => {
    try {
      // TODO: Connect to API
      // Mock data for now
      setCheckins([
        {
          id: '1',
          user: { name: 'Sarah M', photoUrl: null },
          points: 125,
          timestamp: '2 hours ago',
          completed: true
        },
        {
          id: '2',
          user: { name: 'Mike T', photoUrl: null },
          points: 110,
          timestamp: '5 hours ago',
          completed: true
        },
        {
          id: '3',
          user: { name: 'Alex R', photoUrl: null },
          points: 0,
          timestamp: null,
          completed: false
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch check-ins:', error);
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

  const completedCount = checkins.filter(c => c.completed).length;
  const totalCount = checkins.length;

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
          <Text className="text-slate-400 text-sm mb-2">This Week</Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-white text-3xl font-bold">{completedCount}</Text>
            <Text className="text-slate-400 text-lg">/ {totalCount} completed</Text>
          </View>
          <View className="bg-slate-700 h-2 rounded-full overflow-hidden mt-3">
            <View 
              className="bg-primary h-full rounded-full"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        <View className="gap-3">
          {checkins.map((checkin) => (
            <CheckinRow key={checkin.id} checkin={checkin} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function CheckinRow({ checkin }) {
  return (
    <View className={`rounded-xl p-5 border ${
      checkin.completed 
        ? 'bg-surface-dark border-slate-700' 
        : 'bg-slate-800/50 border-slate-700'
    }`}>
      <View className="flex-row items-center gap-4">
        {/* Avatar */}
        <View className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden">
          {checkin.user.photoUrl ? (
            <Image source={{ uri: checkin.user.photoUrl }} className="w-full h-full" />
          ) : (
            <View className="w-full h-full items-center justify-center bg-primary/20">
              <Text className="text-primary text-lg font-bold">
                {checkin.user.name.substring(0, 1)}
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View className="flex-1">
          <Text className="text-white font-bold text-base">{checkin.user.name}</Text>
          {checkin.completed ? (
            <View className="flex-row items-center gap-2 mt-1">
              <CheckCircle size={14} color="#0df259" strokeWidth={2} />
              <Text className="text-slate-400 text-sm">{checkin.timestamp}</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-2 mt-1">
              <Clock size={14} color="#94a3b8" strokeWidth={2} />
              <Text className="text-slate-500 text-sm">Not checked in yet</Text>
            </View>
          )}
        </View>

        {/* Points */}
        {checkin.completed && (
          <View className="bg-primary/10 px-3 py-1 rounded-full">
            <Text className="text-primary font-bold">{checkin.points} pts</Text>
          </View>
        )}
      </View>
    </View>
  );
}
