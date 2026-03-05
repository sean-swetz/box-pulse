import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { ArrowLeft, Bell, Megaphone } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { announcementAPI } from '../../lib/api';

export default function AnnouncementsScreen() {
  const { selectedGym } = useAuthStore();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    // Mark as viewed so the unread dot clears on next dashboard visit
    if (selectedGym?.id) {
      AsyncStorage.setItem(`lastViewedAnnouncements_${selectedGym.id}`, Date.now().toString());
    }
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await announcementAPI.list(selectedGym.id);
      setAnnouncements(res.data);
    } catch (e) {
      console.error('Failed to fetch announcements:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
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
      <View className="bg-surface-dark px-6 pt-16 pb-5 border-b border-slate-700">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#ffffff" strokeWidth={2} />
          </TouchableOpacity>
          <Bell size={22} color="#0df259" strokeWidth={2} />
          <Text className="text-white text-2xl font-bold">Announcements</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0df259" />}
      >
        {announcements.length === 0 ? (
          <View className="items-center justify-center py-24 px-6">
            <Megaphone size={48} color="#334155" strokeWidth={1.5} />
            <Text className="text-slate-400 text-base mt-4 text-center">No announcements yet</Text>
            <Text className="text-slate-600 text-sm mt-1 text-center">
              Coaches and admins can post announcements from the Admin panel
            </Text>
          </View>
        ) : (
          <View className="px-6 py-4 gap-4">
            {announcements.map((item) => (
              <AnnouncementCard key={item.id} item={item} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function AnnouncementCard({ item }) {
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View className="bg-surface-dark rounded-2xl p-5 border border-slate-700">
      <Text className="text-white font-bold text-lg mb-2">{item.title}</Text>
      <Text className="text-slate-300 text-sm leading-relaxed">{item.body}</Text>
      <View className="flex-row items-center gap-2 mt-4 pt-4 border-t border-slate-700/60">
        <View className="w-6 h-6 rounded-full bg-primary/20 items-center justify-center">
          <Text className="text-primary text-xs font-bold">
            {item.author?.name?.[0]?.toUpperCase()}
          </Text>
        </View>
        <Text className="text-slate-500 text-xs flex-1">{item.author?.name}</Text>
        <Text className="text-slate-600 text-xs">{timeAgo(item.createdAt)}</Text>
      </View>
    </View>
  );
}
