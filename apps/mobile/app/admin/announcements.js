import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, Plus, Megaphone } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { announcementAPI } from '../../lib/api';

export default function AdminAnnouncements() {
  const { selectedGym } = useAuthStore();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Refresh list every time we return from the compose screen
  useFocusEffect(
    useCallback(() => {
      fetchAnnouncements();
    }, [])
  );

  const fetchAnnouncements = async () => {
    try {
      const res = await announcementAPI.list(selectedGym.id);
      setAnnouncements(res.data);
    } catch (e) {
      console.error('Fetch announcements error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

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

  // Strip HTML for admin list preview
  const stripHtml = (html) => html?.replace(/<[^>]*>/g, '') ?? '';

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
      <View className="bg-surface-dark px-6 pt-16 pb-4 border-b border-slate-700">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
              <ArrowLeft size={24} color="#ffffff" strokeWidth={2} />
            </TouchableOpacity>
            <Megaphone size={22} color="#0df259" strokeWidth={2} />
            <Text className="text-white text-2xl font-bold">Announcements</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/admin/announcement-compose')}
            className="w-10 h-10 bg-primary rounded-xl items-center justify-center"
          >
            <Plus size={20} color="#102216" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 py-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0df259" />}
      >
        {announcements.length === 0 ? (
          <View className="items-center py-20">
            <Megaphone size={48} color="#334155" strokeWidth={1.5} />
            <Text className="text-slate-400 text-base mt-4">No announcements yet</Text>
            <TouchableOpacity
              onPress={() => router.push('/admin/announcement-compose')}
              className="mt-4 bg-primary px-6 py-3 rounded-xl"
            >
              <Text className="text-background-dark font-bold">Post First Announcement</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-4">
            {announcements.map((item) => (
              <View key={item.id} className="bg-surface-dark rounded-2xl p-5 border border-slate-700">
                <Text className="text-white font-bold text-base mb-1">{item.title}</Text>
                <Text className="text-slate-400 text-sm leading-relaxed" numberOfLines={2}>
                  {stripHtml(item.body)}
                </Text>
                <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-slate-700/60">
                  <Text className="text-slate-500 text-xs flex-1">{item.author?.name}</Text>
                  <Text className="text-slate-600 text-xs">{timeAgo(item.createdAt)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
