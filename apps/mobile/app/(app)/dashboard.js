import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { CheckCircle, Trophy, MessageCircle, BookOpen, Heart, ChevronRight, Settings, Users, Bell } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { recipeAPI, userAPI, announcementAPI } from '../../lib/api';

export default function DashboardScreen() {
  const { user, selectedGym } = useAuthStore();
  const isAdmin = selectedGym?.role === 'owner' || selectedGym?.role === 'admin';
  const [recentRecipes, setRecentRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (selectedGym?.id) {
      loadRecentRecipes();
    }
  }, [selectedGym?.id]);

  useFocusEffect(
    useCallback(() => {
      if (selectedGym?.id) {
        loadStats();
        loadAnnouncements();
      }
    }, [selectedGym?.id])
  );

  const loadStats = async () => {
    try {
      const res = await userAPI.getStats(selectedGym.id);
      setStats(res.data);
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const res = await announcementAPI.list(selectedGym.id);
      const data = res.data;
      setAnnouncements(data);
      if (data.length > 0) {
        const lastViewed = await AsyncStorage.getItem(`lastViewedAnnouncements_${selectedGym.id}`);
        const lastViewedTime = lastViewed ? parseInt(lastViewed) : 0;
        setHasUnread(new Date(data[0].createdAt).getTime() > lastViewedTime);
      } else {
        setHasUnread(false);
      }
    } catch (e) {
      console.error('Failed to load announcements:', e);
    }
  };

  const loadRecentRecipes = async () => {
    try {
      const res = await recipeAPI.list(selectedGym.id);
      setRecentRecipes(res.data.slice(0, 4));
    } catch (e) {
      console.error('Failed to load recipes:', e);
    } finally {
      setRecipesLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background-dark">
      {/* Header */}
      <View className="bg-surface-dark px-6 pt-16 pb-6 border-b border-slate-700">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-3xl font-bold">Dashboard</Text>
            <Text className="text-slate-400 mt-1">{selectedGym?.name ?? 'Welcome back'}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(app)/announcements')}
            className="p-2 relative"
          >
            <Bell size={26} color="#ffffff" strokeWidth={2} />
            {hasUnread && (
              <View className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View className="px-6 py-5">
        <Text className="text-white text-xl font-bold mb-4">Quick Actions</Text>
        <View className="flex-row flex-wrap gap-3">
          <ActionTile
            label="Check In"
            icon={<CheckCircle size={30} color="#102216" strokeWidth={2} />}
            onPress={() => router.push('/(app)/checkin')}
            primary
          />
          <ActionTile
            label="Leaderboard"
            icon={<Trophy size={28} color="#0df259" strokeWidth={2} />}
            onPress={() => router.push('/(app)/leaderboard')}
          />
          <ActionTile
            label="Team Chat"
            icon={<MessageCircle size={28} color="#0df259" strokeWidth={2} />}
            onPress={() => router.push('/(app)/chat')}
          />
          <ActionTile
            label="Recipes"
            icon={<BookOpen size={28} color="#0df259" strokeWidth={2} />}
            onPress={() => router.push('/(app)/recipes')}
          />
          {isAdmin && (
            <ActionTile
              label="Gym Admin"
              icon={<Settings size={28} color="#0df259" strokeWidth={2} />}
              onPress={() => router.push('/(app)/admin')}
            />
          )}
          {stats?.isCoach && (
            <ActionTile
              label={"Coach\nDashboard"}
              icon={<Users size={28} color="#0df259" strokeWidth={2} />}
              onPress={() => router.push('/(app)/coach-dashboard')}
            />
          )}
        </View>
      </View>

      {/* Latest Announcement */}
      {announcements.length > 0 && (
        <View className="px-6 pt-2 pb-2">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <Bell size={18} color="#0df259" strokeWidth={2} />
              <Text className="text-white text-xl font-bold">Announcements</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(app)/announcements')}
              className="flex-row items-center gap-1"
            >
              <Text className="text-primary text-sm font-semibold">See All</Text>
              <ChevronRight size={16} color="#0df259" strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(app)/announcements')}
            className="bg-surface-dark rounded-2xl p-5 border border-slate-700"
          >
            <Text className="text-white font-bold text-base mb-1">{announcements[0].title}</Text>
            <Text className="text-slate-400 text-sm" numberOfLines={2}>
              {announcements[0].body?.replace(/<[^>]*>/g, '') ?? ''}
            </Text>
            <View className="flex-row items-center gap-2 mt-3">
              <View className="w-5 h-5 rounded-full bg-primary/20 items-center justify-center">
                <Text className="text-primary text-xs font-bold">
                  {announcements[0].author?.name?.[0]?.toUpperCase()}
                </Text>
              </View>
              <Text className="text-slate-500 text-xs">
                {announcements[0].author?.name} · {timeAgo(announcements[0].createdAt)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats Grid */}
      <View className="px-6 pb-6">
        <Text className="text-white text-xl font-bold mb-4">Your Stats</Text>
        <View className="flex-row gap-4">
          <View className="flex-1 bg-surface-dark p-5 rounded-xl border border-slate-700">
            <Text className="text-slate-400 text-xs uppercase mb-2">Total Points</Text>
            <Text className="text-white text-3xl font-bold">
              {stats ? stats.points.toLocaleString() : '—'}
            </Text>
          </View>
          <View className="flex-1 bg-surface-dark p-5 rounded-xl border border-slate-700">
            <Text className="text-slate-400 text-xs uppercase mb-2">Rank</Text>
            <Text className="text-primary text-3xl font-bold">
              {stats?.rank ? `#${stats.rank}` : '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* Recent Recipes */}
      <View className="pb-8">
        <View className="flex-row items-center justify-between px-6 mb-4">
          <View className="flex-row items-center gap-2">
            <BookOpen size={20} color="#0df259" strokeWidth={2} />
            <Text className="text-white text-xl font-bold">Recipes</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(app)/recipes')}
            className="flex-row items-center gap-1"
          >
            <Text className="text-primary text-sm font-semibold">See All</Text>
            <ChevronRight size={16} color="#0df259" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {recipesLoading ? (
          <View className="items-center py-6">
            <ActivityIndicator color="#0df259" />
          </View>
        ) : recentRecipes.length === 0 ? (
          <TouchableOpacity
            onPress={() => router.push('/recipes/create')}
            className="mx-6 bg-surface-dark rounded-2xl border border-dashed border-slate-600 p-6 items-center gap-2"
          >
            <BookOpen size={28} color="#475569" strokeWidth={1.5} />
            <Text className="text-slate-400 text-sm text-center">
              No recipes yet — be the first to share one!
            </Text>
            <Text className="text-primary text-sm font-semibold">+ Add Recipe</Text>
          </TouchableOpacity>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
          >
            {recentRecipes.map(recipe => (
              <TouchableOpacity
                key={recipe.id}
                onPress={() => router.push(`/recipes/${recipe.id}`)}
                className="w-44 bg-surface-dark rounded-2xl border border-slate-700 overflow-hidden"
              >
                {recipe.imageUrl ? (
                  <Image source={{ uri: recipe.imageUrl }} className="w-full h-28" resizeMode="cover" />
                ) : (
                  <View className="w-full h-28 bg-slate-800 items-center justify-center">
                    <BookOpen size={24} color="#475569" strokeWidth={1.5} />
                  </View>
                )}
                <View className="p-3">
                  <Text className="text-white font-bold text-sm" numberOfLines={2}>{recipe.title}</Text>
                  <View className="flex-row items-center justify-between mt-2">
                    <Text className="text-slate-500 text-xs">{recipe.author?.name}</Text>
                    <View className="flex-row items-center gap-1">
                      <Heart size={12} color="#94a3b8" strokeWidth={2} />
                      <Text className="text-slate-500 text-xs">{recipe.likesCount}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
}

function ActionTile({ label, icon, onPress, primary }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-surface-dark border border-slate-700 rounded-2xl p-4 items-center justify-center gap-2"
      style={{ flexBasis: '47%', flexGrow: 1 }}
    >
      <View
        className={`w-14 h-14 rounded-2xl items-center justify-center ${
          primary ? 'bg-primary' : 'bg-white/50'
        }`}
      >
        {icon}
      </View>
      <Text className="text-white text-sm font-semibold text-center">{label}</Text>
    </TouchableOpacity>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
